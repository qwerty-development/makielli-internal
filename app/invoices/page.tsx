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
	FaSpinner,
	FaExclamationTriangle,
	FaLink,
	FaFileInvoice,
	FaTruck,
	FaShippingFast,
	FaCheckCircle,
	FaExclamationCircle,
	FaFileAlt,
	FaTimes
} from 'react-icons/fa'
import { generatePDF } from '@/utils/pdfGenerator'
import { debounce } from 'lodash'
import { format } from 'date-fns'
import SearchableSelect from '@/components/SearchableSelect'
import { productFunctions } from '../../utils/functions/products'
import { analyticsFunctions } from '../../utils/functions/product-history'
import ShippingInvoiceModal from '@/components/ShippingInvoiceModal'
import ShippingHistory from '@/components/ShippingHistory'
import { shippingInvoiceFunctions } from '@/utils/functions/shipping-invoices'

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
	type?: 'regular' | 'return'
	currency: 'usd' | 'euro'
	payment_term:
		| '30% deposit 70% before shipping'
		| '30 days after shipping'
		| '60 days after shipping'
		| '100% after delivery' | '100% prepayment'
	delivery_date: string
	payment_info: PaymentInfoOption
	shipping_fee: number
	quotation_id?: number | null
	shipping_status?: 'unshipped' | 'partially_shipped' | 'fully_shipped'
}

type PaymentInfoOption = 'frisson_llc' | 'frisson_llc_euro' | 'frisson_llc_ach' | 'frisson_sarl_chf' | 'frisson_sarl_usd' | 'frisson_sarl_euro' | 'frisson_sarl_ach' 

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
  frisson_llc_euro: {
    label: 'Frisson International LLC - Euro Transfer',
    details: {
      intermediaryBank: 'Deutsche Bank (Frankfurt)',
      intermediarySwift: 'DEUTDEFF',
      beneficiaryBank: 'Interaudi Bank',
      beneficiaryBankAddress: '19 East 54th Street\nNew York, NY 10022\nUnited States of America',
      beneficiarySwift: 'AUSAUS33',
      beneficiaryIban: 'DE66500700100958400410',
      beneficiaryIbanDetails: '(Interaudi Bank at Deutsche Bank)',
      accountName: 'Frisson International LLC',
      accountNumber: '684631-401-099'
    }
  },
  frisson_llc_ach: {
    label: 'Frisson International LLC - ACH',
    details: {
      routingNumber: '026006237',
      accountNumber: '684631'
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
  },
  frisson_sarl_euro: {
    label: 'Frisson Sarl - Euro Transfer',
    details: {
      intermediaryBank: 'Deutsche Bank (Frankfurt)',
      intermediarySwift: 'DEUTDEFF',
      beneficiaryBank: 'Interaudi Bank',
      beneficiaryBankAddress: '19 East 54th Street\nNew York, NY 10022\nUnited States of America',
      beneficiarySwift: 'AUSAUS33',
      beneficiaryIban: 'DE66500700100958400410',
      beneficiaryIbanDetails: '(Interaudi Bank at Deutsche Bank)',
      accountName: 'Frisson Sarl',
      accountNumber: '749361-401-099'
    }
  },
  frisson_sarl_ach: {
    label: 'Frisson Sarl - ACH',
    details: {
      routingNumber: '026006237',
      accountNumber: '749361'
    }
  }
}

// Enhanced error handling for missing data
interface ValidationResult {
	isValid: boolean
	errors: string[]
	warnings: string[]
}

// Safe data access helpers
const SafeDataAccess = {
	getProduct: (products: Product[], productId: string): Product | null => {
		try {
			if (!productId || !products || !Array.isArray(products)) return null
			return products.find(p => p?.id === productId) || null
		} catch (error) {
			console.error('Error finding product:', error)
			return null
		}
	},

	getVariant: (product: Product | null, variantId: string): ProductVariant | null => {
		try {
			if (!product || !variantId || !product.variants || !Array.isArray(product.variants)) return null
			return product.variants.find(v => v?.id === variantId) || null
		} catch (error) {
			console.error('Error finding variant:', error)
			return null
		}
	},

	getClient: (clients: Client[], clientId: number): Client | null => {
		try {
			if (!clientId || !clients || !Array.isArray(clients)) return null
			return clients.find(c => c?.client_id === clientId) || null
		} catch (error) {
			console.error('Error finding client:', error)
			return null
		}
	},

	getSupplier: (suppliers: Supplier[], supplierId: string): Supplier | null => {
		try {
			if (!supplierId || !suppliers || !Array.isArray(suppliers)) return null
			return suppliers.find(s => s?.id === supplierId) || null
		} catch (error) {
			console.error('Error finding supplier:', error)
			return null
		}
	},

	formatVariantDisplay: (variant: ProductVariant | null): string => {
		if (!variant) return 'Variant Not Found'
		try {
			const size = variant.size || 'Unknown Size'
			const color = variant.color || 'Unknown Color'
			return `${size} - ${color}`
		} catch (error) {
			console.error('Error formatting variant:', error)
			return 'Invalid Variant Data'
		}
	}
}

// Enhanced validation functions
const ValidationUtils = {
	validateInvoiceProducts: (products: InvoiceProduct[], allProducts: Product[]): ValidationResult => {
		const errors: string[] = []
		const warnings: string[] = []

		if (!products || !Array.isArray(products) || products.length === 0) {
			errors.push('At least one product is required')
			return { isValid: false, errors, warnings }
		}

		products.forEach((product, index) => {
			if (!product || product === null || product === undefined) {
				errors.push(`Product ${index + 1}: Invalid product data`)
				return
			}

			if (!product.product_id) {
				errors.push(`Product ${index + 1}: Missing product selection`)
				return
			}

			if (!product.product_variant_id) {
				errors.push(`Product ${index + 1}: Missing variant selection`)
				return
			}

			if (!product.quantity || product.quantity <= 0) {
				errors.push(`Product ${index + 1}: Quantity must be greater than 0`)
				return
			}

			const parentProduct = SafeDataAccess.getProduct(allProducts, product.product_id)
			if (!parentProduct) {
				errors.push(`Product ${index + 1}: Product no longer exists (${product.product_id})`)
				return
			}

			const variant = SafeDataAccess.getVariant(parentProduct, product.product_variant_id)
			if (!variant) {
				errors.push(`Product ${index + 1}: Selected variant no longer exists for "${parentProduct.name}" (${product.product_variant_id})`)
				return
			}
		})

		return { isValid: errors.length === 0, errors, warnings }
	},

	validateInvoiceData: (invoice: Partial<Invoice>, isUpdate: boolean = false): ValidationResult => {
		const errors: string[] = []
		const warnings: string[] = []

		if (!invoice.order_number?.trim()) {
			errors.push('Order number is required')
		}

		if (!invoice.currency) {
			errors.push('Currency is required')
		}

		if (!invoice.payment_term) {
			errors.push('Payment terms are required')
		}

		if (!invoice.delivery_date) {
			errors.push('Delivery date is required')
		}

		if (!invoice.payment_info) {
			errors.push('Payment information is required')
		}

		if (invoice.shipping_fee && invoice.shipping_fee < 0) {
			errors.push('Shipping fee cannot be negative')
		}

		if (!isUpdate && (!invoice.created_at)) {
			errors.push('Invoice date is required')
		}

		return { isValid: errors.length === 0, errors, warnings }
	},

	validateRemainingAmount: (totalPrice: number, remainingAmount: number, isReturn: boolean = false): ValidationResult => {
		const errors: string[] = []
		const warnings: string[] = []

		if (isReturn) {
			// For return invoices, both should be negative
			if (totalPrice > 0) {
				errors.push('Return invoice total must be negative')
			}
			if (remainingAmount > 0) {
				errors.push('Return invoice remaining amount must be negative')
			}
			if (Math.abs(remainingAmount) > Math.abs(totalPrice)) {
				errors.push('Remaining amount cannot exceed total price for return invoices')
			}
		} else {
			// For regular invoices
			if (remainingAmount < 0) {
				errors.push('Remaining amount cannot be negative')
			}
			if (remainingAmount > totalPrice) {
				errors.push('Remaining amount cannot exceed total price')
			}
		}

		return { isValid: errors.length === 0, errors, warnings }
	}
}

const PaymentInfoDisplay: React.FC<{ option: PaymentInfoOption }> = ({ option }) => {
	const config = PAYMENT_INFO_CONFIG[option]
	const details: any = config.details
  
	if (option === 'frisson_sarl_chf') {
	  return (
		<div className='mt-4 text-sm'>
		  <p><strong>Intermediary Bank:</strong> {details.intermediaryBank || 'N/A'}</p>
		  <p><strong>Intermediary SWIFT:</strong> {details.intermediarySwift || 'N/A'}</p>
		  <p><strong>IBAN:</strong> {details.iban || 'N/A'} {details.ibanDetails || ''}</p>
		  <p><strong>Beneficiary Bank:</strong> {details.beneficiaryBank || 'N/A'}</p>
		  <p><strong>Beneficiary Account:</strong> {details.beneficiaryAccount || 'N/A'} {details.beneficiaryAccountDetails || ''}</p>
		  <p><strong>Beneficiary:</strong> {details.beneficiary || 'N/A'}</p>
		  <p><strong>Account Number:</strong> {details.accountNumber || 'N/A'}</p>
		  <p><strong>Routing Number:</strong> {details.routingNumber || 'N/A'}</p>
		</div>
	  )
	}
  
	if (option === 'frisson_sarl_euro' || option === 'frisson_llc_euro') {
	  return (
		<div className='mt-4 text-sm'>
		  <p><strong>Intermediary Bank:</strong> {details.intermediaryBank || 'N/A'}</p>
		  <p><strong>Intermediary SWIFT:</strong> {details.intermediarySwift || 'N/A'}</p>
		  <p><strong>Beneficiary Bank:</strong> {details.beneficiaryBank || 'N/A'}</p>
		  <p><strong>Beneficiary Bank Address:</strong>{' '}
			{details.beneficiaryBankAddress
			  ? details.beneficiaryBankAddress.split('\n').map((line: string, i: number) => (
				  <React.Fragment key={i}>{line}<br /></React.Fragment>
				))
			  : 'N/A'}
		  </p>
		  <p><strong>Beneficiary SWIFT:</strong> {details.beneficiarySwift || 'N/A'}</p>
		  <p><strong>Beneficiary IBAN:</strong> {details.beneficiaryIban || 'N/A'} {details.beneficiaryIbanDetails || ''}</p>
		  <p><strong>Account Name:</strong> {details.accountName || 'N/A'}</p>
		  <p><strong>Account Number:</strong> {details.accountNumber || 'N/A'}</p>
		</div>
	  )
	}
  
	if (option === 'frisson_sarl_ach' || option === 'frisson_llc_ach') {
	  return (
		<div className='mt-4 text-sm'>
		  <p><strong>Routing Number:</strong> {details.routingNumber || 'N/A'}</p>
		  <p><strong>Account Number:</strong> {details.accountNumber || 'N/A'}</p>
		</div>
	  )
	}
  
	return (
	  <div className='mt-4 text-sm'>
		<p><strong>Bank:</strong> {details.bank || 'N/A'}</p>
		<p><strong>Bank Address:</strong>{' '}
		  {details.bankAddress
			? details.bankAddress.split('\n').map((line: string, i: number) => (
				<React.Fragment key={i}>{line}<br /></React.Fragment>
			  ))
			: 'N/A'}
		</p>
		<p><strong>ABA:</strong> {details.aba || 'N/A'}</p>
		<p><strong>SWIFT:</strong> {details.swift || 'N/A'}</p>
		<p><strong>Account Name:</strong> {details.accountName || 'N/A'}</p>
		<p><strong>Account Number:</strong> {details.accountNumber || 'N/A'}</p>
		<p><strong>Routing Number:</strong> {details.routingNumber || 'N/A'}</p>
	  </div>
	)
  }

