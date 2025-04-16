'use client'

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
  FaSpinner
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
}

interface LoadingStates {
  isMainLoading: boolean
  isPDFGenerating: boolean
  isOrderCreating: boolean
  isOrderUpdating: boolean
  isOrderDeleting: boolean
  isOrderAccepting: boolean
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
          <div className='bg-gray bg-opacity-75 p-6 rounded-lg shadow-xl text-white'>
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
  const [sortField, setSortField] = useState<keyof Quotation>('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [filterStartDate, setFilterStartDate] = useState<any>(null)
  const [filterEndDate, setFilterEndDate] = useState<any>(null)
  const [filterClient, setFilterClient] = useState<number | null>(null)
  const [filterStatus, setFilterStatus] = useState<string | null>(null)
  const [totalQuotations, setTotalQuotations] = useState(0)
  const [editingProductIndex, setEditingProductIndex] = useState<number | null>(null)
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null)
  const [allProductVariants, setAllProductVariants] = useState<ProductVariant[]>([])
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
    // Default delivery date set to one month ahead
    delivery_date: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString()
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

  // Fetch data on mount and when filters change
  useEffect(() => {
    fetchQuotations()
    fetchClients()
    fetchProducts()
  }, [currentPage, sortField, sortOrder, filterStartDate, filterEndDate, filterClient, filterStatus, orderNumberSearch])

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

  const updateLoadingState = (key: keyof LoadingStates, value: boolean) => {
    setLoadingStates(prev => ({ ...prev, [key]: value }))
  }

  const handleProductSearch = debounce((searchTerm: string) => {
    setProductSearch(searchTerm)
  }, 300)

  const handleEditExistingProduct = (index: number) => {
    if (!newQuotation.products) return
    const productToEdit = newQuotation.products[index]
    const parentProduct = products.find(p => p.id === productToEdit.product_id)
    if (parentProduct) {
      setSelectedProduct(parentProduct)
      setSelectedVariants([productToEdit])
      setEditingProductIndex(index)
    }
  }

  const fetchQuotations = async () => {
    updateLoadingState('isMainLoading', true)
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
      query = query.order(sortField, { ascending: sortOrder === 'asc' })
      const { data, error, count } = await query.range(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage - 1
      )
      if (error) throw error
      setQuotations(data || [])
      setTotalQuotations(count || 0)
    } catch (error) {
      handleError(error, 'fetch orders')
    } finally {
      updateLoadingState('isMainLoading', false)
    }
  }

  const handleOrderNumberSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
  setOrderNumberSearch(e.target.value);
  setCurrentPage(1); // Reset to first page when searching
};

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
    discounts: { [productId: string]: number },
    includeVAT: boolean
  ) => {
    const subtotal = quotationProducts.reduce((total, quotationProduct) => {
      const parentProduct = products.find(p => p.id === quotationProduct.product_id)
      if (!parentProduct) {
        console.warn(`Product not found: ${quotationProduct.product_id}`)
        return total
      }
      const unitPrice = parentProduct.price
      const discount = discounts[quotationProduct.product_id] || 0
      const discountedPrice = Math.max(0, unitPrice - discount)
      return total + discountedPrice * quotationProduct.quantity
    }, 0)
    const vatAmount = includeVAT ? subtotal * 0.11 : 0
    const totalPrice = subtotal + vatAmount
    return { subtotal, vatAmount, totalPrice }
  }

  const handleDiscountChange = (productId: string, discount: number) => {
    const product = products.find(p => p.id === productId)
    const maxDiscount = product?.price
    if (discount < 0) discount = 0
    if (maxDiscount !== undefined && discount > maxDiscount) discount = maxDiscount
    setNewQuotation(prev => ({
      ...prev,
      discounts: { ...prev.discounts, [productId]: discount }
    }))
    const { totalPrice, vatAmount } = calculateTotalPrice(
      newQuotation.products || [],
      { ...newQuotation.discounts, [productId]: discount },
      newQuotation.include_vat || false
    )
    setNewQuotation(prev => ({
      ...prev,
      total_price: totalPrice,
      vat_amount: vatAmount
    }))
  }

  const handleCreateQuotation = async () => {
    const isUpdate = Boolean(newQuotation.id)
    updateLoadingState(isUpdate ? 'isOrderUpdating' : 'isOrderCreating', true)
    try {
      const { subtotal, vatAmount, totalPrice } = calculateTotalPrice(
        newQuotation.products || [],
        newQuotation.discounts || {},
        newQuotation.include_vat || false
      )
      const quotationData = {
        ...newQuotation,
        total_price: totalPrice,
        vat_amount: vatAmount
      }
      const { error } = await supabase
        .from('Quotations')
        [isUpdate ? 'update' : 'insert'](quotationData)
        .eq(isUpdate ? 'id' : '', isUpdate ? newQuotation.id : '')
      if (error) throw error
      toast.success(`Order ${isUpdate ? 'updated' : 'created'} successfully`)
      setShowModal(false)
      fetchQuotations()
    } catch (error) {
      handleError(error, isUpdate ? 'update order' : 'create order')
    } finally {
      updateLoadingState(isUpdate ? 'isOrderUpdating' : 'isOrderCreating', false)
    }
  }

  const handleAcceptQuotation = async (quotation: Quotation) => {
    updateLoadingState('isOrderAccepting', true)
    try {
      const { error: updateError } = await supabase
        .from('Quotations')
        .update({ status: 'accepted' })
        .eq('id', quotation.id)
      if (updateError) throw new Error(`Error updating quotation status: ${updateError.message}`)
      // Create new invoice from quotation data
      const invoiceData = {
        created_at: new Date().toISOString(),
        total_price: quotation.total_price,
        client_id: quotation.client_id,
        products: quotation.products,
        files: [],
        remaining_amount: quotation.total_price,
        order_number: quotation.order_number,
        include_vat: quotation.include_vat,
        vat_amount: quotation.vat_amount,
        discounts: quotation.discounts,
        type: 'regular',
        currency: quotation.currency,
        payment_term: quotation.payment_term,
        delivery_date: quotation.delivery_date
      }
      const { data: invoice, error: invoiceError } = await supabase
        .from('ClientInvoices')
        .insert(invoiceData)
        .single()
      if (invoiceError) throw new Error(`Error creating invoice: ${invoiceError.message}`)
      // Update product quantities and client balance here if needed...
      toast.success('Order accepted and converted to invoice successfully')
      fetchQuotations()
    } catch (error) {
      handleError(error, 'accept order')
    } finally {
      updateLoadingState('isOrderAccepting', false)
    }
  }
