'use client'
import { productFunctions } from '../../utils/functions/products'
import React, { useState, useEffect, ChangeEvent, useRef, useCallback } from 'react'
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
  FaSearch,
  FaSpinner,
  FaExclamationTriangle
} from 'react-icons/fa'
import { generatePDF } from '@/utils/pdfGenerator'
import { debounce } from 'lodash'
import { format } from 'date-fns/format'
import SearchableSelect from '@/components/SearchableSelect'

interface QuotationProduct {
  product_id: string
  product_variant_id: string
  quantity: number
  note: string
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
  order_number: string
  discounts: { [productId: string]: number }
  currency: 'usd' | 'euro'
  payment_term:
    | '30% deposit 70% before shipping'
    | '30 days after shipping'
    | '60 days after shipping'
    | '100% after delivery'| '100% prepayment'
  delivery_date: string
  shipping_fee: number
  payment_info: PaymentInfoOption
}

interface LoadingStates {
  isMainLoading: boolean
  isPDFGenerating: boolean
  isOrderCreating: boolean
  isOrderUpdating: boolean
  isOrderDeleting: boolean
  isOrderAccepting: boolean
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

// Error Boundary Component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="bg-error-50 border border-error-200 rounded-md p-4 m-4">
          <div className="flex">
            <FaExclamationTriangle className="text-error-400 mt-1 mr-2" />
            <div>
              <h3 className="text-sm font-medium text-error-800">Something went wrong</h3>
              <p className="text-sm text-error-700 mt-1">
                {this.state.error?.message || 'An unexpected error occurred'}
              </p>
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="mt-2 bg-error-100 hover:bg-error-200 text-error-800 px-3 py-1 rounded text-sm"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

const LoadingOverlay = ({ children, isLoading }: { children: React.ReactNode; isLoading: boolean }) => (
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

const QuotationsPage: React.FC = () => {
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [showModal, setShowModal] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [sortField, setSortField] = useState<keyof Quotation | 'entity_name'>('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [filterStartDate, setFilterStartDate] = useState<any>(null)
  const [filterEndDate, setFilterEndDate] = useState<any>(null)
  const [filterClient, setFilterClient] = useState<number | null>(null)
  const [filterStatus, setFilterStatus] = useState<string | null>(null)
  const [totalQuotations, setTotalQuotations] = useState(0)
  const [editingProductIndex, setEditingProductIndex] = useState<number | null>(null)
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null)
  const [allProductVariants, setAllProductVariants] = useState<ProductVariant[]>([])
  const [error, setError] = useState<string | null>(null)
  const [newQuotation, setNewQuotation] = useState<Partial<Quotation>>({
    created_at: new Date().toISOString(),
    total_price: 0,
    note: '',
    products: [],
    status: 'pending',
    include_vat: false,
    vat_amount: 0,
    order_number: '0',
    discounts: {},
    currency: 'usd',
    payment_term: '30% deposit 70% before shipping',
    delivery_date: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString(),
    shipping_fee: 0,
    payment_info: 'frisson_llc'
  })
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [selectedVariants, setSelectedVariants] = useState<QuotationProduct[]>([])
  const [productSearch, setProductSearch] = useState('')
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [loadingStates, setLoadingStates] = useState<LoadingStates>({
    isMainLoading: true,
    isPDFGenerating: false,
    isOrderCreating: false,
    isOrderUpdating: false,
    isOrderDeleting: false,
    isOrderAccepting: false
  })
  const [orderNumberSearch, setOrderNumberSearch] = useState<string>('');

  // Safe product finder with error handling
  const findProductSafely = useCallback((productId: string) => {
    try {
      if (!productId || !products || products.length === 0) return null
      return products.find(p => p?.id === productId) || null
    } catch (error) {
      console.error('Error finding product:', error)
      return null
    }
  }, [products])

  // Safe variant finder with error handling
  const findVariantSafely = useCallback((product: Product | null, variantId: string) => {
    try {
      if (!product || !variantId || !product.variants || product.variants.length === 0) return null
      return product.variants.find(v => v?.id === variantId) || null
    } catch (error) {
      console.error('Error finding variant:', error)
      return null
    }
  }, [])

  // Safe client finder with error handling
  const findClientSafely = useCallback((clientId: number) => {
    try {
      if (!clientId || !clients || clients.length === 0) return null
      return clients.find(c => c?.client_id === clientId) || null
    } catch (error) {
      console.error('Error finding client:', error)
      return null
    }
  }, [clients])

  useEffect(() => {
    try {
      fetchQuotations()
      fetchClients()
      fetchProducts()
    } catch (error) {
      console.error('Error in useEffect:', error)
      setError('Failed to initialize data')
    }
  }, [currentPage, sortField, sortOrder, filterStartDate, filterEndDate, filterClient, filterStatus, orderNumberSearch])

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

  const handleError = (error: any, context: string) => {
    console.error(`Error in ${context}:`, error)
    const errorMessage = error?.message || `Failed to ${context.toLowerCase()}`
    toast.error(errorMessage)
    setError(errorMessage)
  }

  const updateLoadingState = (key: keyof LoadingStates, value: boolean) => {
    setLoadingStates(prev => ({ ...prev, [key]: value }))
  }

  const handleProductSearch = debounce((searchTerm: string) => {
    try {
      setProductSearch(searchTerm)
    } catch (error) {
      console.error('Error in product search:', error)
    }
  }, 300)

 const handleEditExistingProduct = (index: number) => {
    try {
      if (!newQuotation.products || !Array.isArray(newQuotation.products)) return
      
      const productToEdit = newQuotation.products[index]
      if (!productToEdit || !productToEdit.product_id) return
      
      const parentProduct = findProductSafely(productToEdit.product_id)
      if (parentProduct) {
        setSelectedProduct(parentProduct)
        setSelectedVariants([productToEdit])
        setEditingProductIndex(index)
      }
    } catch (error) {
      console.error('Error editing product:', error)
      toast.error('Failed to edit product')
    }
  }

  const fetchQuotations = async () => {
    updateLoadingState('isMainLoading', true)
    setError(null)
    
    try {
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
      if (orderNumberSearch) {
        query = query.ilike('order_number', `%${orderNumberSearch}%`);
      }

      if (sortField !== 'entity_name') {
        query = query.order(sortField, { ascending: sortOrder === 'asc' })
      }

      const { data, error, count } = await query.range(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage - 1
      )

      if (error) throw error

      let sortedData = data || []
      if (sortField === 'entity_name') {
        sortedData = sortedData.sort((a, b) => {
          const entityA = findClientSafely(a.client_id)?.name || ''
          const entityB = findClientSafely(b.client_id)?.name || ''

          return sortOrder === 'asc'
            ? entityA.localeCompare(entityB)
            : entityB.localeCompare(entityA)
        })
      }

      setQuotations(sortedData)
      setTotalQuotations(count || 0)
    } catch (error) {
      handleError(error, 'fetch orders')
    } finally {
      updateLoadingState('isMainLoading', false)
    }
  }

  const handleOrderNumberSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setOrderNumberSearch(e.target.value);
      setCurrentPage(1);
    } catch (error) {
      console.error('Error in order number search:', error)
    }
  };

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase.from('Clients').select('*').order('name', { ascending: true })
      if (error) {
        throw error
      } else {
        setClients(data || [])
      }
    } catch (error) {
      handleError(error, 'fetch clients')
    }
  }

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase.from('Products').select(`
        *,
        variants:ProductVariants(*)
      `)
      if (error) {
        throw error
      } else {
        setProducts(data || [])
        const variants = data?.flatMap(product => product?.variants || []) || []
        setAllProductVariants(variants)
      }
    } catch (error) {
      handleError(error, 'fetch products')
    }
  }

 const calculateTotalPrice = (
    quotationProducts: QuotationProduct[],
    discounts: { [productId: string]: number },
    includeVAT: boolean,
    shippingFee: number = 0
  ) => {
    try {
      if (!Array.isArray(quotationProducts)) {
        return { subtotal: 0, vatAmount: 0, totalPrice: 0 }
      }

      const subtotal = quotationProducts.reduce((total, quotationProduct) => {
        try {
          if (!quotationProduct || !quotationProduct.product_id) return total

          // Skip products with empty variant_id (invalid/incomplete products)
          if (!quotationProduct.product_variant_id || quotationProduct.product_variant_id.trim() === '') {
            console.log(`Skipping product with empty variant_id: ${quotationProduct.product_id}`)
            return total
          }

          const parentProduct = findProductSafely(quotationProduct.product_id)
          if (!parentProduct || typeof parentProduct.price !== 'number') {
            return total
          }

          const unitPrice = parentProduct.price
          const discount = discounts[quotationProduct.product_id] || 0
          const discountedPrice = Math.max(0, unitPrice - discount)
          const quantity = quotationProduct.quantity || 0

          return total + discountedPrice * quantity
        } catch (error) {
          console.error('Error calculating product total:', error)
          return total
        }
      }, 0)
      
      const vatAmount = includeVAT ? subtotal * 0.11 : 0
      const totalPrice = subtotal + vatAmount + shippingFee
      
      return { subtotal, vatAmount, totalPrice }
    } catch (error) {
      console.error('Error calculating total price:', error)
      return { subtotal: 0, vatAmount: 0, totalPrice: 0 }
    }
  }

  const handleShippingFeeChange = (value: number) => {
    try {
      const fee = value >= 0 ? value : 0;
      
      setNewQuotation(prev => {
        const { totalPrice, vatAmount } = calculateTotalPrice(
          prev.products || [],
          prev.discounts || {},
          prev.include_vat || false,
          fee
        );
        
        return {
          ...prev,
          shipping_fee: fee,
          total_price: totalPrice,
          vat_amount: vatAmount
        };
      });
    } catch (error) {
      console.error('Error handling shipping fee change:', error)
      toast.error('Failed to update shipping fee')
    }
  }

  const handleDiscountChange = (productId: string, discount: number) => {
    try {
      const product = findProductSafely(productId)
      const maxDiscount = product?.price || 0

      if (discount < 0) discount = 0
      if (maxDiscount && discount > maxDiscount) discount = maxDiscount

      // Use functional update to avoid race conditions - update discount and recalculate total in one operation
      setNewQuotation(prev => {
        const updatedDiscounts = { ...prev.discounts, [productId]: discount }
        const { totalPrice, vatAmount } = calculateTotalPrice(
          prev.products || [],
          updatedDiscounts,
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
      console.error('Error handling discount change:', error)
      toast.error('Failed to update discount')
    }
  }

  const calculateRemainingAmount = (invoice: any, newTotalPrice: number | undefined) => {
    try {
      if (!newTotalPrice || !invoice) return invoice?.remaining_amount || 0;

      const paidAmount = (invoice.total_price || 0) - (invoice.remaining_amount || 0);
      return Math.max(0, newTotalPrice - paidAmount);
    } catch (error) {
      console.error('Error calculating remaining amount:', error)
      return 0
    }
  };

  // Enhanced invoice creation with new product history system
  const createInvoiceFromQuotation = async (quotation: Quotation) => {
    try {
      if (!quotation || !quotation.client_id) {
        throw new Error('Invalid quotation data')
      }

      const invoiceData = {
        created_at: new Date().toISOString(),
        total_price: quotation.total_price || 0,
        client_id: quotation.client_id,
        products: quotation.products || [],
        files: [],
        remaining_amount: quotation.total_price || 0,
        order_number: quotation.order_number || '',
        include_vat: quotation.include_vat || false,
        vat_amount: quotation.vat_amount || 0,
        discounts: quotation.discounts || {},
        type: 'regular',
        currency: quotation.currency || 'usd',
        payment_term: quotation.payment_term || '30% deposit 70% before shipping',
        delivery_date: quotation.delivery_date || new Date().toISOString(),
        payment_info: quotation.payment_info || 'frisson_llc',
        shipping_fee: quotation.shipping_fee || 0,
        quotation_id: quotation.id // Add the quotation_id reference
      };
    
      const { data: createdInvoice, error: invoiceError } = await supabase
        .from('ClientInvoices')
        .insert(invoiceData)
        .select()
        .single();
    
      if (invoiceError) {
        throw new Error(`Error creating invoice: ${invoiceError.message}`);
      }
    
      await updateInventoryForInvoice(quotation.products || [], createdInvoice.id, quotation.id);
      
      return createdInvoice;
    } catch (error) {
      console.error('Error creating invoice from quotation:', error)
      throw error
    }
  };
  
  // Enhanced inventory update with new product history system
  const updateInventoryForInvoice = async (
    products: QuotationProduct[], 
    invoiceId: number, 
    quotationId: number
  ) => {
    try {
      if (!Array.isArray(products)) return
      
      for (const product of products) {
        try {
          if (!product || !product.product_variant_id || !product.quantity) continue
          
          const quantityChange = -product.quantity;
          
          // Enhanced tracking with new product history system
          await productFunctions.updateProductVariantQuantity(
            product.product_variant_id,
            quantityChange,
            'quotation', // Updated source type for new system
            invoiceId.toString(),
            `Invoice #${invoiceId} created from Quotation #${quotationId} - inventory reduction`
          );
        } catch (error: any) {
          console.error(`Error updating product ${product?.product_id} quantity:`, error);
          // Log the error but continue with other products
          const parentProduct = findProductSafely(product?.product_id || '')
          const productName = parentProduct?.name || 'Unknown Product'
          console.warn(`Failed to update inventory for product "${productName}" during quotation-to-invoice conversion`)
        }
      }
    } catch (error) {
      console.error('Error updating inventory for invoice:', error)
      throw error
    }
  };


  const updateInventoryWithNetChange = async (
  originalProducts: QuotationProduct[],
  newProducts: QuotationProduct[],
  invoiceId: number,
  quotationId: number
) => {
  // Calculate net changes per variant
  const netChanges = new Map<string, {
    productId: string,
    variantId: string,
    netChange: number,
    originalQty: number,
    newQty: number
  }>()

  // Process original products (reverse their effect - add back to inventory)
  for (const product of originalProducts || []) {
    if (!product.product_variant_id) continue
    
    const effectiveChange = product.quantity; // Add back to inventory
    
    const existing = netChanges.get(product.product_variant_id) || {
      productId: product.product_id,
      variantId: product.product_variant_id,
      netChange: 0,
      originalQty: product.quantity,
      newQty: 0
    }
    
    existing.netChange += effectiveChange // Reverse the original reduction
    netChanges.set(product.product_variant_id, existing)
  }

  // Process new products (apply their effect - remove from inventory)
  for (const product of newProducts || []) {
    if (!product.product_variant_id) continue
    
    const effectiveChange = -product.quantity; // Remove from inventory
    
    const existing = netChanges.get(product.product_variant_id) || {
      productId: product.product_id,
      variantId: product.product_variant_id,
      netChange: 0,
      originalQty: 0,
      newQty: product.quantity
    }
    
    existing.netChange += effectiveChange // Apply the new reduction
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
        note = `Quotation #${quotationId} update - quantity changed from ${change.originalQty} to ${change.newQty}`
      } else {
        note = `Quotation #${quotationId} update - inventory adjustment`
      }
      
      await productFunctions.updateProductVariantQuantity(
        variantId,
        change.netChange,
        'quotation',
        invoiceId.toString(),
        note
      )
    } catch (error: any) {
      console.error(`Error updating product ${change.productId} quantity:`, error)
      const parentProduct = findProductSafely(change.productId)
      const productName = parentProduct?.name || 'Unknown Product'
      console.warn(`Failed to update inventory for product "${productName}" during quotation update`)
    }
  }
}


const updateRelatedInvoices = async (quotation: Partial<Quotation>) => {
  try {
    if (!quotation.id) {
      throw new Error('Missing quotation ID for invoice update');
    }

    // Find invoice by quotation_id instead of order_number
    const { data: relatedInvoice, error: fetchError } = await supabase
      .from('ClientInvoices')
      .select('*')
      .eq('quotation_id', quotation.id)
      .single();

    if (fetchError || !relatedInvoice) {
      console.log('No related invoice found for this quotation, which is expected for newly accepted quotations');
      return;
    }

    // Store original products for inventory adjustment
    const originalProducts = relatedInvoice.products || [];
    const newProducts = quotation.products || [];

    const updatedInvoiceData = {
      total_price: quotation.total_price || 0,
      products: newProducts,
      remaining_amount: calculateRemainingAmount(relatedInvoice, quotation.total_price),
      include_vat: quotation.include_vat || false,
      vat_amount: quotation.vat_amount || 0,
      discounts: quotation.discounts || {},
      currency: quotation.currency || 'usd',
      payment_term: quotation.payment_term || '30% deposit 70% before shipping',
      delivery_date: quotation.delivery_date || new Date().toISOString(),
      payment_info: quotation.payment_info || 'frisson_llc',
      shipping_fee: quotation.shipping_fee || 0,
      order_number: quotation.order_number || '0'
    };

    const { error: updateError } = await supabase
      .from('ClientInvoices')
      .update(updatedInvoiceData)
      .eq('id', relatedInvoice.id);

    if (updateError) {
      throw new Error(`Error updating related invoice: ${updateError.message}`);
    }

    // NEW CODE - SINGLE INVENTORY UPDATE WITH NET CHANGE:
    await updateInventoryWithNetChange(
      originalProducts,
      newProducts,
      relatedInvoice.id,
      quotation.id
    );

    toast.success('Updated invoice and inventory for related order');
  } catch (error) {
    console.error('Error updating related invoice:', error)
    // Don't throw here as it's not critical if the invoice doesn't exist yet
  }
};

  // Enhanced function to reverse inventory changes with new product history system
  const reverseInventoryChanges = async (
    originalProducts: QuotationProduct[], 
    invoiceId: number, 
    quotationId: number
  ) => {
    try {
      if (!Array.isArray(originalProducts)) return

      for (const product of originalProducts) {
        try {
          if (!product || !product.product_variant_id || !product.quantity) continue
          
          // Reverse the original quantity change (add back to inventory)
          const quantityChange = product.quantity;
          
          await productFunctions.updateProductVariantQuantity(
            product.product_variant_id,
            quantityChange,
            'adjustment', // Use adjustment for reversal
            invoiceId.toString(),
            `Quotation #${quotationId} update - reversing previous inventory changes`
          );
        } catch (error: any) {
          console.error(`Error reversing inventory for product ${product?.product_id}:`, error);
          const parentProduct = findProductSafely(product?.product_id || '')
          const productName = parentProduct?.name || 'Unknown Product'
          console.warn(`Failed to reverse inventory for product "${productName}" during quotation update`)
        }
      }
    } catch (error) {
      console.error('Error reversing inventory changes:', error)
      throw error
    }
  };

  const handleCreateQuotation = async () => {
    const isUpdate = Boolean(newQuotation.id);
    const wasAlreadyAccepted = isUpdate && quotations.find(q => q.id === newQuotation.id)?.status === 'accepted';
    const isBeingAccepted = isUpdate && newQuotation.status === 'accepted' && !wasAlreadyAccepted;

    updateLoadingState(isUpdate ? 'isOrderUpdating' : 'isOrderCreating', true);
    setError(null)

    try {
      if (!newQuotation.client_id) {
        throw new Error('Please select a client')
      }

      if (!newQuotation.products || newQuotation.products.length === 0) {
        throw new Error('Please add at least one product')
      }

      // Validate that all products have a valid variant selected
      const invalidProducts = newQuotation.products.filter(
        (product: QuotationProduct) => !product.product_variant_id || product.product_variant_id.trim() === ''
      )
      if (invalidProducts.length > 0) {
        throw new Error('Please select a variant for all products before saving')
      }

      const shippingFee = Number(newQuotation.shipping_fee) || 0;

      const { vatAmount, totalPrice } = calculateTotalPrice(
        newQuotation.products || [],
        newQuotation.discounts || {},
        newQuotation.include_vat || false,
        shippingFee
      );

      const quotationData = {
        ...newQuotation,
        shipping_fee: shippingFee,
        total_price: totalPrice,
        vat_amount: vatAmount,
        payment_info: newQuotation.payment_info || 'frisson_llc'
      };

      const { error } = await supabase
        .from('Quotations')
        [isUpdate ? 'update' : 'insert'](quotationData)
        .eq(isUpdate ? 'id' : '', isUpdate ? newQuotation.id : '');

      if (error) throw error;

      if (wasAlreadyAccepted) {
        await updateRelatedInvoices(newQuotation);
      } else if (isBeingAccepted) {
        await createInvoiceFromQuotation(quotationData as Quotation);
      }

      toast.success(`Order ${isUpdate ? 'updated' : 'created'} successfully`);
      setShowModal(false);
      fetchQuotations();
    } catch (error) {
      handleError(error, isUpdate ? 'update order' : 'create order');
    } finally {
      updateLoadingState(isUpdate ? 'isOrderUpdating' : 'isOrderCreating', false);
    }
  };

  const handleAcceptQuotation = async (quotation: Quotation) => {
    updateLoadingState('isOrderAccepting', true);
    setError(null)
    
    try {
      if (!quotation || !quotation.id) {
        throw new Error('Invalid quotation')
      }

      const { error: updateError } = await supabase
        .from('Quotations')
        .update({ status: 'accepted' })
        .eq('id', quotation.id);

      if (updateError) throw new Error(`Error updating quotation status: ${updateError.message}`);

      await createInvoiceFromQuotation(quotation);

      toast.success('Order accepted and converted to invoice successfully');
      fetchQuotations();
    } catch (error) {
      handleError(error, 'accept order');
    } finally {
      updateLoadingState('isOrderAccepting', false);
    }
  };

  // Enhanced deletion with new product history system
  const handleDeleteQuotation = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this Order?')) {
      return;
    }

    updateLoadingState('isOrderDeleting', true);
    setError(null)

    try {
      const { data: quotation, error: fetchError } = await supabase
        .from('Quotations')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) {
        throw new Error(`Error fetching order details: ${fetchError.message}`);
      }

      if (quotation && quotation.status === 'accepted') {
        // Find invoice by quotation_id
        const { data: relatedInvoice, error: invoiceFetchError } = await supabase
          .from('ClientInvoices')
          .select('*')
          .eq('quotation_id', quotation.id)
          .single();

        if (invoiceFetchError && invoiceFetchError.code !== 'PGRST116') {
          throw new Error(`Error finding related invoice: ${invoiceFetchError.message}`);
        }

        if (relatedInvoice) {
          const { data: receipts, error: receiptsError } = await supabase
            .from('ClientReceipts')
            .select('id')
            .eq('invoice_id', relatedInvoice.id);

          if (receiptsError) {
            throw new Error(`Error checking for receipts: ${receiptsError.message}`);
          }

          if (receipts && receipts.length > 0) {
            toast.error('Cannot delete: This order has related invoice with payments');
            updateLoadingState('isOrderDeleting', false);
            return;
          }

          // Enhanced inventory reversal with new product history system
          await reverseInventoryChanges(
            relatedInvoice.products || [], 
            relatedInvoice.id, 
            quotation.id
          );

          const { error: invoiceDeleteError } = await supabase
            .from('ClientInvoices')
            .delete()
            .eq('id', relatedInvoice.id);

          if (invoiceDeleteError) {
            throw new Error(`Error deleting related invoice: ${invoiceDeleteError.message}`);
          }

          toast.success('Related invoice and inventory changes were reversed');
        }
      }

      const { error: deleteError } = await supabase
        .from('Quotations')
        .delete()
        .eq('id', id);

      if (deleteError) {
        throw new Error(`Error deleting order: ${deleteError.message}`);
      }

      toast.success('Order deleted successfully');
      fetchQuotations();
    } catch (error) {
      handleError(error, 'delete order');
    } finally {
      updateLoadingState('isOrderDeleting', false);
    }
  };

  const handleEditQuotation = (quotation: Quotation) => {
    try {
      if (!quotation) {
        toast.error('Invalid quotation data')
        return
      }

      // Recalculate total based on current product prices to ensure accuracy
      const { totalPrice, vatAmount } = calculateTotalPrice(
        quotation.products || [],
        quotation.discounts || {},
        quotation.include_vat || false,
        quotation.shipping_fee || 0
      )

      setNewQuotation({
        ...quotation,
        shipping_fee: quotation.shipping_fee || 0,
        products: quotation.products || [],
        discounts: quotation.discounts || {},
        payment_info: quotation.payment_info || 'frisson_llc',
        total_price: totalPrice,
        vat_amount: vatAmount
      })
      setShowModal(true)
    } catch (error) {
      console.error('Error editing quotation:', error)
      toast.error('Failed to edit quotation')
    }
  }

  const handleAddProduct = (product: Product) => {
    try {
      if (!product || !product.variants || product.variants.length === 0) {
        toast.error("This product has no available variants.")
        return
      }
      
      setSelectedProduct(product)
      setSelectedVariants([
        {
          product_id: product.id,
          product_variant_id: product.variants[0]?.id || '',
          quantity: 1,
          note: product.description || ''
        }
      ])
    } catch (error) {
      console.error('Error adding product:', error)
      toast.error('Failed to add product')
    }
  }

  const handleAddVariant = () => {
    try {
      if (selectedProduct) {
        setSelectedVariants([
          ...selectedVariants,
          {
            product_id: selectedProduct.id,
            product_variant_id: '',
            quantity: 1,
            note: selectedProduct.description || ''
          }
        ])
      }
    } catch (error) {
      console.error('Error adding variant:', error)
      toast.error('Failed to add variant')
    }
  }

  const handleVariantChange = (index: number, field: keyof QuotationProduct, value: string | number) => {
    try {
      const updatedVariants = [...selectedVariants]
      updatedVariants[index] = { ...updatedVariants[index], [field]: value }
      setSelectedVariants(updatedVariants)
    } catch (error) {
      console.error('Error changing variant:', error)
      toast.error('Failed to update variant')
    }
  }

  const handleRemoveVariant = (index: number) => {
    try {
      const updatedVariants = selectedVariants.filter((_, i) => i !== index)
      setSelectedVariants(updatedVariants)
    } catch (error) {
      console.error('Error removing variant:', error)
      toast.error('Failed to remove variant')
    }
  }

  const handleAddSelectedProductToQuotation = () => {
    try {
      if (selectedProduct && selectedVariants.length > 0) {
        let updatedProducts = [...(newQuotation.products || [])]
        
        if (editingProductIndex !== null) {
          updatedProducts[editingProductIndex] = selectedVariants[0]
        } else {
          updatedProducts = [...updatedProducts, ...selectedVariants]
        }
        
        // Use functional update to avoid race conditions
        setNewQuotation(prev => {
          const { totalPrice, vatAmount } = calculateTotalPrice(
            updatedProducts,
            prev.discounts || {},
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
      }
    } catch (error) {
      console.error('Error adding selected product:', error)
      toast.error('Failed to add product to order')
    }
  }
  


  const handleSort = (field: any) => {
    try {
      if (field === sortField) {
        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
      } else {
        setSortField(field)
        setSortOrder('asc')
      }
    } catch (error) {
      console.error('Error handling sort:', error)
    }
  }



  const handleQuotationClick = (quotation: Quotation) => {
    try {
      setSelectedQuotation(quotation)
    } catch (error) {
      console.error('Error selecting quotation:', error)
    }
  }



  const handlePDFGeneration = async (quotation: Quotation) => {
    updateLoadingState('isPDFGenerating', true)
    setError(null)
    
    try {
      if (!quotation) {
        throw new Error('Invalid quotation data')
      }
      
      await generatePDF('quotation', quotation)
      toast.success('PDF generated successfully')
    } catch (error) {
      handleError(error, 'generate PDF')
    } finally {
      updateLoadingState('isPDFGenerating', false)
    }
  }

  const resetProductEditingState = () => {
    try {
      setSelectedProduct(null)
      setSelectedVariants([])
      setEditingProductIndex(null)
    } catch (error) {
      console.error('Error resetting product editing state:', error)
    }
  }

  const handleCloseModal = () => {
    try {
      setShowModal(false)
      setNewQuotation({
        created_at: new Date().toISOString(),
        total_price: 0,
        note: '',
        products: [],
        status: 'pending',
        include_vat: false,
        vat_amount: 0,
        order_number: '0',
        discounts: {},
        currency: 'usd',
        payment_term: '30% deposit 70% before shipping',
        delivery_date: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString(),
        client_id: undefined,
        shipping_fee: 0,
        payment_info: 'frisson_llc'
      })
      resetProductEditingState()
      setError(null)
    } catch (error) {
      console.error('Error closing modal:', error)
    }
  }

  const renderQuotationTable = () => (
    <ErrorBoundary>
      <div className='overflow-x-auto bg-white rounded-lg shadow'>
        {loadingStates.isMainLoading ? (
          <div className='flex justify-center items-center p-8'>
            <FaSpinner className='animate-spin text-4xl text-primary-500' />
          </div>
        ) : (
          <table className='w-full table-auto'>
            <thead>
              <tr className='bg-gray text-white uppercase text-sm leading-normal'>
                <th
                  className='py-3 px-6 text-left cursor-pointer'
                  onClick={() => handleSort('entity_name')}>
                  Client {sortField === 'entity_name' && <FaSort className='inline' />}
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
                  onClick={() => handleSort('status')}>
                  Status {sortField === 'status' && <FaSort className='inline' />}
                </th>
                <th
                  className='py-3 px-6 text-left cursor-pointer'
                  onClick={() => handleSort('order_number')}>
                  Order Number {sortField === 'order_number' && <FaSort className='inline' />}
                </th>
                <th className='py-3 px-6 text-center'>Actions</th>
              </tr>
            </thead>
            <tbody className='text-neutral-700 text-sm font-light'>
              {quotations.map(quotation => {
                const client = findClientSafely(quotation.client_id)
                
                return (
                  <tr
                    key={quotation.id}
                    className='border-b border-neutral-300 hover:bg-neutral-100 cursor-pointer'
                    onClick={() => handleQuotationClick(quotation)}>
                    <td className='py-3 px-6 text-left whitespace-nowrap'>
                      {client?.name || '-'}
                    </td>
                    <td className='py-3 px-6 text-left'>
                      {quotation.created_at ? new Date(quotation.created_at).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className='py-3 px-6 text-left'>
                      ${(quotation.total_price || 0).toFixed(2)}
                    </td>
                    <td className='py-3 px-6 text-left'>
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          quotation.status === 'pending'
                            ? 'bg-warning-200 text-warning-800'
                            : quotation.status === 'accepted'
                            ? 'bg-success-200 text-success-800'
                            : 'bg-red-200 text-error-800'
                        }`}>
                        {quotation.status}
                      </span>
                    </td>
                    <td className='py-3 px-6 text-left'>{quotation.order_number || '-'}</td>
                    <td className='py-3 px-6 text-center'>
                      <div className='flex items-center justify-center'>
                        {quotation.status === 'pending' && (
                          <button
                            className='w-4 mr-2 transform hover:text-success-500 hover:scale-110'
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
                          className='w-4 mr-2 transform hover:text-error-500 hover:scale-110'
                          onClick={e => {
                            e.stopPropagation()
                            handleDeleteQuotation(quotation.id)
                          }}>
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </ErrorBoundary>
  )

  const renderPagination = () => {
    const totalPages = Math.ceil(totalQuotations / itemsPerPage)
    return (
      <div className='flex justify-center mt-4'>
        <nav className='relative z-0 inline-flex rounded-md shadow-sm -space-x-px' aria-label='Pagination'>
          <button
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-neutral-300 bg-white text-sm font-medium text-neutral-700 hover:bg-neutral-50 ${
              currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''
            }`}>
            <span className='sr-only'>First</span>⟪
          </button>
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className={`relative inline-flex items-center px-2 py-2 border border-neutral-300 bg-white text-sm font-medium text-neutral-700 hover:bg-neutral-50 ${
              currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''
            }`}>
            <span className='sr-only'>Previous</span>⟨
          </button>
          <span className='relative inline-flex items-center px-4 py-2 border border-neutral-300 bg-white text-sm font-medium text-neutral-700'>
            {currentPage} of {totalPages === 0 ? 1 : totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-neutral-300 bg-white text-sm font-medium text-neutral-700 hover:bg-neutral-50 ${
              currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''
            }`}>
            <span className='sr-only'>Next</span>⟩
          </button>
        </nav>
      </div>
    )
  }

  const handleFilterClientChange = (clientId: number | null) => {
    try {
      setFilterClient(clientId);
      setCurrentPage(1);
    } catch (error) {
      console.error('Error changing client filter:', error)
    }
  };

  const renderFilters = () => (
    <ErrorBoundary>
      <div className='mb-6 flex flex-wrap items-center gap-4'>
        <div className='relative min-w-[200px]'>
          <DatePicker
            selected={filterStartDate}
            onChange={(date: Date | null) => setFilterStartDate(date)}
            selectsStart
            startDate={filterStartDate}
            endDate={filterEndDate}
            placeholderText='Start Date'
            className='block w-full pl-10 pr-3 py-2 border border-neutral-300 rounded-md bg-white placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-primary-500 sm:text-sm'
          />
          <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
            <FaFilter className='h-5 w-5 text-neutral-700' />
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
            className='block w-full pl-10 pr-3 py-2 border border-neutral-300 rounded-md bg-white placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-primary-500 sm:text-sm'
          />
          <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
            <FaFilter className='h-5 w-5 text-neutral-700' />
          </div>
        </div>

        <div className='relative min-w-[200px]'>
          <input
            type='text'
            value={orderNumberSearch}
            onChange={handleOrderNumberSearch}
            placeholder='Search by Order Number'
            className='block w-full pl-10 pr-3 py-2 border border-neutral-300 rounded-md leading-5 bg-white placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-blue sm:text-sm'
          />
          <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
            <FaSearch className='h-5 w-5 text-neutral-700' />
          </div>
        </div>
        <div className='flex-grow min-w-[250px]'>
          <SearchableSelect
            options={clients}
            value={filterClient}
            onChange={handleFilterClientChange}
            placeholder="All Clients"
            label="Filter Client"
            idField="client_id"
          />
        </div>

        <select
          onChange={e => setFilterStatus(e.target.value || null)}
          className='block min-w-[200px] pl-3 pr-10 py-2 text-base border-neutral-300 rounded-md focus:outline-none focus:ring-primary-500 sm:text-sm text-neutral-900'>
          <option value='' className='text-neutral-900 bg-white'>All Statuses</option>
          <option value='pending' className='text-neutral-900 bg-white'>Pending</option>
          <option value='accepted' className='text-neutral-900 bg-white'>Accepted</option>
          <option value='rejected' className='text-neutral-900 bg-white'>Rejected</option>
        </select>
      </div>
    </ErrorBoundary>
  );

  const renderQuotationModal = () => {
    const isExistingOrder = Boolean(newQuotation.id);
    const isAcceptedOrder = isExistingOrder && quotations.find(q => q.id === newQuotation.id)?.status === 'accepted';

    return (
      <ErrorBoundary>
        <div className={`fixed z-10 inset-0 overflow-y-auto ${showModal ? '' : 'hidden'}`}>
          <div className='flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0'>
            <div className='fixed inset-0 transition-opacity' aria-hidden='true'>
              <div className='absolute inset-0 bg-gray opacity-75'></div>
            </div>
            <span className='hidden sm:inline-block sm:align-middle sm:h-screen' aria-hidden='true'>
              &#8203;
            </span>
            <div className='inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full'>
              <div className='bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4'>
                <h3 className='text-lg leading-6 font-medium text-neutral-700 mb-4'>
                  {isExistingOrder ? 'Edit Order' : 'Create New Order'}
                </h3>

                {error && (
                  <div className="mb-4 bg-error-50 border border-error-200 rounded-md p-4">
                    <div className="flex">
                      <FaExclamationTriangle className="text-error-400 mt-1 mr-2" />
                      <div>
                        <h3 className="text-sm font-medium text-error-800">Error</h3>
                        <p className="text-sm text-error-700 mt-1">{error}</p>
                      </div>
                    </div>
                  </div>
                )}
      
                {isAcceptedOrder && (
                  <div className="mb-4 p-4 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-700">
                    <h3 className="font-medium">Editing an Accepted Order</h3>
                    <p className="text-sm">
                      This order has already been accepted and converted to an invoice.
                      Any changes you make will also update the related invoice.
                    </p>
                  </div>
                )}

                <form>
                  <div className='mb-4'>
                    <label className='block text-neutral-700 text-sm font-bold mb-2' htmlFor='date'>
                      Date
                    </label>
                    <DatePicker
                      selected={newQuotation.created_at ? new Date(newQuotation.created_at) : new Date()}
                      onChange={(date: Date | null) =>
                        setNewQuotation({
                          ...newQuotation,
                          created_at: date ? date.toISOString() : new Date().toISOString()
                        })
                      }
                      className='shadow appearance-none border rounded w-full py-2 px-3 text-neutral-700 leading-tight focus:outline-none'
                    />
                  </div>
                  <div className='mb-4'>
                    <SearchableSelect
                      options={clients}
                      value={newQuotation.client_id}
                      onChange={(clientId) => setNewQuotation({ ...newQuotation, client_id: Number(clientId) })}
                      placeholder="Select Client"
                      label="Client"
                      idField="client_id"
                      required
                    />
                  </div>
                  <div className='mb-4'>
                    <label className='block text-neutral-700 text-sm font-bold mb-2'>Products</label>
                    <div className='flex mb-2'>
                      <input
                        type='text'
                        placeholder='Search products...'
                        className='flex-grow shadow appearance-none border rounded py-2 px-3 text-neutral-700 leading-tight focus:outline-none'
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
                          className='flex justify-between items-center p-2 hover:bg-neutral-100 cursor-pointer'
                          onClick={() => handleAddProduct(product)}>
                          <span className='text-neutral-900'>{product?.name || 'Unknown Product'}</span>
                          <button
                            type='button'
                            className='bg-success-500 hover:bg-success-700 text-white font-bold py-1 px-2 rounded text-xs'>
                            Select
                          </button>
                        </div>
                      ))}
                    </div>
                    {selectedProduct && (
                      <div className='mb-4 p-2 border rounded'>
                        <h4 className='font-bold mb-2 text-neutral-900'>{selectedProduct.name}</h4>
                        <label className='block text-neutral-700 text-sm font-semibold mb-2' htmlFor='discount'>
                          Discount per item
                        </label>
                        <input
                          type='number'
                          className='shadow appearance-none border rounded w-full py-2 px-3 text-neutral-700 leading-tight focus:outline-none mb-2'
                          value={newQuotation.discounts?.[selectedProduct.id] || 0}
                          min={0}
                          onChange={e =>
                            handleDiscountChange(selectedProduct.id, Number(e.target.value))
                          }
                          placeholder='Discount per item'
                        />
                        {selectedVariants.map((variant, index) => (
                          <div key={index} className='mb-2 p-2 border rounded'>
                            <select
                              className='shadow appearance-none border rounded w-full py-2 px-3 text-neutral-700 leading-tight focus:outline-none mb-2'
                              value={variant.product_variant_id}
                              onChange={e =>
                                handleVariantChange(index, 'product_variant_id', e.target.value)
                              }>
                              <option value=''>Select Variant</option>
                              {selectedProduct.variants?.map(v => (
                                <option key={v.id} value={v.id}>
                                  {v.size} - {v.color}
                                </option>
                              ))}
                            </select>
                            <input
                              type='number'
                              className='shadow appearance-none border rounded w-full py-2 px-3 text-neutral-700 leading-tight focus:outline-none mb-2'
                              value={variant.quantity}
                              onChange={e =>
                                handleVariantChange(index, 'quantity', Number(e.target.value))
                              }
                              placeholder='Quantity'
                            />
                            <textarea
                              className='shadow appearance-none border rounded w-full py-2 px-3 text-neutral-700 leading-tight focus:outline-none mb-2'
                              value={variant.note}
                              onChange={e =>
                                handleVariantChange(index, 'note', e.target.value)
                              }
                              placeholder='Product Note'
                            />
                            <button
                              type='button'
                              className='bg-error-500 hover:bg-error-700 text-white font-bold py-1 px-2 rounded text-xs'
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
                          className='bg-success-500 hover:bg-success-700 text-white font-bold py-1 px-2 rounded text-xs'
                          onClick={handleAddSelectedProductToQuotation}>
                          Add to Order
                        </button>
                      </div>
                    )}
                    {Array.isArray(newQuotation.products) && newQuotation.products.map((product, index) => {
                      if (!product) return null;
                      
                      const parentProduct = findProductSafely(product.product_id || '');
                      const variant = findVariantSafely(parentProduct, product.product_variant_id || '');
                      
                      return (
                        <div key={index} className='mb-2 p-2 border rounded'>
                          <div className='flex justify-between items-center mb-2'>
                            <span className='font-bold'>
                              {parentProduct?.name || 'Unknown Product'}
                            </span>
                            <div className='space-x-2'>
                              <button
                                type='button'
                                className='bg-primary-500 hover:bg-primary-600 text-white font-bold py-1 px-2 rounded text-xs'
                                onClick={() => handleEditExistingProduct(index)}>
                                Edit
                              </button>
                              <button
                                type='button'
                                className='bg-error-500 hover:bg-error-700 text-white font-bold py-1 px-2 rounded text-xs'
                                onClick={() => {
                                  try {
                                    // Use functional update to avoid race conditions
                                    setNewQuotation(prev => {
                                      const updatedProducts = prev.products?.filter((_, i) => i !== index)
                                      const { totalPrice, vatAmount } = calculateTotalPrice(
                                        updatedProducts || [],
                                        prev.discounts || {},
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
                                    toast.error('Failed to remove product')
                                  }
                                }}>
                                Remove
                              </button>
                            </div>
                          </div>
                          <p>
                            Variant: {variant?.size || 'N/A'} - {variant?.color || 'N/A'}
                          </p>
                          <p>Quantity: {product.quantity || 0}</p>
                          <p>
                            Discount per item: $
                            {newQuotation.discounts?.[product.product_id || '']
                              ? newQuotation.discounts[product.product_id || ''].toFixed(2)
                              : '0.00'}
                          </p>
                          <p>Note: {product.note || '-'}</p>
                        </div>
                      )
                    })}
                  </div>
                  <div className='mb-4'>
                    <label className='block text-neutral-700 text-sm font-bold mb-2' htmlFor='note'>
                      Note
                    </label>
                    <textarea
                      id='note'
                      className='shadow appearance-none border rounded w-full py-2 px-3 text-neutral-700 leading-tight focus:outline-none'
                      value={newQuotation.note}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        setNewQuotation({ ...newQuotation, note: e.target.value })
                      }
                    />
                  </div>
                  <div className='mb-4'>
                    <label className='block text-neutral-700 text-sm font-bold mb-2' htmlFor='order_number'>
                      Order Number
                    </label>
                    <input
                      type='text'
                      id='order_number'
                      required
                      className='shadow appearance-none border rounded w-full py-2 px-3 text-neutral-700 leading-tight focus:outline-none'
                      value={newQuotation.order_number}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setNewQuotation({ ...newQuotation, order_number: e.target.value })
                      }
                    />
                  </div>
                  <div className='mb-4'>
                    <label className='block text-neutral-700 text-sm font-bold mb-2' htmlFor='currency'>
                      Currency
                    </label>
                    <select
                      required
                      value={newQuotation.currency || 'usd'}
                      onChange={(e: any) =>
                        setNewQuotation({
                          ...newQuotation,
                          currency: e.target.value || 'usd'
                        })
                      }
                      className='shadow appearance-none border rounded w-full py-2 px-3 text-neutral-700 leading-tight focus:outline-none'>
                      <option value='usd'>USD ($)</option>
                      <option value='euro'>EUR (€)</option>
                    </select>
                  </div>
                  <div className='mb-4'>
                    <label className='block text-neutral-700 text-sm font-bold mb-2' htmlFor='payment_term'>
                      Payment Terms
                    </label>
                    <select
                      required
                      value={newQuotation.payment_term || '30% deposit 70% before shipping'}
                      onChange={(e:any) =>
                        setNewQuotation({
                          ...newQuotation,
                          payment_term: e.target.value || '30% deposit 70% before shipping'
                        })
                      }
                      className='shadow appearance-none border rounded w-full py-2 px-3 text-neutral-700 leading-tight focus:outline-none'>
                      <option value=''>Select Payment Term</option>
                      <option value='100% after delivery'>100% after delivery</option>
                      <option value='30% deposit 70% before shipping'>30% deposit 70% before shipping</option>
                      <option value='30 days after shipping'>30 days after shipping</option>
                      <option value='60 days after shipping'>60 days after shipping</option>
                      <option value='100% prepayment'>100% prepayment</option>
                    </select>
                  </div>
                  <div className='mb-4'>
                    <label className='block text-neutral-700 text-sm font-bold mb-2' htmlFor='delivery_date'>
                      Delivery Date
                    </label>
                    <DatePicker
                      selected={newQuotation.delivery_date ? new Date(newQuotation.delivery_date) : new Date(new Date().setMonth(new Date().getMonth() + 1))}
                      onChange={(date: Date | null) =>
                        setNewQuotation({
                          ...newQuotation,
                          delivery_date: date ? date.toISOString() : new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString()
                        })
                      }
                      className='shadow appearance-none border rounded w-full py-2 px-3 text-neutral-700 leading-tight focus:outline-none'
                      minDate={new Date()}
                      placeholderText='Select delivery date'
                      required
                    />
                  </div>
                  <div className='mb-4'>
                    <label className='block text-neutral-700 text-sm font-bold mb-2' htmlFor='shipping_fee'>
                      Shipping Fee
                    </label>
                    <input
                      id='shipping_fee'
                      type='number'
                      min='0'
                      className='shadow appearance-none border rounded w-full py-2 px-3 text-neutral-700 leading-tight focus:outline-none focus:shadow-outline'
                      value={newQuotation.shipping_fee || 0}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        handleShippingFeeChange(Number(e.target.value))
                      }
                      placeholder='Enter shipping fee'
                    />
                  </div>
                  <div className='mb-4'>
                    <label className='block text-neutral-700 text-sm font-bold mb-2'>
                      Payment Information
                    </label>
                    <select
                      className='shadow appearance-none border rounded w-full py-2 px-3 text-neutral-700 leading-tight focus:outline-none focus:shadow-outline'
                      value={newQuotation.payment_info || 'frisson_llc'}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setNewQuotation({
                          ...newQuotation,
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
                    <label className='flex items-center'>
                      <input
                        type='checkbox'
                        checked={newQuotation.include_vat}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          try {
                            const includeVAT = e.target.checked

                            // Use functional update to avoid race conditions
                            setNewQuotation(prev => {
                              const { totalPrice, vatAmount } = calculateTotalPrice(
                                prev.products || [],
                                prev.discounts || {},
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
                          } catch (error) {
                            console.error('Error handling VAT change:', error)
                            toast.error('Failed to update VAT')
                          }
                        }}
                        className='form-checkbox h-5 w-5 text-primary-500'
                      />
                      <span className='ml-2 text-neutral-700 text-sm'>Include 11% VAT</span>
                    </label>
                  </div>
                  <div className='mb-4'>
                    <label className='block text-neutral-700 text-sm font-bold mb-2'>
                      Total Price (including VAT and shipping if applicable)
                    </label>
                    <input
                      type='number'
                      className='shadow appearance-none border rounded w-full py-2 px-3 text-neutral-700 leading-tight focus:outline-none'
                      value={newQuotation.total_price || 0}
                      readOnly
                    />
                  </div>
                  {newQuotation.include_vat && (
                    <div className='mb-4'>
                      <label className='block text-neutral-700 text-sm font-bold mb-2'>
                        VAT Amount (11%)
                      </label>
                      <input
                        type='number'
                        className='shadow appearance-none border rounded w-full py-2 px-3 text-neutral-700 leading-tight focus:outline-none'
                        value={newQuotation.vat_amount || 0}
                        readOnly
                      />
                    </div>
                  )}
                  {newQuotation.id && (
                    <div className='mb-4'>
                      <label className='block text-neutral-700 text-sm font-bold mb-2'>
                        Status
                      </label>
                      <select
                        className='shadow appearance-none border rounded w-full py-2 px-3 text-neutral-700 leading-tight focus:outline-none'
                        value={newQuotation.status}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                          setNewQuotation({
                            ...newQuotation,
                            status: e.target.value as 'pending' | 'accepted' | 'rejected'
                          })
                        }>
                        <option value='pending'>Pending</option>
                        <option value='accepted'>Accepted</option>
                        <option value='rejected'>Rejected</option>
                      </select>
                      {isAcceptedOrder && newQuotation.status !== 'accepted' && (
                        <p className="mt-1 text-xs text-error-600">
                          Warning: Changing the status from accepted will not remove the related invoice.
                        </p>
                      )}
                      {!isAcceptedOrder && newQuotation.status === 'accepted' && (
                        <p className="mt-1 text-xs text-success-600">
                          This order will be converted to an invoice when saved.
                        </p>
                      )}
                    </div>
                  )}
                </form>
              </div>
              <div className='bg-neutral-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse'>
                <button
                  type='button'
                  className='w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue text-base font-medium text-white hover:bg-blue focus:outline-none sm:ml-3 sm:w-auto sm:text-sm'
                  onClick={handleCreateQuotation}
                  disabled={loadingStates.isOrderCreating || loadingStates.isOrderUpdating}>
                  {newQuotation.id ? 'Update Order' : 'Create Order'}
                </button>
                <button
                  type='button'
                  className='mt-3 w-full inline-flex justify-center rounded-md border border-neutral-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-neutral-700 hover:bg-neutral-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm'
                  onClick={() => handleCloseModal()}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </ErrorBoundary>
    );
  };

  const renderQuotationDetails = () => {
    if (!selectedQuotation) return null;
  
    try {
      const client = findClientSafely(selectedQuotation.client_id);
      const currency = selectedQuotation.currency || 'usd';
      const currencySymbol = currency === 'euro' ? '€' : '$';
  
      const sizeOptions = [
        'OS', 'XXS', 'XS', 'S', 'S/M', 'M', 'M/L', 'L', 'XL', '2XL', '3XL',
        '36', '38', '40', '42', '44', '46', '48', '50', '52', '54', '56', '58'
      ];
  
      const subtotal = (selectedQuotation.products || []).reduce((total, product) => {
        if (!product) return total;
        
        const parentProduct = findProductSafely(product.product_id || '');
        if (!parentProduct) return total;
  
        const price = parentProduct.price || 0;
        return total + (price * (product.quantity || 0));
      }, 0);
  
      const totalDiscount = (selectedQuotation.products || []).reduce((total, product) => {
        if (!product) return total;
        
        const discount = selectedQuotation.discounts?.[product.product_id || ''] || 0;
        return total + (discount * (product.quantity || 0));
      }, 0);
  
      const totalBeforeVAT = subtotal - totalDiscount;
      const vatAmount = selectedQuotation.include_vat ? totalBeforeVAT * 0.11 : 0;
      const shippingFee = selectedQuotation.shipping_fee || 0;
  
      const productsByNameColor: any = {};
      
      (selectedQuotation.products || []).forEach(product => {
        if (!product || !product.product_id) return;
        
        const parentProduct = findProductSafely(product.product_id);
        if (!parentProduct) return;
  
        const variant = findVariantSafely(parentProduct, product.product_variant_id || '');
        if (!variant) return;
  
        const key = `${parentProduct.name}-${variant.color}`;
        if (!productsByNameColor[key]) {
          productsByNameColor[key] = {
            product_id: parentProduct.id,
            name: parentProduct.name,
            color: variant.color,
            image: parentProduct.photo,
            unitPrice: parentProduct.price,
            sizes: {},
            notes: new Set(),
            totalQuantity: 0,
            discount: selectedQuotation.discounts?.[parentProduct.id] || 0
          };
        }
  
        productsByNameColor[key].sizes[variant.size] =
          (productsByNameColor[key].sizes[variant.size] || 0) + (product.quantity || 0);
  
        productsByNameColor[key].totalQuantity += (product.quantity || 0);
  
        if (product.note) {
          productsByNameColor[key].notes.add(product.note);
        }
      });
  
      const productsArray = Object.values(productsByNameColor).sort((a: any, b: any) => {
        const nameComparison = (a.name || '').localeCompare(b.name || '');
        if (nameComparison !== 0) return nameComparison;
        return (a.color || '').localeCompare(b.color || '');
      });
  
      return (
        <ErrorBoundary>
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
                  <h2 className='text-2xl font-bold text-primary-500'>PURCHASE ORDER</h2>
                </div>
  
                <div className='flex justify-between mb-6'>
                  <div className='w-1/2 pr-4'>
                    <h4 className='font-bold mb-2'>Order To:</h4>
                    <p className='text-sm'>{client?.name || 'N/A'}</p>
                    <p className='text-sm'>{client?.address || 'N/A'}</p>
                    <p className='text-sm'>Phone: {client?.phone || 'N/A'}</p>
                    <p className='text-sm'>Email: {client?.email || 'N/A'}</p>
                    <p className='text-sm'>Tax Number: {client?.tax_number || 'N/A'}</p>
                  </div>
  
                  <div className='w-1/2 pl-4'>
                    <h4 className='font-bold mb-2'>Order Details:</h4>
                    <p className='text-sm'>Order Number: {selectedQuotation.id || 'N/A'}</p>
                    <p className='text-sm'>Date: {selectedQuotation.created_at ? format(new Date(selectedQuotation.created_at), 'PP') : 'N/A'}</p>
                    <p className='text-sm'>Order Number: {selectedQuotation.order_number || 'N/A'}</p>
                    {selectedQuotation.delivery_date && (
                      <p className='text-sm'>Delivery Date: {format(new Date(selectedQuotation.delivery_date), 'PP')}</p>
                    )}
                    {selectedQuotation.payment_term && (
                      <p className='text-sm'>Payment Term: {selectedQuotation.payment_term}</p>
                    )}
                    <p className='text-sm'>Status: <span className={`px-2 py-1 rounded-full text-xs ${
                      selectedQuotation.status === 'pending'
                        ? 'bg-warning-200 text-warning-800'
                        : selectedQuotation.status === 'accepted'
                        ? 'bg-success-200 text-success-800'
                        : 'bg-red-200 text-error-800'
                    }`}>{selectedQuotation.status}</span></p>
                  </div>
                </div>
  
                <div className='mb-6 overflow-x-auto'>
                  <table className='min-w-full border border-neutral-300 text-xs'>
                    <thead>
                      <tr className='bg-neutral-100'>
                        <th className='w-14 p-1 text-xs font-bold text-center border border-neutral-300'>IMAGE</th>
                        <th className='w-20 p-1 text-xs font-bold text-center border border-neutral-300'>STYLE</th>
                        <th className='w-20 p-1 text-xs font-bold text-center border border-neutral-300'>DESCRIPTION</th>
                        <th className='w-14 p-1 text-xs font-bold text-center border border-neutral-300'>COLOR</th>
                        {sizeOptions.map(size => (
                          <th key={size} className='w-7 p-0.5 text-xs font-bold text-center border border-neutral-300'>{size}</th>
                        ))}
                        <th className='w-14 p-1 text-xs font-bold text-center border border-neutral-300'>TOTAL PCS</th>
                        <th className='w-16 p-1 text-xs font-bold text-center border border-neutral-300'>UNIT PRICE</th>
                        {Object.values(productsByNameColor).some((p: any) => (p.discount || 0) > 0) && (
                          <th className='w-16 p-1 text-xs font-bold text-center border border-neutral-300'>DISCOUNT</th>
                        )}
                        <th className='w-18 p-1 text-xs font-bold text-center border border-neutral-300'>TOTAL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productsArray.map((product: any, index: any) => {
                        const priceAfterDiscount = (product.unitPrice || 0) - (product.discount || 0);
                        const lineTotal = priceAfterDiscount * (product.totalQuantity || 0);
  
                        return (
                          <tr key={index} className='border-b border-neutral-300'>
                            <td className='p-1 text-center border-r border-neutral-300'>
                              {product.image ? (
                                <img src={product.image} alt={product.name} className='w-10 h-10 object-contain mx-auto' />
                              ) : (
                                <div className='w-10 h-10 bg-neutral-200 mx-auto'></div>
                              )}
                            </td>
                            <td className='p-1 text-xs font-semibold border-r border-neutral-300'>{product.name || 'N/A'}</td>
                            <td className='p-1 text-xs border-r border-neutral-300'>
                              {Array.from(product.notes || []).map((note: any, i) => (
                                <p key={i} className='text-xs italic text-neutral-600'>{note}</p>
                              ))}
                            </td>
                            <td className='p-1 text-xs text-center border-r border-neutral-300'>{product.color || 'N/A'}</td>
  
                            {sizeOptions.map(size => (
                              <td key={size} className='p-0.5 text-xs text-center border-r border-neutral-300'>
                                {product.sizes[size] ? product.sizes[size] : '-'}
                              </td>
                            ))}
  
                            <td className='p-1 text-xs text-center border-r border-neutral-300'>{product.totalQuantity || 0}</td>
                            <td className='p-1 text-xs text-center border-r border-neutral-300'>
                              {currencySymbol}{(product.unitPrice || 0).toFixed(2)}
                            </td>
  
                            {Object.values(productsByNameColor).some((p: any) => (p.discount || 0) > 0) && (
                              <td className='p-1 text-xs text-center border-r border-neutral-300'>
                                {(product.discount || 0) > 0 ? `${currencySymbol}${product.discount.toFixed(2)}` : '-'}
                              </td>
                            )}
  
                            <td className='p-1 text-xs text-center border-r border-neutral-300'>
                              {currencySymbol}{lineTotal.toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
  
                <div className='flex flex-col items-end mb-6 mt-4'>
                  {Math.abs(subtotal) !== Math.abs(selectedQuotation.total_price || 0) && (
                    <div className='flex justify-end mb-1 w-1/3'>
                      <div className='w-1/2 font-bold text-right pr-4'>Subtotal:</div>
                      <div className='w-1/2 text-right'>
                        {currencySymbol}{subtotal.toFixed(2)}
                      </div>
                    </div>
                  )}
  
                  {totalDiscount > 0 && (
                    <div className='flex justify-end mb-1 w-1/3'>
                      <div className='w-1/2 font-bold text-right pr-4'>Total Discount:</div>
                      <div className='w-1/2 text-right'>
                        {currencySymbol}{totalDiscount.toFixed(2)}
                      </div>
                    </div>
                  )}
  
                  {selectedQuotation.include_vat && (
                    <>
                      {totalBeforeVAT !== subtotal && (
                        <div className='flex justify-end mb-1 w-1/3'>
                          <div className='w-1/2 font-bold text-right pr-4'>Total Before VAT:</div>
                          <div className='w-1/2 text-right'>
                            {currencySymbol}{totalBeforeVAT.toFixed(2)}
                          </div>
                        </div>
                      )}
                      <div className='flex justify-end mb-1 w-1/3'>
                        <div className='w-1/2 font-bold text-right pr-4'>VAT (11%):</div>
                        <div className='w-1/2 text-right'>
                          {currencySymbol}{vatAmount.toFixed(2)}
                        </div>
                      </div>
                    </>
                  )}
  
                  {shippingFee > 0 && (
                    <div className='flex justify-end mb-1 w-1/3'>
                      <div className='w-1/2 font-bold text-right pr-4'>Shipping Fee:</div>
                      <div className='w-1/2 text-right'>
                        {currencySymbol}{shippingFee.toFixed(2)}
                      </div>
                    </div>
                  )}
  
                  <div className='flex justify-end mb-1 w-1/3'>
                    <div className='w-1/2 font-bold text-right pr-4'>Total:</div>
                    <div className='w-1/2 text-right font-bold'>
                      {currencySymbol}{(selectedQuotation.total_price || 0).toFixed(2)}
                    </div>
                  </div>
  
                  <div className='w-2/3 text-right italic text-sm text-neutral-600 mt-1'>
                    Amount in words: [Amount in words would appear here]
                  </div>
                </div>
  
                {/* Payment Information Section - Updated to match invoice style */}
                <div className='border-t border-neutral-300 pt-4 mb-6'>
                  <h4 className='font-bold mb-2'>Payment Information:</h4>
                  {selectedQuotation.payment_info && (
                    <PaymentInfoDisplay option={selectedQuotation.payment_info} />
                  )}
                </div>
  
                {selectedQuotation.note && (
                  <div className='mb-6'>
                    <h4 className='font-bold mb-2'>Additional Notes:</h4>
                    <p className='text-sm'>{selectedQuotation.note}</p>
                  </div>
                )}
  
                <div className='text-center text-neutral-500 text-sm mb-4'>
                  Thank you for your business!
                </div>
  
                <div className='flex justify-center space-x-4 mt-6'>
                  <button
                    className='px-4 py-2 bg-blue text-white font-medium rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none'
                    onClick={() => handlePDFGeneration(selectedQuotation)}>
                    Download PDF
                  </button>
  
                  <button
                    className='px-4 py-2 bg-blue text-white font-medium rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none'
                    onClick={() => {
                      setSelectedQuotation(null);
                      handleEditQuotation(selectedQuotation);
                    }}>
                    Edit Order
                  </button>
  
                  <button
                    className='px-4 py-2 bg-gray text-white font-medium rounded-md shadow-sm hover:bg-neutral-700 focus:outline-none'
                    onClick={() => setSelectedQuotation(null)}>
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </ErrorBoundary>
      );
    } catch (error) {
      console.error('Error rendering quotation details:', error)
      return (
        <div className='fixed inset-0 bg-neutral-900 bg-opacity-50 overflow-y-auto h-full w-full'>
          <div className='relative top-10 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white'>
            <div className="bg-error-50 border border-error-200 rounded-md p-4">
              <div className="flex">
                <FaExclamationTriangle className="text-error-400 mt-1 mr-2" />
                <div>
                  <h3 className="text-sm font-medium text-error-800">Error Loading Order Details</h3>
                  <p className="text-sm text-error-700 mt-1">
                    Failed to load order details. Please try again.
                  </p>
                  <button
                    onClick={() => setSelectedQuotation(null)}
                    className="mt-2 bg-error-100 hover:bg-error-200 text-error-800 px-3 py-1 rounded text-sm"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    }
  };

  return (
    <ErrorBoundary>
      <div className='min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 p-6 sm:p-8'>
        <div className='max-w-7xl mx-auto'>
          <div className='mb-8 animate-fade-in'>
            <h1 className='text-4xl font-bold text-neutral-800 mb-2'>Order Management</h1>
            <p className='text-neutral-600'>Create and manage client orders and quotations</p>
          </div>
        
          {error && (
            <div className="mb-6 bg-error-50 border border-error-200 rounded-md p-4">
              <div className="flex">
                <FaExclamationTriangle className="text-error-400 mt-1 mr-2" />
                <div>
                  <h3 className="text-sm font-medium text-error-800">Error</h3>
                  <p className="text-sm text-error-700 mt-1">{error}</p>
                  <button
                    onClick={() => setError(null)}
                    className="mt-2 bg-error-100 hover:bg-error-200 text-error-800 px-3 py-1 rounded text-sm"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          )}
        
          <div className='card'>
            <div className='p-6'>
              {renderFilters()}
              {renderQuotationTable()}
              {renderPagination()}
            </div>
          </div>
          <button
            className='mt-6 btn-primary flex items-center gap-2'
            onClick={() => {
              try {
                setNewQuotation({
                  created_at: new Date().toISOString(),
                  total_price: 0,
                  note: '',
                  products: [],
                  status: 'pending',
                  include_vat: false,
                  vat_amount: 0,
                  order_number: '0',
                  discounts: {},
                  currency: 'usd',
                  payment_term: '30% deposit 70% before shipping',
                  delivery_date: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString(),
                  client_id: undefined,
                  shipping_fee: 0
                })
                setError(null)
                setShowModal(true)
              } catch (error) {
                console.error('Error creating new order:', error)
                toast.error('Failed to create new order')
              }
            }}>
            <FaPlus /> Create New Order
          </button>
          {showModal && (
            <div className='fixed z-10 inset-0 overflow-y-auto'>
              <LoadingOverlay isLoading={loadingStates.isOrderCreating || loadingStates.isOrderUpdating}>
                {renderQuotationModal()}
              </LoadingOverlay>
            </div>
          )}
          {selectedQuotation && renderQuotationDetails()}
        </div>
      </div>
    </ErrorBoundary>
  )
}

export default QuotationsPage