// Enhanced Error Display Component
const ErrorDisplay: React.FC<{ 
	errors: string[]
	warnings: string[]
	onDismiss?: () => void
}> = ({ errors, warnings, onDismiss }) => {
	if (errors.length === 0 && warnings.length === 0) return null

	return (
		<div className="mb-4 space-y-2">
			{errors.length > 0 && (
				<div className="bg-error-50 border border-error-200 rounded-md p-4">
					<div className="flex justify-between items-start">
						<div className="flex">
							<FaExclamationTriangle className="text-error-400 mt-1 mr-2" />
							<div>
								<h3 className="text-sm font-medium text-error-800">Please fix the following errors:</h3>
								<ul className="list-disc list-inside text-sm text-error-700 mt-1 space-y-1">
									{errors.map((error, index) => (
										<li key={index}>{error}</li>
									))}
								</ul>
							</div>
						</div>
						{onDismiss && (
							<button onClick={onDismiss} className="text-error-400 hover:text-error-600">
								<FaTrash className="h-4 w-4" />
							</button>
						)}
					</div>
				</div>
			)}
			
			{warnings.length > 0 && (
				<div className="bg-warning-50 border border-warning-200 rounded-md p-4">
					<div className="flex">
						<FaInfoCircle className="text-warning-400 mt-1 mr-2" />
						<div>
							<h3 className="text-sm font-medium text-warning-800">Warnings:</h3>
							<ul className="list-disc list-inside text-sm text-warning-700 mt-1 space-y-1">
								{warnings.map((warning, index) => (
									<li key={index}>{warning}</li>
								))}
							</ul>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}

// Shipping Status Badge Component
const ShippingStatusBadge: React.FC<{ status: string }> = ({ status }) => {
	const getStatusConfig = () => {
		switch (status) {
			case 'fully_shipped':
				return { 
					color: 'bg-success-100 text-success-800', 
					icon: <FaCheckCircle className="inline mr-1" />,
					text: 'Fully Shipped'
				}
			case 'partially_shipped':
				return { 
					color: 'bg-yellow-100 text-warning-800', 
					icon: <FaExclamationCircle className="inline mr-1" />,
					text: 'Partially Shipped'
				}
			default:
				return { 
					color: 'bg-neutral-100 text-neutral-800', 
					icon: <FaTruck className="inline mr-1" />,
					text: 'Unshipped'
				}
		}
	}
	
	const config = getStatusConfig()
	
	return (
		<span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
			{config.icon}
			{config.text}
		</span>
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
	const [sortField, setSortField] = useState<keyof Invoice | 'entity_name'>('created_at')
	const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
	const [filterStartDate, setFilterStartDate] = useState<any>(null)
	const [filterEndDate, setFilterEndDate] = useState<any>(null)
	const [filterEntity, setFilterEntity] = useState<number | string | null>(null)
	const [filterQuotationLinked, setFilterQuotationLinked] = useState<string | null>(null)
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

	// Shipping-related state
	const [showShippingModal, setShowShippingModal] = useState(false)
	const [selectedInvoiceForShipping, setSelectedInvoiceForShipping] = useState<Invoice | null>(null)
	const [showShippingHistory, setShowShippingHistory] = useState(false)
	const [selectedInvoiceForHistory, setSelectedInvoiceForHistory] = useState<Invoice | null>(null)

	// Enhanced state for validation
	const [validationErrors, setValidationErrors] = useState<string[]>([])
	const [validationWarnings, setValidationWarnings] = useState<string[]>([])
	
	const [orderNumberSearch, setOrderNumberSearch] = useState<string>('')
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
		payment_info: 'frisson_llc',
		shipping_fee: 0,
		quotation_id: null
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
		filterEntity,
		filterQuotationLinked,
		orderNumberSearch
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
		try {
			const filtered = products.filter(product =>
				product?.name?.toLowerCase().includes(productSearch.toLowerCase())
			)
			setFilteredProducts(filtered)
		} catch (error) {
			console.error('Error filtering products:', error)
			setFilteredProducts([])
		}
	}, [productSearch, products])

	// Enhanced validation when products change
	useEffect(() => {
		if (newInvoice.products && newInvoice.products.length > 0) {
			const validation = ValidationUtils.validateInvoiceProducts(newInvoice.products, products)
			setValidationErrors(validation.errors)
			setValidationWarnings(validation.warnings)
		} else {
			setValidationErrors([])
			setValidationWarnings([])
		}
	}, [newInvoice.products, products])

	const handleOrderNumberSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
		setOrderNumberSearch(e.target.value)
		setCurrentPage(1)
	}

	const handleError = (error: any, context: string) => {
		console.error(`Error in ${context}:`, error)
		const errorMessage = error?.message || `Failed to ${context.toLowerCase()}`
		toast.error(errorMessage)
	}

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

	// Shipping handler functions
	const handleCreateShippingInvoice = (invoice: Invoice) => {
		// Don't allow shipping for return invoices
		if (invoice.type === 'return') {
			toast.error('Cannot create shipping invoice for return invoices')
			return
		}
		
		// Check if invoice has products
		if (!invoice.products || invoice.products.length === 0) {
			toast.error('Invoice has no products to ship')
			return
		}
		
		setSelectedInvoiceForShipping(invoice)
		setShowShippingModal(true)
	}

	const handleViewShippingHistory = (invoice: Invoice) => {
		setSelectedInvoiceForHistory(invoice)
		setShowShippingHistory(true)
	}

	const handleShippingInvoicePDF = async (shippingInvoiceId: number) => {
		updateLoadingState('isPDFGenerating', true)
		try {
			await generatePDF('shippingInvoice', {
				shippingInvoiceId: shippingInvoiceId,
				isClient: activeTab === 'client',
				logoBase64: null
			})
			toast.success('Shipping invoice PDF generated successfully')
		} catch (error) {
			handleError(error, 'generate shipping invoice PDF')
		} finally {
			updateLoadingState('isPDFGenerating', false)
		}
	}

	const handleDownloadLatestShippingPDF = async (invoice: Invoice) => {
		try {
			const shippingInvoices = await shippingInvoiceFunctions.getShippingInvoices(
				invoice.id,
				activeTab === 'client'
			)
			
			if (shippingInvoices.length === 0) {
				toast.error('No shipping invoices found for this invoice')
				return
			}
			
			// Get the latest shipping invoice
			const latestShipping = shippingInvoices.sort((a, b) => 
				new Date(b.shipped_at).getTime() - new Date(a.shipped_at).getTime()
			)[0]
			
			await handleShippingInvoicePDF(latestShipping.id)
		} catch (error) {
			handleError(error, 'download shipping invoice PDF')
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
			let query = supabase.from(table).select('*, quotation_id', { count: 'exact' })

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
			if (orderNumberSearch) {
				query = query.ilike('order_number', `%${orderNumberSearch}%`)
			}
			
			if (filterQuotationLinked) {
				if (filterQuotationLinked === 'linked') {
					query = query.not('quotation_id', 'is', null)
				} else if (filterQuotationLinked === 'direct') {
					query = query.is('quotation_id', null)
				}
			}

			if (sortField !== 'entity_name') {
				query = query.order(sortField, { ascending: sortOrder === 'asc' })
			}

			const { data, error, count } = await query.range(
				(currentPage - 1) * itemsPerPage,
				currentPage * itemsPerPage - 1
			)

			let sortedData = data || []
			if (sortField === 'entity_name') {
				sortedData = sortedData.sort((a, b) => {
					const entityA = activeTab === 'client'
						? SafeDataAccess.getClient(clients, a.client_id)?.name || ''
						: SafeDataAccess.getSupplier(suppliers, a.supplier_id)?.name || ''

					const entityB = activeTab === 'client'
						? SafeDataAccess.getClient(clients, b.client_id)?.name || ''
						: SafeDataAccess.getSupplier(suppliers, b.supplier_id)?.name || ''

					return sortOrder === 'asc'
						? entityA.localeCompare(entityB)
						: entityB.localeCompare(entityA)
				})
			}

			setInvoices(sortedData)
			setTotalInvoices(count || 0)
		} catch (error) {
			handleError(error, 'fetch invoices')
		} finally {
			updateLoadingState('isMainLoading', false)
		}
	}

	const fetchClients = async () => {
		try {
			const { data, error } = await supabase.from('Clients').select('*').order('name', { ascending: true })
			if (error) throw error
			setClients(data || [])
		} catch (error) {
			handleError(error, 'fetch clients')
		}
	}

	const fetchSuppliers = async () => {
		try {
			const { data, error } = await supabase.from('Suppliers').select('*')
			if (error) throw error
			setSuppliers(data || [])
		} catch (error) {
			handleError(error, 'fetch suppliers')
		}
	}

	const fetchProducts = async () => {
		try {
			const { data, error } = await supabase.from('Products').select(`
				*,
				variants:ProductVariants(*)
			`)
			if (error) throw error
			setProducts(data || [])
		} catch (error) {
			handleError(error, 'fetch products')
		}
	}

	const calculateTotalPrice = (
		invoiceProducts: InvoiceProduct[],
		discounts: { [productId: string]: number },
		isClientInvoice: boolean,
		includeVAT: boolean,
		shippingFee: number = 0
	) => {
		const subtotal = invoiceProducts.reduce((total, invoiceProduct) => {
			try {
				if (!invoiceProduct || invoiceProduct === null || invoiceProduct === undefined) {
					return total
				}

				// Skip products with empty variant_id (invalid/incomplete products)
				if (!invoiceProduct.product_variant_id || invoiceProduct.product_variant_id.trim() === '') {
					console.log(`Skipping product with empty variant_id: ${invoiceProduct.product_id}`)
					return total
				}

				const product = SafeDataAccess.getProduct(products, invoiceProduct.product_id)
				if (!product) {
					console.warn(`Product not found: ${invoiceProduct.product_id}`)
					return total
				}

				const unitPrice = isClientInvoice ? (product.price || 0) : (product.cost || 0)
				const discount = discounts[invoiceProduct.product_id] || 0
				const discountedPrice = Math.max(0, unitPrice - discount)
				return total + discountedPrice * (invoiceProduct.quantity || 0)
			} catch (error) {
				console.error('Error calculating product total:', error)
				return total
			}
		}, 0)

		const validShippingFee = Number(shippingFee) || 0
		const vatAmount = includeVAT ? subtotal * 0.11 : 0
		const totalPrice = subtotal + vatAmount + validShippingFee

		return { subtotal, vatAmount, totalPrice }
	}

	const calculateRemainingAmountForUpdate = async (
		invoiceId: number,
		newTotalPrice: number,
		table: string
	): Promise<number> => {
		try {
			// Get the original invoice data
			const { data: originalInvoice, error: invoiceError } = await supabase
				.from(table)
				.select('total_price, remaining_amount, shipping_fee')
				.eq('id', invoiceId)
				.single()

			if (invoiceError) {
				console.error('Error fetching original invoice:', invoiceError)
				return newTotalPrice // Fallback to new total price
			}

			const originalTotalPrice = Number(originalInvoice.total_price) || 0
			const originalRemainingAmount = Number(originalInvoice.remaining_amount) || 0
			const paidAmount = originalTotalPrice - originalRemainingAmount
			
			// New remaining amount is new total minus what's been paid
			const newRemainingAmount = newTotalPrice - paidAmount

			const finalRemainingAmount = Math.max(0, newRemainingAmount)
			return finalRemainingAmount
		} catch (error) {
			console.error('Error calculating remaining amount:', error)
			return newTotalPrice
		}
	}

	const updateProductQuantitiesWithNetChange = async (
		originalProducts: InvoiceProduct[],
		newProducts: InvoiceProduct[],
		isClientInvoice: boolean,
		originalIsReturn: boolean,
		newIsReturn: boolean,
		invoiceId: number
	) => {
		// Calculate net changes per variant
		const netChanges = new Map<string, {
			productId: string,
			variantId: string,
			netChange: number,
			originalQty: number,
			newQty: number
		}>()

		// Process original products (subtract their effect)
		for (const product of originalProducts || []) {
			if (!product || product === null || product === undefined || !product.product_variant_id) continue
			
			let effectiveChange = isClientInvoice ? -product.quantity : product.quantity
			if (originalIsReturn) {
				effectiveChange = -effectiveChange
			}
			
			const existing = netChanges.get(product.product_variant_id) || {
				productId: product.product_id,
				variantId: product.product_variant_id,
				netChange: 0,
				originalQty: product.quantity,
				newQty: 0
			}
			
			existing.netChange -= effectiveChange // Reverse the original effect
			netChanges.set(product.product_variant_id, existing)
		}

		// Process new products (add their effect)
		for (const product of newProducts || []) {
			if (!product || product === null || product === undefined || !product.product_variant_id) continue
			
			let effectiveChange = isClientInvoice ? -product.quantity : product.quantity
			if (newIsReturn) {
				effectiveChange = -effectiveChange
			}
			
			const existing = netChanges.get(product.product_variant_id) || {
				productId: product.product_id,
				variantId: product.product_variant_id,
				netChange: 0,
				originalQty: 0,
				newQty: product.quantity
			}
			
			existing.netChange += effectiveChange // Add the new effect
			existing.newQty = product.quantity
			existing.productId = product.product_id
			netChanges.set(product.product_variant_id, existing)
		}

		// Apply net changes
		for (const [variantId, change] of netChanges) {
			if (change.netChange === 0) continue // Skip if no net change
			
			try {
				// Build descriptive note
				let note = ''
				if (change.originalQty !== change.newQty) {
					note = `Invoice update - quantity changed from ${change.originalQty} to ${change.newQty}`
				} else {
					note = `Invoice update - inventory adjustment`
				}
				
				await productFunctions.updateProductVariantQuantity(
					variantId,
					change.netChange,
					isClientInvoice ? 'client_invoice' : 'supplier_invoice',
					invoiceId.toString(),
					note
				)
			} catch (error: any) {
				const parentProduct = SafeDataAccess.getProduct(products, change.productId)
				const productName = parentProduct?.name || 'Unknown Product'
				console.error(`Error updating product ${productName} quantity:`, error)
			}
		}
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
			// Enhanced validation
			const productValidation = ValidationUtils.validateInvoiceProducts(newInvoice.products || [], products)
			const invoiceValidation = ValidationUtils.validateInvoiceData(newInvoice, isUpdate)

			const allErrors = [...productValidation.errors, ...invoiceValidation.errors]
			const allWarnings = [...productValidation.warnings, ...invoiceValidation.warnings]

			if (allErrors.length > 0) {
				setValidationErrors(allErrors)
				setValidationWarnings(allWarnings)
				toast.error('Please fix all errors before creating the invoice')
				return
			}

			// Show warnings but allow creation
			if (allWarnings.length > 0) {
				const proceed = window.confirm(
					`There are warnings with this invoice:\n\n${allWarnings.join('\n')}\n\nDo you want to continue?`
				)
				if (!proceed) return
			}

			const entityId: any = getEntityId(newInvoice)
			const shippingFee = Number(newInvoice.shipping_fee) || 0

			const { subtotal, vatAmount, totalPrice } = calculateTotalPrice(
				newInvoice.products || [],
				newInvoice.discounts || {},
				isClientInvoice,
				newInvoice.include_vat || false,
				shippingFee
			)

			const isReturnInvoice = isClientInvoice ? (newInvoice.type === 'return') : false
			const finalTotalPrice = isReturnInvoice ? -Math.abs(totalPrice) : Math.abs(totalPrice)
			const finalVatAmount = isReturnInvoice ? -Math.abs(vatAmount) : Math.abs(vatAmount)

			let finalRemainingAmount = finalTotalPrice
			if (isUpdate && newInvoice.id) {
				finalRemainingAmount = await calculateRemainingAmountForUpdate(newInvoice.id, finalTotalPrice, table)
				
				// Additional validation for updates
				if (finalRemainingAmount < 0 && !isReturnInvoice) {
					const proceed = window.confirm(
						`Warning: The remaining amount would be negative (${finalRemainingAmount.toFixed(2)}). This means more has been paid than the new total. Do you want to continue?`
					)
					if (!proceed) return
				}
			}

			// Validate remaining amount
			const remainingValidation = ValidationUtils.validateRemainingAmount(
				finalTotalPrice,
				finalRemainingAmount,
				isReturnInvoice
			)

			if (!remainingValidation.isValid) {
				setValidationErrors(remainingValidation.errors)
				toast.error('Invalid remaining amount calculation')
				return
			}

			let invoiceData: any = {
				...newInvoice,
				shipping_fee: shippingFee,
				total_price: finalTotalPrice,
				remaining_amount: finalRemainingAmount, // Use calculated remaining amount
				vat_amount: finalVatAmount,
				[isClientInvoice ? 'client_id' : 'supplier_id']: entityId,
				currency: newInvoice.currency || 'usd',
				payment_term: newInvoice.payment_term,
				delivery_date: newInvoice.delivery_date,
				payment_info: newInvoice.payment_info || 'frisson_llc',
				quotation_id: newInvoice.quotation_id || null
			}

			if (!isClientInvoice) {
				delete invoiceData.type
			}

			// Handle update
			if (newInvoice.id && originalInvoiceData) {
				const { error: updateError } = await supabase
					.from(table)
					.update(invoiceData)
					.eq('id', newInvoice.id)

				if (updateError) throw updateError

				await updateProductQuantitiesWithNetChange(
					originalInvoiceData.products || [],
					newInvoice.products || [],
					isClientInvoice,
					originalInvoiceData.type === 'return',
					newInvoice.type === 'return',
					newInvoice.id
				)

				const oldAmount = Number(originalInvoiceData.total_price) || 0
				const balanceChange = finalTotalPrice - oldAmount
				if (Math.abs(balanceChange) > 0.01) { // Only update if there's a significant change
					await updateEntityBalance(balanceChange, entityId)
				}

				toast.success('Invoice updated successfully')
				setShowModal(false)
				resetInvoiceState()
				fetchInvoices() // Refresh the list
				return
			}

			// Handle new invoice creation
			const { data: createdInvoice, error: createError } = await supabase
				.from(table)
				.insert(invoiceData)
				.select()
				.single()

			if (createError) throw createError

			await updateProductQuantities(
				newInvoice.products || [],
				isClientInvoice,
				newInvoice.type === 'return',
				false,
				createdInvoice.id
			)
			await updateEntityBalance(finalTotalPrice, entityId)

			toast.success(`Invoice ${isUpdate ? 'updated' : 'created'} successfully`)
			setShowModal(false)
			resetInvoiceState()
			fetchInvoices()
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
		products: any,
		isClientInvoice: boolean,
		isReturn: boolean,
		isReversal: boolean = false,
		invoiceId: number = 0
	) => {
		const isReturnInvoice = isClientInvoice ? isReturn : false

		for (const product of products) {
			if (!product || product === null || product === undefined || !product.product_variant_id) continue

			try {
				let quantityChange = isClientInvoice ? -product.quantity : product.quantity

				if (isReturnInvoice) {
					quantityChange = -quantityChange
				}

				if (isReversal) {
					quantityChange = -quantityChange
				}

				// Enhanced tracking with new product history system
				await productFunctions.updateProductVariantQuantity(
					product.product_variant_id,
					quantityChange,
					isClientInvoice ? 'client_invoice' : 'supplier_invoice',
					invoiceId.toString(),
					isReturnInvoice
						? 'Return invoice - inventory adjustment'
						: isReversal
							? 'Invoice reversal - inventory adjustment'
							: 'Invoice created - inventory adjustment'
				)
			} catch (error: any) {
				const parentProduct = SafeDataAccess.getProduct(products, product.product_id)
				const productName = parentProduct?.name || 'Unknown Product'
				console.error(`Error updating product ${productName} quantity:`, error)
				// Continue with other products even if one fails
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

			const roundedAmount = Math.round(Number(amount) * 100) / 100
			// Use transaction-like behavior by getting current data with row lock
			const { data, error } = await supabase
				.from(table)
				.select('balance')
				.eq(field, id)
				.single()

			if (error) {
				throw new Error(`Error fetching current balance: ${error.message}`)
			}

			const currentBalance = Number(data?.balance) || 0
			const newBalance = Math.round((currentBalance + roundedAmount) * 100) / 100

			console.log('Current Balance:', currentBalance)
			console.log('New Balance:', newBalance)

			// Update with the new balance
			const { error: updateError } = await supabase
				.from(table)
				.update({ balance: newBalance })
				.eq(field, id)

			if (updateError) {
				throw new Error(`Error updating balance: ${updateError.message}`)
			}
			console.log(`✅ Updated ${activeTab} balance: ${currentBalance} → ${newBalance} (change: ${roundedAmount})`)
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

			// Check if there are any receipts for this invoice
			const receiptTable = isClientInvoice ? 'ClientReceipts' : 'SupplierReceipts'
			const { data: receipts, error: receiptError } = await supabase
				.from(receiptTable)
				.select('id')
				.eq('invoice_id', id)

			if (receiptError) {
				throw new Error(`Error checking receipts: ${receiptError.message}`)
			}

			if (receipts && receipts.length > 0) {
				throw new Error('Cannot delete invoice with existing receipts. Please delete receipts first.')
			}

			// Delete associated files first
			await Promise.all(
				(invoiceData.files || []).map((fileUrl: string) => handleFileDelete(fileUrl))
			)

			const isReturn = invoiceData.type === 'return'
			const quantityMultiplier = isReturn ? -1 : 1

			// Enhanced deletion tracking with new product history system
			await Promise.all(
				(invoiceData.products || [])
					.filter((product: any) => product !== null && product !== undefined && product.product_variant_id)
					.map(
						(product: { product_variant_id: any; quantity: number }) =>
							productFunctions.updateProductVariantQuantity(
								product.product_variant_id,
								quantityMultiplier * product.quantity,
								'adjustment',
								id.toString(),
								'Invoice deletion - inventory adjustment'
							)
					)
			)

			const { error: deleteError } = await supabase
				.from(table)
				.delete()
				.eq('id', id)

			if (deleteError) throw deleteError

			const balanceChange = -Number(invoiceData.total_price)
			await updateEntityBalance(balanceChange, entityId)

			toast.success('Invoice deleted successfully')
			await fetchInvoices()
		} catch (error) {
			handleError(error, 'delete invoice')
		} finally {
			updateLoadingState('isInvoiceDeleting', false)
		}
	}

	const handleSort = (field: any) => {
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
				products: [...(currentInvoice.products || []).filter((p: any) => p !== null && p !== undefined)],
				discounts: { ...(currentInvoice.discounts || {}) },
				type: currentInvoice.type,
				payment_info: currentInvoice.payment_info || 'frisson_llc',
				shipping_fee: Number(currentInvoice.shipping_fee) || 0, // Ensure it's a number
				quotation_id: currentInvoice.quotation_id || null
			})

			const updatedInvoice = {
				...currentInvoice,
				products: [...(currentInvoice.products || []).filter((p: any) => p !== null && p !== undefined)],
				discounts: { ...(currentInvoice.discounts || {}) },
				type: currentInvoice.type || 'regular',
				created_at: currentInvoice.created_at,
				total_price: Number(currentInvoice.total_price) || 0,
				order_number: currentInvoice.order_number,
				files: currentInvoice.files || [],
				remaining_amount: Number(currentInvoice.remaining_amount) || 0,
				include_vat: currentInvoice.include_vat || false,
				vat_amount: Number(currentInvoice.vat_amount) || 0,
				currency: currentInvoice.currency || 'usd',
				payment_term: currentInvoice.payment_term || '',
				delivery_date:
					currentInvoice.delivery_date ||
					new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString(),
				payment_info: currentInvoice.payment_info || 'frisson_llc',
				client_id: isClientInvoice ? entityId : undefined,
				supplier_id: !isClientInvoice ? entityId : undefined,
				shipping_fee: Number(currentInvoice.shipping_fee) || 0, // Ensure it's a number
				quotation_id: currentInvoice.quotation_id || null
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
		try {
			if (!product.variants || product.variants.length === 0) {
				toast.error(`Product "${product.name}" has no available variants.`)
				return
			}

			const activeVariants = product.variants.filter(v => v && v.id)
			if (activeVariants.length === 0) {
				toast.error(`Product "${product.name}" has no valid variants available.`)
				return
			}

			setSelectedProduct(product)
			setSelectedVariants([
				{
					product_id: product.id,
					product_variant_id: activeVariants[0].id,
					quantity: 1,
					note: product.description || ''
				}
			])

			if (!newInvoice.discounts?.[product.id]) {
				setNewInvoice(prev => ({
					...prev,
					discounts: { ...prev.discounts, [product.id]: 0 }
				}))
			}
		} catch (error) {
			console.error('Error adding product:', error)
			toast.error('Failed to add product. Please try again.')
		}
	}

	const handleAddVariant = () => {
		try {
			if (selectedProduct) {
				if (!selectedProduct.variants || selectedProduct.variants.length === 0) {
					toast.error(`Product "${selectedProduct.name}" has no available variants.`)
					return
				}

				const activeVariants = selectedProduct.variants.filter(v => v && v.id)
				if (activeVariants.length === 0) {
					toast.error(`Product "${selectedProduct.name}" has no valid variants available.`)
					return
				}

				setSelectedVariants([
					...selectedVariants,
					{
						product_id: selectedProduct.id,
						product_variant_id: activeVariants[0].id,
						quantity: 1,
						note: selectedProduct.description || ''
					}
				])
			}
		} catch (error) {
			console.error('Error adding variant:', error)
			toast.error('Failed to add variant. Please try again.')
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
		try {
			const updatedVariants = [...selectedVariants]
			updatedVariants[index] = { ...updatedVariants[index], [field]: value }
			setSelectedVariants(updatedVariants)
		} catch (error) {
			console.error('Error updating variant:', error)
			toast.error('Failed to update variant. Please try again.')
		}
	}

	const handleDiscountChange = (productId: string, discount: number) => {
		try {
			const product = SafeDataAccess.getProduct(products, productId)
			const maxDiscount = activeTab === 'client' ? (product?.price || 0) : (product?.cost || 0)

			if (discount < 0) discount = 0
			if (maxDiscount && discount > maxDiscount) discount = maxDiscount

			const isClientInvoice = activeTab === 'client'

			// Use functional update to avoid race conditions
			setNewInvoice(prev => {
				const updatedDiscounts = { ...prev.discounts, [productId]: discount }
				const { totalPrice, vatAmount } = calculateTotalPrice(
					prev.products || [],
					updatedDiscounts,
					isClientInvoice,
					prev.include_vat || false,
					prev.shipping_fee || 0
				)

				return {
					...prev,
					discounts: updatedDiscounts,
					total_price: totalPrice,
					vat_amount: vatAmount
				}
			})
		} catch (error) {
			console.error('Error updating discount:', error)
			toast.error('Failed to update discount. Please try again.')
		}
	}

	// FIXED: Enhanced shipping fee change handler with proper state updates
	const handleShippingFeeChange = (value: number) => {
		try {
			const fee = Number(value) >= 0 ? Number(value) : 0
			
			console.log('=== SHIPPING FEE CHANGE ===')
			console.log('Input value:', value)
			console.log('Normalized fee:', fee)
			
			setNewInvoice(prev => {
				const isClientInvoice = activeTab === 'client'
				const { totalPrice, vatAmount } = calculateTotalPrice(
					prev.products || [],
					prev.discounts || {},
					isClientInvoice,
					prev.include_vat || false,
					fee
				)
				
				console.log('Updated total price:', totalPrice)
				console.log('Updated VAT amount:', vatAmount)
				
				return {
					...prev,
					shipping_fee: fee,
					total_price: totalPrice,
					vat_amount: vatAmount
				}
			})
		} catch (error) {
			console.error('Error updating shipping fee:', error)
			toast.error('Failed to update shipping fee. Please try again.')
		}
	}

	const handleRemoveProduct = (index: number) => {
		try {
			const isClientInvoice = activeTab === 'client'

			// Use functional update to avoid race conditions
			setNewInvoice(prev => {
				const updatedProducts = prev.products?.filter((_, i) => i !== index)
				const { totalPrice, vatAmount } = calculateTotalPrice(
					updatedProducts || [],
					prev.discounts || {},
					isClientInvoice,
					prev.include_vat || false,
					prev.shipping_fee || 0
				)

				return {
					...prev,
					products: updatedProducts,
					total_price: totalPrice,
					vat_amount: vatAmount
				}
			})
		} catch (error) {
			console.error('Error removing product:', error)
			toast.error('Failed to remove product. Please try again.')
		}
	}

	const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
		if (e.target.files && e.target.files.length > 0) {
			setSelectedFile(e.target.files[0])
		}
	}

	const handleSendEmail = async (invoice: Invoice) => {
		updateLoadingState('isEmailSending', true)

		try {
			const entity = activeTab === 'client'
				? SafeDataAccess.getClient(clients, invoice.client_id || 0)
				: SafeDataAccess.getSupplier(suppliers, invoice.supplier_id || '')

			if (!entity?.email || !entity?.name) {
				throw new Error('Recipient information not found')
			}

			const productsWithDetails = invoice.products?.filter((p: any) => p !== null && p !== undefined).map(product => {
				if (!product) return null

				const parentProduct = SafeDataAccess.getProduct(products, product.product_id)
				const variant = SafeDataAccess.getVariant(parentProduct, product.product_variant_id)
				
				const sizeOptions = [
					'OS', 'XXS', 'XS', 'S', 'S/M', 'M', 'M/L', 'L', 'XL', '2XL', '3XL',
					'36', '38', '40', '42', '44', '46', '48', '50', '52', '54', '56', '58'
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
					name: parentProduct?.name || 'Product Not Found',
					color: variant?.color || 'Variant Not Found',
					sizes: sizes,
					unitPrice: activeTab === 'client' ? (parentProduct?.price || 0) : (parentProduct?.cost || 0),
					image: parentProduct?.photo || ''
				}
			}) || []

			const invoiceData = {
				...invoice,
				products: productsWithDetails,
				[activeTab === 'client' ? 'client_name' : 'supplier_name']: entity.name
			}

			const response = await fetch('/api/send-invoice-email', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					invoice: invoiceData,
					recipientEmail: entity.email,
					activeTab
				})
			})

			if (response.ok) {
				toast.success('Email sent successfully')
			} else {
				throw new Error('Failed to send email')
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
		try {
			if (!newInvoice.products) return

			const productToEdit = newInvoice.products[index]
			if (!productToEdit) {
				toast.error('Product not found')
				return
			}

			const parentProduct = SafeDataAccess.getProduct(products, productToEdit.product_id)

			if (parentProduct) {
				setSelectedProduct(parentProduct)
				setSelectedVariants([productToEdit])
				setEditingProductIndex(index)
			} else {
				toast.error('Selected product no longer exists')
			}
		} catch (error) {
			console.error('Error editing product:', error)
			toast.error('Failed to edit product. Please try again.')
		}
	}

	const handleAddSelectedProductToInvoice = () => {
		try {
			if (selectedProduct && selectedVariants.length > 0) {
				const invalidVariants = selectedVariants.filter(variant => {
					const variantExists = SafeDataAccess.getVariant(selectedProduct, variant.product_variant_id)
					return !variantExists
				})

				if (invalidVariants.length > 0) {
					toast.error('Some selected variants are no longer available. Please reselect variants.')
					return
				}

				const isClientInvoice = activeTab === 'client'

				// Use functional update to avoid race conditions
				setNewInvoice(prev => {
					let updatedProducts = [...(prev.products || [])]

					if (editingProductIndex !== null) {
						updatedProducts[editingProductIndex] = selectedVariants[0]
					} else {
						updatedProducts = [...updatedProducts, ...selectedVariants]
					}

					const { totalPrice, vatAmount } = calculateTotalPrice(
						updatedProducts,
						prev.discounts || {},
						isClientInvoice,
						prev.include_vat || false,
						prev.shipping_fee || 0
					)

					return {
						...prev,
						products: updatedProducts,
						total_price: totalPrice,
						vat_amount: vatAmount
					}
				})

				setSelectedProduct(null)
				setSelectedVariants([])
				setEditingProductIndex(null)

				toast.success('Product added to invoice successfully')
			}
		} catch (error) {
			console.error('Error adding product to invoice:', error)
			toast.error('Failed to add product to invoice. Please try again.')
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
			payment_info: 'frisson_llc',
			shipping_fee: 0,
			quotation_id: null
		})
		setSelectedProduct(null)
		setSelectedVariants([])
		setEditingProductIndex(null)
		setOriginalInvoiceData(null)
		setValidationErrors([])
		setValidationWarnings([])
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
						<div className='bg-neutral-900 bg-opacity-75 p-6 rounded-lg shadow-xl text-white'>
							<FaSpinner className='animate-spin mx-auto text-6xl' />
							<p className='mt-4 text-lg font-semibold'>Loading...</p>
						</div>
					</div>
				</div>
			)}
		</div>
	)

	const renderInvoiceTable = () => (
		<div className='overflow-x-auto'>
			{loadingStates.isMainLoading ? (
				<div className='flex justify-center items-center p-8'>
					<FaSpinner className='animate-spin text-4xl text-primary-500' />
				</div>
			) : (
				<table className='w-full table-auto'>
					<thead>
						<tr className='bg-neutral-100 text-neutral-700 uppercase text-xs font-semibold tracking-wider'>
							<th
								className='py-3 px-6 text-left cursor-pointer'
								onClick={() => handleSort('entity_name')}>
								{activeTab === 'client' ? 'Client' : 'Supplier'} {sortField === 'entity_name' && <FaSort className='inline' />}
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
							<th
								className='py-3 px-6 text-left cursor-pointer'
								onClick={() => handleSort('remaining_amount')}>
								Remaining Amount {sortField === 'remaining_amount' && <FaSort className='inline' />}
							</th>
							<th
								className='py-3 px-6 text-left cursor-pointer'
								onClick={() => handleSort('order_number')}>
								Order Number {sortField === 'order_number' && <FaSort className='inline' />}
							</th>
							<th className='py-3 px-6 text-center'>Source</th>
							<th className='py-3 px-6 text-center'>Files</th>
							<th className='py-3 px-6 text-center'>Actions</th>
							<th className='py-3 px-6 text-center'>Type</th>
							<th className='py-3 px-6 text-center'>Shipping Status</th>
						</tr>
					</thead>
					<tbody className='text-neutral-600 text-sm divide-y divide-neutral-200'>
						{invoices.map(invoice => {
							const entity = activeTab === 'client'
								? SafeDataAccess.getClient(clients, invoice.client_id || 0)
								: SafeDataAccess.getSupplier(suppliers, invoice.supplier_id || '')

							// FIXED: Enhanced data integrity check including shipping fee
							const totalPrice = Number(invoice.total_price) || 0
							const remainingAmount = Number(invoice.remaining_amount) || 0
							const shippingFee = Number(invoice.shipping_fee) || 0
							
							const hasDataIssue = Math.abs(remainingAmount) > Math.abs(totalPrice) + 0.01 // Allow small rounding differences
							const hasShippingFeeIssue = shippingFee > 0 && remainingAmount < 0 && Math.abs(remainingAmount) === shippingFee

							return (
								<tr
									key={invoice.id}
									className={`cursor-pointer hover:bg-neutral-50 transition-colors duration-150 ${
										invoice.type === 'return' ? 'bg-error-50' : ''
									} ${hasDataIssue || hasShippingFeeIssue ? 'bg-warning-50' : ''}`}
									onClick={() => handleInvoiceClick(invoice)}>
									<td className='py-3 px-6 text-left whitespace-nowrap'>
										{entity?.name || 'Entity Not Found'}
									</td>
									<td className='py-3 px-6 text-left'>
										{invoice.created_at ? new Date(invoice.created_at).toLocaleDateString() : 'N/A'}
									</td>
									<td
										className={`py-3 px-6 text-left ${
											invoice.type === 'return'
												? 'text-error-600'
												: 'text-success-600'
										}`}>
										${totalPrice.toFixed(2)}
										{invoice.type === 'return' && ' (Return)'}
									</td>
									<td
										className={`py-3 px-6 text-left ${
											remainingAmount > 0
												? 'text-warning-600'
												: 'text-success-600'
										} ${hasDataIssue || hasShippingFeeIssue ? 'font-bold text-error-600' : ''}`}>
										${remainingAmount.toFixed(2)}
										{(hasDataIssue || hasShippingFeeIssue) && ' ⚠️'}
									</td>
									<td className='py-3 px-6 text-left'>{invoice.order_number || '-'}</td>
									<td className='py-3 px-6 text-center'>
										{invoice.quotation_id ? (
											<div className="flex items-center justify-center">
												<FaLink className="text-primary-600 mr-1" />
												<span className="text-primary-600 text-xs" title={`Created from Quotation #${invoice.quotation_id}`}>
													Q#{invoice.quotation_id}
												</span>
											</div>
										) : (
											<div className="flex items-center justify-center">
												<FaFileInvoice className="text-neutral-500 mr-1" />
												<span className="text-neutral-500 text-xs" title="Direct Invoice">
													Direct
												</span>
											</div>
										)}
									</td>
									<td className='py-3 px-6 text-center'>
										{invoice.files && invoice.files.length > 0 ? (
											<FaFile className='inline text-primary-600' />
										) : (
											'-'
										)}
									</td>
									<td className='py-3 px-6 text-center'>
										<div className='flex item-center justify-center'>
											<button
												className='mr-2 btn-primary px-3 py-1 text-sm text-nowrap transform hover:scale-105 transition-transform'
												onClick={e => {
													e.stopPropagation()
													handleSendEmail(invoice)
												}}>
												Send Email
											</button>
											<button
												className='w-4 mr-2 transform text-primary-600 hover:text-primary-700 hover:scale-110 transition-all'
												onClick={e => {
													e.stopPropagation()
													handleEditInvoice(invoice)
												}}>
												<FaEdit />
											</button>
											<button
												className='w-4 mr-2 transform text-error-600 hover:text-error-700 hover:scale-110 transition-all'
												onClick={e => {
													e.stopPropagation()
													handleDeleteInvoice(invoice.id)
												}}>
												<FaTrash />
											</button>
											{invoice.type !== 'return' && (
												<>
													<button
														className='mr-2 btn-success px-3 py-1 text-sm text-nowrap transform hover:scale-105 transition-transform flex items-center gap-1'
														onClick={e => {
															e.stopPropagation()
															handleCreateShippingInvoice(invoice)
														}}>
														<FaShippingFast />
														Ship
													</button>
													<button
														className='mr-2 btn-outline px-3 py-1 text-sm text-nowrap transform hover:scale-105 transition-transform flex items-center gap-1'
														onClick={e => {
															e.stopPropagation()
															handleViewShippingHistory(invoice)
														}}>
														<FaTruck />
														History
													</button>
													{invoice.shipping_status !== 'unshipped' && (
														<button
															className='mr-2 bg-secondary-500 hover:bg-secondary-600 text-white px-3 py-1 text-sm rounded-lg text-nowrap transform hover:scale-105 transition-all flex items-center gap-1'
															onClick={e => {
																e.stopPropagation()
																handleDownloadLatestShippingPDF(invoice)
															}}>
															<FaFileAlt />
															PDF
														</button>
													)}
												</>
											)}
										</div>
									</td>
									<td className='py-3 px-6 text-center'>
										<span
											className={`px-2 py-1 rounded-full text-xs font-medium ${
												invoice.type === 'return'
													? 'bg-error-100 text-error-800'
													: 'bg-success-100 text-success-800'
											}`}>
											{invoice.type === 'return' ? 'Return' : 'Regular'}
										</span>
									</td>
									<td className='py-3 px-6 text-center'>
										{invoice.shipping_status && (
											<ShippingStatusBadge status={invoice.shipping_status} />
										)}
									</td>
								</tr>
							)
						})}
					</tbody>
				</table>
			)}
		</div>
	)

	const renderPagination = () => {
		const totalPages = Math.ceil(totalInvoices / itemsPerPage)
		return (
			<div className='flex justify-center mt-6'>
				<nav
					className='inline-flex rounded-lg shadow-soft overflow-hidden'
					aria-label='Pagination'>
					<button
						onClick={() => setCurrentPage(1)}
						disabled={currentPage === 1}
						className={`px-3 py-2 border border-neutral-300 bg-white text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors ${
							currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''
						}`}>
						<span className='sr-only'>First</span>⟪
					</button>
					<button
						onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
						disabled={currentPage === 1}
						className={`px-3 py-2 border-t border-b border-neutral-300 bg-white text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors ${
							currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''
						}`}>
						<span className='sr-only'>Previous</span>⟨
					</button>
					<span className='px-4 py-2 border-t border-b border-neutral-300 bg-neutral-50 text-sm font-medium text-neutral-700'>
						{currentPage} of {totalPages === 0 ? 1 : totalPages}
					</span>
					<button
						onClick={() =>
							setCurrentPage(Math.min(totalPages, currentPage + 1))
						}
						disabled={currentPage === totalPages}
						className={`px-3 py-2 border-t border-b border-neutral-300 bg-white text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors ${
							currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''
						}`}>
						<span className='sr-only'>Next</span>⟩
					</button>
					<button
						onClick={() => setCurrentPage(totalPages)}
						disabled={currentPage === totalPages}
						className={`px-3 py-2 border border-neutral-300 bg-white text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors ${
							currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''
						}`}>
						<span className='sr-only'>Last</span>⟫
					</button>
				</nav>
			</div>
		)
	}

	const renderFilters = () => (
		<div className='mb-6 flex flex-wrap items-center gap-4'>
			<div className='relative min-w-[200px]'>
				<DatePicker
					selected={filterStartDate}
					onChange={(date: Date | null) => setFilterStartDate(date)}
					selectsStart
					startDate={filterStartDate}
					endDate={filterEndDate}
					placeholderText='Start Date'
					className='input pl-10'
				/>
				<div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
					<FaFilter className='h-5 w-5 text-neutral-400' />
				</div>
			</div>

			<div className='relative min-w-[200px]'>
				<DatePicker
					selected={filterEndDate}
					onChange={(date: Date | null) => setFilterEndDate(date)}
					selectsEnd
					startDate={filterStartDate}
					endDate={filterEndDate}
					minDate={filterStartDate}
					placeholderText='End Date'
					className='input pl-10'
				/>
				<div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
					<FaFilter className='h-5 w-5 text-neutral-400' />
				</div>
			</div>

			<div className='relative min-w-[200px]'>
				<input
					type='text'
					value={orderNumberSearch}
					onChange={handleOrderNumberSearch}
					placeholder='Search by Order Number'
					className='input pl-10'
				/>
				<div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
					<FaSearch className='h-5 w-5 text-neutral-400' />
				</div>
			</div>

			<SearchableSelect
				options={activeTab === 'client' ? clients : suppliers}
				value={filterEntity}
				onChange={(value) => handleFilterEntityChange(value)}
				placeholder={`Filter by ${activeTab === 'client' ? 'Client' : 'Supplier'}`}
				label={activeTab === 'client' ? 'Filter Client' : 'Filter Supplier'}
				idField={activeTab === 'client' ? 'client_id' : 'id'}
				className="flex-grow"
			/>

			<select
				value={filterQuotationLinked || ''}
				onChange={(e) => {
					setFilterQuotationLinked(e.target.value || null)
					setCurrentPage(1)
				}}
				className='input min-w-[180px] text-neutral-900'
			>
				<option value='' className='text-neutral-900 bg-white'>All Sources</option>
				<option value='linked' className='text-neutral-900 bg-white'>From Quotation</option>
				<option value='direct' className='text-neutral-900 bg-white'>Direct Invoice</option>
			</select>
		</div>
	)

	const renderInvoiceModal = () => (
		<div
			className={`modal-overlay ${showModal ? '' : 'hidden'}`}
			onClick={(e) => {
				if (e.target === e.currentTarget) {
					setShowModal(false)
				}
			}}>
			<div className='modal-content max-w-2xl' onClick={(e) => e.stopPropagation()}>
				<div className='flex items-center justify-between p-6 border-b border-neutral-200'>
					<h2 className='text-2xl font-bold text-neutral-800'>
						{newInvoice.id ? 'Edit Invoice' : 'Create New Invoice'}
					</h2>
					<button
						onClick={() => setShowModal(false)}
						className='p-2 rounded-lg hover:bg-neutral-100 transition-colors text-neutral-500 hover:text-neutral-700'>
						<FaTimes className='w-5 h-5' />
					</button>
				</div>

				<div className='p-6'>
					{newInvoice.id && newInvoice.quotation_id && (
						<div className="mb-4 p-3 bg-primary-50 border-l-4 border-primary-400 text-primary-700">
							<div className="flex items-center">
								<FaLink className="mr-2" />
								<p className="text-sm font-medium">
									This invoice was created from Quotation #{newInvoice.quotation_id}
								</p>
							</div>
						</div>
					)}

						<ErrorDisplay 
							errors={validationErrors} 
							warnings={validationWarnings}
							onDismiss={() => {
								setValidationErrors([])
								setValidationWarnings([])
							}}
						/>

						<form
							ref={formRef}
							onScroll={saveScrollPosition}
							onSubmit={e => e.preventDefault()}
							className='overflow-y-auto max-h-[70vh]'>
							<div className='mb-4'>
								{newInvoice.type === 'return' && (
									<div className='mb-4 p-4 bg-warning-50 border-l-4 border-warning-400 text-warning-700'>
										<p className='font-medium'>Return Invoice Notice</p>
										<p className='text-sm'>
											This is a return invoice. The total amount will be deducted from the entity balance and products will be added back to inventory.
										</p>
									</div>
								)}
								<label className='block text-neutral-700 text-sm font-medium mb-2' htmlFor='date'>
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
									className='input'
								/>
							</div>

							{activeTab === 'client' && (
								<div className='mb-4'>
									<label className='block text-neutral-700 text-sm font-medium mb-2'>
										Invoice Type
									</label>
									<select
										className='input'
										value={newInvoice.type || 'regular'}
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
							)}

							<div className='mb-4'>
								<SearchableSelect
									options={activeTab === 'client' ? clients : suppliers}
									value={activeTab === 'client' ? newInvoice.client_id : newInvoice.supplier_id}
									onChange={(value) => {
										const idField = activeTab === 'client' ? 'client_id' : 'supplier_id'
										setNewInvoice({ ...newInvoice, [idField]: value })
									}}
									placeholder={`Select ${activeTab === 'client' ? 'Client' : 'Supplier'}`}
									label={activeTab === 'client' ? 'Client' : 'Supplier'}
									idField={activeTab === 'client' ? 'client_id' : 'id'}
									required
								/>
							</div>

							<div className='mb-4'>
								<label className='block text-neutral-700 text-sm font-medium mb-2'>Products</label>
								<div className='flex mb-2'>
									<input
										type='text'
										placeholder='Search products...'
										className='flex-grow input'
										onChange={e => handleProductSearch(e.target.value)}
									/>
									<button
										type='button'
										className='ml-2 btn-primary'
										onClick={() => setProductSearch('')}>
										<FaSearch />
									</button>
								</div>

								<div className='max-h-40 overflow-y-auto mb-2'>
									{filteredProducts.map(product => {
										const hasValidVariants = product.variants && product.variants.length > 0 && 
											product.variants.some(v => v && v.id)

										return (
											<div
												key={product.id}
												className={`flex justify-between items-center p-2 cursor-pointer ${
													hasValidVariants ? 'hover:bg-neutral-100' : 'bg-neutral-100 cursor-not-allowed'
												}`}
												onClick={() => hasValidVariants && handleAddProduct(product)}>
												<span className={hasValidVariants ? '' : 'text-neutral-400'}>
													{product.name}
													{!hasValidVariants && ' (No Valid Variants)'}
												</span>
												<button
													type='button'
													disabled={!hasValidVariants}
													className={`font-bold py-1 px-2 rounded text-xs ${
														hasValidVariants 
															? 'bg-success-500 hover:bg-success-700 text-white'
															: 'bg-neutral-300 text-neutral-500 cursor-not-allowed'
													}`}>
													{hasValidVariants ? 'Select' : 'Unavailable'}
												</button>
											</div>
										)
									})}
								</div>

								{selectedProduct && (
									<div className='mb-4 p-2 border rounded'>
										<h4 className='font-bold mb-2'>{selectedProduct.name}</h4>
										<label className='block text-neutral-700 text-sm font-semibold mb-2' htmlFor='discount'>
											Discount per item
										</label>
										<input
											type='number'
											className='input mb-2'
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
										{selectedVariants.map((variant, index) => {
											const availableVariants = selectedProduct.variants?.filter(v => v && v.id) || []

											return (
												<div key={index} className='mb-2 p-2 border rounded'>
													<select
														className='input mb-2'
														value={variant.product_variant_id}
														onChange={e =>
															handleVariantChange(
																index,
																'product_variant_id',
																e.target.value
															)
														}>
														<option value=''>Select Variant</option>
														{availableVariants.map(v => (
															<option key={v.id} value={v.id}>
																{SafeDataAccess.formatVariantDisplay(v)} 
																{v.quantity <= 5 && ` (Low Stock: ${v.quantity})`}
															</option>
														))}
													</select>
													<input
														type='number'
														min='1'
														className='input mb-2'
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
														className='input mb-2'
														value={variant.note}
														onChange={e =>
															handleVariantChange(index, 'note', e.target.value)
														}
														placeholder='Product Note'
													/>
													<button
														type='button'
														className='bg-error-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded text-xs'
														onClick={() => handleRemoveVariant(index)}>
														Remove Variant
													</button>
												</div>
											)
										})}
										<button
											type='button'
											className='btn-outline text-xs py-1 px-2 mr-2'
											onClick={handleAddVariant}>
											Add Another Variant
										</button>
										<button
											type='button'
											className='btn-success text-xs py-1 px-2'
											onClick={handleAddSelectedProductToInvoice}>
											Add to Invoice
										</button>
									</div>
								)}

								{newInvoice.products?.filter(product => product !== null && product !== undefined).map((product, index) => {
									if (!product) return null

									const parentProduct = SafeDataAccess.getProduct(products, product.product_id)
									const variant = SafeDataAccess.getVariant(parentProduct, product.product_variant_id)

									return (
										<div key={index} className={`mb-2 p-2 border rounded ${!parentProduct || !variant ? 'bg-error-50 border-error-200' : ''}`}>
											<div className='flex justify-between items-center mb-2'>
												<span className='font-bold'>
													{parentProduct?.name || `Product Not Found (${product?.product_id || 'N/A'})`}
													{!parentProduct && <span className="text-error-500 text-xs ml-2">[DELETED]</span>}
												</span>
												<div className='space-x-2'>
													<button
														type='button'
														className='btn-primary text-xs py-1 px-2'
														onClick={() => handleEditExistingProduct(index)}>
														Edit
													</button>
													<button
														type='button'
														className='btn-danger text-xs py-1 px-2'
														onClick={() => handleRemoveProduct(index)}>
														Remove
													</button>
												</div>
											</div>
											<p>
												Variant: {SafeDataAccess.formatVariantDisplay(variant)}
												{!variant && <span className="text-error-500 text-xs ml-2">[NOT FOUND]</span>}
											</p>
											<p>Quantity: {product.quantity || 0}</p>
											<p>
												Discount per item: $
												{product?.product_id && newInvoice.discounts?.[product.product_id] ? newInvoice.discounts[product.product_id].toFixed(2) : '0.00'}
											</p>
											<p>Note: {product.note || '-'}</p>
											{(!parentProduct || !variant) && (
												<div className="mt-2 p-2 bg-error-100 rounded text-error-700 text-xs">
													⚠️ This product or variant is no longer available. Please remove or edit this item.
												</div>
											)}
										</div>
									)
								})}
							</div>

							<div className='mb-4'>
								<label className='block text-neutral-700 text-sm font-medium mb-2' htmlFor='order_number'>
									Order Number
								</label>
								<input
									id='order_number'
									type='text'
									required
									className='input'
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
								<label className='block text-neutral-700 text-sm font-medium mb-2' htmlFor='currency'>
									Currency
								</label>
								<select
									id='currency'
									className='input'
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
								<label className='block text-neutral-700 text-sm font-medium mb-2' htmlFor='payment_term'>
									Payment Terms
								</label>
								<select
									id='payment_term'
									className='input'
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
									<option value='100% prepayment'>100% prepayment</option>
								</select>
							</div>

							<div className='mb-4'>
								<label className='block text-neutral-700 text-sm font-medium mb-2' htmlFor='delivery_date'>
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
									className='input'
									minDate={new Date()}
									placeholderText='Select delivery date'
									required
								/>
							</div>

							{/* FIXED: Enhanced shipping fee input with better validation */}
							<div className='mb-4'>
								<label className='block text-neutral-700 text-sm font-medium mb-2' htmlFor='shipping_fee'>
									Shipping Fee
								</label>
								<div className='relative'>
									<span className='absolute left-3 top-2 text-neutral-700'>$</span>
									<input
										id='shipping_fee'
										type='number'
										min='0'
										step='0.01'
										className='input pl-8'
										value={newInvoice.shipping_fee || ''}
										onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
											const value = e.target.value
											// Allow empty string for clearing the field
											if (value === '') {
												handleShippingFeeChange(0)
											} else {
												const numValue = parseFloat(value)
												if (!isNaN(numValue) && numValue >= 0) {
													handleShippingFeeChange(numValue)
												}
											}
										}}
										placeholder='0.00'
									/>
								</div>
								<p className='text-xs text-neutral-500 mt-1'>
									Shipping fee will be included in the total price and remaining amount calculations.
								</p>
							</div>

							<div className='mb-4'>
								<label className='flex items-center'>
									<input
										type='checkbox'
										checked={newInvoice.include_vat}
										onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
											const includeVAT = e.target.checked

											// Use functional update to avoid race conditions
											setNewInvoice(prev => {
												const { totalPrice, vatAmount } = calculateTotalPrice(
													prev.products || [],
													prev.discounts || {},
													activeTab === 'client',
													includeVAT,
													prev.shipping_fee || 0
												)

												return {
													...prev,
													include_vat: includeVAT,
													vat_amount: vatAmount,
													total_price: totalPrice
												}
											})
										}}
										className='form-checkbox h-5 w-5 text-primary-500'
									/>
									<span className='ml-2 text-neutral-700 text-sm'>Include 11% VAT</span>
								</label>
							</div>

							<div className='mb-4'>
								<label className='block text-neutral-700 text-sm font-medium mb-2'>
									Total Price (including VAT and shipping if applicable)
								</label>
								<input
									type='number'
									className='input'
									value={newInvoice.total_price || 0}
									readOnly
								/>
							</div>

							{newInvoice.include_vat && (
								<div className='mb-4'>
									<label className='block text-neutral-700 text-sm font-medium mb-2'>
										VAT Amount (11%)
									</label>
									<input
										type='number'
										className='input'
										value={newInvoice.vat_amount || 0}
										readOnly
									/>
								</div>
							)}

							<div className='mb-4'>
								<label className='block text-neutral-700 text-sm font-medium mb-2'>
									Payment Information
								</label>
								<select
									className='input'
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
								<label className='block text-neutral-700 text-sm font-medium mb-2'>Files</label>
								<input
									type='file'
									onChange={handleFileChange}
									className='input'
								/>
								{selectedFile && (
									<button
										type='button'
										onClick={handleFileUpload}
										disabled={uploadingFile}
										className='mt-2 btn-primary disabled:opacity-50 disabled:cursor-not-allowed'>
										{uploadingFile ? 'Uploading...' : 'Upload File'}
									</button>
								)}
								{newInvoice.files?.map((file, index) => (
									<div key={index} className='flex items-center mt-2'>
										<a
											href={file}
											target='_blank'
											rel='noopener noreferrer'
											className='text-primary-500 hover:underline mr-2'>
											{file.split('/').pop() || 'File'}
										</a>
										<button
											type='button'
											onClick={() => handleFileDelete(file)}
											className='text-error-500 hover:text-error-700'>
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
							className={`btn-primary w-full sm:w-auto ${
								validationErrors.length > 0
									? '!bg-neutral-400 cursor-not-allowed'
									: ''
							}`}
							onClick={handleCreateInvoice}
							disabled={validationErrors.length > 0}>
							{newInvoice.id ? 'Update Invoice' : 'Create Invoice'}
						</button>
						<button
							type='button'
							className='btn-ghost w-full sm:w-auto sm:ml-3'
							onClick={() => {
								setShowModal(false)
								resetInvoiceState()
							}}>
							Cancel
						</button>
					</div>
				</div>
			</div>
	)

const renderInvoiceDetails = () => {
		if (!selectedInvoice) return null

		const isClientInvoice = activeTab === 'client'
		const entity:any = isClientInvoice
			? SafeDataAccess.getClient(clients, selectedInvoice.client_id || 0)
			: SafeDataAccess.getSupplier(suppliers, selectedInvoice.supplier_id || '')

		const isReturn = selectedInvoice.type === 'return'
		const currency = selectedInvoice.currency || 'usd'
		const currencySymbol = currency === 'euro' ? '€' : '$'

		const subtotal = selectedInvoice.products?.filter((p: any) => p !== null && p !== undefined).reduce((total, product) => {
			try {
				if (!product) return total

				const parentProduct = SafeDataAccess.getProduct(products, product.product_id)
				if (!parentProduct) return total

				const price = isClientInvoice ? (parentProduct.price || 0) : (parentProduct.cost || 0)
				const lineTotal = price * product.quantity
				return total + (isReturn ? -lineTotal : lineTotal)
			} catch (error) {
				console.error('Error calculating subtotal for product:', error)
				return total
			}
		}, 0) || 0

		const totalDiscount = selectedInvoice.products?.filter((p: any) => p !== null && p !== undefined).reduce((total, product) => {
			try {
				if (!product || !product.product_id) return total

				const discount = selectedInvoice.discounts?.[product.product_id] || 0
				const lineDiscount = discount * product.quantity
				return total + (isReturn ? -lineDiscount : lineDiscount)
			} catch (error) {
				console.error('Error calculating discount for product:', error)
				return total
			}
		}, 0) || 0

		const totalBeforeVAT = subtotal - totalDiscount
		const vatAmount = selectedInvoice.include_vat ? totalBeforeVAT * 0.11 : 0
		const shippingFee = Number(selectedInvoice.shipping_fee) || 0

		const sizeOptions = [
			'OS', 'XXS', 'XS', 'S', 'S/M', 'M', 'M/L', 'L', 'XL', '2XL', '3XL',
			'36', '38', '40', '42', '44', '46', '48', '50', '52', '54', '56', '58'
		]

		// Enhanced product grouping with error handling
		const productsByNameColor: any = {}
		selectedInvoice.products?.filter((p: any) => p !== null && p !== undefined).forEach(product => {
			try {
				if (!product) return

				const parentProduct = SafeDataAccess.getProduct(products, product.product_id)
				const variant = SafeDataAccess.getVariant(parentProduct, product.product_variant_id)

				const productName = parentProduct?.name || `Product Not Found (${product?.product_id || 'N/A'})`
				const variantColor = variant?.color || `Variant Not Found (${product.product_variant_id})`
				const variantSize = variant?.size || 'Unknown Size'

				const key = `${productName}-${variantColor}`
				if (!productsByNameColor[key]) {
					productsByNameColor[key] = {
						product_id: parentProduct?.id || product?.product_id || 'unknown',
						name: productName,
						color: variantColor,
						image: parentProduct?.photo || '',
						unitPrice: isClientInvoice ? (parentProduct?.price || 0) : (parentProduct?.cost || 0),
						sizes: {},
						notes: new Set(),
						totalQuantity: 0,
						discount: selectedInvoice.discounts?.[parentProduct?.id || product?.product_id] || 0,
						hasErrors: !parentProduct || !variant
					}
				}

				productsByNameColor[key].sizes[variantSize] =
					(productsByNameColor[key].sizes[variantSize] || 0) + product.quantity

				productsByNameColor[key].totalQuantity += product.quantity

				if (product.note) {
					productsByNameColor[key].notes.add(product.note)
				}
			} catch (error) {
				console.error('Error processing product for display:', error)
			}
		})

		const productsArray = Object.values(productsByNameColor).sort((a: any, b: any) => {
			const nameComparison = a.name.localeCompare(b.name)
			if (nameComparison !== 0) return nameComparison
			return a.color.localeCompare(b.color)
		})

		return (
			<div className='fixed inset-0 bg-neutral-900 bg-opacity-50 overflow-y-auto h-full w-full'>
				<div className='relative top-10 mx-auto p-5 border w-4/5 max-w-5xl shadow-lg rounded-md bg-white'>
					<div className='mt-3'>
						<div className='flex justify-between items-start mb-6'>
							<div>
								<img src="/logo/logo.png" alt="Company Logo" className="h-16 w-auto" />
							</div>
							<div className='text-right'>
								<h4 className='font-bold'>Company Information</h4>
								<p className='text-sm'>Frisson International LLC</p>
								<p className='text-sm'>1441 Caribbean breeze drive</p>
								<p className='text-sm'>Tampa Florida, 33613</p>
								<p className='text-sm'>United States Of America</p>
							</div>
						</div>

						<div className='mb-6 text-center'>
							<h2 className={`text-2xl font-bold ${isReturn ? 'text-error-600' : 'text-primary-500'}`}>
								{isReturn ? 'RETURN INVOICE' : 'INVOICE'}
							</h2>

							{isReturn && (
								<div className='mt-2 bg-error-100 p-2 rounded-md'>
									<p className='text-error-600 font-semibold'>Return Invoice</p>
								</div>
							)}

							{/* Show quotation reference if invoice was created from a quotation */}
							{selectedInvoice.quotation_id && (
								<div className='mt-2 bg-blue-50 p-2 rounded-md'>
									<p className='text-primary-600 text-sm font-medium'>
										📋 Created from Order #{selectedInvoice.quotation_id}
									</p>
								</div>
							)}
						</div>

						<div className='flex justify-between mb-6'>
							<div className='w-1/2 pr-4'>
								<h4 className='font-bold mb-2'>{isClientInvoice ? 'Bill To:' : 'Supplier:'}</h4>
								<p className='text-sm'>{entity?.name || 'Entity Not Found'}</p>
								<p className='text-sm'>{isClientInvoice ? entity?.address : entity?.location}</p>
								<p className='text-sm'>Phone: {entity?.phone || 'N/A'}</p>
								<p className='text-sm'>Email: {entity?.email || 'N/A'}</p>
								{isClientInvoice && <p className='text-sm'>Tax Number: {entity?.tax_number || 'N/A'}</p>}
							</div>

							<div className='w-1/2 pl-4'>
								<h4 className='font-bold mb-2'>Invoice Details:</h4>
								<p className='text-sm'>Invoice Number: {selectedInvoice.id || 'N/A'}</p>
								<p className='text-sm'>Date: {selectedInvoice.created_at ? format(new Date(selectedInvoice.created_at), 'PP') : 'N/A'}</p>
								<p className='text-sm'>Order Number: {selectedInvoice.order_number || 'N/A'}</p>
								{selectedInvoice.quotation_id && (
									<p className='text-sm text-primary-600'>Source Order: #{selectedInvoice.quotation_id}</p>
								)}
								{selectedInvoice.delivery_date && (
									<p className='text-sm'>Delivery Date: {format(new Date(selectedInvoice.delivery_date), 'PP')}</p>
								)}
								{selectedInvoice.payment_term && (
									<p className='text-sm'>Payment Term: {selectedInvoice.payment_term}</p>
								)}
						
								{shippingFee > 0 && (
									<p className='text-sm'>Shipping Fee: {currencySymbol}{shippingFee.toFixed(2)}</p>
								)}
							</div>
						</div>

						{/* Enhanced Products Table with Error Handling */}
						<div className='mb-6 overflow-x-auto'>
							<table className='min-w-full border border-neutral-300 text-xs'>
								<thead>
									<tr className='bg-neutral-100'>
										<th className='w-14 p-1 text-xs font-bold text-center border border-neutral-300'>IMAGE</th>
										<th className='w-20 p-1 text-xs font-bold text-center border border-neutral-300'>STYLE</th>
										<th className='w-20 p-1 text-xs font-bold text-center border border-neutral-300'>DESCRIPTION</th>
										<th className='w-14 p-1 text-xs font-bold text-center border border-neutral-300'>COLOR</th>
										{sizeOptions.map(size => (
											<th key={size} className='w-8 p-0.5 text-xs font-bold text-center border border-neutral-300'>{size}</th>
										))}
										<th className='w-14 p-1 text-xs font-bold text-center border border-neutral-300'>TOTAL PCS</th>
										<th className='w-16 p-1 text-xs font-bold text-center border border-neutral-300'>UNIT PRICE</th>
										{Object.values(productsByNameColor).some((p: any) => p.discount > 0) && (
											<th className='w-16 p-1 text-xs font-bold text-center border border-neutral-300'>DISCOUNT</th>
										)}
										<th className='w-20 p-1 text-xs font-bold text-center border border-neutral-300'>TOTAL</th>
									</tr>
								</thead>
								<tbody>
									{productsArray.map((product: any, index: any) => {
										const priceAfterDiscount = product.unitPrice - product.discount
										const lineTotal = priceAfterDiscount * product.totalQuantity
										const displayLineTotal = isReturn ? -lineTotal : lineTotal

										return (
											<tr key={index} className={`border-b border-neutral-300 ${product.hasErrors ? 'bg-error-50' : ''}`}>
												<td className='p-1 text-center border-r border-neutral-300'>
													{product.image ? (
														<img src={product.image} alt={product.name} className='w-10 h-10 object-contain mx-auto' />
													) : (
														<div className='w-10 h-10 bg-neutral-200 mx-auto flex items-center justify-center'>
															{product.hasErrors && <FaExclamationTriangle className="text-error-500 text-xs" />}
														</div>
													)}
												</td>
												<td className={`p-1 text-xs font-semibold border-r border-neutral-300 ${product.hasErrors ? 'text-error-600' : ''}`}>
													{product.name}
													{product.hasErrors && <span className="block text-error-500">[ERROR]</span>}
												</td>
												<td className='p-1 text-xs border-r border-neutral-300'>
													{Array.from(product.notes).map((note: any, i: any) => (
														<p key={i} className='text-xs italic text-neutral-600'>{note}</p>
													))}
												</td>
												<td className={`p-1 text-xs text-center border-r border-neutral-300 ${product.hasErrors ? 'text-error-600' : ''}`}>
													{product.color}
												</td>

												{sizeOptions.map(size => (
													<td key={size} className='p-0.5 text-xs text-center border-r border-neutral-300'>
														{product.sizes[size] ? product.sizes[size] : '-'}
													</td>
												))}

												<td className='p-1 text-xs text-center border-r border-neutral-300'>{product.totalQuantity}</td>
												<td className='p-1 text-xs text-center border-r border-neutral-300'>
													{currencySymbol}{product.unitPrice?.toFixed(2)}
												</td>

												{Object.values(productsByNameColor).some((p: any) => p.discount > 0) && (
													<td className='p-1 text-xs text-center border-r border-neutral-300'>
														{product.discount > 0 ? `${currencySymbol}${product.discount.toFixed(2)}` : '-'}
													</td>
												)}

												<td className='p-1 text-xs text-center border-r border-neutral-300'>
													{currencySymbol}{Math.abs(displayLineTotal).toFixed(2)}
												</td>
											</tr>
										)
									})}
								</tbody>
							</table>
							
							{/* Warning for missing products */}
							{productsArray.some((p: any) => p.hasErrors) && (
								<div className="mt-4 p-3 bg-warning-50 border border-warning-200 rounded-md">
									<div className="flex">
										<FaExclamationTriangle className="text-warning-400 mt-1 mr-2" />
										<div>
											<h4 className="text-sm font-medium text-warning-800">Data Integrity Warning</h4>
											<p className="text-sm text-warning-700 mt-1">
												Some products or variants in this invoice are no longer available in the system. 
												This may affect calculations and inventory tracking.
											</p>
										</div>
									</div>
								</div>
							)}
						</div>

						{/* FIXED: Enhanced Totals Section with proper shipping fee display */}
						<div className='flex flex-col items-end mb-6 mt-4'>
							{Math.abs(subtotal) !== Math.abs(selectedInvoice.total_price || 0) && (
								<div className='flex justify-end mb-1 w-1/3'>
									<div className='w-1/2 font-bold text-right pr-4'>Subtotal:</div>
									<div className='w-1/2 text-right'>
										{currencySymbol}{Math.abs(subtotal).toFixed(2)}
										{isReturn && ' (Return)'}
									</div>
								</div>
							)}

							{totalDiscount > 0 && (
								<div className='flex justify-end mb-1 w-1/3'>
									<div className='w-1/2 font-bold text-right pr-4'>Total Discount:</div>
									<div className='w-1/2 text-right'>
										{currencySymbol}{Math.abs(totalDiscount).toFixed(2)}
										{isReturn && ' (Return)'}
									</div>
								</div>
							)}

							{selectedInvoice.include_vat && (
								<>
									{totalBeforeVAT !== subtotal && (
										<div className='flex justify-end mb-1 w-1/3'>
											<div className='w-1/2 font-bold text-right pr-4'>Total Before VAT:</div>
											<div className='w-1/2 text-right'>
												{currencySymbol}{Math.abs(totalBeforeVAT).toFixed(2)}
												{isReturn && ' (Return)'}
											</div>
										</div>
									)}
									<div className='flex justify-end mb-1 w-1/3'>
										<div className='w-1/2 font-bold text-right pr-4'>VAT (11%):</div>
										<div className='w-1/2 text-right'>
											{currencySymbol}{Math.abs(vatAmount).toFixed(2)}
											{isReturn && ' (Return)'}
										</div>
									</div>
								</>
							)}

							{shippingFee > 0 && (
								<div className='flex justify-end mb-1 w-1/3'>
									<div className='w-1/2 font-bold text-right pr-4'>Shipping Fee:</div>
									<div className='w-1/2 text-right'>
										{currencySymbol}{Math.abs(shippingFee).toFixed(2)}
									</div>
								</div>
							)}

							<div className='flex justify-end mb-1 w-1/3'>
								<div className='w-1/2 font-bold text-right pr-4'>Total:</div>
								<div className='w-1/2 text-right font-bold'>
									{currencySymbol}{Math.abs(selectedInvoice.total_price || 0).toFixed(2)}
									{isReturn && ' (Return)'}
								</div>
							</div>

							<div className='w-2/3 text-right italic text-sm text-neutral-600 mt-1'>
								Amount in words: [Amount in words would appear here]
								{isReturn && ' (Credit)'}
							</div>
						</div>

						{/* Payment Information Section */}
						<div className='border-t border-neutral-300 pt-4 mb-6'>
							<h4 className='font-bold mb-2'>Payment Information:</h4>
							{selectedInvoice.payment_info && (
								<PaymentInfoDisplay option={selectedInvoice.payment_info} />
							)}
						</div>

						{/* Shipping Information Section */}
						{selectedInvoice.shipping_status && (
							<div className='mb-6'>
								<h4 className='font-bold mb-2'>Shipping Status:</h4>
								<ShippingStatusBadge status={selectedInvoice.shipping_status} />
								
								{selectedInvoice.shipping_status !== 'unshipped' && (
									<div className='mt-4'>
										<ShippingHistory
											invoiceId={selectedInvoice.id}
											isClientInvoice={activeTab === 'client'}
											products={products}
											onUpdate={() => {
												fetchInvoices()
												// Refresh the selected invoice details
												if (selectedInvoice) {
													const updated = invoices.find(inv => inv.id === selectedInvoice.id)
													if (updated) setSelectedInvoice(updated)
												}
											}}
											onDownloadPDF={handleShippingInvoicePDF}
										/>
									</div>
								)}
							</div>
						)}

						{/* Files Section */}
						{selectedInvoice.files && selectedInvoice.files.length > 0 && (
							<div className='mb-6'>
								<h4 className='font-bold mb-2'>Attached Files:</h4>
								<ul className='list-disc list-inside'>
									{selectedInvoice.files.map((file, index) => (
										<li key={index} className='text-sm'>
											<a
												href={file}
												target='_blank'
												rel='noopener noreferrer'
												className='text-primary-500 hover:underline'>
												{file.split('/').pop() || 'File'}
											</a>
										</li>
									))}
								</ul>
							</div>
						)}

						{isReturn && (
							<div className='text-center mb-6'>
								<p className='text-error-600 italic text-sm'>
									This is a return invoice. All amounts shown are credits to be applied to your account.
								</p>
							</div>
						)}

						<div className='text-center text-neutral-500 text-sm mb-4'>
							Thank you for your business!
						</div>

						<div className='flex justify-center space-x-4 mt-6'>
							<button
								className='px-4 py-2 bg-blue text-white font-medium rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none'
								onClick={() => handlePDFGeneration(selectedInvoice)}>
								Download PDF
							</button>
							<button
								className='px-4 py-2 bg-gray text-white font-medium rounded-md shadow-sm hover:bg-neutral-700 focus:outline-none'
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
		<div className='min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 p-6 sm:p-8'>
			<div className='w-full'>
				<div className='mb-8 animate-fade-in'>
					<div className='flex items-center justify-between mb-4'>
						<div>
							<h1 className='text-4xl font-bold text-neutral-800 mb-2'>Invoice Management</h1>
							<p className='text-neutral-600'>Create and manage client and supplier invoices</p>
						</div>
						<button
							className='btn-primary flex items-center gap-2'
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
						payment_info: 'frisson_llc',
						shipping_fee: 0,
						quotation_id: null
					})
					setShowModal(true)
				}}>
				<FaPlus /> Create New Invoice
			</button>
					</div>
				</div>

				<div className='card overflow-hidden mb-6'>
					<div className='flex border-b border-neutral-200'>
						<button
							className={`flex-1 py-4 px-6 text-center font-medium transition-all duration-300 ${
								activeTab === 'client'
									? 'bg-primary-500 text-white'
									: 'bg-white text-neutral-700 hover:bg-neutral-50'
							}`}
							onClick={() => setActiveTab('client')}>
							Client Invoices
						</button>
						<button
							className={`flex-1 py-4 px-6 text-center font-medium transition-all duration-300 ${
								activeTab === 'supplier'
									? 'bg-primary-500 text-white'
									: 'bg-white text-neutral-700 hover:bg-neutral-50'
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
			</div>

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

			{/* Shipping Invoice Modal */}
			{showShippingModal && selectedInvoiceForShipping && (
				<ShippingInvoiceModal
					isOpen={showShippingModal}
					onClose={() => {
						setShowShippingModal(false)
						setSelectedInvoiceForShipping(null)
					}}
					invoice={selectedInvoiceForShipping}
					products={products}
					isClientInvoice={activeTab === 'client'}
					onSuccess={() => {
						fetchInvoices()
						toast.success('Shipping invoice created successfully!')
					}}
				/>
			)}

			{/* Shipping History Modal */}
			{showShippingHistory && selectedInvoiceForHistory && (
				<div className='fixed z-10 inset-0 overflow-y-auto'>
					<div className='flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0'>
						<div className='fixed inset-0 transition-opacity' aria-hidden='true'>
							<div className='absolute inset-0 bg-neutral-500 opacity-75'></div>
						</div>
						
						<span className='hidden sm:inline-block sm:align-middle sm:h-screen' aria-hidden='true'>
							&#8203;
						</span>
						
						<div className='inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full'>
							<div className='bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4'>
								<div className='flex items-center mb-4'>
									<FaTruck className='text-primary-500 text-2xl mr-3' />
									<h3 className='text-lg leading-6 font-medium text-neutral-900'>
										Shipping History - Invoice #{selectedInvoiceForHistory.id}
									</h3>
								</div>
								
								<div className='mb-4 p-3 bg-blue-50 border-l-4 border-blue-400 text-primary-500-700'>
									<p className='text-sm'>
										Order Number: {selectedInvoiceForHistory.order_number}
									</p>
									<p className='text-xs mt-1'>
										Status: <ShippingStatusBadge status={selectedInvoiceForHistory.shipping_status || 'unshipped'} />
									</p>
								</div>
								
								<ShippingHistory
									invoiceId={selectedInvoiceForHistory.id}
									isClientInvoice={activeTab === 'client'}
									products={products}
									onUpdate={() => {
										fetchInvoices()
									}}
									onDownloadPDF={handleShippingInvoicePDF}
								/>
							</div>
							
							<div className='bg-neutral-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse'>
								<button
									type='button'
									onClick={() => {
										setShowShippingHistory(false)
										setSelectedInvoiceForHistory(null)
									}}
									className='w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-neutral-700-700 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm'
								>
									Close
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}

export default InvoicesPage