const handleDeleteQuotation = async (id: number) => {
  if (!window.confirm('Are you sure you want to delete this Order?')) {
    return;
  }

  updateLoadingState('isOrderDeleting', true);

  try {
    // First, fetch the quotation to check its status
    const { data: quotation, error: fetchError } = await supabase
      .from('Quotations')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      throw new Error(`Error fetching order details: ${fetchError.message}`);
    }

    // If the quotation status is 'accepted', find and delete the related invoice
    if (quotation && quotation.status === 'accepted') {
      // Find invoice(s) that were created from this quotation
      const { data: relatedInvoices, error: invoiceFetchError } = await supabase
        .from('ClientInvoices')
        .select('*')
        .eq('client_id', quotation.client_id)
        .eq('order_number', quotation.order_number);

      if (invoiceFetchError) {
        throw new Error(`Error finding related invoices: ${invoiceFetchError.message}`);
      }

      if (relatedInvoices && relatedInvoices.length > 0) {
        // Delete each related invoice
        for (const invoice of relatedInvoices) {
          // Delete the invoice
          const { error: invoiceDeleteError } = await supabase
            .from('ClientInvoices')
            .delete()
            .eq('id', invoice.id);

          if (invoiceDeleteError) {
            throw new Error(`Error deleting related invoice: ${invoiceDeleteError.message}`);
          }
        }

        toast.success(`Related ${relatedInvoices.length > 1 ? 'invoices were' : 'invoice was'} also deleted`);
      }
    }

    // Delete the quotation
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
    // Set newQuotation state to the quotation being edited
    setNewQuotation(quotation)
    setShowModal(true)
  }

  const handleQuotationClick = (quotation: Quotation) => {
    setSelectedQuotation(quotation)
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
        product_variant_id: product.variants[0]?.id || '',
        quantity: 1,
        note: product.description || ''
      }
    ])
  }

  const handleAddVariant = () => {
    if (selectedProduct) {
      setSelectedVariants([
        ...selectedVariants,
        {
          product_id: selectedProduct.id,
          product_variant_id: '', // Default to empty string; user must select
          quantity: 1,
          note: selectedProduct.description || ''
        }
      ])
    }
  }

  const handleVariantChange = (index: number, field: keyof QuotationProduct, value: string | number) => {
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
      let updatedProducts = [...(newQuotation.products || [])]
      if (editingProductIndex !== null) {
        updatedProducts[editingProductIndex] = selectedVariants[0]
      } else {
        updatedProducts = [...updatedProducts, ...selectedVariants]
      }
      const { totalPrice, vatAmount } = calculateTotalPrice(
        updatedProducts,
        newQuotation.discounts || {},
        newQuotation.include_vat || false
      )
      setNewQuotation({
        ...newQuotation,
        products: updatedProducts,
        total_price: totalPrice,
        vat_amount: vatAmount
      })
      // Reset product selection
      setSelectedProduct(null)
      setSelectedVariants([])
      setEditingProductIndex(null)
    }
  }

  const handlePDFGeneration = async (quotation: Quotation) => {
    updateLoadingState('isPDFGenerating', true)
    try {
      await generatePDF('quotation', quotation)
      toast.success('PDF generated successfully')
    } catch (error) {
      handleError(error, 'generate PDF')
    } finally {
      updateLoadingState('isPDFGenerating', false)
    }
  }

  const resetProductEditingState = () => {
    setSelectedProduct(null)
    setSelectedVariants([])
    setEditingProductIndex(null)
  }

  const handleCloseModal = () => {
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
      // Default delivery date set to current date (adjust if needed)
      delivery_date: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString(),
      client_id: undefined
    })
    resetProductEditingState()
  }

  const renderQuotationTable = () => (
    <div className='overflow-x-auto bg-white rounded-lg shadow'>
      {loadingStates.isMainLoading ? (
        <div className='flex justify-center items-center p-8'>
          <FaSpinner className='animate-spin text-4xl text-blue' />
        </div>
      ) : (
        <table className='w-full table-auto'>
          <thead>
            <tr className='bg-gray text-white uppercase text-sm leading-normal'>
              <th
                className='py-3 px-6 text-left cursor-pointer'
                onClick={() => handleSort('id')}>
                Order Number {sortField === 'id' && <FaSort className='inline' />}
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
              <th className='py-3 px-6 text-left'>Client</th>
              <th className='py-3 px-6 text-left'>Status</th>
              <th className='py-3 px-6 text-center'>Actions</th>
            </tr>
          </thead>
          <tbody className='text-gray text-sm font-light'>
            {quotations.map(quotation => (
              <tr
                key={quotation.id}
                className='border-b border-gray hover:bg-neutral-100 cursor-pointer'
                onClick={() => handleQuotationClick(quotation)}>
                <td className='py-3 px-6 text-left whitespace-nowrap'>{quotation.id}</td>
                <td className='py-3 px-6 text-left'>
                  {new Date(quotation.created_at).toLocaleDateString() || 'N/A'}
                </td>
                <td className='py-3 px-6 text-left'>
                  ${quotation.total_price?.toFixed(2)}
                </td>
                <td className='py-3 px-6 text-left'>
                  {clients.find(c => c.client_id === quotation.client_id)?.name || '-'}
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
                  <div className='flex items-center justify-center'>
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
                    { quotation.status!== 'accepted' &&
                    <button
                      className='w-4 mr-2 transform hover:text-purple-500 hover:scale-110'
                      onClick={e => {
                        e.stopPropagation()
                        handleEditQuotation(quotation)
                      }}>
                      <FaEdit />
                    </button>
}
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
      )}
    </div>
  )

  const renderPagination = () => {
    const totalPages = Math.ceil(totalQuotations / itemsPerPage)
    return (
      <div className='flex justify-center mt-4'>
        <nav className='relative z-0 inline-flex rounded-md shadow-sm -space-x-px' aria-label='Pagination'>
          <button
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray bg-white text-sm font-medium text-gray hover:bg-neutral-50 ${
              currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''
            }`}>
            <span className='sr-only'>First</span>⟪
          </button>
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className={`relative inline-flex items-center px-2 py-2 border border-gray bg-white text-sm font-medium text-gray hover:bg-neutral-50 ${
              currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''
            }`}>
            <span className='sr-only'>Previous</span>⟨
          </button>
          <span className='relative inline-flex items-center px-4 py-2 border border-gray bg-white text-sm font-medium text-gray'>
            {currentPage} of {totalPages === 0 ? 1 : totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray bg-white text-sm font-medium text-gray hover:bg-neutral-50 ${
              currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''
            }`}>
            <span className='sr-only'>Next</span>⟩
          </button>
        </nav>
      </div>
    )
  }

  const handleFilterClientChange = (clientId: number | null) => {
  setFilterClient(clientId);
  setCurrentPage(1);
};


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
        className='block w-full pl-10 pr-3 py-2 border border-gray rounded-md bg-white placeholder-gray focus:outline-none focus:ring-1 focus:ring-blue sm:text-sm'
      />
      <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
        <FaFilter className='h-5 w-5 text-gray' />
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
        className='block w-full pl-10 pr-3 py-2 border border-gray rounded-md bg-white placeholder-gray focus:outline-none focus:ring-1 focus:ring-blue sm:text-sm'
      />
      <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
        <FaFilter className='h-5 w-5 text-gray' />
      </div>
    </div>

<div className='relative min-w-[200px]'>
  <input
    type='text'
    value={orderNumberSearch}
    onChange={handleOrderNumberSearch}
    placeholder='Search by Order Number'
    className='block w-full pl-10 pr-3 py-2 border border-gray rounded-md leading-5 bg-white placeholder-gray focus:outline-none focus:ring-1 focus:ring-blue focus:border-blue sm:text-sm'
  />
  <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
    <FaSearch className='h-5 w-5 text-gray' />
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
      className='block min-w-[200px] pl-3 pr-10 py-2 text-base border-gray rounded-md focus:outline-none focus:ring-blue sm:text-sm'>
      <option value=''>All Statuses</option>
      <option value='pending'>Pending</option>
      <option value='accepted'>Accepted</option>
      <option value='rejected'>Rejected</option>
    </select>
  </div>
);

  const renderQuotationModal = () => (
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
            <h3 className='text-lg leading-6 font-medium text-gray mb-4'>
              {newQuotation.id ? 'Edit Order' : 'Create New Order'}
            </h3>
            <form>
              <div className='mb-4'>
                <label className='block text-gray text-sm font-bold mb-2' htmlFor='date'>
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
                  className='shadow appearance-none border rounded w-full py-2 px-3 text-gray leading-tight focus:outline-none'
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
                <label className='block text-gray text-sm font-bold mb-2'>Products</label>
                <div className='flex mb-2'>
                  <input
                    type='text'
                    placeholder='Search products...'
                    className='flex-grow shadow appearance-none border rounded py-2 px-3 text-gray leading-tight focus:outline-none'
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
                      className='shadow appearance-none border rounded w-full py-2 px-3 text-gray leading-tight focus:outline-none mb-2'
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
                          className='shadow appearance-none border rounded w-full py-2 px-3 text-gray leading-tight focus:outline-none mb-2'
                          value={variant.product_variant_id}
                          onChange={e =>
                            handleVariantChange(index, 'product_variant_id', e.target.value)
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
                          className='shadow appearance-none border rounded w-full py-2 px-3 text-gray leading-tight focus:outline-none mb-2'
                          value={variant.quantity}
                          onChange={e =>
                            handleVariantChange(index, 'quantity', Number(e.target.value))
                          }
                          placeholder='Quantity'
                        />
                        <textarea
                          className='shadow appearance-none border rounded w-full py-2 px-3 text-gray leading-tight focus:outline-none mb-2'
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
                      Add to Order
                    </button>
                  </div>
                )}
                {newQuotation.products?.map((product, index) => (
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
                          onClick={() => {
                            const updatedProducts = newQuotation.products?.filter((_, i) => i !== index)
                            const { totalPrice, vatAmount } = calculateTotalPrice(
                              updatedProducts || [],
                              newQuotation.discounts || {},
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
                      {newQuotation.discounts?.[product.product_id]
                        ? newQuotation.discounts[product.product_id].toFixed(2)
                        : '0.00'}
                    </p>
                    <p>Note: {product.note || '-'}</p>
                  </div>
                ))}
              </div>
              <div className='mb-4'>
                <label className='block text-gray text-sm font-bold mb-2' htmlFor='note'>
                  Note
                </label>
                <textarea
                  id='note'
                  className='shadow appearance-none border rounded w-full py-2 px-3 text-gray leading-tight focus:outline-none'
                  value={newQuotation.note}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setNewQuotation({ ...newQuotation, note: e.target.value })
                  }
                />
              </div>
              <div className='mb-4'>
                <label className='block text-gray text-sm font-bold mb-2' htmlFor='order_number'>
                  Order Number
                </label>
                <input
                  type='text'
                  id='order_number'
                  required
                  className='shadow appearance-none border rounded w-full py-2 px-3 text-gray leading-tight focus:outline-none'
                  value={newQuotation.order_number}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setNewQuotation({ ...newQuotation, order_number: e.target.value })
                  }
                />
              </div>
              <div className='mb-4'>
                <label className='block text-gray text-sm font-bold mb-2' htmlFor='currency'>
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
                  className='shadow appearance-none border rounded w-full py-2 px-3 text-gray leading-tight focus:outline-none'>
                  <option value='usd'>USD ($)</option>
                  <option value='euro'>EUR (€)</option>
                </select>
              </div>
              <div className='mb-4'>
                <label className='block text-gray text-sm font-bold mb-2' htmlFor='payment_term'>
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
                  className='shadow appearance-none border rounded w-full py-2 px-3 text-gray leading-tight focus:outline-none'>
                  <option value=''>Select Payment Term</option>
                  <option value='100% after delivery'>100% after delivery</option>
                  <option value='30% deposit 70% before shipping'>30% deposit 70% before shipping</option>
                  <option value='30 days after shipping'>30 days after shipping</option>
                  <option value='60 days after shipping'>60 days after shipping</option>
                   <option value='100% prepayment'>100% prepayment</option>
                </select>
              </div>
              <div className='mb-4'>
                <label className='block text-gray text-sm font-bold mb-2' htmlFor='delivery_date'>
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
                  className='shadow appearance-none border rounded w-full py-2 px-3 text-gray leading-tight focus:outline-none'
                  minDate={new Date()}
                  placeholderText='Select delivery date'
                  required
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
                        newQuotation.discounts || {},
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
                  <span className='ml-2 text-gray text-sm'>Include 11% VAT</span>
                </label>
              </div>
              <div className='mb-4'>
                <label className='block text-gray text-sm font-bold mb-2'>
                  Total Price (including VAT if applicable)
                </label>
                <input
                  type='number'
                  className='shadow appearance-none border rounded w-full py-2 px-3 text-gray leading-tight focus:outline-none'
                  value={newQuotation.total_price || 0}
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
                    className='shadow appearance-none border rounded w-full py-2 px-3 text-gray leading-tight focus:outline-none'
                    value={newQuotation.vat_amount || 0}
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
                    className='shadow appearance-none border rounded w-full py-2 px-3 text-gray leading-tight focus:outline-none'
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
                </div>
              )}
            </form>
          </div>
          <div className='bg-neutral-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse'>
            <button
              type='button'
              className='w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue text-base font-medium text-white hover:bg-blue focus:outline-none sm:ml-3 sm:w-auto sm:text-sm'
              onClick={handleCreateQuotation}>
              {newQuotation.id ? 'Update Order' : 'Create Order'}
            </button>
            <button
              type='button'
              className='mt-3 w-full inline-flex justify-center rounded-md border border-gray shadow-sm px-4 py-2 bg-white text-base font-medium text-gray hover:bg-neutral-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm'
              onClick={() => handleCloseModal()}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )

const renderQuotationDetails = () => {
  if (!selectedQuotation) return null;

  const client = clients.find(c => c.client_id === selectedQuotation.client_id);
  const currency = selectedQuotation.currency || 'usd';
  const currencySymbol = currency === 'euro' ? '€' : '$';

  // Updated size options matching PDF - includes existing 48 and adds 50, 52, 54, 56, 58
  const sizeOptions = [
    'OS', 'XXS', 'XS', 'S', 'S/M', 'M', 'M/L', 'L', 'XL', '2XL', '3XL',
    '36', '38', '40', '42', '44', '46', '48', '50', '52', '54', '56', '58'
  ];

  // Calculate totals matching PDF calculation logic
  const subtotal = selectedQuotation.products?.reduce((total, product) => {
    const parentProduct = products.find(p => p.id === product.product_id);
    if (!parentProduct) return total;

    const price = parentProduct.price || 0;
    return total + (price * product.quantity);
  }, 0) || 0;

  const totalDiscount = selectedQuotation.products?.reduce((total, product) => {
    const discount = selectedQuotation.discounts?.[product.product_id] || 0;
    return total + (discount * product.quantity);
  }, 0) || 0;

  const totalBeforeVAT = subtotal - totalDiscount;
  const vatAmount = selectedQuotation.include_vat ? totalBeforeVAT * 0.11 : 0;

  // Transform product data to match PDF format
  const productsByNameColor:any = {};
  selectedQuotation.products?.forEach(product => {
    const parentProduct = products.find(p => p.id === product.product_id);
    if (!parentProduct) return;

    const variant = allProductVariants.find(v => v.id === product.product_variant_id);
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

    // Add quantity to the specific size
    productsByNameColor[key].sizes[variant.size] =
      (productsByNameColor[key].sizes[variant.size] || 0) + product.quantity;

    // Update total quantity
    productsByNameColor[key].totalQuantity += product.quantity;

    // Add note if it exists
    if (product.note) {
      productsByNameColor[key].notes.add(product.note);
    }
  });

  // Convert to array and sort by name then color (matching PDF)
  const productsArray = Object.values(productsByNameColor).sort((a:any, b:any) => {
    const nameComparison = a.name.localeCompare(b.name);
    if (nameComparison !== 0) return nameComparison;
    return a.color.localeCompare(b.color);
  });

  return (
    <div className='fixed inset-0 bg-gray bg-opacity-50 overflow-y-auto h-full w-full'>
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
            <h2 className='text-2xl font-bold text-blue'>PURCHASE ORDER</h2>
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
                  ? 'bg-yellow-200 text-yellow-800'
                  : selectedQuotation.status === 'accepted'
                  ? 'bg-green-200 text-green-800'
                  : 'bg-red-200 text-red-800'
              }`}>{selectedQuotation.status}</span></p>
            </div>
          </div>

          {/* Products Table - Matching PDF Layout with adjusted column widths for additional sizes */}
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
                  {Object.values(productsByNameColor).some((p:any) => p.discount > 0) && (
                    <th className='w-16 p-1 text-xs font-bold text-center border border-neutral-300'>DISCOUNT</th>
                  )}
                  <th className='w-18 p-1 text-xs font-bold text-center border border-neutral-300'>TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {productsArray.map((product:any, index:any) => {
                  const priceAfterDiscount = product.unitPrice - product.discount;
                  const lineTotal = priceAfterDiscount * product.totalQuantity;

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
                        {Array.from(product.notes).map((note:any, i) => (
                          <p key={i} className='text-xs italic text-neutral-600'>{note}</p>
                        ))}
                      </td>
                      <td className='p-1 text-xs text-center border-r border-neutral-300'>{product.color || 'N/A'}</td>

                      {/* Size columns - Adjusted to be more compact */}
                      {sizeOptions.map(size => (
                        <td key={size} className='p-0.5 text-xs text-center border-r border-neutral-300'>
                          {product.sizes[size] ? product.sizes[size] : '-'}
                        </td>
                      ))}

                      <td className='p-1 text-xs text-center border-r border-neutral-300'>{product.totalQuantity}</td>
                      <td className='p-1 text-xs text-center border-r border-neutral-300'>
                        {currencySymbol}{product.unitPrice?.toFixed(2)}
                      </td>

                      {Object.values(productsByNameColor).some((p:any) => p.discount > 0) && (
                        <td className='p-1 text-xs text-center border-r border-neutral-300'>
                          {product.discount > 0 ? `${currencySymbol}${product.discount.toFixed(2)}` : '-'}
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

          {/* Totals Section - Matching PDF Layout */}
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

          {/* Payment Information Section */}

          {/* Note Section */}
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
              className='px-4 py-2 bg-blue text-white font-medium rounded-md shadow-sm hover:bg-blue-700 focus:outline-none'
              onClick={() => handlePDFGeneration(selectedQuotation)}>
              Download PDF
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
  );
};

  return (
    <div className='mx-auto px-4 py-8 text-gray'>
      <h1 className='text-3xl font-bold text-gray mb-6'>Order Management</h1>
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
            vat_amount: 0,
            order_number: '0',
            discounts: {},
            currency: 'usd',
            payment_term: '30% deposit 70% before shipping',
            delivery_date: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString(),
            client_id: undefined
          })
          setShowModal(true)
        }}>
        <FaPlus className='inline-block mr-2' /> Create New Order
      </button>
      {showModal && (
        <div className='fixed z-10 inset-0 overflow-y-auto'>
          <LoadingOverlay isLoading={loadingStates.isOrderCreating || loadingStates.isOrderUpdating}>
            {renderQuotationModal()}
          </LoadingOverlay>
        </div>
      )}
      {renderQuotationDetails()}
    </div>
  )
}

export default QuotationsPage
