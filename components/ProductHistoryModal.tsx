import React, { useEffect, useState } from 'react'
import { ProductHistoryEntry, analyticsFunctions } from '@/utils/functions/analytics'
import { FaSpinner, FaTimes } from 'react-icons/fa'

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
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isOpen && productId) {
      fetchHistory()
    }
  }, [isOpen, productId, variantId])

  const fetchHistory = async () => {
    setIsLoading(true)
    try {
      let historyData: ProductHistoryEntry[]
      if (variantId) {
        historyData = await analyticsFunctions.getProductVariantHistory(variantId)
      } else {
        historyData = await analyticsFunctions.getProductHistory(productId)
      }
      setHistory(historyData)
    } catch (error) {
      console.error('Error fetching product history:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray">
            {variantInfo
              ? `History for ${productName} (${variantInfo.size} - ${variantInfo.color})`
              : `History for ${productName}`}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 focus:outline-none"
          >
            <FaTimes size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <FaSpinner className="animate-spin text-blue text-4xl" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-gray">
              No history records found for this product.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Change
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Previous Qty
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      New Qty
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Source
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {history.map((entry) => (
                    <tr key={entry.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(entry.created_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span
                          className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            entry.quantity_change > 0
                              ? 'bg-green-100 text-green-800'
                              : entry.quantity_change < 0
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {entry.quantity_change > 0 ? '+' : ''}
                          {entry.quantity_change}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {entry.previous_quantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {entry.new_quantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatSourceType(entry.source_type)}
                        {entry.source_id && ` #${entry.source_id}`}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                        {entry.notes || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="p-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray text-white rounded hover:bg-black"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default ProductHistoryModal