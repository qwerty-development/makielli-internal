'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '../../utils/supabase'
import { toast } from 'react-hot-toast'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { Client } from '../../utils/functions/clients'
import { Product, ProductVariant } from '../../utils/functions/products'
import {
	FaSort,
	FaEdit,
	FaTrash,
	FaFilter,
	FaPlus,
	FaCheck,
	FaSearch
} from 'react-icons/fa'
import { generatePDF } from '@/utils/pdfGenerator'
import { debounce } from 'lodash'

interface QuotationProduct {
	product_id: string
	product_variant_id: string
	quantity: number
	note: string
}

interface Quotation {
	id: number
	created_at: string
	total_price: number
	note: string
	client_id: number
	products: QuotationProduct[]
	status: 'pending' | 'accepted' | 'rejected'
	include_vat: boolean
	vat_amount: number
}

const QuotationsPage: React.FC = () => {
	const [quotations, setQuotations] = useState<Quotation[]>([])
	const [clients, setClients] = useState<Client[]>([])
	const [products, setProducts] = useState<Product[]>([])
	const [showModal, setShowModal] = useState(false)
	const [currentPage, setCurrentPage] = useState(1)
	const [itemsPerPage] = useState(10)
	const [sortField, setSortField] = useState<keyof Quotation>('created_at')
	const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
	const [filterStartDate, setFilterStartDate] = useState<any>(null)
	const [filterEndDate, setFilterEndDate] = useState<any>(null)
	const [filterClient, setFilterClient] = useState<number | null>(null)
	const [filterStatus, setFilterStatus] = useState<string | null>(null)
	const [totalQuotations, setTotalQuotations] = useState(0)
	const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(
		null
	)
	const [allProductVariants, setAllProductVariants] = useState<
		ProductVariant[]
	>([])
	const [newQuotation, setNewQuotation] = useState<Partial<Quotation>>({
		created_at: new Date().toISOString(),
		total_price: 0,
		note: '',
		products: [],
		status: 'pending',
		include_vat: false,
		vat_amount: 0
	})
	const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
	const [selectedVariants, setSelectedVariants] = useState<QuotationProduct[]>(
		[]
	)
	const [productSearch, setProductSearch] = useState('')
	const [filteredProducts, setFilteredProducts] = useState<Product[]>([])

	useEffect(() => {
		fetchQuotations()
		fetchClients()
		fetchProducts()
	}, [
		currentPage,
		sortField,
		sortOrder,
		filterStartDate,
		filterEndDate,
		filterClient,
		filterStatus
	])

	useEffect(() => {
		const filtered = products.filter(product =>
			product.name.toLowerCase().includes(productSearch.toLowerCase())
		)
		setFilteredProducts(filtered)
	}, [productSearch, products])

	const handleProductSearch = debounce((searchTerm: string) => {
		setProductSearch(searchTerm)
	}, 300)

	const fetchQuotations = async () => {
		let query = supabase.from('Quotations').select('*', { count: 'exact' })

		if (filterStartDate) {
			query = query.gte('created_at', filterStartDate.toISOString())
		}
		if (filterEndDate) {
			query = query.lte('created_at', filterEndDate.toISOString())
		}
		if (filterClient) {
			query = query.eq('client_id', filterClient)
		}
		if (filterStatus) {
			query = query.eq('status', filterStatus)
		}

		query = query.order(sortField, { ascending: sortOrder === 'asc' })

		const { data, error, count } = await query.range(
			(currentPage - 1) * itemsPerPage,
			currentPage * itemsPerPage - 1
		)

		if (error) {
			toast.error(`Error fetching quotations: ${error.message}`)
		} else {
			setQuotations(data || [])
			setTotalQuotations(count || 0)
		}
	}

	const fetchClients = async () => {
		const { data, error } = await supabase.from('Clients').select('*')
		if (error) {
			toast.error(`Error fetching clients: ${error.message}`)
		} else {
			setClients(data || [])
		}
	}

	const fetchProducts = async () => {
		const { data, error } = await supabase.from('Products').select(`
      *,
      variants:ProductVariants(*)
    `)

		if (error) {
			toast.error(`Error fetching products: ${error.message}`)
		} else {
			setProducts(data || [])
			const variants = data?.flatMap(product => product.variants) || []
			setAllProductVariants(variants)
		}
	}

	const calculateTotalPrice = (
		quotationProducts: QuotationProduct[],
		includeVAT: boolean
	) => {
		const subtotal = quotationProducts.reduce((total, quotationProduct) => {
			const variant = allProductVariants.find(
				v => v.id === quotationProduct.product_variant_id
			)

			if (!variant) {
				console.error(
					`Variant not found for id: ${quotationProduct.product_variant_id}`
				)
				return total
			}

			const parentProduct = products.find(p => p.id === variant.product_id)

			if (!parentProduct) {
				console.error(
					`Product not found for variant id: ${quotationProduct.product_variant_id}`
				)
				return total
			}

			return total + parentProduct.price * quotationProduct.quantity
		}, 0)

		const vatAmount = includeVAT ? subtotal * 0.11 : 0
		const totalPrice = subtotal + vatAmount

		return { subtotal, vatAmount, totalPrice }
	}

	const handleCreateQuotation = async () => {
		const { subtotal, vatAmount, totalPrice } = calculateTotalPrice(
			newQuotation.products || [],
			newQuotation.include_vat || false
		)
		const quotationData = {
			...newQuotation,
			total_price: totalPrice,
			vat_amount: vatAmount
		}

		let result
		if (newQuotation.id) {
			result = await supabase
				.from('Quotations')
				.update(quotationData)
				.eq('id', newQuotation.id)
		} else {
			result = await supabase.from('Quotations').insert(quotationData).single()
		}

		const { data, error } = result

		if (error) {
			toast.error(
				`Error ${newQuotation.id ? 'updating' : 'creating'} quotation: ${
					error.message
				}`
			)
		} else {
			toast.success(
				`Quotation ${newQuotation.id ? 'updated' : 'created'} successfully`
			)
			setShowModal(false)
			fetchQuotations()
		}
	}

	const handleAcceptQuotation = async (quotation: Quotation) => {
		// Update quotation status
		const { error: updateError } = await supabase
			.from('Quotations')
			.update({ status: 'accepted' })
			.eq('id', quotation.id)

		if (updateError) {
			toast.error(`Error updating quotation status: ${updateError.message}`)
			return
		}

		// Create new invoice
		const invoiceData = {
			created_at: new Date().toISOString(),
			total_price: quotation.total_price,
			note: quotation.note,
			client_id: quotation.client_id,
			products: quotation.products,
			remaining_amount: quotation.total_price,
			include_vat: quotation.include_vat,
			vat_amount: quotation.vat_amount
		}

		const { data: invoice, error: invoiceError } = await supabase
			.from('ClientInvoices')
			.insert(invoiceData)
			.single()

		if (invoiceError) {
			toast.error(`Error creating invoice: ${invoiceError.message}`)
			return
		}

		// Update product quantities
		for (const product of quotation.products) {
			const { error: quantityError } = await supabase.rpc(
				'update_product_variant_quantity',
				{
					variant_id: product.product_variant_id,
					quantity_change: -product.quantity
				}
			)

			if (quantityError) {
				toast.error(`Error updating product quantity: ${quantityError.message}`)
			}
		}

		// Update client balance
		const { data: clientData, error: clientError } = await supabase
			.from('Clients')
			.select('balance')
			.eq('client_id', quotation.client_id)
			.single()

		if (clientError) {
			toast.error(`Error fetching client balance: ${clientError.message}`)
			return
		}

		const newBalance = (clientData?.balance || 0) + quotation.total_price

		const { error: balanceError } = await supabase
			.from('Clients')
			.update({ balance: newBalance })
			.eq('client_id', quotation.client_id)

		if (balanceError) {
			toast.error(`Error updating client balance: ${balanceError.message}`)
		}

		toast.success('Quotation accepted and converted to invoice successfully')
		fetchQuotations()
	}

	const handleDeleteQuotation = async (id: number) => {
		if (window.confirm('Are you sure you want to delete this quotation?')) {
			const { error } = await supabase.from('Quotations').delete().eq('id', id)

			if (error) {
				toast.error(`Error deleting quotation: ${error.message}`)
			} else {
				toast.success('Quotation deleted successfully')
				fetchQuotations()
			}
		}
	}

	const handleSort = (field: keyof Quotation) => {
		if (field === sortField) {
			setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
		} else {
			setSortField(field)
			setSortOrder('asc')
		}
	}

	const handleEditQuotation = (quotation: Quotation) => {
		setNewQuotation(quotation)
		setShowModal(true)
	}

	const handleQuotationClick = (quotation: Quotation) => {
		setSelectedQuotation(quotation)
	}

	const handleAddProduct = (product: Product) => {
		setSelectedProduct(product)
		setSelectedVariants([
			{
				product_id: product.id,
				product_variant_id: product.variants[0]?.id || '',
				quantity: 1,
				note: ''
			}
		])
	}

	const handleAddVariant = () => {
		if (selectedProduct) {
			setSelectedVariants([
				...selectedVariants,
				{
					product_id: selectedProduct.id,
					product_variant_id: '',
					quantity: 1,
					note: ''
				}
			])
		}
	}

	const handleVariantChange = (
		index: number,
		field: keyof QuotationProduct,
		value: string | number
	) => {
		const updatedVariants = [...selectedVariants]
		updatedVariants[index] = { ...updatedVariants[index], [field]: value }
		setSelectedVariants(updatedVariants)
	}

	const handleRemoveVariant = (index: number) => {
		const updatedVariants = selectedVariants.filter((_, i) => i !== index)
		setSelectedVariants(updatedVariants)
	}

	const handleAddSelectedProductToQuotation = () => {
		if (selectedProduct && selectedVariants.length > 0) {
			const updatedProducts = [
				...(newQuotation.products || []),
				...selectedVariants
			]
			const { totalPrice, vatAmount } = calculateTotalPrice(
				updatedProducts,
				newQuotation.include_vat || false
			)
			setNewQuotation({
				...newQuotation,
				products: updatedProducts,
				total_price: totalPrice,
				vat_amount: vatAmount
			})
			setSelectedProduct(null)
			setSelectedVariants([])
		}
	}

	const renderQuotationTable = () => (
		<div className='overflow-x-auto bg-white rounded-lg shadow'>
			<table className='w-full table-auto'>
				<thead>
					<tr className='bg-gray text-white uppercase text-sm leading-normal'>
						<th
							className='py-3 px-6 text-left cursor-pointer'
							onClick={() => handleSort('id')}>
							ID {sortField === 'id' && <FaSort className='inline' />}
						</th>
						<th
							className='py-3 px-6 text-left cursor-pointer'
							onClick={() => handleSort('created_at')}>
							Date {sortField === 'created_at' && <FaSort className='inline' />}
						</th>
						<th
							className='py-3 px-6 text-left cursor-pointer'
							onClick={() => handleSort('total_price')}>
							Total Price{' '}
							{sortField === 'total_price' && <FaSort className='inline' />}
						</th>
						<th className='py-3 px-6 text-left'>Client</th>
						<th className='py-3 px-6 text-left'>Status</th>
						<th className='py-3 px-6 text-center'>Actions</th>
					</tr>
				</thead>
				<tbody className='text-gray text-sm font-light'>
					{quotations.map(quotation => (
						<tr
							key={quotation.id}
							className='border-b border-gray hover:bg-gray-100 cursor-pointer'
							onClick={() => handleQuotationClick(quotation)}>
							<td className='py-3 px-6 text-left whitespace-nowrap'>
								{quotation.id}
							</td>
							<td className='py-3 px-6 text-left'>
								{new Date(quotation.created_at).toLocaleDateString()}
							</td>
							<td className='py-3 px-6 text-left'>
								${quotation.total_price?.toFixed(2)}
							</td>
							<td className='py-3 px-6 text-left'>
								{clients.find(c => c.client_id === quotation.client_id)?.name}
							</td>
							<td className='py-3 px-6 text-left'>
								<span
									className={`px-2 py-1 rounded-full text-xs ${
										quotation.status === 'pending'
											? 'bg-yellow-200 text-yellow-800'
											: quotation.status === 'accepted'
											? 'bg-green-200 text-green-800'
											: 'bg-red-200 text-red-800'
									}`}>
									{quotation.status}
								</span>
							</td>
							<td className='py-3 px-6 text-center'>
								<div className='flex item-center justify-center'>
									{quotation.status === 'pending' && (
										<button
											className='w-4 mr-2 transform hover:text-green-500 hover:scale-110'
											onClick={e => {
												e.stopPropagation()
												handleAcceptQuotation(quotation)
											}}>
											<FaCheck />
										</button>
									)}
									<button
										className='w-4 mr-2 transform hover:text-purple-500 hover:scale-110'
										onClick={e => {
											e.stopPropagation()
											handleEditQuotation(quotation)
										}}>
										<FaEdit />
									</button>
									<button
										className='w-4 mr-2 transform hover:text-red-500 hover:scale-110'
										onClick={e => {
											e.stopPropagation()
											handleDeleteQuotation(quotation.id)
										}}>
										<FaTrash />
									</button>
								</div>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	)

	const renderPagination = () => {
		const totalPages = Math.ceil(totalQuotations / itemsPerPage)
		return (
			<div className='flex justify-center mt-4'>
				<nav
					className='relative z-0 inline-flex rounded-md shadow-sm -space-x-px'
					aria-label='Pagination'>
					<button
						onClick={() => setCurrentPage(1)}
						disabled={currentPage === 1}
						className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray bg-white text-sm font-medium text-gray hover:bg-gray-50 ${
							currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''
						}`}>
						<span className='sr-only'>First</span>⟪
					</button>
					<button
						onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
						disabled={currentPage === 1}
						className={`relative inline-flex items-center px-2 py-2 border border-gray bg-white text-sm font-medium text-gray hover:bg-gray-50 ${
							currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''
						}`}>
						<span className='sr-only'>Previous</span>⟨
					</button>
					<span className='relative inline-flex items-center px-4 py-2 border border-gray bg-white text-sm font-medium text-gray'>
						{currentPage} of {totalPages === 0 ? 1 : totalPages}
					</span>
					<button
						onClick={() =>
							setCurrentPage(Math.min(totalPages, currentPage + 1))
						}
						disabled={currentPage === totalPages}
						className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray bg-white text-sm font-medium text-gray hover:bg-gray-50 ${
							currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''
						}`}>
						<span className='sr-only'>Next</span>⟩
					</button>
				</nav>
			</div>
		)
	}

	const renderFilters = () => (
		<div className='mb-6 flex items-center space-x-4'>
			<div className='relative'>
				<DatePicker
					selected={filterStartDate}
					onChange={(date: Date | null) => setFilterStartDate(date)}
					selectsStart
					startDate={filterStartDate}
					endDate={filterEndDate}
					placeholderText='Start Date'
					className='block w-full pl-10 pr-3 py-2 border border-gray rounded-md leading-5 bg-white placeholder-gray focus:outline-none focus:placeholder-gray focus:ring-1 focus:ring-blue focus:border-blue sm:text-sm'
				/>
				<div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
					<FaFilter className='h-5 w-5 text-gray' />
				</div>
			</div>
			<div className='relative'>
				<DatePicker
					selected={filterEndDate}
					onChange={(date: Date | null) => setFilterEndDate(date)}
					selectsEnd
					startDate={filterStartDate}
					endDate={filterEndDate}
					minDate={filterStartDate}
					placeholderText='End Date'
					className='block w-full pl-10 pr-3 py-2 border border-gray rounded-md leading-5 bg-white placeholder-gray focus:outline-none focus:placeholder-gray focus:ring-1 focus:ring-blue focus:border-blue sm:text-sm'
				/>
				<div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
					<FaFilter className='h-5 w-5 text-gray' />
				</div>
			</div>
			<select
				onChange={e =>
					setFilterClient(e.target.value ? Number(e.target.value) : null)
				}
				className='block w-full pl-3 pr-10 py-2 text-base border-gray focus:outline-none focus:ring-blue focus:border-blue sm:text-sm rounded-md'>
				<option value=''>All Clients</option>
				{clients.map(client => (
					<option key={client.client_id} value={client.client_id}>
						{client.name}
					</option>
				))}
			</select>
			<select
				onChange={e => setFilterStatus(e.target.value || null)}
				className='block w-full pl-3 pr-10 py-2 text-base border-gray focus:outline-none focus:ring-blue focus:border-blue sm:text-sm rounded-md'>
				<option value=''>All Statuses</option>
				<option value='pending'>Pending</option>
				<option value='accepted'>Accepted</option>
				<option value='rejected'>Rejected</option>
			</select>
		</div>
	)

	const renderQuotationModal = () => (
		<div
			className={`fixed z-10 inset-0 overflow-y-auto ${
				showModal ? '' : 'hidden'
			}`}>
			<div className='flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0'>
				<div className='fixed inset-0 transition-opacity' aria-hidden='true'>
					<div className='absolute inset-0 bg-gray opacity-75'></div>
				</div>
				<span
					className='hidden sm:inline-block sm:align-middle sm:h-screen'
					aria-hidden='true'>
					&#8203;
				</span>
				<div className='inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full'>
					<div className='bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4'>
						<h3 className='text-lg leading-6 font-medium text-gray mb-4'>
							{newQuotation.id ? 'Edit Quotation' : 'Create New Quotation'}
						</h3>
						<form>
							<div className='mb-4'>
								<label
									className='block text-gray text-sm font-bold mb-2'
									htmlFor='date'>
									Date
								</label>
								<DatePicker
									selected={
										newQuotation.created_at
											? new Date(newQuotation.created_at)
											: null
									}
									onChange={(date: Date | null) =>
										setNewQuotation({
											...newQuotation,
											created_at: date ? date.toISOString() : ''
										})
									}
									className='shadow appearance-none border rounded w-full py-2 px-3 text-gray leading-tight focus:outline-none focus:shadow-outline'
								/>
							</div>
							<div className='mb-4'>
								<label
									className='block text-gray text-sm font-bold mb-2'
									htmlFor='client'>
									Client
								</label>
								<select
									id='client'
									className='shadow appearance-none border rounded w-full py-2 px-3 text-gray leading-tight focus:outline-none focus:shadow-outline'
									value={newQuotation.client_id}
									onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
										setNewQuotation({
											...newQuotation,
											client_id: Number(e.target.value)
										})
									}>
									<option value=''>Select Client</option>
									{clients.map(client => (
										<option key={client.client_id} value={client.client_id}>
											{client.name}
										</option>
									))}
								</select>
							</div>
							<div className='mb-4'>
								<label className='block text-gray text-sm font-bold mb-2'>
									Products
								</label>
								<div className='flex mb-2'>
									<input
										type='text'
										placeholder='Search products...'
										className='flex-grow shadow appearance-none border rounded py-2 px-3 text-gray leading-tight focus:outline-none focus:shadow-outline'
										onChange={e => handleProductSearch(e.target.value)}
									/>
									<button
										type='button'
										className='ml-2 bg-blue hover:bg-blue text-white font-bold py-2 px-4 rounded'
										onClick={() => setProductSearch('')}>
										<FaSearch />
									</button>
								</div>
								<div className='max-h-40 overflow-y-auto mb-2'>
									{filteredProducts.map(product => (
										<div
											key={product.id}
											className='flex justify-between items-center p-2 hover:bg-gray-100 cursor-pointer'
											onClick={() => handleAddProduct(product)}>
											<span>{product.name}</span>
											<button
												type='button'
												className='bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-2 rounded text-xs'>
												Select
											</button>
										</div>
									))}
								</div>

								{selectedProduct && (
									<div className='mb-4 p-2 border rounded'>
										<h4 className='font-bold mb-2'>{selectedProduct.name}</h4>
										{selectedVariants.map((variant, index) => (
											<div key={index} className='mb-2 p-2 border rounded'>
												<select
													className='shadow appearance-none border rounded w-full py-2 px-3 text-gray leading-tight focus:outline-none focus:shadow-outline mb-2'
													value={variant.product_variant_id}
													onChange={e =>
														handleVariantChange(
															index,
															'product_variant_id',
															e.target.value
														)
													}>
													<option value=''>Select Variant</option>
													{selectedProduct.variants.map(v => (
														<option key={v.id} value={v.id}>
															{v.size} - {v.color}
														</option>
													))}
												</select>
												<input
													type='number'
													className='shadow appearance-none border rounded w-full py-2 px-3 text-gray leading-tight focus:outline-none focus:shadow-outline mb-2'
													value={variant.quantity}
													onChange={e =>
														handleVariantChange(
															index,
															'quantity',
															Number(e.target.value)
														)
													}
													placeholder='Quantity'
												/>
												<textarea
													className='shadow appearance-none border rounded w-full py-2 px-3 text-gray leading-tight focus:outline-none focus:shadow-outline mb-2'
													value={variant.note}
													onChange={e =>
														handleVariantChange(index, 'note', e.target.value)
													}
													placeholder='Product Note'
												/>
												<button
													type='button'
													className='bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded text-xs'
													onClick={() => handleRemoveVariant(index)}>
													Remove Variant
												</button>
											</div>
										))}
										<button
											type='button'
											className='bg-blue hover:bg-blue text-white font-bold py-1 px-2 rounded text-xs mr-2'
											onClick={handleAddVariant}>
											Add Another Variant
										</button>
										<button
											type='button'
											className='bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-2 rounded text-xs'
											onClick={handleAddSelectedProductToQuotation}>
											Add to Quotation
										</button>
									</div>
								)}

								{newQuotation.products?.map((product, index) => (
									<div key={index} className='mb-2 p-2 border rounded'>
										<div className='flex justify-between items-center mb-2'>
											<span className='font-bold'>
												{products.find(p => p.id === product.product_id)?.name}
											</span>
											<button
												type='button'
												className='bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded text-xs'
												onClick={() => {
													const updatedProducts = newQuotation.products?.filter(
														(_, i) => i !== index
													)
													const { totalPrice, vatAmount } = calculateTotalPrice(
														updatedProducts || [],
														newQuotation.include_vat || false
													)
													setNewQuotation({
														...newQuotation,
														products: updatedProducts,
														total_price: totalPrice,
														vat_amount: vatAmount
													})
												}}>
												Remove
											</button>
										</div>
										<p>
											Variant:{' '}
											{
												products
													.find(p => p.id === product.product_id)
													?.variants.find(
														v => v.id === product.product_variant_id
													)?.size
											}{' '}
											-{' '}
											{
												products
													.find(p => p.id === product.product_id)
													?.variants.find(
														v => v.id === product.product_variant_id
													)?.color
											}
										</p>
										<p>Quantity: {product.quantity}</p>
										<p>Note: {product.note}</p>
									</div>
								))}
							</div>
							<div className='mb-4'>
								<label
									className='block text-gray text-sm font-bold mb-2'
									htmlFor='note'>
									Note
								</label>
								<textarea
									id='note'
									className='shadow appearance-none border rounded w-full py-2 px-3 text-gray leading-tight focus:outline-none focus:shadow-outline'
									value={newQuotation.note}
									onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
										setNewQuotation({ ...newQuotation, note: e.target.value })
									}
								/>
							</div>
							<div className='mb-4'>
								<label className='flex items-center'>
									<input
										type='checkbox'
										checked={newQuotation.include_vat}
										onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
											const includeVAT = e.target.checked
											const { totalPrice, vatAmount } = calculateTotalPrice(
												newQuotation.products || [],
												includeVAT
											)
											setNewQuotation({
												...newQuotation,
												include_vat: includeVAT,
												vat_amount: vatAmount,
												total_price: totalPrice
											})
										}}
										className='form-checkbox h-5 w-5 text-blue'
									/>
									<span className='ml-2 text-gray'>Include 11% VAT</span>
								</label>
							</div>
							<div className='mb-4'>
								<label className='block text-gray text-sm font-bold mb-2'>
									Total Price (including VAT if applicable)
								</label>
								<input
									type='number'
									className='shadow appearance-none border rounded w-full py-2 px-3 text-gray leading-tight focus:outline-none focus:shadow-outline'
									value={newQuotation.total_price}
									readOnly
								/>
							</div>
							{newQuotation.include_vat && (
								<div className='mb-4'>
									<label className='block text-gray text-sm font-bold mb-2'>
										VAT Amount (11%)
									</label>
									<input
										type='number'
										className='shadow appearance-none border rounded w-full py-2 px-3 text-gray leading-tight focus:outline-none focus:shadow-outline'
										value={newQuotation.vat_amount}
										readOnly
									/>
								</div>
							)}
							{newQuotation.id && (
								<div className='mb-4'>
									<label className='block text-gray text-sm font-bold mb-2'>
										Status
									</label>
									<select
										className='shadow appearance-none border rounded w-full py-2 px-3 text-gray leading-tight focus:outline-none focus:shadow-outline'
										value={newQuotation.status}
										onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
											setNewQuotation({
												...newQuotation,
												status: e.target.value as
													| 'pending'
													| 'accepted'
													| 'rejected'
											})
										}>
										<option value='pending'>Pending</option>
										<option value='accepted'>Accepted</option>
										<option value='rejected'>Rejected</option>
									</select>
								</div>
							)}
						</form>
					</div>
					<div className='bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse'>
						<button
							type='button'
							className='w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue text-base font-medium text-white hover:bg-blue focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue sm:ml-3 sm:w-auto sm:text-sm'
							onClick={handleCreateQuotation}>
							{newQuotation.id ? 'Update Quotation' : 'Create Quotation'}
						</button>
						<button
							type='button'
							className='mt-3 w-full inline-flex justify-center rounded-md border border-gray shadow-sm px-4 py-2 bg-white text-base font-medium text-gray hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm'
							onClick={() => {
								setShowModal(false)
								setNewQuotation({
									created_at: new Date().toISOString(),
									total_price: 0,
									note: '',
									products: [],
									status: 'pending',
									include_vat: false,
									vat_amount: 0
								})
								setSelectedProduct(null)
								setSelectedVariants([])
							}}>
							Cancel
						</button>
					</div>
				</div>
			</div>
		</div>
	)

	const renderQuotationDetails = () => {
		if (!selectedQuotation) return null

		return (
			<div className='fixed inset-0 bg-gray bg-opacity-50 overflow-y-auto h-full w-full'>
				<div className='relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white'>
					<div className='mt-3 text-center'>
						<h3 className='text-lg leading-6 font-medium text-gray'>
							Quotation Details
						</h3>
						<div className='mt-2 px-7 py-3'>
							<p className='text-sm text-gray'>ID: {selectedQuotation.id}</p>
							<p className='text-sm text-gray'>
								Date:{' '}
								{new Date(selectedQuotation.created_at).toLocaleDateString()}
							</p>
							<p className='text-sm text-gray'>
								Total Price: ${selectedQuotation.total_price?.toFixed(2)}
							</p>
							{selectedQuotation.include_vat && (
								<p className='text-sm text-gray'>
									VAT Amount: ${selectedQuotation.vat_amount?.toFixed(2)}
								</p>
							)}
							<p className='text-sm text-gray'>
								Client:{' '}
								{
									clients.find(c => c.client_id === selectedQuotation.client_id)
										?.name
								}
							</p>
							<p className='text-sm text-gray'>
								Status: {selectedQuotation.status}
							</p>
							<p className='text-sm text-gray'>
								Note: {selectedQuotation.note}
							</p>
							<h4 className='text-sm font-medium text-gray mt-4'>Products:</h4>
							<ul className='list-disc list-inside'>
								{selectedQuotation.products.map((product, index) => {
									const variant = allProductVariants.find(
										v => v.id === product.product_variant_id
									)
									const productItem = products.find(
										p => p.id === variant?.product_id
									)
									return (
										<li key={index} className='text-sm text-gray'>
											{productItem?.name} - {variant?.size} - {variant?.color} -
											Quantity: {product.quantity}
											{product.note && (
												<div className='ml-4 text-xs italic'>
													Note: {product.note}
												</div>
											)}
										</li>
									)
								})}
							</ul>
						</div>
						<div className='items-center px-4 py-3'>
							<button
								className='px-4 py-2 bg-blue text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-blue focus:outline-none focus:ring-2 focus:ring-blue mb-2'
								onClick={() => generatePDF('quotation', selectedQuotation)}>
								Download PDF
							</button>
							<button
								className='px-4 py-2 bg-gray text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-gray focus:outline-none focus:ring-2 focus:ring-gray'
								onClick={() => setSelectedQuotation(null)}>
								Close
							</button>
						</div>
					</div>
				</div>
			</div>
		)
	}

	return (
		<div className='mx-auto px-4 py-8 text-gray'>
			<h1 className='text-3xl font-bold text-gray mb-6'>
				Quotation Management
			</h1>
			<div className='bg-white shadow-md rounded-lg'>
				<div className='p-6'>
					{renderFilters()}
					{renderQuotationTable()}
					{renderPagination()}
				</div>
			</div>
			<button
				className='mt-6 bg-blue hover:bg-blue text-white font-bold py-2 px-4 rounded-full shadow-lg transition duration-300 ease-in-out transform hover:-translate-y-1 hover:scale-110'
				onClick={() => {
					setNewQuotation({
						created_at: new Date().toISOString(),
						total_price: 0,
						note: '',
						products: [],
						status: 'pending',
						include_vat: false,
						vat_amount: 0
					})
					setShowModal(true)
				}}>
				<FaPlus className='inline-block mr-2' /> Create New Quotation
			</button>
			{renderQuotationModal()}
			{renderQuotationDetails()}
		</div>
	)
}

export default QuotationsPage
