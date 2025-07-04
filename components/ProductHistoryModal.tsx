import React, { useEffect, useState } from 'react'
import { ProductHistoryEntry, ProductHistorySummary, analyticsFunctions } from '@/utils/functions/product-history'
import { 
  FaTimes, 
  FaHistory,
  FaBoxes,
  FaDollarSign,
  FaEdit,
  FaPalette,
  FaPlus,
  FaTrash,
  FaDownload,
  FaFilter
} from 'react-icons/fa'
import { format } from 'date-fns'

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

const ProductHistoryModal: React.FC<ProductHistoryModalProps> = ({
  isOpen,
  onClose,
  productId,
  productName,
  variantId,
  variantInfo
}) => {
  const [history, setHistory] = useState<ProductHistoryEntry[]>([])
  const [summary, setSummary] = useState<ProductHistorySummary | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [filterType, setFilterType] = useState<string>('all')
  const [activeView, setActiveView] = useState<'timeline' | 'summary'>('timeline')

  useEffect(() => {
    if (isOpen && productId) {
      fetchHistory()
      fetchSummary()
    }
  }, [isOpen, productId, variantId, filterType])

  const fetchHistory = async () => {
    setIsLoading(true)
    try {
      const options: any = { variantId, limit: 100 }
      if (filterType !== 'all') {
        options.changeType = filterType
      }
      
      const data = await analyticsFunctions.getProductHistory(productId, options)
      setHistory(data)
    } catch (error) {
      console.error('Error fetching history:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchSummary = async () => {
    try {
      const data = await analyticsFunctions.getInventorySummary(productId, variantId)
      setSummary(data)
    } catch (error) {
      console.error('Error fetching summary:', error)
    }
  }

  const exportToCSV = () => {
    const headers = ['Date', 'Type', 'Change', 'Source', 'User', 'Notes']
    const rows = history.map(entry => [
      format(new Date(entry.created_at), 'yyyy-MM-dd HH:mm'),
      entry.change_type,
      analyticsFunctions.formatHistoryEntry(entry),
      entry.source_reference || entry.source_type,
      entry.user_email || 'System',
      entry.notes || ''
    ])

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${productName}_history_${format(new Date(), 'yyyyMMdd')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const getChangeIcon = (changeType: string) => {
    switch (changeType) {
      case 'inventory': return <FaBoxes />
      case 'price': return <FaDollarSign />
      case 'details': return <FaEdit />
      case 'variant': return <FaPalette />
      case 'creation': return <FaPlus />
      case 'deletion': return <FaTrash />
      default: return <FaHistory />
    }
  }

  const getChangeColor = (changeType: string) => {
    const display = analyticsFunctions.getChangeTypeDisplay(changeType as any)
    switch (display.color) {
      case 'blue': return 'text-blue-600 bg-blue-50'
      case 'green': return 'text-green-600 bg-green-50'
      case 'purple': return 'text-purple-600 bg-purple-50'
      case 'orange': return 'text-orange-600 bg-orange-50'
      case 'teal': return 'text-teal-600 bg-teal-50'
      case 'red': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              Product History
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {productName}
              {variantInfo && (
                <span className="ml-2 text-blue-600">
                  ({variantInfo.size} - {variantInfo.color})
                </span>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <FaTimes size={24} />
          </button>
        </div>

        {/* View Toggle & Filters */}
        <div className="p-4 border-b bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <button
                onClick={() => setActiveView('timeline')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeView === 'timeline'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                Timeline
              </button>
              <button
                onClick={() => setActiveView('summary')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeView === 'summary'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                Summary
              </button>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <FaFilter className="text-gray-500" />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Changes</option>
                  <option value="inventory">Inventory</option>
                  <option value="price">Price</option>
                  <option value="details">Details</option>
                  <option value="variant">Variants</option>
                </select>
              </div>

              <button
                onClick={exportToCSV}
                className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
              >
                <FaDownload size={14} />
                Export
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : activeView === 'timeline' ? (
            // Timeline View
            <div className="space-y-4">
              {history.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No history records found
                </div>
              ) : (
                history.map((entry) => {
                  const display = analyticsFunctions.getChangeTypeDisplay(entry.change_type)
                  
                  return (
                    <div key={entry.id} className="flex gap-4">
                      <div className="flex-shrink-0">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getChangeColor(entry.change_type)}`}>
                          {getChangeIcon(entry.change_type)}
                        </div>
                      </div>
                      
                      <div className="flex-1 bg-gray-50 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-semibold text-gray-800">
                              {analyticsFunctions.formatHistoryEntry(entry)}
                            </h4>
                            {entry.source_reference && (
                              <p className="text-sm text-gray-600 mt-1">
                                Source: {entry.source_reference}
                              </p>
                            )}
                          </div>
                          <span className="text-xs text-gray-500">
                            {format(new Date(entry.created_at), 'MMM dd, yyyy HH:mm')}
                          </span>
                        </div>
                        
                        {entry.notes && (
                          <p className="text-sm text-gray-600 italic">
                            Note: {entry.notes}
                          </p>
                        )}
                        
                        {entry.user_email && (
                          <p className="text-xs text-gray-500 mt-2">
                            By: {entry.user_email}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          ) : (
            // Summary View
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {summary ? (
                <>
                  <div className="bg-blue-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-blue-800 mb-4">
                      Inventory Summary
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-700">Total Received:</span>
                        <span className="font-semibold text-green-600">
                          +{summary.total_in}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Total Sold/Used:</span>
                        <span className="font-semibold text-red-600">
                          -{summary.total_out}
                        </span>
                      </div>
                      <div className="border-t pt-3 flex justify-between">
                        <span className="text-gray-700">Current Stock:</span>
                        <span className="font-bold text-lg">
                          {summary.current_quantity}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">
                      Activity Stats
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-700">Total Transactions:</span>
                        <span className="font-semibold">
                          {summary.total_transactions}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Last Updated:</span>
                        <span className="font-semibold">
                          {format(new Date(summary.last_updated), 'MMM dd, yyyy')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Change Type Breakdown */}
                  <div className="col-span-full bg-white border rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">
                      Activity Breakdown
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {['inventory', 'price', 'details', 'variant'].map(type => {
                        const count = history.filter(h => h.change_type === type).length
                        const display = analyticsFunctions.getChangeTypeDisplay(type as any)
                        
                        return (
                          <div key={type} className={`rounded-lg p-4 ${getChangeColor(type)}`}>
                            <div className="flex items-center gap-2 mb-2">
                              {getChangeIcon(type)}
                              <span className="font-medium">{display.label}</span>
                            </div>
                            <p className="text-2xl font-bold">{count}</p>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </>
              ) : (
                <div className="col-span-full text-center py-12 text-gray-500">
                  No summary data available
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ProductHistoryModal