'use client'

import React, {
	useState,
	useEffect,
	ChangeEvent,
	useRef,
	useCallback
} from 'react'
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
	FaDownload,
	FaInfoCircle,
	FaSearch,
	FaSpinner
} from 'react-icons/fa'
import { generatePDF } from '@/utils/pdfGenerator'
import { debounce } from 'lodash'
import { format } from 'date-fns'

interface LoadingStates {
	isMainLoading: boolean
	isPDFGenerating: boolean
	isEmailSending: boolean
	isInvoiceCreating: boolean
	isInvoiceUpdating: boolean
	isInvoiceDeleting: boolean
	isFileUploading: boolean
}

interface InvoiceProduct {
	product_id: string
	product_variant_id: string
	quantity: number
	note: string
}

interface Invoice {
	id: number
	created_at: string
	total_price: number
	client_id?: number
	order_number: string
	supplier_id?: string
	products: InvoiceProduct[]
	files: string[]
	remaining_amount: number
	include_vat: boolean
	vat_amount: number
	discounts?: { [productId: string]: number }
	type: 'regular' | 'return'
	currency: 'usd' | 'euro'
	payment_term:
		| '30% deposit 70% before shipping'
		| '30 days after shipping'
		| '60 days after shipping'
		| '100% after delivery'
	delivery_date: string
	payment_info: PaymentInfoOption
}
type PaymentInfoOption = 'frisson_llc' | 'frisson_sarl_chf' | 'frisson_sarl_usd'

const PAYMENT_INFO_CONFIG = {
	frisson_llc: {
		label: 'Frisson International LLC - USD',
		details: {
			bank: 'Interaudi Bank',
			bankAddress:
				'19 East 54th Street\nNew York, NY 10022\nUnited States of America',
			aba: '026006237',
			swift: 'AUSAUS33',
			accountName: 'Frisson International LLC',
			accountNumber: '684631',
			routingNumber: '026006237'
		}
	},
	frisson_sarl_chf: {
		label: 'Frisson Sarl - CHF',
		details: {
			intermediaryBank: 'Deutsche Bank (Frankfurt)',
			intermediarySwift: 'DEUTDEFF',
			iban: 'CH24 0483 5092 7957 0300 0',
			ibanDetails: '(Deutsche Bank at Credit Suisse)',
			beneficiaryBank: 'Interaudi Bank (New York)',
			beneficiaryAccount: '958400400CHF',
			beneficiaryAccountDetails: '(Interaudi Bank at Deutsche Bank)',
			beneficiary: 'Frisson Sarl',
			accountNumber: '749361-401-003',
			routingNumber: '026006237',
			baseAccountNumber: '749361'
		}
	},
	frisson_sarl_usd: {
		label: 'Frisson Sarl - USD',
		details: {
			bank: 'Interaudi Bank',
			bankAddress:
				'19 East 54th Street\nNew York, NY 10022\nUnited States of America',
			aba: '026006237',
			swift: 'AUSAUS33',
			accountName: 'Frisson Sarl',
			accountNumber: '749361-401-01',
			routingNumber: '026006237',
			baseAccountNumber: '749361'
		}
	}
}

const PaymentInfoDisplay: React.FC<{ option: PaymentInfoOption }> = ({ option }) => {
	const config = PAYMENT_INFO_CONFIG[option]
	const details: any = config.details

	if (option === 'frisson_sarl_chf') {
		return (
			<div className='mt-4 text-sm'>
				<p>
					<strong>Intermediary Bank:</strong> {details.intermediaryBank || 'N/A'}
				</p>
				<p>
					<strong>Intermediary SWIFT:</strong> {details.intermediarySwift || 'N/A'}
				</p>
				<p>
					<strong>IBAN:</strong> {details.iban || 'N/A'} {details.ibanDetails || ''}
				</p>
				<p>
					<strong>Beneficiary Bank:</strong> {details.beneficiaryBank || 'N/A'}
				</p>
				<p>
					<strong>Beneficiary Account:</strong> {details.beneficiaryAccount || 'N/A'}{' '}
					{details.beneficiaryAccountDetails || ''}
				</p>
				<p>
					<strong>Beneficiary:</strong> {details.beneficiary || 'N/A'}
				</p>
				<p>
					<strong>Account Number:</strong> {details.accountNumber || 'N/A'}
				</p>
				<p>
					<strong>Routing Number:</strong> {details.routingNumber || 'N/A'}
				</p>
			</div>
		)
	}

	return (
		<div className='mt-4 text-sm'>
			<p>
				<strong>Bank:</strong> {details.bank || 'N/A'}
			</p>
			<p>
				<strong>Bank Address:</strong>{' '}
				{details.bankAddress
					? details.bankAddress.split('\n').map((line: string | number | bigint | boolean | React.ReactElement<any, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | Promise<React.AwaitedReactNode> | null | undefined, i: React.Key | null | undefined) => (
							<React.Fragment key={i}>
								{line}
								<br />
							</React.Fragment>
					  ))
					: 'N/A'}
			</p>
			<p>
				<strong>ABA:</strong> {details.aba || 'N/A'}
			</p>
			<p>
				<strong>SWIFT:</strong> {details.swift || 'N/A'}
			</p>
			<p>
				<strong>Account Name:</strong> {details.accountName || 'N/A'}
			</p>
			<p>
				<strong>Account Number:</strong> {details.accountNumber || 'N/A'}
			</p>
			<p>
				<strong>Routing Number:</strong> {details.routingNumber || 'N/A'}
			</p>
		</div>
	)
}

