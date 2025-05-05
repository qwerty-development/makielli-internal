import React, { useEffect, useState, useMemo } from 'react'
import { ProductHistoryEntry, analyticsFunctions } from '@/utils/functions/analytics'
import { 
  FaSpinner, 
  FaTimes, 
  FaFilter, 
  FaSort, 
  FaChartLine, 
  FaDownload, 
  FaSearch,
  FaChevronLeft,
  FaChevronRight,
  FaSortAmountUp,
  FaSortAmountDown,
  FaTags
} from 'react-icons/fa'
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts'
import { format, parseISO, subDays } from 'date-fns'
import { supabase } from '@/utils/supabase'

interface ProductHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  productId: string
  productName: string
  variantId?: string
  variantInfo?: {
    size: string
    color: string
  }
}

interface ProductVariant {
  id: string
  product_id: string
  size: string
  color: string
  quantity: number
  price: number
}

type SortField = 'created_at' | 'quantity_change' | 'previous_quantity' | 'new_quantity'
type SortDirection = 'asc' | 'desc'
type FilterSourceType = 'all' | 'client_invoice' | 'supplier_invoice' | 'adjustment' | 'manual' | 'quotation'

const ProductHistoryModal: React.FC<ProductHistoryModalProps> = ({
  isOpen,
  onClose,
  productId,
  productName,
  variantId,
  variantInfo
}) => {
  const [history, setHistory] = useState<ProductHistoryEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // For variant filtering when viewing overall product
  const [variants, setVariants] = useState<ProductVariant[]>([])
  const [loadingVariants, setLoadingVariants] = useState(false)
  const [selectedVariantId, setSelectedVariantId] = useState<string>('all')
  const [selectedSize, setSelectedSize] = useState<string>('all')
  const [selectedColor, setSelectedColor] = useState<string>('all')
  
  // Pagination
  const [page, setPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  
  // Sorting
  const [sortField, setSortField] = useState<SortField>('created_at')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  
  // Filtering
  const [sourceTypeFilter, setSourceTypeFilter] = useState<FilterSourceType>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [dateRange, setDateRange] = useState<{start: Date | null, end: Date | null}>({
    start: subDays(new Date(), 30),
    end: new Date()
  })
  
  // View type
  const [viewType, setViewType] = useState<'table' | 'chart'>('table')

  // Get the list of available sizes and colors for filtering
  const { sizes, colors } = useMemo(() => {
    const sizeSet = new Set<string>()
    const colorSet = new Set<string>()
    
    variants.forEach(variant => {
      sizeSet.add(variant.size)
      colorSet.add(variant.color)
    })
    
    return {
      sizes: Array.from(sizeSet).sort(),
      colors: Array.from(colorSet).sort()
    }
  }, [variants])

  // Build a map of variant IDs to variant info for lookup
  const variantMap = useMemo(() => {
    const map = new Map<string, ProductVariant>()
    variants.forEach(variant => {
      map.set(variant.id, variant)
    })
    return map
  }, [variants])

  useEffect(() => {
    if (isOpen && productId) {
      fetchHistory()
      
      // Only fetch variants if we're viewing the overall product (not a specific variant)
      if (!variantId) {
        fetchProductVariants()
      }
    }
  }, [isOpen, productId, variantId])
  
  // When a variant filter changes, reset pagination
  useEffect(() => {
    setPage(1)
  }, [selectedVariantId, selectedSize, selectedColor])

  const fetchProductVariants = async () => {
    if (!productId) return
    
    setLoadingVariants(true)
    try {
      // Fetch the variants directly from supabase
      const { data, error } = await supabase
        .from('ProductVariants')
        .select('*')
        .eq('product_id', productId)
      
      if (error) throw error
      setVariants(data || [])
    } catch (error) {
      console.error('Error fetching product variants:', error)
    } finally {
      setLoadingVariants(false)
    }
  }

  const fetchHistory = async () => {
    setIsLoading(true)
    setError(null)
    try {
      let historyData: ProductHistoryEntry[]
      if (variantId) {
        historyData = await analyticsFunctions.getProductVariantHistory(variantId, 100)
      } else {
        historyData = await analyticsFunctions.getProductHistory(productId, 100)
      }
      setHistory(historyData)
      // Reset pagination when new data is loaded
      setPage(1)
    } catch (error) {
      console.error('Error fetching product history:', error)
      setError('Failed to load history data. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Format the source type for display
  const formatSourceType = (sourceType: string): string => {
    switch (sourceType) {
      case 'client_invoice':
        return 'Client Invoice'
      case 'supplier_invoice':
        return 'Supplier Invoice'
      case 'adjustment':
        return 'Adjustment'
      case 'manual':
        return 'Manual Update'
      case 'quotation':
        return 'Quotation'
      default:
        return sourceType.charAt(0).toUpperCase() + sourceType.slice(1).replace('_', ' ')
    }
  }

  // Get variant info display string
  const getVariantDisplayInfo = (variantId: string): string => {
    const variant = variantMap.get(variantId)
    if (variant) {
      return `${variant.size} - ${variant.color}`
    }
    return 'Unknown Variant'
  }

  // Filter and sort the history data
  const filteredAndSortedHistory = useMemo(() => {
    let filtered = [...history]
    
    // Apply variant filters (only if looking at overall product)
    if (!variantId) {
      if (selectedVariantId !== 'all') {
        filtered = filtered.filter(entry => entry.variant_id === selectedVariantId)
      } else {
        // Apply size filter
        if (selectedSize !== 'all') {
          filtered = filtered.filter(entry => {
            const variant = variantMap.get(entry.variant_id)
            return variant && variant.size === selectedSize
          })
        }
        
        // Apply color filter
        if (selectedColor !== 'all') {
          filtered = filtered.filter(entry => {
            const variant = variantMap.get(entry.variant_id)
            return variant && variant.color === selectedColor
          })
        }
      }
    }
    
    // Apply source type filter
    if (sourceTypeFilter !== 'all') {
      filtered = filtered.filter(entry => entry.source_type === sourceTypeFilter)
    }
    
    // Apply search term filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(entry => 
        entry.notes?.toLowerCase().includes(term) ||
        entry.source_id?.toLowerCase().includes(term) ||
        formatSourceType(entry.source_type).toLowerCase().includes(term)
      )
    }
    
    // Apply date range filter
    if (dateRange.start && dateRange.end) {
      filtered = filtered.filter(entry => {
        const entryDate = new Date(entry.created_at)
        return entryDate >= dateRange.start! && entryDate <= dateRange.end!
      })
    }
    
    // Sort the data
    filtered.sort((a, b) => {
      if (sortField === 'created_at') {
        return sortDirection === 'asc' 
          ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          : new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
      
      // For numeric fields
      return sortDirection === 'asc'
        ? a[sortField] - b[sortField]
        : b[sortField] - a[sortField]
    })
    
    return filtered
  }, [history, sourceTypeFilter, searchTerm, dateRange, sortField, sortDirection, 
      selectedVariantId, selectedSize, selectedColor, variantMap, variantId])

  // Get current page items for pagination
  const currentPageItems = useMemo(() => {
    const startIndex = (page - 1) * itemsPerPage
    return filteredAndSortedHistory.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredAndSortedHistory, page, itemsPerPage])

  // Chart data - aggregate by day for line chart
  const chartData = useMemo(() => {
    // Create a map to store aggregated data by date
    const dataByDate = new Map()
    
    filteredAndSortedHistory.forEach(entry => {
      const date = format(new Date(entry.created_at), 'yyyy-MM-dd')
      
      if (!dataByDate.has(date)) {
        dataByDate.set(date, { 
          date,
          qty: entry.new_quantity,
          changes: entry.quantity_change
        })
      } else {
        const data = dataByDate.get(date)
        // Just use the last quantity for the day (represents end of day)
        data.qty = entry.new_quantity
        data.changes += entry.quantity_change
      }
    })
    
    // Convert map to array sorted by date
    return Array.from(dataByDate.values())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [filteredAndSortedHistory])

  // Function to export data to CSV
  const exportToCSV = () => {
    // Include variant info in CSV headers if viewing overall product
    const headers = !variantId 
      ? ['Date', 'Variant', 'Change', 'Previous Qty', 'New Qty', 'Source', 'Notes']
      : ['Date', 'Change', 'Previous Qty', 'New Qty', 'Source', 'Notes']
    
    const csvData = filteredAndSortedHistory.map(entry => {
      const row: string[] = [
        new Date(entry.created_at).toLocaleString()
      ]
      
      // Add variant info if viewing overall product
      if (!variantId) {
        const variant = variantMap.get(entry.variant_id)
        row.push(variant ? `${variant.size} - ${variant.color}` : 'Unknown Variant')
      }
      
      // Convert numeric values to strings
      row.push(
        entry.quantity_change.toString(),
        entry.previous_quantity.toString(),
        entry.new_quantity.toString(),
        `${formatSourceType(entry.source_type)}${entry.source_id ? ` #${entry.source_id}` : ''}`,
        entry.notes || ''
      )
      
      return row
    })
    
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => 
        typeof cell === 'string' && cell.includes(',') 
          ? `"${cell}"` 
          : cell
      ).join(','))
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `${productName}${variantInfo ? `-${variantInfo.size}-${variantInfo.color}` : ''}-history.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Function to handle sort changes
  const handleSort = (field: SortField) => {
    if (field === sortField) {
      // Toggle sort direction if clicking the same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      // Set the new sort field and reset direction to descending
      setSortField(field)
      setSortDirection('desc')
    }
  }

  // Get sort icon based on current sort
  const getSortIcon = (field: SortField) => {
    if (field !== sortField) return <FaSort className="ml-1 text-neutral-400" />
    return sortDirection === 'asc' 
      ? <FaSortAmountUp className="ml-1 text-blue" /> 
      : <FaSortAmountDown className="ml-1 text-blue" />
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray">
            {variantInfo
              ? `History for ${productName} (${variantInfo.size} - ${variantInfo.color})`
              : `History for ${productName}`}
          </h2>
          <div className="flex items-center space-x-4">
            <div className="flex">
              <button
                onClick={() => setViewType('table')}
                className={`px-3 py-1 rounded-l ${viewType === 'table' ? 'bg-blue text-white' : 'bg-neutral-100 text-neutral-600'}`}
              >
                Table
              </button>
              <button
                onClick={() => setViewType('chart')}
                className={`px-3 py-1 rounded-r ${viewType === 'chart' ? 'bg-blue text-white' : 'bg-neutral-100 text-neutral-600'}`}
              >
                Chart
              </button>
            </div>
            
            <button
              onClick={exportToCSV}
              className="flex items-center bg-neutral-100 text-neutral-600 hover:bg-neutral-200 px-2 py-1 rounded"
              title="Export to CSV"
            >
              <FaDownload className="mr-1" /> Export
            </button>
            
            <button
              onClick={onClose}
              className="text-neutral-500 hover:text-neutral-700 focus:outline-none"
            >
              <FaTimes size={20} />
            </button>
          </div>
        </div>

        <div className="p-4 border-b bg-neutral-50">
          <div className="flex flex-wrap gap-3 justify-between items-center">
            {/* Search */}
            <div className="flex items-center relative">
              <input
                type="text"
                placeholder="Search notes or sources..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-4 py-1 border rounded text-sm focus:ring-1 focus:ring-blue focus:border-blue"
              />
              <FaSearch className="absolute left-2 text-neutral-400" />
            </div>
            
            {/* Variant filters - only show when viewing overall product */}
            {!variantId && (
              <div className="flex flex-wrap gap-2 items-center">
                {variants.length > 0 && (
                  <div className="flex items-center">
                    <span className="flex items-center mr-2 text-sm">
                      <FaTags className="mr-1 text-neutral-400" /> Variant:
                    </span>
                    <select
                      value={selectedVariantId}
                      onChange={(e) => {
                        setSelectedVariantId(e.target.value)
                        // Reset size and color filters when selecting a specific variant
                        if (e.target.value !== 'all') {
                          setSelectedSize('all')
                          setSelectedColor('all')
                        }
                      }}
                      className="border rounded px-2 py-1 text-sm focus:ring-1 focus:ring-blue focus:border-blue min-w-[150px]"
                      disabled={loadingVariants}
                    >
                      <option value="all">All Variants</option>
                      {variants.map(variant => (
                        <option key={variant.id} value={variant.id}>
                          {variant.size} - {variant.color}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                
                {selectedVariantId === 'all' && sizes.length > 0 && (
                  <div className="flex items-center">
                    <label className="mr-2 text-sm">Size:</label>
                    <select
                      value={selectedSize}
                      onChange={(e) => setSelectedSize(e.target.value)}
                      className="border rounded px-2 py-1 text-sm focus:ring-1 focus:ring-blue focus:border-blue min-w-[100px]"
                      disabled={loadingVariants}
                    >
                      <option value="all">All Sizes</option>
                      {sizes.map(size => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                
                {selectedVariantId === 'all' && colors.length > 0 && (
                  <div className="flex items-center">
                    <label className="mr-2 text-sm">Color:</label>
                    <select
                      value={selectedColor}
                      onChange={(e) => setSelectedColor(e.target.value)}
                      className="border rounded px-2 py-1 text-sm focus:ring-1 focus:ring-blue focus:border-blue min-w-[100px]"
                      disabled={loadingVariants}
                    >
                      <option value="all">All Colors</option>
                      {colors.map(color => (
                        <option key={color} value={color}>
                          {color}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                
                {variants.length === 0 && !loadingVariants && (
                  <div className="text-sm text-amber-600">
                    No variants found for this product.
                  </div>
                )}
              </div>
            )}
            
            {/* Source Type Filter */}
            <div className="flex items-center">
              <label className="mr-2 text-sm">Source Type:</label>
              <select
                value={sourceTypeFilter}
                onChange={(e) => setSourceTypeFilter(e.target.value as FilterSourceType)}
                className="border rounded px-2 py-1 text-sm focus:ring-1 focus:ring-blue focus:border-blue"
              >
                <option value="all">All Sources</option>
                <option value="client_invoice">Client Invoice</option>
                <option value="supplier_invoice">Supplier Invoice</option>
                <option value="adjustment">Adjustment</option>
                <option value="manual">Manual Update</option>
                <option value="quotation">Quotation</option>
              </select>
            </div>
            
            {/* Items per page */}
            <div className="flex items-center">
              <label className="mr-2 text-sm">Show:</label>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value))
                  setPage(1) // Reset to first page
                }}
                className="border rounded px-2 py-1 text-sm focus:ring-1 focus:ring-blue focus:border-blue"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {error && (
            <div className="text-center py-4 text-red-500 bg-red-50 rounded-lg">
              {error}
              <button 
                onClick={fetchHistory}
                className="ml-2 underline text-blue hover:text-indigo-dark"
              >
                Retry
              </button>
            </div>
          )}
          
          {loadingVariants && !variantId && (
            <div className="text-center py-2 text-neutral-500 bg-neutral-50 rounded-lg mb-4">
              <FaSpinner className="animate-spin inline mr-2" />
              Loading variant information...
            </div>
          )}
          
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <FaSpinner className="animate-spin text-blue text-4xl" />
            </div>
          ) : filteredAndSortedHistory.length === 0 ? (
            <div className="text-center py-8 text-gray">
              No history records found for this product.
            </div>
          ) : viewType === 'table' ? (
            // Table View
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-200">
                <thead className="bg-neutral-50">
                  <tr>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider cursor-pointer hover:bg-neutral-100"
                      onClick={() => handleSort('created_at')}
                    >
                      <div className="flex items-center">
                        Date {getSortIcon('created_at')}
                      </div>
                    </th>
                    {/* Show variant column only when viewing overall product */}
                    {!variantId && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Variant
                      </th>
                    )}
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider cursor-pointer hover:bg-neutral-100"
                      onClick={() => handleSort('quantity_change')}
                    >
                      <div className="flex items-center">
                        Change {getSortIcon('quantity_change')}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider cursor-pointer hover:bg-neutral-100"
                      onClick={() => handleSort('previous_quantity')}
                    >
                      <div className="flex items-center">
                        Previous Qty {getSortIcon('previous_quantity')}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider cursor-pointer hover:bg-neutral-100"
                      onClick={() => handleSort('new_quantity')}
                    >
                      <div className="flex items-center">
                        New Qty {getSortIcon('new_quantity')}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Source
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-neutral-200">
                  {currentPageItems.map((entry) => {
                    // Get variant details
                    const variant = !variantId && variantMap.get(entry.variant_id)
                    
                    return (
                      <tr key={entry.id} className="hover:bg-neutral-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                          {new Date(entry.created_at).toLocaleString()}
                        </td>
                        {/* Show variant column only when viewing overall product */}
                        {!variantId && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {variant ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                {variant.size} - {variant.color}
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-800">
                                Unknown
                              </span>
                            )}
                          </td>
                        )}
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span
                            className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              entry.quantity_change > 0
                                ? 'bg-green-100 text-green-800'
                                : entry.quantity_change < 0
                                ? 'bg-red-100 text-red-800'
                                : 'bg-neutral-100 text-neutral-800'
                            }`}
                          >
                            {entry.quantity_change > 0 ? '+' : ''}
                            {entry.quantity_change}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                          {entry.previous_quantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                          {entry.new_quantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                          {formatSourceType(entry.source_type)}
                          {entry.source_id && (
                            <span className="ml-1 text-blue cursor-pointer hover:underline" title="View source details">
                              #{entry.source_id}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-neutral-500 max-w-xs">
                          <div className="truncate" title={entry.notes || '-'}>
                            {entry.notes || '-'}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              
              {/* Pagination */}
              <div className="flex items-center justify-between mt-4 px-6 py-3 bg-neutral-50 border-t rounded-b-lg">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className={`relative inline-flex items-center px-4 py-2 border border-neutral-300 text-sm font-medium rounded-md ${
                      page === 1 ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed' : 'bg-white text-neutral-700 hover:bg-neutral-50'
                    }`}
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage(Math.min(Math.ceil(filteredAndSortedHistory.length / itemsPerPage), page + 1))}
                    disabled={page >= Math.ceil(filteredAndSortedHistory.length / itemsPerPage)}
                    className={`ml-3 relative inline-flex items-center px-4 py-2 border border-neutral-300 text-sm font-medium rounded-md ${
                      page >= Math.ceil(filteredAndSortedHistory.length / itemsPerPage)
                        ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
                        : 'bg-white text-neutral-700 hover:bg-neutral-50'
                    }`}
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-neutral-700">
                      Showing <span className="font-medium">{Math.min((page - 1) * itemsPerPage + 1, filteredAndSortedHistory.length)}</span> to{' '}
                      <span className="font-medium">{Math.min(page * itemsPerPage, filteredAndSortedHistory.length)}</span> of{' '}
                      <span className="font-medium">{filteredAndSortedHistory.length}</span> results
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                      <button
                        onClick={() => setPage(Math.max(1, page - 1))}
                        disabled={page === 1}
                        className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-neutral-300 ${
                          page === 1 ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed' : 'bg-white text-neutral-500 hover:bg-neutral-50'
                        }`}
                      >
                        <span className="sr-only">Previous</span>
                        <FaChevronLeft className="h-5 w-5" aria-hidden="true" />
                      </button>
                      
                      {Array.from({ length: Math.min(5, Math.ceil(filteredAndSortedHistory.length / itemsPerPage)) }).map((_, i) => {
                        const pageNumber = i + 1
                        return (
                          <button
                            key={i}
                            onClick={() => setPage(pageNumber)}
                            className={`relative inline-flex items-center px-4 py-2 border ${
                              page === pageNumber
                                ? 'z-10 bg-blue text-white border-blue'
                                : 'bg-white border-neutral-300 text-neutral-500 hover:bg-neutral-50'
                            }`}
                          >
                            {pageNumber}
                          </button>
                        )
                      })}
                      
                      <button
                        onClick={() => setPage(Math.min(Math.ceil(filteredAndSortedHistory.length / itemsPerPage), page + 1))}
                        disabled={page >= Math.ceil(filteredAndSortedHistory.length / itemsPerPage)}
                        className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-neutral-300 ${
                          page >= Math.ceil(filteredAndSortedHistory.length / itemsPerPage)
                            ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
                            : 'bg-white text-neutral-500 hover:bg-neutral-50'
                        }`}
                      >
                        <span className="sr-only">Next</span>
                        <FaChevronRight className="h-5 w-5" aria-hidden="true" />
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Chart View
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-lg font-medium mb-4">Quantity History Over Time</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis 
                      yAxisId="left"
                      orientation="left"
                      tick={{ fontSize: 12 }}
                      label={{ value: 'Quantity', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      tick={{ fontSize: 12 }}
                      label={{ value: 'Changes', angle: 90, position: 'insideRight', style: { textAnchor: 'middle' } }}
                    />
                    <Tooltip 
                      formatter={(value, name) => [value, name === 'qty' ? 'Quantity' : 'Changes']}
                    />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="qty"
                      name="Quantity"
                      stroke="#1E1E89"
                      activeDot={{ r: 8 }}
                      strokeWidth={2}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="changes"
                      name="Changes"
                      stroke="#4C5B5C"
                      strokeDasharray="5 5"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 text-sm text-neutral-500">
                <p>The chart shows the quantity level (solid line) and quantity changes (dashed line) over time.</p>
                <p>Note: Changes are aggregated by day.</p>
                {!variantId && selectedVariantId === 'all' && variants.length > 0 && (
                  <p className="text-amber-600 mt-1">
                    <strong>Note:</strong> This chart is showing aggregated data across all variants. 
                    Use the variant filters above for more specific analysis.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t flex justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray text-white rounded hover:bg-black"
          >
            Close
          </button>
          
          <div className="text-sm text-neutral-500">
            {filteredAndSortedHistory.length} {filteredAndSortedHistory.length === 1 ? 'record' : 'records'} found
            {!variantId && selectedVariantId !== 'all' && (
              <span className="ml-1">
                for variant {getVariantDisplayInfo(selectedVariantId)}
              </span>
            )}
            {!variantId && selectedSize !== 'all' && (
              <span className="ml-1">
                with size {selectedSize}
              </span>
            )}
            {!variantId && selectedColor !== 'all' && (
              <span className="ml-1">
                with color {selectedColor}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProductHistoryModal