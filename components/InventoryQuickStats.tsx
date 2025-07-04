import React, { useEffect, useState } from 'react'
import { analyticsFunctions, ProductHistorySummary } from '@/utils/functions/product-history'
import { FaArrowUp, FaArrowDown, FaBox } from 'react-icons/fa'

interface InventoryQuickStatsProps {
  productId: string
  className?: string
}

const InventoryQuickStats: React.FC<InventoryQuickStatsProps> = ({ productId, className = '' }) => {
  const [summary, setSummary] = useState<ProductHistorySummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchSummary()
  }, [productId])

  const fetchSummary = async () => {
    try {
      const data = await analyticsFunctions.getInventorySummary(productId)
      setSummary(data)
    } catch (error) {
      console.error('Error fetching inventory summary:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      </div>
    )
  }

  if (!summary) {
    return null
  }

  return (
    <div className={`flex items-center gap-4 text-sm ${className}`}>
      <div className="flex items-center gap-1">
        <FaArrowUp className="text-green-500 text-xs" />
        <span className="text-green-600 font-medium">{summary.total_in}</span>
      </div>
      <div className="flex items-center gap-1">
        <FaArrowDown className="text-red-500 text-xs" />
        <span className="text-red-600 font-medium">{summary.total_out}</span>
      </div>
      <div className="flex items-center gap-1">
        <FaBox className="text-blue-500 text-xs" />
        <span className="text-blue-600 font-medium">{summary.current_quantity}</span>
      </div>
    </div>
  )
}

export default InventoryQuickStats