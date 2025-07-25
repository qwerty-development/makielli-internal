'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { productHistoryFunctions } from '@/utils/functions/productHistory'
import { productFunctions } from '@/utils/functions/products'
import { 
  FaHistory, 
  FaUsers, 
  FaCalendar, 
  FaBox,
  FaArrowLeft,
  FaDownload,
  FaFilter,
  FaSpinner,
  FaShoppingCart,
  FaTruck,
  FaExchangeAlt,
  FaEdit,
  FaFileInvoice
} from 'react-icons/fa'
import { format } from 'date-fns'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import type { 
  ProductHistoryDetail, 
  ProductHistorySummary, 
  VariantSalesDetail,
  CustomerPurchaseHistory 
} from '@/utils/functions/productHistory'
import type { Product } from '@/utils/functions/products'

export default function ProductHistoryDetailPage() {
  const router = useRouter()
  const params = useParams()
  const productId = params.productId as string

  const [product, setProduct] = useState<Product | null>(null)
  const [history, setHistory] = useState<ProductHistoryDetail[]>([])
  const [summary, setSummary] = useState<ProductHistorySummary | null>(null)
  const [variantSales, setVariantSales] = useState<VariantSalesDetail[]>([])
  const [customerHistory, setCustomerHistory] = useState<CustomerPurchaseHistory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'timeline' | 'variants' | 'customers'>('timeline')
  
  // Filters
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)
  const [selectedVariant, setSelectedVariant] = useState<string>('')
  const [selectedSourceType, setSelectedSourceType] = useState<string>('')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    if (productId) {
      fetchAllData()
    }
  }, [productId])

  useEffect(() => {
    if (productId) {
      fetchHistory()
    }
  }, [startDate, endDate, selectedVariant, selectedSourceType])

  const fetchAllData = async () => {
    try {
      setIsLoading(true)
      
      // Fetch product details
      const products = await productFunctions.getAllProducts()
      const currentProduct = products.find(p => p.id === productId)
      if (currentProduct) {
        setProduct(currentProduct)
      }

      // Fetch all history data in parallel
      const [historyData, summaryData, variantData, customerData] = await Promise.all([
        productHistoryFunctions.getProductHistory(productId),
        productHistoryFunctions.getProductHistorySummary(productId),
        productHistoryFunctions.getVariantSalesDetails(productId),
        productHistoryFunctions.getCustomerPurchaseHistory(productId)
      ])

      setHistory(historyData)
      setSummary(summaryData)
      setVariantSales(variantData)
      setCustomerHistory(customerData)
    } catch (error) {
      console.error('Error fetching product data:', error)
      toast.error('Failed to load product history')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchHistory = async () => {
    try {
      const filters: any = {}
      if (startDate) filters.startDate = startDate
      if (endDate) filters.endDate = endDate
      if (selectedVariant) filters.variantId = selectedVariant
      if (selectedSourceType) filters.sourceType = selectedSourceType

      const historyData = await productHistoryFunctions.getProductHistory(productId, filters)
      setHistory(historyData)
    } catch (error) {
      console.error('Error fetching filtered history:', error)
      toast.error('Failed to filter history')
    }
  }

  const getSourceTypeIcon = (sourceType: string) => {
    switch (sourceType) {
      case 'client_invoice':
        return <FaFileInvoice className="text-blue" />
      case 'supplier_invoice':
        return <FaTruck className="text-green-600" />
      case 'quotation':
        return <FaShoppingCart className="text-purple-600" />
      case 'adjustment':
        return <FaEdit className="text-orange-600" />
      case 'return':
        return <FaExchangeAlt className="text-red-600" />
      default:
        return <FaHistory className="text-neutral-600" />
    }
  }

  const getSourceTypeLabel = (sourceType: string) => {
    return sourceType.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  const handleExportCSV = async () => {
    try {
      const csv = await productHistoryFunctions.exportProductHistoryToCSV(productId)
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${product?.name || 'product'}_history_${format(new Date(), 'yyyy-MM-dd')}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success('History exported successfully')
    } catch (error) {
      console.error('Error exporting history:', error)
      toast.error('Failed to export history')
    }
  }

  const clearFilters = () => {
    setStartDate(null)
    setEndDate(null)
    setSelectedVariant('')
    setSelectedSourceType('')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <FaSpinner className="animate-spin text-4xl text-blue mb-4 mx-auto" />
          <p className="text-neutral-600">Loading product history...</p>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <FaBox className="text-6xl text-neutral-300 mb-4 mx-auto" />
          <p className="text-neutral-600 text-lg mb-4">Product not found</p>
          <button
            onClick={() => router.push('/products/history')}
            className="px-4 py-2 bg-blue text-white rounded-lg hover:bg-indigo-600"
          >
            Back to Products
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/products/history')}
                className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
              >
                <FaArrowLeft className="text-neutral-600" />
              </button>
              
              <div className="flex items-center gap-4">
                {product.photo && (
                  <img
                    src={product.photo}
                    alt={product.name}
                    className="w-16 h-16 object-cover rounded-lg"
                  />
                )}
                <div>
                  <h1 className="text-2xl font-bold text-neutral-800">{product.name}</h1>
                  <p className="text-neutral-600">Product History & Analytics</p>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2 bg-neutral-200 text-neutral-700 rounded-lg hover:bg-neutral-300 transition-colors"
              >
                <FaFilter />
                Filters
              </button>
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-2 px-4 py-2 bg-blue text-white rounded-lg hover:bg-indigo-600 transition-colors"
              >
                <FaDownload />
                Export CSV
              </button>
            </div>
          </div>

          {/* Summary Stats */}
          {summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div className="bg-neutral-50 rounded-lg p-3">
                <p className="text-sm text-neutral-600">Total Sold</p>
                <p className="text-2xl font-bold text-neutral-800">{summary.total_sold}</p>
              </div>
              <div className="bg-neutral-50 rounded-lg p-3">
                <p className="text-sm text-neutral-600">Unique Customers</p>
                <p className="text-2xl font-bold text-neutral-800">{summary.unique_customers}</p>
              </div>
              <div className="bg-neutral-50 rounded-lg p-3">
                <p className="text-sm text-neutral-600">Avg. Sale Quantity</p>
                <p className="text-2xl font-bold text-neutral-800">{summary.avg_sale_quantity || 0}</p>
              </div>
              <div className="bg-neutral-50 rounded-lg p-3">
                <p className="text-sm text-neutral-600">Last Sale</p>
                <p className="text-sm font-medium text-neutral-800">
                  {summary.last_sale_date 
                    ? format(new Date(summary.last_sale_date), 'MMM d, yyyy')
                    : 'No sales yet'
                  }
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Start Date</label>
                <DatePicker
                  selected={startDate}
                  onChange={setStartDate}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue focus:border-transparent"
                  placeholderText="Select start date"
                  dateFormat="MM/dd/yyyy"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">End Date</label>
                <DatePicker
                  selected={endDate}
                  onChange={setEndDate}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue focus:border-transparent"
                  placeholderText="Select end date"
                  dateFormat="MM/dd/yyyy"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Variant</label>
                <select
                  value={selectedVariant}
                  onChange={(e) => setSelectedVariant(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue focus:border-transparent"
                >
                  <option value="">All Variants</option>
                  {product.variants?.map((variant) => (
                    <option key={variant.id} value={variant.id}>
                      {variant.size} - {variant.color}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Source Type</label>
                <select
                  value={selectedSourceType}
                  onChange={(e) => setSelectedSourceType(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue focus:border-transparent"
                >
                  <option value="">All Types</option>
                  <option value="client_invoice">Client Invoice</option>
                  <option value="supplier_invoice">Supplier Invoice</option>
                  <option value="quotation">Quotation</option>
                  <option value="adjustment">Adjustment</option>
                  <option value="return">Return</option>
                </select>
              </div>
            </div>

            <button
              onClick={clearFilters}
              className="mt-4 text-sm text-blue hover:text-indigo-600"
            >
              Clear all filters
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-neutral-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('timeline')}
                className={`px-6 py-3 text-sm font-medium ${
                  activeTab === 'timeline'
                    ? 'text-blue border-b-2 border-blue'
                    : 'text-neutral-600 hover:text-neutral-800'
                }`}
              >
                Timeline
              </button>
              <button
                onClick={() => setActiveTab('variants')}
                className={`px-6 py-3 text-sm font-medium ${
                  activeTab === 'variants'
                    ? 'text-blue border-b-2 border-blue'
                    : 'text-neutral-600 hover:text-neutral-800'
                }`}
              >
                Variant Analysis
              </button>
              <button
                onClick={() => setActiveTab('customers')}
                className={`px-6 py-3 text-sm font-medium ${
                  activeTab === 'customers'
                    ? 'text-blue border-b-2 border-blue'
                    : 'text-neutral-600 hover:text-neutral-800'
                }`}
              >
                Customer Analysis
              </button>
            </nav>
          </div>

          <div className="p-6">
            {/* Timeline Tab */}
            {activeTab === 'timeline' && (
              <div className="space-y-4">
                {history.length === 0 ? (
                  <div className="text-center py-12">
                    <FaHistory className="text-6xl text-neutral-300 mx-auto mb-4" />
                    <p className="text-neutral-600">No history found for the selected filters</p>
                  </div>
                ) : (
                  history.map((record) => (
                    <div key={record.id} className="flex gap-4 border-b border-neutral-100 pb-4 last:border-0">
                      <div className="flex-shrink-0 mt-1">
                        {getSourceTypeIcon(record.source_type)}
                      </div>
                      
                      <div className="flex-grow">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-neutral-800">
                              {getSourceTypeLabel(record.source_type)}
                              {record.invoice_order_number && (
                                <span className="ml-2 text-sm text-neutral-600">
                                  #{record.invoice_order_number}
                                </span>
                              )}
                            </p>
                            
                            <div className="mt-1 space-y-1">
                              <p className="text-sm text-neutral-600">
                                {record.client_name && (
                                  <span>Customer: <span className="font-medium">{record.client_name}</span></span>
                                )}
                              </p>
                              
                              <p className="text-sm text-neutral-600">
                                Variant: <span className="font-medium">{record.size} - {record.color}</span>
                              </p>
                              
                              <p className="text-sm text-neutral-600">
                                Quantity: 
                                <span className={`font-medium ml-1 ${
                                  record.quantity_change < 0 ? 'text-red-600' : 'text-green-600'
                                }`}>
                                  {record.quantity_change > 0 ? '+' : ''}{record.quantity_change}
                                </span>
                              </p>

                              {record.notes && (
                                <p className="text-sm text-neutral-500 italic">{record.notes}</p>
                              )}
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <p className="text-sm text-neutral-500">
                              {format(new Date(record.created_at), 'MMM d, yyyy')}
                            </p>
                            <p className="text-xs text-neutral-400">
                              {format(new Date(record.created_at), 'h:mm a')}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Variants Tab */}
            {activeTab === 'variants' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {variantSales.map((variant) => (
                    <div key={variant.variant_id} className="bg-neutral-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-neutral-800">
                          {variant.size} - {variant.color}
                        </h4>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          variant.current_stock === 0
                            ? 'bg-red-100 text-red-600'
                            : variant.current_stock < 10
                            ? 'bg-yellow-100 text-yellow-600'
                            : 'bg-green-100 text-green-600'
                        }`}>
                          Stock: {variant.current_stock}
                        </span>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-neutral-600">Units Sold</span>
                          <span className="font-medium">{variant.total_sold}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-600">Customers</span>
                          <span className="font-medium">{variant.unique_customers}</span>
                        </div>
                      </div>

                      {/* Progress bar showing stock level */}
                      <div className="mt-3">
                        <div className="w-full bg-neutral-200 rounded-full h-2">
                          <div 
                            className="bg-blue h-2 rounded-full"
                            style={{ 
                              width: `${Math.min(100, (variant.current_stock / (variant.current_stock + variant.total_sold)) * 100)}%` 
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Customers Tab */}
            {activeTab === 'customers' && (
              <div className="space-y-4">
                {customerHistory.length === 0 ? (
                  <div className="text-center py-12">
                    <FaUsers className="text-6xl text-neutral-300 mx-auto mb-4" />
                    <p className="text-neutral-600">No customer purchases yet</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="border-b border-neutral-200">
                          <th className="text-left py-3 px-4 text-sm font-medium text-neutral-700">Customer</th>
                          <th className="text-center py-3 px-4 text-sm font-medium text-neutral-700">Total Units</th>
                          <th className="text-center py-3 px-4 text-sm font-medium text-neutral-700">Purchases</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-neutral-700">Variants Purchased</th>
                          <th className="text-center py-3 px-4 text-sm font-medium text-neutral-700">Last Purchase</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100">
                        {customerHistory.map((customer) => (
                          <tr key={customer.client_id} className="hover:bg-neutral-50">
                            <td className="py-3 px-4">
                              <p className="font-medium text-neutral-800">{customer.client_name}</p>
                            </td>
                            <td className="text-center py-3 px-4 font-medium">{customer.total_purchased}</td>
                            <td className="text-center py-3 px-4">{customer.purchase_count}</td>
                            <td className="py-3 px-4">
                              <div className="flex flex-wrap gap-1">
                                {customer.variants_purchased.map((variant, index) => (
                                  <span 
                                    key={index}
                                    className="inline-block px-2 py-1 text-xs bg-neutral-100 rounded"
                                  >
                                    {variant.size}-{variant.color} ({variant.quantity})
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="text-center py-3 px-4 text-sm text-neutral-600">
                              {format(new Date(customer.last_purchase_date), 'MMM d, yyyy')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}