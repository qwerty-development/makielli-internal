'use client'

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import React, { useState, useEffect } from 'react'
import {
  clientFunctions,
  Client,
  Company
} from '../../../../utils/functions/clients'
import { supabase } from '../../../../utils/supabase'
import { productFunctions } from '../../../../utils/functions/products'
import { format } from 'date-fns'
import { FaSort, FaFile, FaDownload, FaInfoCircle, FaSync, FaHistory, FaBox, FaLink, FaFileInvoice, FaTruck, FaShippingFast, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa'
import { generatePDF } from '@/utils/pdfGenerator'
import { toast } from 'react-hot-toast'

interface InvoiceProduct {
  product_variant_id: string
  quantity: number
  note: string
}

interface InvoiceProductWithDetails extends InvoiceProduct {
  variantDetails?: {
    id: string
    size: string
    color: string
    quantity: number
    product: {
      id: string
      name: string
      price: number
      photo: string | null
    }
  }
}

interface QuotationProduct {
  product_variant_id: string
  quantity: number
  note: string
}

interface QuotationProductWithDetails extends QuotationProduct {
  variantDetails?: {
    id: string
    size: string
    color: string
    quantity: number
    product: {
      id: string
      name: string
      price: number
      photo: string | null
    }
  }
}

interface Invoice {
  id: number
  created_at: string
  total_price: number
  remaining_amount: number
  products: InvoiceProduct[]
  files: string[]
  currency?: string
  type?: string
  quotation_id?: number | null
  order_number?: string
  shipping_status?: 'unshipped' | 'partially_shipped' | 'fully_shipped'
}

interface Receipt {
  id: number
  paid_at: string
  amount: number
  invoice_id: number
  files: string[]
  currency?: string
}

interface Quotation {
  id: number
  created_at: string
  total_price: number
  note: string
  client_id: number
  products: InvoiceProduct[]
  status: 'pending' | 'accepted' | 'rejected'
  include_vat: boolean
  vat_amount: number
  order_number: string
  discounts: { [productId: string]: number }
  currency: 'usd' | 'euro'
  payment_term: string
  delivery_date: string
}

interface BalanceCalculation {
  calculatedBalance: number
  databaseBalance: number
  isReconciled: boolean
  difference: number
  totalInvoices: number
  totalReturns: number
  totalReceipts: number
  lastUpdated: string
}

export default function ClientDetailsPage({
  params
}: {
  params: { clientId: string }
}) {
  const router = useRouter()
  const [client, setClient] = useState<Client | null>(null)
  const [companies, setCompanies] = useState<Company[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [balanceInfo, setBalanceInfo] = useState<BalanceCalculation | null>(null)
  const [isRecalculatingBalance, setIsRecalculatingBalance] = useState(false)

  const [isEditing, setIsEditing] = useState(false)
  const [editedClient, setEditedClient] = useState<Client | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [invoiceProductDetails, setInvoiceProductDetails] = useState<{[invoiceId: number]: InvoiceProductWithDetails[]}>({})
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [quotationProductDetails, setQuotationProductDetails] = useState<{[quotationId: number]: QuotationProductWithDetails[]}>({})
  const [activeTab, setActiveTab] = useState('details')
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null)
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null)
  const [sortField, setSortField] = useState<keyof Invoice | keyof Receipt | keyof Quotation>(
    'id'
  )
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    if (params.clientId) {
      fetchClientDetails()
      fetchInvoices()
      fetchReceipts()
      fetchQuotations()
      fetchCompanies()
      calculateClientBalance()
    }
  }, [params.clientId])

  const fetchClientDetails = async () => {
    try {
      setIsLoading(true)
      const clientData = await clientFunctions.getClientById(
        Number(params.clientId)
      )
      setClient(clientData)
      setEditedClient(clientData)

    } catch (error:any) {
      console.error('Error fetching client details:', error)
      toast.error('Failed to fetch client details. Please try again later.'+ error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const calculateClientBalance = async () => {
    try {
      // Fetch current database balance
      const { data: clientData, error: clientError } = await supabase
        .from('Clients')
        .select('balance')
        .eq('client_id', params.clientId)
        .single()

      if (clientError) {
        throw new Error(`Failed to fetch client balance: ${clientError.message}`)
      }

      // Fetch all invoices
      const { data: invoicesData, error: invoiceError } = await supabase
        .from('ClientInvoices')
        .select('*')
        .eq('client_id', params.clientId)
        .order('created_at', { ascending: true })

      if (invoiceError) {
        throw new Error(`Failed to fetch invoices: ${invoiceError.message}`)
      }

      // Fetch all receipts with currency information
      const { data: receiptsData, error: receiptError } = await supabase
        .from('ClientReceipts')
        .select(`
          *,
          ClientInvoices!inner(currency)
        `)
        .eq('client_id', params.clientId)
        .order('paid_at', { ascending: true })

      let processedReceipts = receiptsData || []
      
      if (receiptError) {
        // Fallback to separate queries
        const { data: receiptsOnly, error: receiptError2 } = await supabase
          .from('ClientReceipts')
          .select('*')
          .eq('client_id', params.clientId)
          .order('paid_at', { ascending: true })

        if (receiptError2) {
          throw new Error(`Failed to fetch receipts: ${receiptError2.message}`)
        }

        processedReceipts = await Promise.all(
          (receiptsOnly || []).map(async (receipt) => {
            const { data: invoiceData } = await supabase
              .from('ClientInvoices')
              .select('currency')
              .eq('id', receipt.invoice_id)
              .single()
            
            return {
              ...receipt,
              ClientInvoices: { currency: invoiceData?.currency || 'usd' }
            }
          })
        )
      }

      // Calculate totals
      let totalInvoices = 0
      let totalReturns = 0
      let calculatedBalance = 0;

      // Process invoices
      (invoicesData || []).forEach((invoice: { total_price: any; type: string }) => {
        const amount = Math.abs(invoice.total_price || 0)
        if (invoice.type === 'return') {
          totalReturns += amount
          calculatedBalance -= amount
        } else {
          totalInvoices += amount
          calculatedBalance += amount
        }
      })

      // Process receipts
      let totalReceipts = 0
      processedReceipts.forEach(receipt => {
        const amount = Math.abs(receipt.amount || 0)
        totalReceipts += amount
        calculatedBalance -= amount
      })

      const databaseBalance = clientData.balance || 0
      const difference = Math.abs(calculatedBalance - databaseBalance)
      const isReconciled = difference <= 0.01

      // Update database balance if there's a significant difference
      if (!isReconciled) {
        console.log(`Updating client balance from ${databaseBalance} to ${calculatedBalance}`)
        
        const { error: updateError } = await supabase
          .from('Clients')
          .update({ balance: calculatedBalance })
          .eq('client_id', params.clientId)

        if (updateError) {
          console.error('Failed to update client balance:', updateError)
        } else {
          // Refresh client data to show updated balance
          await fetchClientDetails()
        }
      }

      setBalanceInfo({
        calculatedBalance,
        databaseBalance,
        isReconciled,
        difference,
        totalInvoices,
        totalReturns,
        totalReceipts,
        lastUpdated: new Date().toISOString()
      })

    } catch (error: any) {
      console.error('Error calculating client balance:', error)
      toast.error('Failed to calculate client balance: ' + error.message)
    }
  }

  const handleRecalculateBalance = async () => {
    setIsRecalculatingBalance(true)
    try {
      await calculateClientBalance()
      toast.success('Balance recalculated successfully')
    } catch (error) {
      toast.error('Failed to recalculate balance')
    } finally {
      setIsRecalculatingBalance(false)
    }
  }

  const fetchCompanies = async () => {
    try {
      const companiesData = await clientFunctions.getAllCompanies()
      setCompanies(companiesData)
    } catch (error) {
      console.error('Error fetching companies:', error)
      toast.error('Failed to fetch companies. Please try again later.')
    }
  }

  const fetchInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from('ClientInvoices')
        .select('*')
        .eq('client_id', params.clientId)
        .order(sortField as string, { ascending: sortOrder === 'asc' })

      if (error) throw error
      setInvoices(data || [])

      // Fetch product details for each invoice
      const productDetailsMap: {[invoiceId: number]: InvoiceProductWithDetails[]} = {}

      for (const invoice of data || []) {
        if (invoice.products && Array.isArray(invoice.products)) {
          // Filter out null/undefined products before processing
          const validProducts = invoice.products.filter((p: any) => p !== null && p !== undefined && p.product_variant_id)
          const variantIds = validProducts.map((p: InvoiceProduct) => p.product_variant_id)

          try {
            const variantDetails = await productFunctions.getVariantsWithProductDetails(variantIds)

            productDetailsMap[invoice.id] = validProducts.map((product: InvoiceProduct) => {
              const details = variantDetails.find(v => v.id === product.product_variant_id)
              return {
                ...product,
                variantDetails: details || undefined
              }
            })
          } catch (productError) {
            console.error(`Error fetching product details for invoice ${invoice.id}:`, productError)
            productDetailsMap[invoice.id] = validProducts
          }
        }
      }
      
      setInvoiceProductDetails(productDetailsMap)
    } catch (error:any) {
      console.error('Error fetching invoices:', error)
      toast.error('Failed to fetch invoices. Please try again later.'+ error.message)
    }
  }

  const fetchReceipts = async () => {
    try {
      // Enhanced fetch with currency information
      const { data, error } = await supabase
        .from('ClientReceipts')
        .select(`
          *,
          ClientInvoices!inner(currency)
        `)
        .eq('client_id', params.clientId)
        .order(sortField as string, { ascending: sortOrder === 'asc' })

      if (error) {
        // Fallback to simple query if join fails
        const { data: receiptsData, error: receiptError } = await supabase
          .from('ClientReceipts')
          .select('*')
          .eq('client_id', params.clientId)
          .order(sortField as string, { ascending: sortOrder === 'asc' })

        if (receiptError) throw receiptError

        // Get currency for each receipt separately
        const receiptsWithCurrency = await Promise.all(
          (receiptsData || []).map(async (receipt) => {
            const { data: invoiceData } = await supabase
              .from('ClientInvoices')
              .select('currency')
              .eq('id', receipt.invoice_id)
              .single()
            
            return {
              ...receipt,
              currency: receipt.currency || invoiceData?.currency || 'usd'
            }
          })
        )

        setReceipts(receiptsWithCurrency)
      } else {
        // Process joined data
        const processedReceipts = (data || []).map(receipt => ({
          ...receipt,
          currency: receipt.currency || receipt.ClientInvoices?.currency || 'usd'
        }))
        setReceipts(processedReceipts)
      }
    } catch (error:any) {
      console.error('Error fetching receipts:', error)
      toast.error('Failed to fetch receipts. Please try again later.'+ error.message)
    }
  }

  // Function to fetch quotations
  const fetchQuotations = async () => {
    try {
      const { data, error } = await supabase
        .from('Quotations')
        .select('*')
        .eq('client_id', params.clientId)
        .order(sortField as string, { ascending: sortOrder === 'asc' })

      if (error) throw error
      setQuotations(data || [])

      // Fetch product details for each quotation
      const productDetailsMap: {[quotationId: number]: QuotationProductWithDetails[]} = {}

      for (const quotation of data || []) {
        if (quotation.products && Array.isArray(quotation.products)) {
          // Filter out null/undefined products before processing
          const validProducts = quotation.products.filter((p: any) => p !== null && p !== undefined && p.product_variant_id)
          const variantIds = validProducts.map((p: QuotationProduct) => p.product_variant_id)

          try {
            const variantDetails = await productFunctions.getVariantsWithProductDetails(variantIds)

            productDetailsMap[quotation.id] = validProducts.map((product: QuotationProduct) => {
              const details = variantDetails.find(v => v.id === product.product_variant_id)
              return {
                ...product,
                variantDetails: details || undefined
              }
            })
          } catch (productError) {
            console.error(`Error fetching product details for quotation ${quotation.id}:`, productError)
            productDetailsMap[quotation.id] = validProducts
          }
        }
      }

      setQuotationProductDetails(productDetailsMap)
    } catch (error:any) {
      console.error('Error fetching quotations:', error)
      toast.error('Failed to fetch orders. Please try again later.'+ error.message)
    }
  }

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditedClient(client)
  }

  const handleSaveEdit = async () => {
    if (!editedClient) return

    try {
      await clientFunctions.updateClient(editedClient.client_id, editedClient)
      setClient(editedClient)
      setIsEditing(false)

      toast.success('Client updated successfully')
    } catch (error:any) {
      console.error('Error updating client:', error)

      toast.error('Failed to update client'+ error?.message )
    }
  }

  const handleDelete = async () => {
    if (!client) return

    if (window.confirm('Are you sure you want to delete this client?')) {
      try {
        await clientFunctions.deleteClient(client.client_id)
        toast.success('Client deleted successfully')
        window.location.href = '/clients'
      } catch (error:any) {
        console.error('Error deleting client:', error)

        toast.error('Failed to delete client'+error.message)
      }
    }
  }

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    if (!editedClient) return

    const { name, value } = e.target
    setEditedClient({
      ...editedClient,
      [name]: name === 'company_id' ? Number(value) : value
    })
  }

  const handleSort = (field: keyof Invoice | keyof Receipt | keyof Quotation) => {
    if (field === sortField) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
    if (activeTab === 'invoices') {
      fetchInvoices()
    } else if (activeTab === 'receipts') {
      fetchReceipts()
    } else if (activeTab === 'quotations') {
      fetchQuotations()
    }
  }

  const handleInvoiceClick = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
  }

  const handleReceiptClick = (receipt: Receipt) => {
    setSelectedReceipt(receipt)
  }

  // Handler for quotation clicks
  const handleQuotationClick = (quotation: Quotation) => {
    setSelectedQuotation(quotation)
  }

  const getCompanyName = (companyId: number) => {
    const company = companies.find(c => c.id === companyId)
    return company ? company.name : 'Unknown Company'
  }

  const getCurrencySymbol = (currency: string | undefined): string => {
    return currency === 'euro' ? '€' : '$'
  }

  const getInvoiceProductsPreview = (invoiceId: number): string => {
    const products = invoiceProductDetails[invoiceId] || []
    if (products.length === 0) return 'No products'
    
    if (products.length === 1) {
      const product = products[0]
      if (product.variantDetails) {
        return `${product.variantDetails.product.name} (${product.quantity}x)`
      }
      return `${product.quantity} items`
    }
    
    const totalItems = products.reduce((sum, p) => sum + p.quantity, 0)
    const uniqueProducts = new Set(products.map(p => 
      p.variantDetails ? p.variantDetails.product.name : 'Unknown'
    )).size
    
    return `${uniqueProducts} products (${totalItems} items)`
  }

  const getProductDisplayName = (product: InvoiceProductWithDetails): string => {
    if (product.variantDetails) {
      const { variantDetails } = product
      return `${variantDetails.product.name} - ${variantDetails.size} (${variantDetails.color})`
    }
    return `Product ID: ${product.product_variant_id}`
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
            color: 'bg-warning-100 text-warning-800', 
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

  if (isLoading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='text-center'>
          <div className='inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mb-4'></div>
          <p className='text-neutral-600 font-medium'>Loading client details...</p>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 p-6 sm:p-8'>
      <div className='max-w-7xl mx-auto'>
        <div className='mb-8 animate-fade-in'>
          <div className='flex items-center justify-between mb-4'>
            <div>
              <h1 className='text-4xl font-bold text-neutral-800 mb-2'>Client Details</h1>
              <p className='text-neutral-600'>Manage client information and view transaction history</p>
            </div>
            <div className='flex gap-3'>
              <button
                onClick={() =>
                  generatePDF('clientFinancialReport', {
                    clientId: client?.client_id,
                    clientName: client?.name
                  })
                }
                className='btn-primary flex items-center gap-2'>
                <FaDownload />
                Financial Report
              </button>
              <button
                onClick={() => router.push(`/clients/history/${client?.client_id}`)}
                className='btn-outline flex items-center gap-2'>
                <FaHistory />
                Product History
              </button>
            </div>
          </div>
        </div>
      {client && (
        <div>
          <div className='card p-6 mb-6'>
            <div className='flex flex-wrap gap-3'>
              <button
                onClick={() => setActiveTab('details')}
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
                  activeTab === 'details'
                    ? 'bg-primary-500 text-white shadow-colored'
                    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                }`}>
                Details
              </button>
              <button
                onClick={() => setActiveTab('invoices')}
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
                  activeTab === 'invoices'
                    ? 'bg-primary-500 text-white shadow-colored'
                    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                }`}>
                Invoices
              </button>
              <button
                onClick={() => setActiveTab('quotations')}
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
                  activeTab === 'quotations'
                    ? 'bg-primary-500 text-white shadow-colored'
                    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                }`}>
                Orders
              </button>
            </div>
          </div>

          {activeTab === 'details' && (
            <div className='card p-6'>
              {isEditing ? (
                <form
                  onSubmit={e => {
                    e.preventDefault()
                    handleSaveEdit()
                  }}>
                  <h2 className='text-2xl font-bold text-neutral-800 mb-6'>Edit Client Information</h2>
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mb-6'>
                    <div>
                      <label className='block text-sm font-medium text-neutral-700 mb-2' htmlFor='name'>
                        Name *
                      </label>
                      <input
                        type='text'
                        id='name'
                        name='name'
                        value={editedClient?.name || ''}
                        onChange={handleInputChange}
                        className='input'
                        required
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-neutral-700 mb-2' htmlFor='email'>
                        Email *
                      </label>
                      <input
                        type='email'
                        id='email'
                        name='email'
                        value={editedClient?.email || ''}
                        onChange={handleInputChange}
                        className='input'
                        required
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-neutral-700 mb-2' htmlFor='phone'>
                        Phone *
                      </label>
                      <input
                        type='tel'
                        id='phone'
                        name='phone'
                        value={editedClient?.phone || ''}
                        onChange={handleInputChange}
                        className='input'
                        required
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-neutral-700 mb-2' htmlFor='tax_number'>
                        Tax Number *
                      </label>
                      <input
                        type='text'
                        id='tax_number'
                        name='tax_number'
                        value={editedClient?.tax_number || ''}
                        onChange={handleInputChange}
                        className='input'
                        required
                      />
                    </div>
                    <div className='md:col-span-2'>
                      <label className='block text-sm font-medium text-neutral-700 mb-2' htmlFor='address'>
                        Address *
                      </label>
                      <input
                        type='text'
                        id='address'
                        name='address'
                        value={editedClient?.address || ''}
                        onChange={handleInputChange}
                        className='input'
                        required
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-neutral-700 mb-2' htmlFor='company_id'>
                        Company *
                      </label>
                      <select
                        id='company_id'
                        name='company_id'
                        value={editedClient?.company_id || ''}
                        onChange={handleInputChange}
                        className='input'
                        required>
                        <option value=''>Select a company</option>
                        {companies.map(company => (
                          <option key={company.id} value={company.id}>
                            {company.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className='flex items-center gap-3'>
                    <button type='submit' className='btn-success'>
                      Save Changes
                    </button>
                    <button type='button' onClick={handleCancelEdit} className='btn-ghost'>
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <h2 className='text-2xl font-bold text-neutral-800 mb-6'>Client Information</h2>
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-6 mb-6'>
                    <div className='bg-neutral-50 rounded-lg p-4'>
                      <h3 className='text-sm font-medium text-neutral-600 mb-1'>Name</h3>
                      <p className='text-lg font-semibold text-neutral-800'>{client.name}</p>
                    </div>
                    <div className='bg-neutral-50 rounded-lg p-4'>
                      <h3 className='text-sm font-medium text-neutral-600 mb-1'>Email</h3>
                      <p className='text-lg font-semibold text-neutral-800'>{client.email}</p>
                    </div>
                    <div className='bg-neutral-50 rounded-lg p-4'>
                      <h3 className='text-sm font-medium text-neutral-600 mb-1'>Phone</h3>
                      <p className='text-lg font-semibold text-neutral-800'>{client.phone}</p>
                    </div>
                    <div className='bg-neutral-50 rounded-lg p-4'>
                      <h3 className='text-sm font-medium text-neutral-600 mb-1'>Tax Number</h3>
                      <p className='text-lg font-semibold text-neutral-800'>{client.tax_number}</p>
                    </div>
                    <div className='md:col-span-2 bg-neutral-50 rounded-lg p-4'>
                      <h3 className='text-sm font-medium text-neutral-600 mb-1'>Address</h3>
                      <p className='text-lg font-semibold text-neutral-800'>{client.address}</p>
                    </div>
                    <div className='bg-neutral-50 rounded-lg p-4'>
                      <h3 className='text-sm font-medium text-neutral-600 mb-1'>Balance</h3>
                      <p className={`text-2xl font-bold ${client.balance >= 0 ? 'text-error-600' : 'text-success-600'}`}>
                        ${client.balance.toFixed(2)}
                        <span className='text-sm font-normal ml-2'>
                          {client.balance > 0 && '(Outstanding)'}
                          {client.balance < 0 && '(Credit)'}
                          {client.balance === 0 && '(Settled)'}
                        </span>
                      </p>
                    </div>
                    <div className='bg-neutral-50 rounded-lg p-4'>
                      <h3 className='text-sm font-medium text-neutral-600 mb-1'>Company</h3>
                      <p className='text-lg font-semibold text-neutral-800'>{getCompanyName(client.company_id)}</p>
                    </div>
                  </div>
                  <div className='flex items-center gap-3 pt-4 border-t border-neutral-200'>
                    <button onClick={handleEdit} className='btn-primary'>
                      Edit Client
                    </button>
                    <button onClick={handleDelete} className='btn-danger'>
                      Delete Client
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'invoices' && (
            <div className='card overflow-hidden'>
              <div className='bg-primary-500 text-white p-6'>
                <h2 className='text-2xl font-bold'>Invoices</h2>
                <p className='text-primary-100 mt-1'>View all invoices for this client</p>
              </div>
              <div className='overflow-x-auto'>
                <table className='w-full table-auto'>
                  <thead>
                    <tr className='bg-neutral-100 text-neutral-700 uppercase text-xs font-semibold tracking-wider'>
                    <th
                      className='py-3 px-6 text-left cursor-pointer'
                      onClick={() => handleSort('id')}>
                      ID {sortField === 'id' && <FaSort className='inline' />}
                    </th>
                    <th
                      className='py-3 px-6 text-left cursor-pointer'
                      onClick={() => handleSort('created_at')}>
                      Date{' '}
                      {sortField === 'created_at' && (
                        <FaSort className='inline' />
                      )}
                    </th>
                    <th
                      className='py-3 px-6 text-left cursor-pointer'
                      onClick={() => handleSort('total_price')}>
                      Total{' '}
                      {sortField === 'total_price' && (
                        <FaSort className='inline' />
                      )}
                    </th>
                    <th
                      className='py-3 px-6 text-left cursor-pointer'
                      onClick={() => handleSort('remaining_amount')}>
                      Remaining{' '}
                      {sortField === 'remaining_amount' && (
                        <FaSort className='inline' />
                      )}
                    </th>
                    <th className='py-3 px-6 text-center'>Order Number</th>
                    <th className='py-3 px-6 text-center'>Source</th>
                    <th className='py-3 px-6 text-center'>Products</th>
                    <th className='py-3 px-6 text-center'>Type</th>
                    <th className='py-3 px-6 text-center'>Shipping Status</th>
                    <th className='py-3 px-6 text-center'>Files</th>
                  </tr>
                  </thead>
                  <tbody className='text-neutral-600 text-sm divide-y divide-neutral-200'>
                    {invoices.map(invoice => {
                      const currencySymbol = getCurrencySymbol(invoice.currency)
                      const isReturn = invoice.type === 'return'
                      const totalPrice = Number(invoice.total_price) || 0
                      const remainingAmount = Number(invoice.remaining_amount) || 0

                      return (
                        <tr
                          key={invoice.id}
                          onClick={() => handleInvoiceClick(invoice)}
                          className={`cursor-pointer hover:bg-neutral-50 transition-colors duration-150 ${
                            isReturn ? 'bg-error-50' : ''
                          }`}>
                        <td className='py-3 px-6 text-left whitespace-nowrap'>
                          {invoice.id}
                        </td>
                        <td className='py-3 px-6 text-left'>
                          {invoice.created_at ? new Date(invoice.created_at).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className={`py-3 px-6 text-left ${
                          isReturn ? 'text-error-600' : 'text-success-600'
                        }`}>
                          {currencySymbol}{Math.abs(totalPrice).toFixed(2)}
                          {isReturn && ' (Return)'}
                        </td>
                        <td className={`py-3 px-6 text-left ${
                          remainingAmount > 0 ? 'text-warning-600' : 'text-success-600'
                        }`}>
                          {currencySymbol}{Math.abs(remainingAmount).toFixed(2)}
                        </td>
                        <td className='py-3 px-6 text-center'>
                          {invoice.order_number || '-'}
                        </td>
                        <td className='py-3 px-6 text-center'>
                          {invoice.quotation_id ? (
                            <div className="flex items-center justify-center">
                              <FaLink className="text-primary-500 mr-1" />
                              <span className="text-primary-500 text-xs" title={`Created from Order #${invoice.quotation_id}`}>
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
                          <div className='flex items-center justify-center space-x-1'>
                            <FaBox className='text-primary-500 text-sm' />
                            <span className='text-xs text-neutral-600' title={getInvoiceProductsPreview(invoice.id)}>
                              {getInvoiceProductsPreview(invoice.id)}
                            </span>
                          </div>
                        </td>
                        <td className='py-3 px-6 text-center'>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            isReturn ? 'bg-error-100 text-error-800' : 'bg-success-100 text-success-800'
                          }`}>
                            {isReturn ? 'Return' : 'Regular'}
                          </span>
                        </td>
                        <td className='py-3 px-6 text-center'>
                          <ShippingStatusBadge status={invoice.shipping_status || 'unshipped'} />
                        </td>
                        <td className='py-3 px-6 text-center'>
                          {invoice.files && invoice.files.length > 0 ? (
                            <div className="flex items-center justify-center">
                              <FaFile className='text-primary-500 mr-1' />
                              <span className="text-xs text-neutral-600">{invoice.files.length}</span>
                            </div>
                          ) : (
                            <span className="text-neutral-400">-</span>
                          )}
                        </td>
                      </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Quotations tab */}
          {activeTab === 'quotations' && (
            <div className='card overflow-hidden'>
              <div className='bg-primary-500 text-white p-6'>
                <h2 className='text-2xl font-bold'>Orders</h2>
                <p className='text-primary-100 mt-1'>View all orders for this client</p>
              </div>
              <div className='overflow-x-auto'>
                <table className='w-full table-auto'>
                  <thead>
                    <tr className='bg-neutral-100 text-neutral-700 uppercase text-xs font-semibold tracking-wider'>
                    <th
                      className='px-6 py-3 border-b-2 border-white text-left text-xs leading-4 font-medium uppercase tracking-wider cursor-pointer'
                      onClick={() => handleSort('id')}>
                      ID {sortField === 'id' && <FaSort className='inline' />}
                    </th>
                    <th
                      className='px-6 py-3 border-b-2 border-white text-left text-xs leading-4 font-medium uppercase tracking-wider cursor-pointer'
                      onClick={() => handleSort('created_at')}>
                      Date{' '}
                      {sortField === 'created_at' && (
                        <FaSort className='inline' />
                      )}
                    </th>
                    <th
                      className='px-6 py-3 border-b-2 border-white text-left text-xs leading-4 font-medium uppercase tracking-wider cursor-pointer'
                      onClick={() => handleSort('total_price')}>
                      Total{' '}
                      {sortField === 'total_price' && (
                        <FaSort className='inline' />
                      )}
                    </th>
                    <th
                      className='px-6 py-3 border-b-2 border-white text-left text-xs leading-4 font-medium uppercase tracking-wider cursor-pointer'
                      onClick={() => handleSort('status')}>
                      Status{' '}
                      {sortField === 'status' && (
                        <FaSort className='inline' />
                      )}
                    </th>
                    <th className='px-6 py-3 border-b-2 border-white text-left text-xs leading-4 font-medium uppercase tracking-wider'>
                      Order Number
                    </th>
                    <th className='px-6 py-3 border-b-2 border-white text-left text-xs leading-4 font-medium uppercase tracking-wider'>
                      Currency
                    </th>
                    <th className='px-6 py-3 border-b-2 border-white text-left text-xs leading-4 font-medium uppercase tracking-wider'>
                      Notes
                    </th>
                    </tr>
                  </thead>
                  <tbody className='text-neutral-600 text-sm divide-y divide-neutral-200'>
                    {quotations.map(quotation => {
                      const currencySymbol = getCurrencySymbol(quotation.currency)

                      return (
                        <tr
                          key={quotation.id}
                          onClick={() => handleQuotationClick(quotation)}
                          className='cursor-pointer hover:bg-neutral-50 transition-colors duration-150'>
                        <td className='px-6 py-4 whitespace-no-wrap border-b border-white'>
                          {quotation.id}
                        </td>
                        <td className='px-6 py-4 whitespace-no-wrap border-b border-white'>
                          {format(new Date(quotation.created_at), 'PPP')}
                        </td>
                        <td className='px-6 py-4 whitespace-no-wrap border-b border-white'>
                          {currencySymbol}{quotation.total_price.toFixed(2)}
                        </td>
                        <td className='px-6 py-4 whitespace-no-wrap border-b border-white'>
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${
                              quotation.status === 'pending'
                                ? 'bg-warning-200 text-warning-800'
                                : quotation.status === 'accepted'
                                ? 'bg-success-200 text-success-800'
                                : 'bg-error-200 text-error-800'
                            }`}>
                            {quotation.status}
                          </span>
                        </td>
                        <td className='px-6 py-4 whitespace-no-wrap border-b border-white'>
                          {quotation.order_number}
                        </td>
                        <td className='px-6 py-4 whitespace-no-wrap border-b border-white'>
                          {(quotation.currency || 'usd').toUpperCase()}
                        </td>
                        <td className='px-6 py-4 whitespace-no-wrap border-b border-white'>
                          {quotation.note ? (
                            <FaInfoCircle
                              className='text-primary-500'
                              title={quotation.note}
                            />
                          ) : (
                            '-'
                          )}
                        </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'receipts' && (
            <div className='card overflow-hidden'>
              <div className='bg-primary-500 text-white p-6'>
                <h2 className='text-2xl font-bold'>Receipts</h2>
                <p className='text-primary-100 mt-1'>View all receipts for this client</p>
              </div>
              <div className='overflow-x-auto'>
                <table className='w-full table-auto'>
                  <thead>
                    <tr className='bg-neutral-100 text-neutral-700 uppercase text-xs font-semibold tracking-wider'>
                    <th
                      className='px-6 py-3 border-b-2 border-white text-left text-xs leading-4 font-medium uppercase tracking-wider cursor-pointer'
                      onClick={() => handleSort('id')}>
                      ID {sortField === 'id' && <FaSort className='inline' />}
                    </th>
                    <th
                      className='px-6 py-3 border-b-2 border-white text-left text-xs leading-4 font-medium uppercase tracking-wider cursor-pointer'
                      onClick={() => handleSort('paid_at')}>
                      Date{' '}
                      {sortField === 'paid_at' && <FaSort className='inline' />}
                    </th>
                    <th
                      className='px-6 py-3 border-b-2 border-white text-left text-xs leading-4 font-medium uppercase tracking-wider cursor-pointer'
                      onClick={() => handleSort('amount')}>
                      Amount{' '}
                      {sortField === 'amount' && <FaSort className='inline' />}
                    </th>
                    <th
                      className='px-6 py-3 border-b-2 border-white text-left text-xs leading-4 font-medium uppercase tracking-wider cursor-pointer'
                      onClick={() => handleSort('invoice_id')}>
                      Invoice ID{' '}
                      {sortField === 'invoice_id' && (
                        <FaSort className='inline' />
                      )}
                    </th>
                    <th className='px-6 py-3 border-b-2 border-white text-left text-xs leading-4 font-medium uppercase tracking-wider'>
                      Currency
                    </th>
                    <th className='px-6 py-3 border-b-2 border-white text-left text-xs leading-4 font-medium uppercase tracking-wider'>
                      Files
                    </th>
                    </tr>
                  </thead>
                  <tbody className='text-neutral-600 text-sm divide-y divide-neutral-200'>
                    {receipts.map(receipt => {
                      const currencySymbol = getCurrencySymbol(receipt.currency)

                      return (
                        <tr
                          key={receipt.id}
                          onClick={() => handleReceiptClick(receipt)}
                          className='cursor-pointer hover:bg-neutral-50 transition-colors duration-150'>
                        <td className='px-6 py-4 whitespace-no-wrap border-b border-white'>
                          {receipt.id}
                        </td>
                        <td className='px-6 py-4 whitespace-no-wrap border-b border-white'>
                          {format(new Date(receipt.paid_at), 'PPP')}
                        </td>
                        <td className='px-6 py-4 whitespace-no-wrap border-b border-white'>
                          {currencySymbol}{receipt.amount.toFixed(2)}
                        </td>
                        <td className='px-6 py-4 whitespace-no-wrap border-b border-white'>
                          {receipt.invoice_id}
                        </td>
                        <td className='px-6 py-4 whitespace-no-wrap border-b border-white'>
                          {(receipt.currency || 'usd').toUpperCase()}
                        </td>
                        <td className='px-6 py-4 whitespace-no-wrap border-b border-white'>
                          {receipt.files.length > 0 ? (
                            <FaFile className='inline text-primary-500' />
                          ) : (
                            '-'
                          )}
                        </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}



          {selectedInvoice && (
            <div className='modal-overlay' onClick={() => setSelectedInvoice(null)}>
              <div className='modal-content max-w-5xl' onClick={e => e.stopPropagation()}>
                <div className='flex justify-between items-start mb-6 px-2'>
                  <div>
                    <h3 className='text-2xl font-bold text-neutral-900 flex items-center'>
                      <FaFileInvoice className="mr-3 text-primary-500" />
                      Invoice #{selectedInvoice.id}
                    </h3>
                    <div className="flex items-center mt-2 space-x-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        selectedInvoice.type === 'return'
                          ? 'bg-error-100 text-error-800'
                          : 'bg-success-100 text-success-800'
                      }`}>
                        {selectedInvoice.type === 'return' ? 'Return Invoice' : 'Regular Invoice'}
                      </span>
                      <ShippingStatusBadge status={selectedInvoice.shipping_status || 'unshipped'} />
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedInvoice(null)}
                    className='p-2 rounded-lg hover:bg-neutral-100 transition-colors text-neutral-500 hover:text-neutral-700'>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Invoice Summary */}
                  <div className="lg:col-span-1">
                    <div className="bg-neutral-50 rounded-lg p-4">
                      <h4 className="text-lg font-semibold text-neutral-900 mb-4">Invoice Summary</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-neutral-600">Date:</span>
                          <span className="font-medium">{format(new Date(selectedInvoice.created_at), 'PPP')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-600">Order Number:</span>
                          <span className="font-medium">{selectedInvoice.order_number || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-600">Currency:</span>
                          <span className="font-medium">{(selectedInvoice.currency || 'usd').toUpperCase()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-600">Source:</span>
                          <div className="flex items-center">
                            {selectedInvoice.quotation_id ? (
                              <>
                                <FaLink className="text-primary-500 mr-1 text-xs" />
                                <span className="text-primary-500 text-sm">Order #{selectedInvoice.quotation_id}</span>
                              </>
                            ) : (
                              <>
                                <FaFileInvoice className="text-neutral-500 mr-1 text-xs" />
                                <span className="text-neutral-500 text-sm">Direct Invoice</span>
                              </>
                            )}
                          </div>
                        </div>
                        <hr className="border-neutral-200" />
                        <div className="flex justify-between text-lg">
                          <span className="text-neutral-600">Total:</span>
                          <span className={`font-bold ${
                            selectedInvoice.type === 'return' ? 'text-error-600' : 'text-success-600'
                          }`}>
                            {getCurrencySymbol(selectedInvoice.currency)}{Math.abs(selectedInvoice.total_price).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between text-lg">
                          <span className="text-neutral-600">Remaining:</span>
                          <span className={`font-bold ${
                            selectedInvoice.remaining_amount > 0 ? 'text-warning-600' : 'text-success-600'
                          }`}>
                            {getCurrencySymbol(selectedInvoice.currency)}{Math.abs(selectedInvoice.remaining_amount).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Products */}
                  <div className="lg:col-span-2">
                    <div className="bg-white border border-neutral-200 rounded-lg">
                      <div className="px-4 py-3 border-b border-neutral-200">
                        <h4 className="text-lg font-semibold text-neutral-900 flex items-center">
                          <FaBox className="mr-2 text-primary-500" />
                          Products ({(invoiceProductDetails[selectedInvoice.id] || selectedInvoice.products).filter((p: any) => p !== null && p !== undefined).length})
                        </h4>
                      </div>
                      <div className="p-4">
                        <div className='space-y-4 max-h-96 overflow-y-auto'>
                          {(invoiceProductDetails[selectedInvoice.id] || selectedInvoice.products).filter((p: any) => p !== null && p !== undefined).map((product, index) => {
                            const productWithDetails = product as InvoiceProductWithDetails
                            return (
                              <div key={index} className='bg-white border border-neutral-200 rounded-lg p-4 hover:shadow-md transition-shadow'>
                                <div className='flex items-start space-x-4'>
                                  {productWithDetails.variantDetails?.product.photo && (
                                    <div className="flex-shrink-0">
                                      <Image 
                                        src={productWithDetails.variantDetails.product.photo} 
                                        alt={productWithDetails.variantDetails.product.name}
                                        width={80}
                                        height={80}
                                        className='w-20 h-20 object-cover rounded-lg border'
                                      />
                                    </div>
                                  )}
                                  <div className='flex-1 min-w-0'>
                                    <h5 className='text-lg font-semibold text-neutral-900 truncate'>
                                      {productWithDetails.variantDetails ? 
                                        productWithDetails.variantDetails.product.name : 
                                        'Product Not Found'
                                      }
                                    </h5>
                                    {productWithDetails.variantDetails && (
                                      <div className="mt-1 flex items-center space-x-4 text-sm text-neutral-600">
                                        <span className="bg-neutral-100 px-2 py-1 rounded">
                                          Size: {productWithDetails.variantDetails.size}
                                        </span>
                                        <span className="bg-neutral-100 px-2 py-1 rounded">
                                          Color: {productWithDetails.variantDetails.color}
                                        </span>
                                      </div>
                                    )}
                                    <div className='mt-2 flex items-center justify-between'>
                                      <div className="flex items-center space-x-4">
                                        <span className='text-sm font-medium text-neutral-900'>
                                          Quantity: <span className="text-primary-500 font-bold">{productWithDetails.quantity}</span>
                                        </span>
                                        {productWithDetails.variantDetails && (
                                          <span className='text-sm text-neutral-600'>
                                            ${productWithDetails.variantDetails.product.price.toFixed(2)} each
                                          </span>
                                        )}
                                      </div>
                                      {productWithDetails.variantDetails && (
                                        <div className="text-right">
                                          <span className="text-lg font-bold text-success-600">
                                            ${(productWithDetails.variantDetails.product.price * productWithDetails.quantity).toFixed(2)}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                    {productWithDetails.note && (
                                      <div className='mt-3 p-2 bg-warning-50 border-l-4 border-warning-400 rounded'>
                                        <div className="flex items-start">
                                          <FaInfoCircle className="text-warning-600 mr-2 mt-0.5 flex-shrink-0" />
                                          <span className="text-sm text-warning-800">{productWithDetails.note}</span>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Files Section */}
                {selectedInvoice.files && selectedInvoice.files.length > 0 && (
                  <div className="mt-6">
                    <div className="bg-white border border-neutral-200 rounded-lg">
                      <div className="px-4 py-3 border-b border-neutral-200">
                        <h4 className="text-lg font-semibold text-neutral-900 flex items-center">
                          <FaFile className="mr-2 text-primary-500" />
                          Attachments ({selectedInvoice.files.length})
                        </h4>
                      </div>
                      <div className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {selectedInvoice.files.map((file, index) => (
                            <a
                              key={index}
                              href={file}
                              target='_blank'
                              rel='noopener noreferrer'
                              className='flex items-center p-3 bg-neutral-50 rounded-lg hover:bg-neutral-100 transition-colors group'>
                              <FaFile className="text-primary-500 mr-3" />
                              <div className="flex-1 min-w-0">
                                <span className="text-sm font-medium text-neutral-900 truncate block">
                                  {file.split('/').pop()}
                                </span>
                                <span className="text-xs text-gray-500">Click to open</span>
                              </div>
                              <FaDownload className="text-neutral-400 group-hover:text-primary-500 ml-2" />
                            </a>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className='flex justify-end mt-6 pt-4 border-t border-neutral-200'>
                  <button className='btn-ghost' onClick={() => setSelectedInvoice(null)}>
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Quotation details modal */}
          {selectedQuotation && (
            <div className='modal-overlay' onClick={() => setSelectedQuotation(null)}>
              <div className='modal-content max-w-5xl' onClick={e => e.stopPropagation()}>
                <div className='flex justify-between items-start mb-6 px-2'>
                  <div>
                    <h3 className='text-2xl font-bold text-neutral-900 flex items-center'>
                      <FaShippingFast className="mr-3 text-primary-500" />
                      Order #{selectedQuotation.id}
                    </h3>
                    <div className="flex items-center mt-2 space-x-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        selectedQuotation.status === 'pending'
                          ? 'bg-warning-200 text-warning-800'
                          : selectedQuotation.status === 'accepted'
                          ? 'bg-success-200 text-success-800'
                          : 'bg-error-200 text-error-800'
                      }`}>
                        {selectedQuotation.status.charAt(0).toUpperCase() + selectedQuotation.status.slice(1)}
                      </span>
                      {selectedQuotation.include_vat && (
                        <span className="px-3 py-1 rounded-full text-sm font-medium bg-info-100 text-info-800">
                          VAT Included
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedQuotation(null)}
                    className='p-2 rounded-lg hover:bg-neutral-100 transition-colors text-neutral-500 hover:text-neutral-700'>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Order Summary */}
                  <div className="lg:col-span-1">
                    <div className="bg-neutral-50 rounded-lg p-4">
                      <h4 className="text-lg font-semibold text-neutral-900 mb-4">Order Summary</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-neutral-600">Date:</span>
                          <span className="font-medium">{format(new Date(selectedQuotation.created_at), 'PPP')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-600">Order Number:</span>
                          <span className="font-medium">{selectedQuotation.order_number || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-600">Currency:</span>
                          <span className="font-medium">{(selectedQuotation.currency || 'usd').toUpperCase()}</span>
                        </div>
                        {selectedQuotation.payment_term && (
                          <div className="flex justify-between">
                            <span className="text-neutral-600">Payment Terms:</span>
                            <span className="font-medium text-sm">{selectedQuotation.payment_term}</span>
                          </div>
                        )}
                        {selectedQuotation.delivery_date && (
                          <div className="flex justify-between">
                            <span className="text-neutral-600">Delivery Date:</span>
                            <span className="font-medium">{format(new Date(selectedQuotation.delivery_date), 'PPP')}</span>
                          </div>
                        )}
                        <hr className="border-neutral-200" />
                        <div className="flex justify-between text-lg">
                          <span className="text-neutral-600">Total:</span>
                          <span className="font-bold text-success-600">
                            {getCurrencySymbol(selectedQuotation.currency)}{selectedQuotation.total_price.toFixed(2)}
                          </span>
                        </div>
                        {selectedQuotation.include_vat && selectedQuotation.vat_amount && (
                          <div className="flex justify-between text-sm">
                            <span className="text-neutral-600">VAT Amount:</span>
                            <span className="font-medium text-neutral-700">
                              {getCurrencySymbol(selectedQuotation.currency)}{selectedQuotation.vat_amount.toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>
                      <button
                        className='btn-primary w-full mt-4 flex items-center justify-center gap-2'
                        onClick={() => {
                          generatePDF('quotation', selectedQuotation);
                        }}>
                        <FaDownload /> Download PDF
                      </button>
                    </div>
                    {selectedQuotation.note && (
                      <div className="bg-info-50 border border-info-200 rounded-lg p-4 mt-4">
                        <h4 className="text-sm font-semibold text-info-800 mb-2">Note</h4>
                        <p className="text-sm text-info-700">{selectedQuotation.note}</p>
                      </div>
                    )}
                  </div>

                  {/* Products */}
                  <div className="lg:col-span-2">
                    <div className="bg-white border border-neutral-200 rounded-lg">
                      <div className="px-4 py-3 border-b border-neutral-200">
                        <h4 className="text-lg font-semibold text-neutral-900 flex items-center">
                          <FaBox className="mr-2 text-primary-500" />
                          Products ({(quotationProductDetails[selectedQuotation.id] || selectedQuotation.products).filter((p: any) => p !== null && p !== undefined).length})
                        </h4>
                      </div>
                      <div className="p-4">
                        <div className='space-y-4 max-h-96 overflow-y-auto'>
                          {(quotationProductDetails[selectedQuotation.id] || selectedQuotation.products).filter((p: any) => p !== null && p !== undefined).map((product, index) => {
                            const productWithDetails = product as QuotationProductWithDetails
                            return (
                              <div key={index} className='bg-white border border-neutral-200 rounded-lg p-4 hover:shadow-md transition-shadow'>
                                <div className='flex items-start space-x-4'>
                                  {productWithDetails.variantDetails?.product.photo && (
                                    <div className="flex-shrink-0">
                                      <Image
                                        src={productWithDetails.variantDetails.product.photo}
                                        alt={productWithDetails.variantDetails.product.name}
                                        width={80}
                                        height={80}
                                        className="rounded-lg object-cover border border-neutral-200"
                                      />
                                    </div>
                                  )}
                                  <div className='flex-grow'>
                                    <div className='flex justify-between items-start'>
                                      <div>
                                        <h5 className='font-semibold text-neutral-900'>
                                          {productWithDetails.variantDetails?.product.name || 'Product Not Found'}
                                        </h5>
                                        <div className='flex items-center gap-2 mt-1'>
                                          {productWithDetails.variantDetails && (
                                            <>
                                              <span className='text-sm bg-neutral-100 px-2 py-1 rounded text-neutral-700'>
                                                Size: {productWithDetails.variantDetails.size}
                                              </span>
                                              <span className='text-sm bg-neutral-100 px-2 py-1 rounded text-neutral-700'>
                                                Color: {productWithDetails.variantDetails.color}
                                              </span>
                                            </>
                                          )}
                                        </div>
                                        {productWithDetails.note && (
                                          <p className='text-sm text-neutral-600 mt-2 italic'>
                                            Note: {productWithDetails.note}
                                          </p>
                                        )}
                                      </div>
                                      <div className='text-right'>
                                        <p className='text-lg font-bold text-neutral-900'>
                                          Qty: {productWithDetails.quantity}
                                        </p>
                                        {productWithDetails.variantDetails && (
                                          <p className='text-sm text-neutral-600'>
                                            {getCurrencySymbol(selectedQuotation.currency)}{productWithDetails.variantDetails.product.price.toFixed(2)} each
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedReceipt && (
            <div className='modal-overlay' onClick={() => setSelectedReceipt(null)}>
              <div className='modal-content max-w-2xl' onClick={e => e.stopPropagation()}>
                <div className='mt-3 text-center'>
                  <h3 className='text-lg leading-6 font-medium text-neutral-900'>
                    Receipt Details
                  </h3>
                  <div className='mt-2 px-7 py-3'>
                    <p className='text-sm text-neutral-500'>
                      ID: {selectedReceipt.id}
                    </p>
                    <p className='text-sm text-neutral-500'>
                      Date: {format(new Date(selectedReceipt.paid_at), 'PPP')}
                    </p>
                    <p className='text-sm text-neutral-500'>
                      Amount: {getCurrencySymbol(selectedReceipt.currency)}{selectedReceipt.amount.toFixed(2)}
                    </p>
                    <p className='text-sm text-neutral-500'>
                      Currency: {(selectedReceipt.currency || 'usd').toUpperCase()}
                    </p>
                    <p className='text-sm text-neutral-500'>
                      Invoice ID: {selectedReceipt.invoice_id}
                    </p>
                    <h4 className='text-sm font-medium text-neutral-900 mt-4'>
                      Files:
                    </h4>
                    <ul className='list-disc list-inside'>
                      {selectedReceipt.files.map((file, index) => (
                        <li key={index} className='text-sm text-neutral-500'>
                          <a
                            href={file}
                            target='_blank'
                            rel='noopener noreferrer'
                            className='text-primary-500 hover:underline'>
                            {file.split('/').pop()}{' '}
                            <FaDownload className='inline' />
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className='items-center px-4 py-3'>
                    <button className='btn-ghost w-full' onClick={() => setSelectedReceipt(null)}>
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  )
}