const InvoicesPage: React.FC = () => {
	const [activeTab, setActiveTab] = useState<'client' | 'supplier'>('client')
	const [invoices, setInvoices] = useState<Invoice[]>([])
	const [clients, setClients] = useState<Client[]>([])
	const [suppliers, setSuppliers] = useState<Supplier[]>([])
	const [products, setProducts] = useState<Product[]>([])
	const [showModal, setShowModal] = useState(false)
	const [currentPage, setCurrentPage] = useState(1)
	const [itemsPerPage] = useState(10)
	const [sortField, setSortField] = useState<keyof Invoice>('created_at')
	const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
	const [filterStartDate, setFilterStartDate] = useState<any>(null)
	const [filterEndDate, setFilterEndDate] = useState<any>(null)
	const [filterEntity, setFilterEntity] = useState<number | string | null>(null)
	const [totalInvoices, setTotalInvoices] = useState(0)

	const formRef = useRef<HTMLFormElement>(null)
	const scrollPositionRef = useRef(0)
	const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
	const [loadingStates, setLoadingStates] = useState<LoadingStates>({
		isMainLoading: true,
		isPDFGenerating: false,
		isEmailSending: false,
		isInvoiceCreating: false,
		isInvoiceUpdating: false,
		isInvoiceDeleting: false,
		isFileUploading: false
	})

	const [editingProductIndex, setEditingProductIndex] = useState<number | null>(null)
	const [newInvoice, setNewInvoice] = useState<Partial<Invoice>>({
		created_at: new Date().toISOString(),
		total_price: 0,
		order_number: '',
		products: [],
		files: [],
		remaining_amount: 0,
		include_vat: false,
		vat_amount: 0,
		discounts: {},
		type: 'regular',
		currency: 'usd',
		payment_term: '30% deposit 70% before shipping',
		delivery_date: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString(),
		payment_info: 'frisson_llc'
	})
	const [selectedFile, setSelectedFile] = useState<File | null>(null)
	const [uploadingFile, setUploadingFile] = useState(false)
	const [productSearch, setProductSearch] = useState('')
	const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
	const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
	const [selectedVariants, setSelectedVariants] = useState<InvoiceProduct[]>([])
	const [originalInvoiceData, setOriginalInvoiceData] = useState<Invoice | null>(null)

	const saveScrollPosition = () => {
		if (formRef.current) {
			scrollPositionRef.current = formRef.current.scrollTop
		}
	}

	const restoreScrollPosition = useCallback(() => {
		if (formRef.current && scrollPositionRef.current > 0) {
			formRef.current.scrollTop = scrollPositionRef.current
		}
	}, [])

	useEffect(() => {
		restoreScrollPosition()
	}, [restoreScrollPosition, newInvoice])

	useEffect(() => {
		fetchInvoices()
		fetchClients()
		fetchSuppliers()
		fetchProducts()
	}, [
		activeTab,
		currentPage,
		sortField,
		sortOrder,
		filterStartDate,
		filterEndDate,
		filterEntity
	])

	useEffect(() => {
		if (showModal) {
			document.body.style.overflow = 'hidden'
		} else {
			document.body.style.overflow = 'unset'
		}
		return () => {
			document.body.style.overflow = 'unset'
		}
	}, [showModal])

	useEffect(() => {
		const filtered = products.filter(product =>
			product.name.toLowerCase().includes(productSearch.toLowerCase())
		)
		setFilteredProducts(filtered)
	}, [productSearch, products])

	const handleError = (error: any, context: string) => {
		console.error(`Error in ${context}:`, error)
		const errorMessage = error?.message || `Failed to ${context.toLowerCase()}`
		toast.error(errorMessage)
	}

	// Loading state helper
	const updateLoadingState = (key: keyof LoadingStates, value: boolean) => {
		setLoadingStates(prev => ({ ...prev, [key]: value }))
	}

	const handlePDFGeneration = async (invoice: Invoice) => {
		updateLoadingState('isPDFGenerating', true)
		try {
			await generatePDF('invoice', {
				...invoice,
				logoBase64: null
			})
			toast.success('PDF generated successfully')
		} catch (error) {
			handleError(error, 'generate PDF')
		} finally {
			updateLoadingState('isPDFGenerating', false)
		}
	}

	const handleProductSearch = debounce((searchTerm: string) => {
		setProductSearch(searchTerm)
	}, 300)

	const getEntityId = (invoice: Partial<Invoice>) => {
		const idField = activeTab === 'client' ? 'client_id' : 'supplier_id'
		const id = invoice[idField as keyof typeof invoice]

		if (!id) {
			throw new Error(
				`${activeTab === 'client' ? 'Client' : 'Supplier'} ID is required`
			)
		}

		return id
	}

	const fetchInvoices = async () => {
		updateLoadingState('isMainLoading', true)
		const table = activeTab === 'client' ? 'ClientInvoices' : 'SupplierInvoices'
		try {
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
			setInvoices(data || [])
			setTotalInvoices(count || 0)
		} catch (error) {
			handleError(error, 'fetch invoices')
		} finally {
			updateLoadingState('isMainLoading', false)
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
		}
	}

	const calculateTotalPrice = (
		invoiceProducts: InvoiceProduct[],
		discounts: { [productId: string]: number },
		isClientInvoice: boolean,
		includeVAT: boolean
	) => {
		const subtotal = invoiceProducts.reduce((total, invoiceProduct) => {
			const product = products.find(p => p.id === invoiceProduct.product_id)
			if (!product) {
				console.warn(`Product not found: ${invoiceProduct.product_id}`)
				return total
			}

			const unitPrice = isClientInvoice ? product.price : product.cost
			const discount = discounts[invoiceProduct.product_id] || 0
			const discountedPrice = Math.max(0, unitPrice - discount) // Prevent negative prices
			return total + discountedPrice * invoiceProduct.quantity
		}, 0)

		const vatAmount = includeVAT ? subtotal * 0.11 : 0
		const totalPrice = subtotal + vatAmount

		return { subtotal, vatAmount, totalPrice }
	}

	const handleCreateInvoice = async () => {
		const isUpdate = Boolean(newInvoice.id)
		updateLoadingState(
			isUpdate ? 'isInvoiceUpdating' : 'isInvoiceCreating',
			true
		)

		const table = activeTab === 'client' ? 'ClientInvoices' : 'SupplierInvoices'
		const isClientInvoice = activeTab === 'client'

		try {
			// Validate entity ID
			const entityId: any = getEntityId(newInvoice)

			// Ensure all products have valid variant IDs
			if (newInvoice.products?.some(p => !p.product_variant_id)) {
				toast.error("All products must have a valid variant selected.")
				return
			}

			// If delivery_date is missing, default to one month from now
			if (!newInvoice.delivery_date) {
				setNewInvoice(prev => ({
					...prev,
					delivery_date: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString()
				}))
			}

			// Validate payment_info field
			if (!newInvoice.payment_info) {
				setNewInvoice(prev => ({
					...prev,
					payment_info: 'frisson_llc'
				}))
			}

			const { subtotal, vatAmount, totalPrice } = calculateTotalPrice(
				newInvoice.products || [],
				newInvoice.discounts || {},
				isClientInvoice,
				newInvoice.include_vat || false
			)

			const finalTotalPrice =
				newInvoice.type === 'return'
					? -Math.abs(totalPrice)
					: Math.abs(totalPrice)
			const finalVatAmount =
				newInvoice.type === 'return'
					? -Math.abs(vatAmount)
					: Math.abs(vatAmount)

			const invoiceData = {
				...newInvoice,
				total_price: finalTotalPrice,
				remaining_amount: finalTotalPrice,
				vat_amount: finalVatAmount,
				[isClientInvoice ? 'client_id' : 'supplier_id']: entityId,
				currency: newInvoice.currency || 'usd',
				payment_term: newInvoice.payment_term,
				delivery_date: newInvoice.delivery_date,
				payment_info: newInvoice.payment_info || 'frisson_llc'
			}

			if (newInvoice.id && originalInvoiceData) {
				// Update existing invoice
				const { error: updateError } = await supabase
					.from(table)
					.update(invoiceData)
					.eq('id', newInvoice.id)

				if (updateError) throw updateError

				// Update quantities and balance
				await updateProductQuantities(
					originalInvoiceData.products,
					isClientInvoice,
					originalInvoiceData.type === 'return',
					true
				)
				await updateProductQuantities(
					newInvoice.products || [],
					isClientInvoice,
					newInvoice.type === 'return',
					false
				)

				const oldAmount = originalInvoiceData.total_price || 0
				const balanceChange = finalTotalPrice - oldAmount
				await updateEntityBalance(balanceChange, entityId)

				toast.success('Invoice updated successfully')
				setShowModal(false)
				resetInvoiceState()
				window.location.reload()
				return
			}
			const { error: createError } = await supabase
				.from(table)
				.insert(invoiceData)
				.single()

			if (createError) throw createError

			await updateProductQuantities(
				newInvoice.products || [],
				isClientInvoice,
				newInvoice.type === 'return',
				false
			)
			await updateEntityBalance(finalTotalPrice, entityId)

			toast.success(`Invoice ${isUpdate ? 'updated' : 'created'} successfully`)
			setShowModal(false)
			resetInvoiceState()
			if (isUpdate) {
				window.location.reload()
			} else {
				fetchInvoices()
			}
		} catch (error) {
			handleError(error, isUpdate ? 'update invoice' : 'create invoice')
		} finally {
			updateLoadingState(
				isUpdate ? 'isInvoiceUpdating' : 'isInvoiceCreating',
				false
			)
		}
	}

	const updateProductQuantities = async (
		products: InvoiceProduct[],
		isClientInvoice: boolean,
		isReturn: boolean,
		isReversal: boolean = false
	) => {
		for (const product of products) {
			try {
				let quantityChange = isClientInvoice
					? -product.quantity
					: product.quantity

				if (isReturn) {
					quantityChange = -quantityChange
				}

				if (isReversal) {
					quantityChange = -quantityChange
				}

				const { error } = await supabase.rpc('update_product_variant_quantity', {
					variant_id: product.product_variant_id,
					quantity_change: quantityChange
				})

				if (error) throw error
			} catch (error: any) {
				throw new Error(
					`Error updating quantity for product ${product.product_id}: ${error.message}`
				)
			}
		}
	}

	const updateEntityBalance = async (
		amount: number,
		forcedEntityId?: number | string
	) => {
		try {
			const table = activeTab === 'client' ? 'Clients' : 'Suppliers'
			const field = activeTab === 'client' ? 'client_id' : 'id'
			const id = forcedEntityId || getEntityId(newInvoice)

			if (!id) {
				throw new Error('No valid entity ID found')
			}

			const { data, error } = await supabase
				.from(table)
				.select('balance')
				.eq(field, id)
				.single()

			if (error) {
				throw new Error(`Error fetching current balance: ${error.message}`)
			}

			const currentBalance = data?.balance || 0
			const newBalance = currentBalance + amount

			const { error: updateError } = await supabase
				.from(table)
				.update({ balance: newBalance })
				.eq(field, id)

			if (updateError) {
				throw new Error(`Error updating balance: ${updateError.message}`)
			}
		} catch (error: any) {
			console.error('Balance update error:', error)
			toast.error(error.message || 'Error updating balance')
			throw error
		}
	}

	const handleDeleteInvoice = async (id: number) => {
		if (!window.confirm('Are you sure you want to delete this invoice?')) {
			return
		}

		updateLoadingState('isInvoiceDeleting', true)

		const table = activeTab === 'client' ? 'ClientInvoices' : 'SupplierInvoices'
		const isClientInvoice = activeTab === 'client'

		try {
			const { data: invoiceData, error: fetchError } = await supabase
				.from(table)
				.select('*')
				.eq('id', id)
				.single()

			if (fetchError)
				throw new Error(`Error fetching invoice: ${fetchError.message}`)

			const entityId = isClientInvoice
				? invoiceData.client_id
				: invoiceData.supplier_id
			if (!entityId) {
				throw new Error(`${isClientInvoice ? 'Client' : 'Supplier'} ID not found in invoice`)
			}

			await Promise.all(
				(invoiceData.files || []).map((fileUrl: string) => handleFileDelete(fileUrl))
			)

			const isReturn = invoiceData.type === 'return'
			const quantityMultiplier = isReturn ? -1 : 1
			await Promise.all(
				(invoiceData.products || []).map(
					(product: { product_variant_id: any; quantity: number }) =>
						supabase.rpc('update_product_variant_quantity', {
							variant_id: product.product_variant_id,
							quantity_change: quantityMultiplier * product.quantity
						})
				)
			)

			const { error: deleteError } = await supabase
				.from(table)
				.delete()
				.eq('id', id)

			if (deleteError) throw deleteError

			const balanceChange = -invoiceData.total_price
			await updateEntityBalance(balanceChange, entityId)

			toast.success('Invoice deleted successfully')
			await fetchInvoices()
		} catch (error) {
			handleError(error, 'delete invoice')
		} finally {
			updateLoadingState('isInvoiceDeleting', false)
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

	const handleEditInvoice = async (invoice: Invoice) => {
		try {
			const isClientInvoice = activeTab === 'client'
			const entityId = isClientInvoice ? invoice.client_id : invoice.supplier_id

			if (!entityId) {
				throw new Error(`${isClientInvoice ? 'Client' : 'Supplier'} ID not found in invoice`)
			}

			const table = activeTab === 'client' ? 'ClientInvoices' : 'SupplierInvoices'
			const { data: currentInvoice, error: fetchError } = await supabase
				.from(table)
				.select('*')
				.eq('id', invoice.id)
				.single()

			if (fetchError)
				throw new Error(`Error fetching invoice: ${fetchError.message}`)

			setOriginalInvoiceData({
				...currentInvoice,
				products: [...(currentInvoice.products || [])],
				discounts: { ...(currentInvoice.discounts || {}) },
				type: currentInvoice.type,
				payment_info: currentInvoice.payment_info || 'frisson_llc'
			})

			const updatedInvoice = {
				...currentInvoice,
				products: [...(currentInvoice.products || [])],
				discounts: { ...(currentInvoice.discounts || {}) },
				type: currentInvoice.type || 'regular',
				created_at: currentInvoice.created_at,
				total_price: currentInvoice.total_price,
				order_number: currentInvoice.order_number,
				files: currentInvoice.files || [],
				remaining_amount: currentInvoice.remaining_amount,
				include_vat: currentInvoice.include_vat || false,
				vat_amount: currentInvoice.vat_amount || 0,
				currency: currentInvoice.currency || 'usd',
				payment_term: currentInvoice.payment_term || '',
				delivery_date:
					currentInvoice.delivery_date ||
					new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString(),
				payment_info: currentInvoice.payment_info || 'frisson_llc',
				client_id: isClientInvoice ? entityId : undefined,
				supplier_id: !isClientInvoice ? entityId : undefined
			}

			setNewInvoice(updatedInvoice)
			setShowModal(true)
		} catch (error: any) {
			console.error('Edit error:', error)
			toast.error(error.message || 'Error preparing invoice for edit')
			resetInvoiceState()
		}
	}

	const handleInvoiceClick = (invoice: Invoice) => {
		setSelectedInvoice(invoice)
	}

	const handleFilterEntityChange = (id: number | string | null) => {
		setFilterEntity(id)
		setCurrentPage(1)
	}

	const handleAddProduct = (product: Product) => {
		if (!product.variants || product.variants.length === 0) {
			toast.error("This product has no available variants.")
			return
		}
		setSelectedProduct(product)
		setSelectedVariants([
			{
				product_id: product.id,
				product_variant_id: product.variants[0].id,
				quantity: 1,
				note: ''
			}
		])
		if (!newInvoice.discounts?.[product.id]) {
			setNewInvoice(prev => ({
				...prev,
				discounts: { ...prev.discounts, [product.id]: 0 }
			}))
		}
	}

	const handleAddVariant = () => {
		if (selectedProduct) {
			if (!selectedProduct.variants || selectedProduct.variants.length === 0) {
				toast.error("This product has no available variants.")
				return
			}
			setSelectedVariants([
				...selectedVariants,
				{
					product_id: selectedProduct.id,
					product_variant_id: selectedProduct.variants[0].id,
					quantity: 1,
					note: ''
				}
			])
		}
	}

	const handleRemoveVariant = (index: number) => {
		const updatedVariants = selectedVariants.filter((_, i) => i !== index)
		setSelectedVariants(updatedVariants)
	}

	const handleVariantChange = (
		index: number,
		field: keyof InvoiceProduct,
		value: string | number
	) => {
		const updatedVariants = [...selectedVariants]
		updatedVariants[index] = { ...updatedVariants[index], [field]: value }
		setSelectedVariants(updatedVariants)
	}

	const handleDiscountChange = (productId: string, discount: number) => {
		const product = products.find(p => p.id === productId)
		const maxDiscount = activeTab === 'client' ? product?.price : product?.cost

		if (discount < 0) discount = 0
		if (maxDiscount !== undefined && discount > maxDiscount)
			discount = maxDiscount
		setNewInvoice(prev => ({
			...prev,
			discounts: { ...prev.discounts, [productId]: discount }
		}))

		const isClientInvoice = activeTab === 'client'
		const { totalPrice, vatAmount } = calculateTotalPrice(
			newInvoice.products || [],
			{ ...newInvoice.discounts, [productId]: discount },
			isClientInvoice,
			newInvoice.include_vat || false
		)
		setNewInvoice(prev => ({
			...prev,
			total_price: totalPrice,
			vat_amount: vatAmount
		}))
	}

	const handleRemoveProduct = (index: number) => {
		const updatedProducts = newInvoice.products?.filter((_, i) => i !== index)
		const isClientInvoice = activeTab === 'client'
		const { totalPrice, vatAmount } = calculateTotalPrice(
			updatedProducts || [],
			newInvoice.discounts || {},
			isClientInvoice,
			newInvoice.include_vat || false
		)
		setNewInvoice({
			...newInvoice,
			products: updatedProducts,
			total_price: totalPrice,
			vat_amount: vatAmount
		})
	}

	const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
		if (e.target.files && e.target.files.length > 0) {
			setSelectedFile(e.target.files[0])
		}
	}

	const handleSendEmail = async (invoice: Invoice) => {
		updateLoadingState('isEmailSending', true)

		try {
			const recipientEmail =
				activeTab === 'client'
					? clients.find(client => client.client_id === invoice.client_id)?.email
					: suppliers.find(supplier => supplier.id === invoice.supplier_id)?.email

			const recipientName =
				activeTab === 'client'
					? clients.find(client => client.client_id === invoice.client_id)?.name
					: suppliers.find(supplier => supplier.id === invoice.supplier_id)?.name

			if (!recipientEmail || !recipientName) {
				throw new Error('Recipient information not found')
			}

			const productsWithDetails = invoice.products?.map(product => {
				const parentProduct = products.find(p => p.id === product.product_id)
				const variant = parentProduct?.variants.find(
					v => v.id === product.product_variant_id
				)
				const sizeOptions = [
					'OS',
					'XXS',
					'XS',
					'S',
					'M',
					'L',
					'XL',
					'2XL',
					'3XL',
					'38',
					'40',
					'42',
					'44',
					'46'
				]
				const sizes = sizeOptions.reduce((acc: any, size: any) => {
					acc[size] = 0
					return acc
				}, {})
				if (variant) {
					sizes[variant.size] = product.quantity
				}
				return {
					product_variant_id: product.product_variant_id,
					quantity: product.quantity,
					note: product.note,
					name: parentProduct?.name || 'N/A',
					color: variant?.color || 'N/A',
					sizes: sizes,
					unitPrice: activeTab === 'client' ? parentProduct?.price : parentProduct?.cost,
					image: parentProduct?.photo || ''
				}
			}) || []
			const invoiceData = {
				...invoice,
				products: productsWithDetails,
				[activeTab === 'client' ? 'client_name' : 'supplier_name']: recipientName
			}

			const response = await fetch('/api/send-invoice-email', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					invoice: invoiceData,
					recipientEmail,
					activeTab
				})
			})

			if (response.ok) {
				toast.success('Email sent successfully')
			}
		} catch (error) {
			handleError(error, 'send email')
		} finally {
			updateLoadingState('isEmailSending', false)
		}
	}

	const handleFileUpload = async () => {
		if (!selectedFile) {
			toast.error('No file selected')
			return
		}

		updateLoadingState('isFileUploading', true)

		try {
			const fileName = `${Date.now()}_${selectedFile.name}`
			const { data, error } = await supabase.storage
				.from('Files')
				.upload(fileName, selectedFile)

			if (error) throw error

			const { data: publicURLData } = supabase.storage
				.from('Files')
				.getPublicUrl(fileName)

			if (!publicURLData) {
				throw new Error('Error getting public URL: No data returned')
			}

			const updatedFiles = [...(newInvoice.files || []), publicURLData.publicUrl]
			setNewInvoice({ ...newInvoice, files: updatedFiles })
			toast.success('File uploaded successfully')
			setSelectedFile(null)
		} catch (error) {
			handleError(error, 'upload file')
		} finally {
			updateLoadingState('isFileUploading', false)
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

			if (deleteError) throw deleteError

			const updatedFiles = newInvoice.files?.filter(file => file !== fileUrl)
			setNewInvoice({ ...newInvoice, files: updatedFiles })
			toast.success('File deleted successfully')
		} catch (error) {
			console.error('Error deleting file:', error)
			toast.error('Error deleting file. Please try again.')
		}
	}

	const handleEditExistingProduct = (index: number) => {
		if (!newInvoice.products) return

		const productToEdit = newInvoice.products[index]
		const parentProduct = products.find(p => p.id === productToEdit.product_id)

		if (parentProduct) {
			setSelectedProduct(parentProduct)
			setSelectedVariants([productToEdit])
			setEditingProductIndex(index)
		}
	}

	const handleAddSelectedProductToInvoice = () => {
		if (selectedProduct && selectedVariants.length > 0) {
			let updatedProducts = [...(newInvoice.products || [])]

			if (editingProductIndex !== null) {
				updatedProducts[editingProductIndex] = selectedVariants[0]
			} else {
				updatedProducts = [...updatedProducts, ...selectedVariants]
			}

			const isClientInvoice = activeTab === 'client'
			const { totalPrice, vatAmount } = calculateTotalPrice(
				updatedProducts,
				newInvoice.discounts || {},
				isClientInvoice,
				newInvoice.include_vat || false
			)

			setNewInvoice({
				...newInvoice,
				products: updatedProducts,
				total_price: totalPrice,
				vat_amount: vatAmount
			})

			setSelectedProduct(null)
			setSelectedVariants([])
			setEditingProductIndex(null)
		}
	}

	const resetInvoiceState = () => {
		setNewInvoice({
			created_at: new Date().toISOString(),
			total_price: 0,
			order_number: '',
			products: [],
			files: [],
			remaining_amount: 0,
			include_vat: false,
			vat_amount: 0,
			discounts: {},
			type: 'regular',
			currency: 'usd',
			payment_term: '30% deposit 70% before shipping',
			delivery_date: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString(),
			client_id: undefined,
			supplier_id: undefined,
			payment_info: 'frisson_llc'
		})
		setSelectedProduct(null)
		setSelectedVariants([])
		setEditingProductIndex(null)
		setOriginalInvoiceData(null)
	}

	const LoadingOverlay = ({
		children,
		isLoading
	}: {
		children: React.ReactNode
		isLoading: boolean
	}) => (
		<div className='relative'>
			{children}
			{isLoading && (
				<div
					className='fixed inset-0 z-50 overflow-y-auto'
					style={{
						backdropFilter: 'blur(5px)',
						WebkitBackdropFilter: 'blur(5px)'
					}}>
					<div
						className='flex items-center justify-center min-h-screen'
						onClick={e => e.stopPropagation()}>
						<div className='bg-gray bg-opacity-75 p-6 rounded-lg shadow-xl text-white'>
							<FaSpinner className='animate-spin mx-auto text-6xl' />
							<p className='mt-4 text-lg font-semibold'>Loading...</p>
						</div>
					</div>
				</div>
			)}
		</div>
	)

	const renderInvoiceTable = () => (
		<div className='overflow-x-auto bg-white rounded-lg shadow'>
			{loadingStates.isMainLoading ? (
				<div className='flex justify-center items-center p-8'>
					<FaSpinner className='animate-spin text-4xl text-blue' />
				</div>
			) : (
				<table className='w-full table-auto'>
					<thead>
						<tr className='bg-gray text-white uppercase text-sm leading-normal'>
							<th className='py-3 px-6 text-left'>
								{activeTab === 'client' ? 'Client' : 'Supplier'}
							</th>
							<th
								className='py-3 px-6 text-left cursor-pointer'
								onClick={() => handleSort('created_at')}>
								Date {sortField === 'created_at' && <FaSort className='inline' />}
							</th>
							<th
								className='py-3 px-6 text-left cursor-pointer'
								onClick={() => handleSort('total_price')}>
								Total Price {sortField === 'total_price' && <FaSort className='inline' />}
							</th>
							<th className='py-3 px-6 text-left'>Order Number</th>
							<th className='py-3 px-6 text-center'>Files</th>
							<th className='py-3 px-6 text-center'>Actions</th>
							<th className='py-3 px-6 text-center'>Type</th>
						</tr>
					</thead>
					<tbody className='text-gray text-sm font-light'>
						{invoices.map(invoice => (
							<tr
								key={invoice.id}
								className={`border-b border-gray cursor-pointer ${
									invoice.type === 'return' ? 'bg-red-50' : ''
								}`}
								onClick={() => handleInvoiceClick(invoice)}>
								<td className='py-3 px-6 text-left whitespace-nowrap'>
									{activeTab === 'client'
										? clients.find(client => client.client_id === invoice.client_id)
												?.name
										: suppliers.find(supplier => supplier.id === invoice.supplier_id)
												?.name || '-'}
								</td>
								<td className='py-3 px-6 text-left'>
									{new Date(invoice.created_at).toLocaleDateString() || 'N/A'}
								</td>
								<td
									className={`py-3 px-6 text-left ${
										invoice.type === 'return'
											? 'text-red-600'
											: 'text-green-600'
									}`}>
									${(invoice.total_price || 0).toFixed(2)}
									{invoice.type === 'return' && ' (Return)'}
								</td>
								<td className='py-3 px-6 text-left'>{invoice.order_number || '-'}</td>
								<td className='py-3 px-6 text-center'>
									{invoice.files && invoice.files.length > 0 ? (
										<FaFile className='inline text-blue' />
									) : (
										'-'
									)}
								</td>
								<td className='py-3 px-6 text-center'>
									<div className='flex item-center justify-center'>
										<button
											className='mr-2 bg-blue text-white p-1 rounded-lg text-nowrap transform hover:scale-110'
											onClick={e => {
												e.stopPropagation()
												handleSendEmail(invoice)
											}}>
											Send Email
										</button>
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
								<td className='py-3 px-6 text-center'>
									<span
										className={`px-2 py-1 rounded-full text-xs font-medium ${
											invoice.type === 'return'
												? 'bg-red-100 text-red-800'
												: 'bg-green-100 text-green-800'
										}`}>
										{invoice.type === 'return' ? 'Return' : 'Regular'}
									</span>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			)}
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
						className={`relative inline-flex items-center text-blue px-2 py-2 rounded-l-md border border-gray bg-white text-sm font-medium hover:bg-neutral-50 ${
							currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''
						}`}>
						<span className='sr-only'>First</span>⟪
					</button>
					<button
						onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
						disabled={currentPage === 1}
						className={`relative inline-flex text-blue items-center px-2 py-2 border border-gray bg-white text-sm font-medium hover:bg-neutral-50 ${
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
						className={`relative inline-flex items-center text-blue px-2 py-2 rounded-r-md border border-gray bg-white text-sm font-medium hover:bg-neutral-50 ${
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
					className='block w-full pl-10 pr-3 py-2 border border-gray rounded-md leading-5 bg-white placeholder-gray focus:outline-none focus:ring-1 focus:ring-blue focus:border-blue sm:text-sm'
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
					className='block w-full pl-10 pr-3 py-2 border border-gray rounded-md leading-5 bg-white placeholder-gray focus:outline-none focus:ring-1 focus:ring-blue focus:border-blue sm:text-sm'
				/>
				<div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
					<FaFilter className='h-5 w-5 text-gray' />
				</div>
			</div>
			<select
				onChange={e =>
					handleFilterEntityChange(
						e.target.value ? Number(e.target.value) : null
					)
				}
				className='block w-full pl-3 pr-10 py-2 text-base border-gray focus:outline-none focus:ring-blue focus:border-blue sm:text-sm rounded-md'>
				<option value=''>All {activeTab === 'client' ? 'Clients' : 'Suppliers'}</option>
				{activeTab === 'client'
					? clients.map(client => (
							<option key={client.client_id} value={client.client_id.toString()}>
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
			className={`fixed z-10 inset-0 overflow-y-auto ${showModal ? '' : 'hidden'}`}>
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
							{newInvoice.id ? 'Edit Invoice' : 'Create New Invoice'}
						</h3>
						<form
							ref={formRef}
							onScroll={saveScrollPosition}
							onSubmit={e => e.preventDefault()}
							className='overflow-y-auto max-h-[70vh]'>
							<div className='mb-4'>
								{newInvoice.type === 'return' && (
									<div className='mb-4 p-4 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-700'>
										<p className='font-medium'>Return Invoice Notice</p>
										<p className='text-sm'>
											This is a return invoice. The total amount will be deducted from the client balance and products will be added back to inventory.
										</p>
									</div>
								)}
								<label className='block text-gray text-sm font-bold mb-2' htmlFor='date'>
									Date
								</label>
								<DatePicker
									selected={newInvoice.created_at ? new Date(newInvoice.created_at) : null}
									onChange={(date: Date | null) =>
										setNewInvoice({
											...newInvoice,
											created_at: date ? date.toISOString() : new Date().toISOString()
										})
									}
									className='shadow appearance-none border rounded w-full py-2 px-3 text-gray leading-tight focus:outline-none focus:shadow-outline'
								/>
							</div>
							<div className='mb-4'>
								<label className='block text-gray text-sm font-bold mb-2'>
									Invoice Type
								</label>
								<select
									className='shadow appearance-none border rounded w-full py-2 px-3 text-gray leading-tight focus:outline-none focus:shadow-outline'
									value={newInvoice.type}
									onChange={e =>
										setNewInvoice({
											...newInvoice,
											type: e.target.value as 'regular' | 'return'
										})
									}>
									<option value='regular'>Regular Invoice</option>
									<option value='return'>Return Invoice</option>
								</select>
							</div>
							<div className='mb-4'>
								<label className='block text-gray text-sm font-bold mb-2' htmlFor='entity'>
									{activeTab === 'client' ? 'Client' : 'Supplier'}
								</label>
								<select
									required
									id='entity'
									className='shadow appearance-none border rounded w-full py-2 px-3 text-gray leading-tight focus:outline-none focus:shadow-outline'
									value={
										activeTab === 'client'
											? newInvoice.client_id
											: newInvoice.supplier_id
									}
									onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
										const idField = activeTab === 'client' ? 'client_id' : 'supplier_id'
										setNewInvoice({ ...newInvoice, [idField]: e.target.value })
									}}>
									<option value=''>Select {activeTab === 'client' ? 'Client' : 'Supplier'}</option>
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
								<label className='block text-gray text-sm font-bold mb-2'>Products</label>
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
											className='flex justify-between items-center p-2 cursor-pointer'
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
										<label className='block text-gray text-sm font-semibold mb-2' htmlFor='discount'>
											Discount per item
										</label>
										<input
											type='number'
											className='shadow appearance-none border rounded w-full py-2 px-3 text-gray leading-tight focus:outline-none focus:shadow-outline mb-2'
											value={newInvoice.discounts?.[selectedProduct.id] || 0}
											min={0}
											onChange={e =>
												handleDiscountChange(
													selectedProduct.id,
													Number(e.target.value)
												)
											}
											placeholder='Discount per item'
										/>
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
											onClick={handleAddSelectedProductToInvoice}>
											Add to Invoice
										</button>
									</div>
								)}

								{newInvoice.products?.map((product, index) => (
									<div key={index} className='mb-2 p-2 border rounded'>
										<div className='flex justify-between items-center mb-2'>
											<span className='font-bold'>
												{products.find(p => p.id === product.product_id)?.name || 'N/A'}
											</span>
											<div className='space-x-2'>
												<button
													type='button'
													className='bg-blue hover:bg-indigo-700 text-white font-bold py-1 px-2 rounded text-xs'
													onClick={() => handleEditExistingProduct(index)}>
													Edit
												</button>
												<button
													type='button'
													className='bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded text-xs'
													onClick={() => handleRemoveProduct(index)}>
													Remove
												</button>
											</div>
										</div>
										<p>
											Variant:{' '}
											{products.find(p => p.id === product.product_id)
												?.variants.find(v => v.id === product.product_variant_id)
												?.size || 'N/A'}{' '}
											-{' '}
											{products.find(p => p.id === product.product_id)
												?.variants.find(v => v.id === product.product_variant_id)
												?.color || 'N/A'}
										</p>
										<p>Quantity: {product.quantity || 0}</p>
										<p>
											Discount per item: $
											{newInvoice.discounts?.[product.product_id]
												? newInvoice.discounts[product.product_id].toFixed(2)
												: '0.00'}
										</p>
										<p>Note: {product.note || '-'}</p>
									</div>
								))}
							</div>
							<div className='mb-4'>
								<label className='block text-gray text-sm font-bold mb-2' htmlFor='order_number'>
									Order Number
								</label>
								<input
									id='order_number'
									type='text'
									required
									className='shadow appearance-none border rounded w-full py-2 px-3 text-gray leading-tight focus:outline-none focus:shadow-outline'
									value={newInvoice.order_number}
									onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
										setNewInvoice({
											...newInvoice,
											order_number: e.target.value
										})
									}
								/>
							</div>
							<div className='mb-4'>
								<label className='block text-gray text-sm font-bold mb-2' htmlFor='currency'>
									Currency
								</label>
								<select
									id='currency'
									className='shadow appearance-none border rounded w-full py-2 px-3 text-gray leading-tight focus:outline-none focus:shadow-outline'
									value={newInvoice.currency || 'usd'}
									onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
										setNewInvoice({
											...newInvoice,
											currency: e.target.value as 'usd' | 'euro'
										})
									}
									required>
									<option value='usd'>USD ($)</option>
									<option value='euro'>EUR (€)</option>
								</select>
							</div>
							<div className='mb-4'>
								<label className='block text-gray text-sm font-bold mb-2' htmlFor='payment_term'>
									Payment Terms
								</label>
								<select
									id='payment_term'
									className='shadow appearance-none border rounded w-full py-2 px-3 text-gray leading-tight focus:outline-none focus:shadow-outline'
									value={newInvoice.payment_term || ''}
									onChange={(e: any) =>
										setNewInvoice({
											...newInvoice,
											payment_term: e.target.value
										})
									}
									required>
									<option value=''>Select Payment Term</option>
									<option value='100% after delivery'>100% after delivery</option>
									<option value='30% deposit 70% before shipping'>30% deposit 70% before shipping</option>
									<option value='30 days after shipping'>30 days after shipping</option>
									<option value='60 days after shipping'>60 days after shipping</option>
								</select>
							</div>
							<div className='mb-4'>
								<label className='block text-gray text-sm font-bold mb-2' htmlFor='delivery_date'>
									Delivery Date
								</label>
								<DatePicker
									selected={newInvoice.delivery_date ? new Date(newInvoice.delivery_date) : null}
									onChange={(date: Date | null) =>
										setNewInvoice({
											...newInvoice,
											delivery_date: date
												? date.toISOString()
												: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString()
										})
									}
									className='shadow appearance-none border rounded w-full py-2 px-3 text-gray leading-tight focus:outline-none focus:shadow-outline'
									minDate={new Date()}
									placeholderText='Select delivery date'
									required
								/>
							</div>
							<div className='mb-4'>
								<label className='flex items-center'>
									<input
										type='checkbox'
										checked={newInvoice.include_vat}
										onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
											const includeVAT = e.target.checked
											const { totalPrice, vatAmount } = calculateTotalPrice(
												newInvoice.products || [],
												newInvoice.discounts || {},
												activeTab === 'client',
												includeVAT
											)
											setNewInvoice({
												...newInvoice,
												include_vat: includeVAT,
												vat_amount: vatAmount,
												total_price: totalPrice
											})
										}}
										className='form-checkbox h-5 w-5 text-blue'
									/>
									<span className='ml-2 text-gray text-sm'>Include 11% VAT</span>
								</label>
							</div>
							<div className='mb-4'>
								<label className='block text-gray text-sm font-bold mb-2'>
									Total Price (including VAT if applicable)
								</label>
								<input
									type='number'
									className='shadow appearance-none border rounded w-full py-2 px-3 text-gray leading-tight focus:outline-none focus:shadow-outline'
									value={newInvoice.total_price || 0}
									readOnly
								/>
							</div>
							{newInvoice.include_vat && (
								<div className='mb-4'>
									<label className='block text-gray text-sm font-bold mb-2'>
										VAT Amount (11%)
									</label>
									<input
										type='number'
										className='shadow appearance-none border rounded w-full py-2 px-3 text-gray leading-tight focus:outline-none focus:shadow-outline'
										value={newInvoice.vat_amount || 0}
										readOnly
									/>
								</div>
							)}
							<div className='mb-4'>
								<label className='block text-gray text-sm font-bold mb-2'>
									Payment Information
								</label>
								<select
									className='shadow appearance-none border rounded w-full py-2 px-3 text-gray leading-tight focus:outline-none focus:shadow-outline'
									value={newInvoice.payment_info || 'frisson_llc'}
									onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
										e.preventDefault()
										e.stopPropagation()
										setNewInvoice({
											...newInvoice,
											payment_info: e.target.value as PaymentInfoOption
										})
									}}
									required>
									<option value=''>Select Payment Information</option>
									{Object.entries(PAYMENT_INFO_CONFIG).map(([key, config]) => (
										<option key={key} value={key}>
											{config.label}
										</option>
									))}
								</select>
							</div>
							<div className='mb-4'>
								<label className='block text-gray text-sm font-bold mb-2'>Files</label>
								<input
									type='file'
									onChange={handleFileChange}
									className='shadow appearance-none border rounded w-full py-2 px-3 text-gray leading-tight focus:outline-none focus:shadow-outline'
								/>
								{selectedFile && (
									<button
										type='button'
										onClick={handleFileUpload}
										disabled={uploadingFile}
										className='mt-2 bg-blue hover:bg-blue text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline'>
										{uploadingFile ? 'Uploading...' : 'Upload File'}
									</button>
								)}
								{newInvoice.files?.map((file, index) => (
									<div key={index} className='flex items-center mt-2'>
										<a
											href={file}
											target='_blank'
											rel='noopener noreferrer'
											className='text-blue hover:underline mr-2'>
											{file.split('/').pop() || 'File'}
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
					<div className='bg-neutral-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse'>
						<button
							type='button'
							className='w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue text-base font-medium text-white hover:bg-blue focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue sm:ml-3 sm:w-auto sm:text-sm'
							onClick={handleCreateInvoice}>
							{newInvoice.id ? 'Update Invoice' : 'Create Invoice'}
						</button>
						<button
							type='button'
							className='mt-3 w-full inline-flex justify-center rounded-md border border-gray shadow-sm px-4 py-2 bg-white text-base font-medium text-gray hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm'
							onClick={() => {
								setShowModal(false)
								resetInvoiceState()
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

		let subtotal = 0
		let totalDiscount = 0

		return (
			<div className='fixed inset-0 bg-gray bg-opacity-50 overflow-y-auto h-full w-full'>
				<div className='relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white'>
					<div className='mt-3 text-center'>
						<h3 className='text-lg leading-6 font-medium text-gray'>Invoice Details</h3>
						<div className='mt-2 px-7 py-3'>
							<p className='text-sm text-gray'>ID: {selectedInvoice.id || '-'}</p>
							<p className='text-sm text-gray'>
								Total Price: ${ (selectedInvoice.total_price || 0).toFixed(2) }
							</p>
							{selectedInvoice.include_vat && (
								<p className='text-sm text-gray'>
									VAT (11%): ${ (selectedInvoice.vat_amount || 0).toFixed(2) }
								</p>
							)}
							<p className='text-sm text-gray'>
								Order Number: {selectedInvoice.order_number || '-'}
							</p>
							<p className='text-sm text-neutral-500'>
								Currency: {selectedInvoice.currency === 'euro' ? '€ (EUR)' : '$ (USD)'}
							</p>
							<p className='text-sm text-neutral-500'>
								Payment Terms: {selectedInvoice.payment_term || '-'}
							</p>
							{selectedInvoice.payment_info && (
								<div className='mt-4'>
									<h4 className='text-sm font-medium text-gray'>Payment Information</h4>
									<PaymentInfoDisplay option={selectedInvoice.payment_info} />
								</div>
							)}
							{selectedInvoice.delivery_date && (
								<p className='text-sm text-neutral-500'>
									Delivery Date: {format(new Date(selectedInvoice.delivery_date), 'PP')}
								</p>
							)}
							<h4 className='text-sm font-medium text-gray mt-4'>Products:</h4>
							<ul className='list-disc list-inside'>
								{(selectedInvoice.products || []).map((product, index) => {
									const parentProduct = products.find(p => p.id === product.product_id)
									const variant = parentProduct?.variants.find(
										v => v.id === product.product_variant_id
									)
									const unitPrice = activeTab === 'client'
										? parentProduct?.price || 0
										: parentProduct?.cost || 0
									const discount = selectedInvoice.discounts?.[product.product_id] || 0
									const discountedPrice = (unitPrice || 0) - discount
									const lineTotal = discountedPrice * product.quantity
									const lineTotalDiscount = discount * product.quantity

									subtotal += (unitPrice || 0) * product.quantity
									totalDiscount += lineTotalDiscount

									return (
										<li key={index} className='text-sm text-gray'>
											{parentProduct?.name || 'N/A'} - {variant?.size || 'N/A'} - {variant?.color || 'N/A'} - Quantity: {product.quantity || 0} - Unit {activeTab === 'client' ? 'Price' : 'Cost'}: ${ (unitPrice || 0).toFixed(2) } - Discount per item: ${ discount.toFixed(2) } - Discounted Price: ${ discountedPrice.toFixed(2) } - Line Total: ${ lineTotal.toFixed(2) } - Line Discount: ${ lineTotalDiscount.toFixed(2) }
											{product.note && (
												<div className='ml-4 text-xs italic'>Note: {product.note}</div>
											)}
										</li>
									)
								})}
							</ul>
							<div className='mt-4'>
								<p className='text-sm text-gray'>Subtotal: ${ subtotal.toFixed(2) }</p>
								<p className='text-sm text-gray'>Total Discount: ${ totalDiscount.toFixed(2) }</p>
								<p className='text-sm text-gray'>Total Before VAT: ${ (subtotal - totalDiscount).toFixed(2) }</p>
								{selectedInvoice.include_vat && (
									<p className='text-sm text-gray'>VAT (11%): ${ (selectedInvoice.vat_amount || 0).toFixed(2) }</p>
								)}
								<p className='text-sm font-bold text-gray'>Final Total: ${ (selectedInvoice.total_price || 0).toFixed(2) }</p>
							</div>
							<h4 className='text-sm font-medium text-gray mt-4'>Files:</h4>
							<ul className='list-disc list-inside'>
								{(selectedInvoice.files || []).map((file, index) => (
									<li key={index} className='text-sm text-gray'>
										<a
											href={file}
											target='_blank'
											rel='noopener noreferrer'
											className='text-blue hover:underline'>
											{file.split('/').pop() || 'File'}
										</a>
									</li>
								))}
							</ul>
						</div>
						<div className='items-center px-4 py-3'>
							<button
								className='px-4 py-2 bg-blue text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-blue focus:outline-none focus:ring-2 focus:ring-blue mb-2'
								onClick={() => handlePDFGeneration(selectedInvoice!)}>
								Download PDF
							</button>
							<button
								className='px-4 py-2 bg-gray text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-gray focus:outline-none focus:ring-2 focus:ring-gray'
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
			<h1 className='text-3xl font-bold text-gray mb-6'>Invoice Management</h1>
			<div className='bg-white shadow-md rounded-lg'>
				<div className='flex border-b'>
					<button
						className={`flex-1 py-4 px-6 text-center ${
							activeTab === 'client' ? 'bg-blue text-white' : 'bg-gray text-white'
						}`}
						onClick={() => setActiveTab('client')}>
						Client Invoices
					</button>
					<button
						className={`flex-1 py-4 px-6 text-center ${
							activeTab === 'supplier' ? 'bg-blue text-white' : 'bg-gray text-white'
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
				className='mt-6 bg-blue hover:bg-blue text-white font-bold py-2 px-4 rounded-full shadow-lg transition duration-300 ease-in-out transform hover:-translate-y-1 hover:scale-110'
				onClick={() => {
					setNewInvoice({
						created_at: new Date().toISOString(),
						total_price: 0,
						products: [],
						files: [],
						remaining_amount: 0,
						include_vat: false,
						vat_amount: 0,
						order_number: '',
						discounts: {},
						type: 'regular',
						currency: 'usd',
						payment_term: '30% deposit 70% before shipping',
						delivery_date: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString(),
						client_id: undefined,
						supplier_id: undefined,
						payment_info: 'frisson_llc'
					})
					setShowModal(true)
				}}>
				<FaPlus className='inline-block mr-2' /> Create New Invoice
			</button>
			{showModal && (
				<div className='fixed z-10 inset-0 overflow-y-auto'>
					<div className='flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0'>
						<div className='fixed inset-0 transition-opacity' aria-hidden='true'>
							<div className='absolute inset-0 bg-gray opacity-75'></div>
						</div>
						<span className='hidden sm:inline-block sm:align-middle sm:h-screen' aria-hidden='true'>
							&#8203;
						</span>
						<LoadingOverlay
							isLoading={
								loadingStates.isInvoiceCreating ||
								loadingStates.isInvoiceUpdating
							}>
							{renderInvoiceModal()}
						</LoadingOverlay>
					</div>
				</div>
			)}
			{selectedInvoice && (
				<div className='fixed z-10 inset-0 overflow-y-auto'>
					<LoadingOverlay
						isLoading={
							loadingStates.isPDFGenerating || loadingStates.isEmailSending
						}>
						{renderInvoiceDetails()}
					</LoadingOverlay>
				</div>
			)}
		</div>
	)
}

export default InvoicesPage
