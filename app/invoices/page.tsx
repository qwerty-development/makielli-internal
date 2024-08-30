'use client'

import React, { useState, useEffect, ChangeEvent } from 'react'
import { supabase } from '../../utils/supabase'
import { toast } from 'react-hot-toast'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { Client } from '../../utils/functions/clients'
import { Supplier } from '../../utils/functions/suppliers'
import { Product, ProductVariant } from '../../utils/functions/products'
import {
	FaSort,
	FaEdit,
	FaTrash,
	FaFilter,
	FaPlus,
	FaFile,
	FaDownload
} from 'react-icons/fa'

interface Invoice {
	id: number
	created_at: string
	total_price: number
	note: string
	client_id?: number
	supplier_id?: string
	products: { product_variant_id: string; quantity: number }[]
	files: string[]
	remaining_amount: number
}

const InvoicesPage: React.FC = () => {
	const [activeTab, setActiveTab] = useState<'client' | 'supplier'>('client')
	const [invoices, setInvoices] = useState<Invoice[]>([])
	const [clients, setClients] = useState<Client[]>([])
	const [suppliers, setSuppliers] = useState<Supplier[]>([])
	const [products, setProducts] = useState<Product[]>([])
	const [selectedProduct, setSelectedProduct] = useState<string | null>(null)
	const [showModal, setShowModal] = useState(false)
	const [currentPage, setCurrentPage] = useState(1)
	const [itemsPerPage] = useState(10)
	const [sortField, setSortField] = useState<keyof Invoice>('created_at')
	const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
	const [filterDate, setFilterDate] = useState<Date | null>(null)
	const [filterEntity, setFilterEntity] = useState<number | string | null>(null)
	const [totalInvoices, setTotalInvoices] = useState(0)
	const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
	const [allProductVariants, setAllProductVariants] = useState<
		ProductVariant[]
	>([])
	const [newInvoice, setNewInvoice] = useState<Partial<Invoice>>({
		created_at: new Date().toISOString(),
		total_price: 0,
		note: '',
		products: [],
		files: [],
		remaining_amount: 0
	})
	const [filterStartDate, setFilterStartDate] = useState<any>(null)
	const [filterEndDate, setFilterEndDate] = useState<any>(null)
	const [selectedFile, setSelectedFile] = useState<File | null>(null)
	const [uploadingFile, setUploadingFile] = useState(false)

	useEffect(() => {
		fetchInvoices()
		fetchClients()
		fetchSuppliers()
		fetchProducts()
	}, [activeTab, currentPage, sortField, sortOrder, filterDate, filterEntity])

	const fetchInvoices = async () => {
		const table = activeTab === 'client' ? 'ClientInvoices' : 'SupplierInvoices'
		let query = supabase.from(table).select('*', { count: 'exact' })

		if (filterStartDate) {
			query = query.gte('created_at', filterStartDate.toISOString())
		}
		if (filterEndDate) {
			query = query.lte('created_at', filterEndDate.toISOString())
		}

		if (filterEntity) {
			const idField = activeTab === 'client' ? 'client_id' : 'supplier_id'
			query = query.eq(idField, filterEntity)
		}

		query = query.order(sortField, { ascending: sortOrder === 'asc' })

		const { data, error, count } = await query.range(
			(currentPage - 1) * itemsPerPage,
			currentPage * itemsPerPage - 1
		)

		if (error) {
			toast.error(`Error fetching invoices: ${error.message}`)
		} else {
			setInvoices(data || [])
			setTotalInvoices(count || 0)
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

	const fetchSuppliers = async () => {
		const { data, error } = await supabase.from('Suppliers').select('*')
		if (error) {
			toast.error(`Error fetching suppliers: ${error.message}`)
		} else {
			setSuppliers(data || [])
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
		invoiceProducts: { product_variant_id: string; quantity: number }[]
	) => {
		return invoiceProducts.reduce((total, invoiceProduct) => {
			const variant = allProductVariants.find(
				v => v.id === invoiceProduct.product_variant_id
			)

			if (!variant) {
				console.error(
					`Variant not found for id: ${invoiceProduct.product_variant_id}`
				)
				return total
			}

			const parentProduct = products.find(p => p.id === variant.product_id)

			if (!parentProduct) {
				console.error(
					`Product not found for variant id: ${invoiceProduct.product_variant_id}`
				)
				return total
			}

			return total + parentProduct.price * invoiceProduct.quantity
		}, 0)
	}

	const handleCreateInvoice = async () => {
		const table = activeTab === 'client' ? 'ClientInvoices' : 'SupplierInvoices'
		const totalPrice = calculateTotalPrice(newInvoice.products || [])
		const invoiceData = { ...newInvoice, total_price: totalPrice }

		let result
		if (newInvoice.id) {
			// Fetch the old invoice data
			const { data: oldInvoice, error: fetchError } = await supabase
				.from(table)
				.select('*')
				.eq('id', newInvoice.id)
				.single()

			if (fetchError) {
				toast.error(`Error fetching old invoice: ${fetchError.message}`)
				return
			}

			// Update existing invoice
			result = await supabase
				.from(table)
				.update(invoiceData)
				.eq('id', newInvoice.id)

			// Update product quantities
			await updateProductQuantities(oldInvoice.products, true) // Increase old quantities
			await updateProductQuantities(newInvoice.products || []) // Decrease new quantities

			// Update entity balance
			await updateEntityBalance(totalPrice - oldInvoice.total_price)
		} else {
			// Create new invoice
			result = await supabase.from(table).insert(invoiceData).single()

			// Update product quantities
			await updateProductQuantities(newInvoice.products || [])

			// Update entity balance
			await updateEntityBalance(totalPrice)
		}

		const { data, error } = result

		if (error) {
			toast.error(
				`Error ${newInvoice.id ? 'updating' : 'creating'} invoice: ${
					error.message
				}`
			)
		} else {
			toast.success(
				`Invoice ${newInvoice.id ? 'updated' : 'created'} successfully`
			)
			setShowModal(false)
			fetchInvoices()
		}
	}

	const updateProductQuantities = async (
		products: { product_variant_id: string; quantity: number }[],
		isIncrease = false
	) => {
		for (const product of products) {
			const { error } = await supabase.rpc('update_product_variant_quantity', {
				variant_id: product.product_variant_id,
				quantity_change: isIncrease ? product.quantity : -product.quantity
			})

			if (error) {
				toast.error(`Error updating product quantity: ${error.message}`)
			}
		}
	}

	const updateEntityBalance = async (amount: number) => {
		const table = activeTab === 'client' ? 'Clients' : 'Suppliers'
		const idField = activeTab === 'client' ? 'client_id' : 'supplier_id'
		const id = newInvoice[idField as keyof typeof newInvoice]
		const field = activeTab === 'client' ? 'client_id' : 'id'

		const { data, error } = await supabase
			.from(table)
			.select('balance')
			.eq(field, id)
			.single()

		if (error) {
			toast.error(`Error fetching current balance: ${error.message}`)
			return
		}

		const currentBalance = data?.balance || 0
		const newBalance = currentBalance + amount

		const { error: updateError } = await supabase
			.from(table)
			.update({ balance: newBalance })
			.eq(field, id)

		if (updateError) {
			toast.error(`Error updating ${activeTab} balance: ${updateError.message}`)
		}
	}

	const handleDeleteInvoice = async (id: number) => {
		if (window.confirm('Are you sure you want to delete this invoice?')) {
			const table =
				activeTab === 'client' ? 'ClientInvoices' : 'SupplierInvoices'
			const { data: invoiceData, error: fetchError } = await supabase
				.from(table)
				.select('*')
				.eq('id', id)
				.single()

			if (fetchError) {
				toast.error(`Error fetching invoice: ${fetchError.message}`)
				return
			}

			// Delete associated files
			for (const fileUrl of invoiceData.files) {
				await handleFileDelete(fileUrl)
			}

			const { error: deleteError } = await supabase
				.from(table)
				.delete()
				.eq('id', id)

			if (deleteError) {
				toast.error(`Error deleting invoice: ${deleteError.message}`)
			} else {
				toast.success('Invoice deleted successfully')
				updateEntityBalance(-invoiceData.total_price)
				updateProductQuantities(invoiceData.products, true)
				fetchInvoices()
			}
		}
	}

	const handleSort = (field: keyof Invoice) => {
		if (field === sortField) {
			setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
		} else {
			setSortField(field)
			setSortOrder('asc')
		}
	}

	const handleEditInvoice = (invoice: Invoice) => {
		setNewInvoice(invoice)
		setShowModal(true)
	}

	const handleInvoiceClick = (invoice: Invoice) => {
		setSelectedInvoice(invoice)
	}

	const handleFilterDateChange = (date: Date | null) => {
		setFilterDate(date)
		setCurrentPage(1)
	}

	const handleFilterEntityChange = (id: number | string | null) => {
		setFilterEntity(id)
		setCurrentPage(1)
	}

	const handleAddProduct = () => {
		const updatedProducts = [
			...(newInvoice.products || []),
			{ product_variant_id: '', quantity: 0 }
		]
		const newTotalPrice = calculateTotalPrice(updatedProducts)
		setNewInvoice({
			...newInvoice,
			products: updatedProducts,
			total_price: newTotalPrice
		})
	}

	const handleProductChange = (index: number, productId: string) => {
		setSelectedProduct(productId)
		const updatedProducts = [...(newInvoice.products || [])]
		updatedProducts[index] = { product_variant_id: '', quantity: 0 }
		const newTotalPrice = calculateTotalPrice(updatedProducts)
		setNewInvoice({
			...newInvoice,
			products: updatedProducts,
			total_price: newTotalPrice
		})
	}

	const handleVariantChange = (index: number, variantId: string) => {
		const updatedProducts = [...(newInvoice.products || [])]
		updatedProducts[index] = {
			...updatedProducts[index],
			product_variant_id: variantId
		}
		const newTotalPrice = calculateTotalPrice(updatedProducts)
		setNewInvoice({
			...newInvoice,
			products: updatedProducts,
			total_price: newTotalPrice
		})
	}

	const handleQuantityChange = (index: number, quantity: number) => {
		const updatedProducts = [...(newInvoice.products || [])]
		updatedProducts[index] = { ...updatedProducts[index], quantity }
		const newTotalPrice = calculateTotalPrice(updatedProducts)
		setNewInvoice({
			...newInvoice,
			products: updatedProducts,
			total_price: newTotalPrice
		})
	}

	const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
		if (e.target.files && e.target.files.length > 0) {
			setSelectedFile(e.target.files[0])
		}
	}

	const handleFileUpload = async () => {
		if (!selectedFile) {
			toast.error('No file selected')
			return
		}

		setUploadingFile(true)

		try {
			const fileName = `${Date.now()}_${selectedFile.name}`
			const { data, error } = await supabase.storage
				.from('Files')
				.upload(fileName, selectedFile)

			if (error) {
				throw error
			}

			const { data: publicURLData } = supabase.storage
				.from('Files')
				.getPublicUrl(fileName)

			if (!publicURLData) {
				throw new Error('Error getting public URL: No data returned')
			}

			const updatedFiles = [
				...(newInvoice.files || []),
				publicURLData.publicUrl
			]
			setNewInvoice({ ...newInvoice, files: updatedFiles })
			toast.success('File uploaded successfully')
			setSelectedFile(null)
		} catch (error) {
			console.error('Error uploading file:', error)
			toast.error('Error uploading file. Please try again.')
		} finally {
			setUploadingFile(false)
		}
	}

	const handleFileDelete = async (fileUrl: string) => {
		try {
			const decodedUrl = decodeURIComponent(fileUrl)
			const fileName = decodedUrl.split('/').pop()

			if (!fileName) {
				throw new Error('Could not extract file name from URL')
			}

			const { error: deleteError } = await supabase.storage
				.from('Files')
				.remove([fileName])

			if (deleteError) {
				throw deleteError
			}

			const updatedFiles = newInvoice.files?.filter(file => file !== fileUrl)
			setNewInvoice({ ...newInvoice, files: updatedFiles })
			toast.success('File deleted successfully')
		} catch (error) {
			console.error('Error deleting file:', error)
			toast.error('Error deleting file. Please try again.')
		}
	}

	const renderInvoiceTable = () => (
		<div className='overflow-x-auto bg-white rounded-lg shadow'>
			<table className='w-full table-auto'>
				<thead>
					<tr className='bg-gray-200 text-gray-600 uppercase text-sm leading-normal'>
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
						<th className='py-3 px-6 text-left'>Note</th>
						<th className='py-3 px-6 text-center'>Files</th>
						<th className='py-3 px-6 text-center'>Actions</th>
					</tr>
				</thead>
				<tbody className='text-gray-600 text-sm font-light'>
					{invoices.map(invoice => (
						<tr
							key={invoice.id}
							className='border-b border-gray-200 hover:bg-gray-100 cursor-pointer'
							onClick={() => handleInvoiceClick(invoice)}>
							<td className='py-3 px-6 text-left whitespace-nowrap'>
								{invoice.id}
							</td>
							<td className='py-3 px-6 text-left'>
								{new Date(invoice.created_at).toLocaleDateString()}
							</td>
							<td className='py-3 px-6 text-left'>
								${invoice.total_price?.toFixed(2)}
							</td>
							<td className='py-3 px-6 text-left'>{invoice.note}</td>
							<td className='py-3 px-6 text-center'>
								{invoice.files.length > 0 ? (
									<FaFile className='inline text-blue-500' />
								) : (
									'-'
								)}
							</td>
							<td className='py-3 px-6 text-center'>
								<div className='flex item-center justify-center'>
									<button
										className='w-4 mr-2 transform text-blue hover:text-purple-500 hover:scale-110'
										onClick={e => {
											e.stopPropagation()
											handleEditInvoice(invoice)
										}}>
										<FaEdit />
									</button>
									<button
										className='w-4 mr-2 transform text-blue hover:text-red-500 hover:scale-110'
										onClick={e => {
											e.stopPropagation()
											handleDeleteInvoice(invoice.id)
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
		const totalPages = Math.ceil(totalInvoices / itemsPerPage)
		return (
			<div className='flex justify-center mt-4'>
				<nav
					className='relative z-0 inline-flex rounded-md shadow-sm -space-x-px'
					aria-label='Pagination'>
					<button
						onClick={() => setCurrentPage(1)}
						disabled={currentPage === 1}
						className={`relative inline-flex items-center text-blue px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 ${
							currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''
						}`}>
						<span className='sr-only'>First</span>⟪
					</button>
					<button
						onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
						disabled={currentPage === 1}
						className={`relative inline-flex text-blue items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 ${
							currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''
						}`}>
						<span className='sr-only'>Previous</span>⟨
					</button>
					<span className='relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700'>
						{currentPage} of {totalPages === 0 ? 1 : totalPages}
					</span>
					<button
						onClick={() =>
							setCurrentPage(Math.min(totalPages, currentPage + 1))
						}
						disabled={currentPage === totalPages}
						className={`relative inline-flex items-center text-blue px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 ${
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
					className='block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm'
				/>
				<div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
					<FaFilter className='h-5 w-5 text-gray-400' />
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
					className='block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm'
				/>
				<div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
					<FaFilter className='h-5 w-5 text-gray-400' />
				</div>
			</div>
			<select
				onChange={e =>
					handleFilterEntityChange(
						e.target.value ? Number(e.target.value) : null
					)
				}
				className='block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md'>
				<option value=''>
					All {activeTab === 'client' ? 'Clients' : 'Suppliers'}
				</option>
				{activeTab === 'client'
					? clients.map(client => (
							<option
								key={client.client_id}
								value={client.client_id.toString()}>
								{client.name}
							</option>
					  ))
					: suppliers.map(supplier => (
							<option key={supplier.id} value={supplier.id}>
								{supplier.name}
							</option>
					  ))}
			</select>
		</div>
	)

	const renderInvoiceModal = () => (
		<div
			className={`fixed z-10 inset-0 overflow-y-auto ${
				showModal ? '' : 'hidden'
			}`}>
			<div className='flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0'>
				<div className='fixed inset-0 transition-opacity' aria-hidden='true'>
					<div className='absolute inset-0 bg-gray-500 opacity-75'></div>
				</div>
				<span
					className='hidden sm:inline-block sm:align-middle sm:h-screen'
					aria-hidden='true'>
					&#8203;
				</span>
				<div className='inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full'>
					<div className='bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4'>
						<h3 className='text-lg leading-6 font-medium text-gray-900 mb-4'>
							{newInvoice.id ? 'Edit Invoice' : 'Create New Invoice'}
						</h3>
						<form>
							<div className='mb-4'>
								<label
									className='block text-gray-700 text-sm font-bold mb-2'
									htmlFor='date'>
									Date
								</label>
								<DatePicker
									selected={
										newInvoice.created_at
											? new Date(newInvoice.created_at)
											: null
									}
									onChange={(date: Date | null) =>
										setNewInvoice({
											...newInvoice,
											created_at: date ? date.toISOString() : ''
										})
									}
									className='shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline'
								/>
							</div>
							<div className='mb-4'>
								<label
									className='block text-gray-700 text-sm font-bold mb-2'
									htmlFor='entity'>
									{activeTab === 'client' ? 'Client' : 'Supplier'}
								</label>
								<select
									id='entity'
									className='shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline'
									onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
										const idField =
											activeTab === 'client' ? 'client_id' : 'supplier_id'
										setNewInvoice({ ...newInvoice, [idField]: e.target.value })
									}}>
									<option>
										Select {activeTab === 'client' ? 'Client' : 'Supplier'}
									</option>
									{activeTab === 'client'
										? clients.map(client => (
												<option key={client.client_id} value={client.client_id}>
													{client.name}
												</option>
										  ))
										: suppliers.map(supplier => (
												<option key={supplier.id} value={supplier.id}>
													{supplier.name}
												</option>
										  ))}
								</select>
							</div>
							<div className='mb-4'>
								<label className='block text-gray-700 text-sm font-bold mb-2'>
									Products
								</label>
								{newInvoice.products?.map((product, index) => (
									<div key={index} className='mb-2 p-2 border rounded'>
										<select
											className='shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline mb-2'
											value={selectedProduct || ''}
											onChange={e =>
												handleProductChange(index, e.target.value)
											}>
											<option value=''>Select Product</option>
											{products.map(product => (
												<option key={product.id} value={product.id}>
													{product.name}
												</option>
											))}
										</select>
										{selectedProduct && (
											<select
												className='shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline mb-2'
												value={product.product_variant_id}
												onChange={e =>
													handleVariantChange(index, e.target.value)
												}>
												<option value=''>Select Variant</option>
												{products
													.find(p => p.id === selectedProduct)
													?.variants.map(variant => (
														<option key={variant.id} value={variant.id}>
															{variant.size} - {variant.color}
														</option>
													))}
											</select>
										)}
										<input
											type='number'
											className='shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline mb-2'
											value={product.quantity}
											onChange={e =>
												handleQuantityChange(index, Number(e.target.value))
											}
											placeholder='Quantity'
										/>
										<button
											type='button'
											className='bg-red-500 hover:bg-red-700 text-blue  font-bold py-1 px-2 rounded text-xs'
											onClick={() => {
												const updatedProducts = newInvoice.products?.filter(
													(_, i) => i !== index
												)
												const newTotalPrice = calculateTotalPrice(
													updatedProducts || []
												)
												setNewInvoice({
													...newInvoice,
													products: updatedProducts,
													total_price: newTotalPrice
												})
											}}>
											Remove
										</button>
									</div>
								))}
								<button
									type='button'
									className='bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded'
									onClick={handleAddProduct}>
									Add Product
								</button>
							</div>
							<div className='mb-4'>
								<label
									className='block text-gray-700 text-sm font-bold mb-2'
									htmlFor='note'>
									Note
								</label>
								<textarea
									id='note'
									className='shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline'
									value={newInvoice.note}
									onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
										setNewInvoice({ ...newInvoice, note: e.target.value })
									}
								/>
							</div>
							<div className='mb-4'>
								<label className='block text-gray-700 text-sm font-bold mb-2'>
									Total Price
								</label>
								<input
									type='number'
									className='shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline'
									value={newInvoice.total_price}
									readOnly
								/>
							</div>
							<div className='mb-4'>
								<label className='block text-gray-700 text-sm font-bold mb-2'>
									Files
								</label>
								<input
									type='file'
									onChange={handleFileChange}
									className='shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline'
								/>
								{selectedFile && (
									<button
										type='button'
										onClick={handleFileUpload}
										disabled={uploadingFile}
										className='mt-2 bg-blue-500 hover:bg-blue-700 text-blue  font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline'>
										{uploadingFile ? 'Uploading...' : 'Upload File'}
									</button>
								)}
								{newInvoice.files?.map((file, index) => (
									<div key={index} className='flex items-center mt-2'>
										<a
											href={file}
											target='_blank'
											rel='noopener noreferrer'
											className='text-blue-500 hover:underline mr-2'>
											{file.split('/').pop()}
										</a>
										<button
											type='button'
											onClick={() => handleFileDelete(file)}
											className='text-red-500 hover:text-red-700'>
											<FaTrash />
										</button>
									</div>
								))}
							</div>
						</form>
					</div>
					<div className='bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse'>
						<button
							type='button'
							className='w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-blue hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm'
							onClick={handleCreateInvoice}>
							{newInvoice.id ? 'Update Invoice' : 'Create Invoice'}
						</button>
						<button
							type='button'
							className='mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-blue text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm'
							onClick={() => {
								setShowModal(false)
								setNewInvoice({
									created_at: new Date().toISOString(),
									total_price: 0,
									note: '',
									products: [],
									files: [],
									remaining_amount: 0
								})
							}}>
							Cancel
						</button>
					</div>
				</div>
			</div>
		</div>
	)

	const renderInvoiceDetails = () => {
		if (!selectedInvoice) return null

		return (
			<div className='fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full'>
				<div className='relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white'>
					<div className='mt-3 text-center'>
						<h3 className='text-lg leading-6 font-medium text-gray-900'>
							Invoice Details
						</h3>
						<div className='mt-2 px-7 py-3'>
							<p className='text-sm text-gray-500'>ID: {selectedInvoice.id}</p>
							<p className='text-sm text-gray-500'>
								Date:{' '}
								{new Date(selectedInvoice.created_at).toLocaleDateString()}
							</p>
							<p className='text-sm text-gray-500'>
								Total Price: ${selectedInvoice.total_price?.toFixed(2)}
							</p>
							<p className='text-sm text-gray-500'>
								Note: {selectedInvoice.note}
							</p>
							<h4 className='text-sm font-medium text-gray-900 mt-4'>
								Products:
							</h4>
							<ul className='list-disc list-inside'>
								{selectedInvoice.products.map((product, index) => (
									<li key={index} className='text-sm text-gray-500'>
										{product.product_variant_id} - Quantity: {product.quantity}
									</li>
								))}
							</ul>
							<h4 className='text-sm font-medium text-gray-900 mt-4'>Files:</h4>
							<ul className='list-disc list-inside'>
								{selectedInvoice.files.map((file, index) => (
									<li key={index} className='text-sm text-gray-500'>
										<a
											href={file}
											target='_blank'
											rel='noopener noreferrer'
											className='text-blue-500 hover:underline'>
											{file.split('/').pop()}
										</a>
									</li>
								))}
							</ul>
						</div>
						<div className='items-center px-4 py-3'>
							<button
								id='ok-btn'
								className='px-4 py-2 text-blue bg-blue-500  text-base font-medium rounded-md w-full shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300'
								onClick={() => setSelectedInvoice(null)}>
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
			<h1 className='text-3xl font-bold text-gray-800 mb-6'>
				Invoice Management
			</h1>
			<div className='bg-white shadow-md rounded-lg'>
				<div className='flex border-b'>
					<button
						className={`flex-1 py-4 px-6 text-center ${
							activeTab === 'client'
								? 'bg-blue text-white'
								: 'bg-gray text-white'
						}`}
						onClick={() => setActiveTab('client')}>
						Client Invoices
					</button>
					<button
						className={`flex-1 py-4 px-6 text-center ${
							activeTab === 'supplier'
								? 'bg-blue text-white'
								: 'bg-gray text-white'
						}`}
						onClick={() => setActiveTab('supplier')}>
						Supplier Invoices
					</button>
				</div>
				<div className='p-6'>
					{renderFilters()}
					{renderInvoiceTable()}
					{renderPagination()}
				</div>
			</div>
			<button
				className='mt-6 bg-blue-500 hover:bg-blue-600  text-blue font-bold py-2 px-4 rounded-full shadow-lg transition duration-300 ease-in-out transform hover:-translate-y-1 hover:scale-110'
				onClick={() => {
					setNewInvoice({
						created_at: new Date().toISOString(),
						total_price: 0,
						note: '',
						products: [],
						files: [],
						remaining_amount: 0
					})
					setShowModal(true)
				}}>
				<FaPlus className='inline-block mr-2' /> Create New Invoice
			</button>
			{renderInvoiceModal()}
			{renderInvoiceDetails()}
		</div>
	)
}

export default InvoicesPage
