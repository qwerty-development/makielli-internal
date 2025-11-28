'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { productHistoryFunctions, ProductHistoryDetail, ProductHistorySummary, VariantSalesDetail, CustomerPurchaseHistory } from '@/utils/functions/productHistory'
import { clientFunctions, Client } from '@/utils/functions/clients'
import SearchableSelect from '@/components/SearchableSelect'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { 
  FaHistory, 
  FaUsers, 
  FaCalendar, 
  FaBox,
  FaSpinner,
  FaFileCsv,
  FaArrowLeft,
  FaChartLine,
  FaChartBar,
  FaUserTag,
  FaFilter,
  FaTag,
  FaTruck,
  FaBoxOpen,
  FaTable,
  FaCheck,
  FaClock
} from 'react-icons/fa'
import { format } from 'date-fns'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const COLORS = {
  primary: '#4F46E5',
  secondary: '#10B981',
  danger: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
  light: '#F9FAFB',
  dark: '#1F2937',
};

interface ProductInfo {
    name: string;
    photo: string;
}

export default function ProductHistoryDetailPage({ params }: { params: { productId: string } }) {
  const router = useRouter()
  const { productId } = params

  const [productInfo, setProductInfo] = useState<ProductInfo | null>(null)
  const [history, setHistory] = useState<ProductHistoryDetail[]>([])
  const [filteredHistory, setFilteredHistory] = useState<ProductHistoryDetail[]>([])
  const [summary, setSummary] = useState<ProductHistorySummary | null>(null)
  const [variantSales, setVariantSales] = useState<VariantSalesDetail[]>([])
  const [customerPurchases, setCustomerPurchases] = useState<CustomerPurchaseHistory[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Filters
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null)
  const [sourceType, setSourceType] = useState('')

  useEffect(() => {
    fetchData()
  }, [productId])

  useEffect(() => {
    applyFilters()
  }, [history, dateRange, selectedClientId, sourceType])

  const fetchData = async () => {
    if (!productId) return
    try {
      setIsLoading(true)
      const [ 
        historyData,
        summaryData,
        variantSalesData,
        customerPurchasesData,
        clientsData
      ] = await Promise.all([
        productHistoryFunctions.getProductHistory(productId),
        productHistoryFunctions.getProductHistorySummary(productId),
        productHistoryFunctions.getVariantSalesDetails(productId),
        productHistoryFunctions.getCustomerPurchaseHistory(productId),
        clientFunctions.getAllClients()
      ])

      setHistory(historyData)
      setFilteredHistory(historyData)
      setSummary(summaryData)
      setVariantSales(variantSalesData)
      setCustomerPurchases(customerPurchasesData)
      setClients(clientsData)

      if (historyData.length > 0) {
        setProductInfo({
            name: historyData[0].product_name,
            photo: historyData[0].product_photo
        })
      }

    } catch (error) {
      console.error('Error fetching product history details:', error)
      toast.error('Failed to load product details')
    } finally {
      setIsLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...history]
    const [startDate, endDate] = dateRange

    if (startDate) {
        filtered = filtered.filter(item => new Date(item.created_at) >= startDate)
    }
    if (endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        filtered = filtered.filter(item => new Date(item.created_at) <= endOfDay)
    }
    if (selectedClientId) {
        filtered = filtered.filter(item => item.client_id === selectedClientId)
    }
    if (sourceType) {
        filtered = filtered.filter(item => item.source_type === sourceType)
    }

    setFilteredHistory(filtered)
  }

  const handleExportCSV = async () => {
    try {
      const csv = await productHistoryFunctions.exportProductHistoryToCSV(productId)
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `${productInfo?.name || 'product'}_history.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast.success('History exported to CSV')
    } catch (error) {
      console.error('Error exporting CSV:', error)
      toast.error('Failed to export CSV')
    }
  }

  const salesOverTimeData = useMemo(() => {
    const sales = filteredHistory
        .filter(h => h.source_type === 'invoice' || h.source_type === 'quotation')
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

    const data = sales.map(s => ({
        date: format(new Date(s.created_at), 'MMM d'),
        quantity: Math.abs(s.quantity_change)
    }))
    return data
  }, [filteredHistory])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-center">
          <FaSpinner className="animate-spin text-4xl text-indigo-600 mb-4 mx-auto" />
          <p className="text-neutral-600 text-lg">Loading Product Details...</p>
        </div>
      </div>
    )
  }

  if (!productInfo) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-neutral-50">
            <div className="text-center">
                <FaBox className="text-6xl text-neutral-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-neutral-700">Product Not Found</h3>
                <p className="text-neutral-500 mt-2">Could not find history for this product.</p>
                <button
                    onClick={() => router.push('/products/history')}
                    className="mt-6 flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                    <FaArrowLeft />
                    Back to Product History
                </button>
            </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-100 p-4 sm:p-6 lg:p-8 text-black">
      <div className="max-w-8xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
                <div className="flex items-center gap-4">
                    {productInfo.photo ? (
                        <img src={productInfo.photo} alt={productInfo.name} className="w-20 h-20 rounded-lg object-cover shadow-sm" />
                    ) : (
                        <div className="w-20 h-20 rounded-lg bg-neutral-200 flex items-center justify-center">
                            <FaBox className="text-4xl text-neutral-400" />
                        </div>
                    )}
                    <div>
                        <h1 className="text-3xl font-bold text-neutral-800">{productInfo.name}</h1>
                        <p className="text-neutral-500 mt-1">Detailed sales and stock history.</p>
                    </div>
                </div>
                <div className="flex items-center gap-4 mt-4 sm:mt-0">
                    <button
                        onClick={() => router.push('/products/history')}
                        className="flex items-center gap-2 px-4 py-2 bg-neutral-200 text-neutral-700 rounded-lg hover:bg-neutral-300 transition-colors"
                    >
                        <FaArrowLeft />
                        Back
                    </button>
                    <button
                        onClick={handleExportCSV}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                        <FaFileCsv />
                        Export CSV
                    </button>
                </div>
            </div>
        </div>

        {/* Summary Stats */}
        {summary && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-6 mb-6">
                <StatCard title="Total Sold" value={summary.total_sold} icon={FaHistory} color="green" />
                <StatCard title="Shipped" value={summary.total_shipped} icon={FaTruck} color="indigo" />
                <StatCard title="Unshipped" value={summary.total_unshipped} icon={FaBoxOpen} color="red" />
                <StatCard title="Total Purchased" value={summary.total_purchased} icon={FaBox} color="blue" />
                <StatCard title="Adjustments" value={summary.total_adjusted} icon={FaTag} color="yellow" />
                <StatCard title="Unique Customers" value={summary.unique_customers} icon={FaUsers} color="purple" />
 
            </div>
        )}

        {/* Visualizations */}
        <div className="mb-6">
           
            <ChartCard title="Variant Performance" icon={FaChartBar}>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={variantSales} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis type="category" dataKey="size" width={80} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="total_sold" fill={COLORS.secondary} name="Total Sold" />
                        <Bar dataKey="shipped" fill={COLORS.primary} name="Shipped" />
                        <Bar dataKey="unshipped" fill={COLORS.warning} name="Unshipped" />
                        <Bar dataKey="current_stock" fill={COLORS.info} name="Current Stock" />
                    </BarChart>
                </ResponsiveContainer>
            </ChartCard>
        </div>

        {/* Variant Quick Stats Table */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
                <FaTable className="text-xl text-indigo-600" />
                <h3 className="font-semibold text-neutral-700 text-lg">Variant Quick Stats</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-neutral-200">
                    <thead className="bg-neutral-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-600 uppercase tracking-wider">Variant</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-600 uppercase tracking-wider">Current Stock</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-600 uppercase tracking-wider">Total Sold</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-600 uppercase tracking-wider">Shipped</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-600 uppercase tracking-wider">Unshipped</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-600 uppercase tracking-wider">% Shipped</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-neutral-600 uppercase tracking-wider">Status</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-neutral-200">
                        {variantSales.map((v, index) => {
                            const percentShipped = v.total_sold > 0 ? Math.round((v.shipped / v.total_sold) * 100) : 100
                            const isFullyShipped = v.unshipped === 0
                            return (
                                <tr key={v.variant_id || index} className="hover:bg-neutral-50 transition-colors">
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full bg-indigo-400"></div>
                                            <span className="font-medium text-neutral-800">{v.size} / {v.color}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-right">
                                        <span className={`font-semibold ${v.current_stock <= 0 ? 'text-red-600' : v.current_stock < 10 ? 'text-yellow-600' : 'text-neutral-800'}`}>
                                            {v.current_stock}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-right font-semibold text-green-600">
                                        {v.total_sold}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-right">
                                        <span className="font-semibold text-indigo-600">{v.shipped}</span>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-right">
                                        <span className={`font-semibold ${v.unshipped > 0 ? 'text-orange-600' : 'text-neutral-400'}`}>
                                            {v.unshipped}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <div className="w-16 bg-neutral-200 rounded-full h-2">
                                                <div 
                                                    className={`h-2 rounded-full ${percentShipped === 100 ? 'bg-green-500' : percentShipped >= 50 ? 'bg-indigo-500' : 'bg-orange-500'}`}
                                                    style={{ width: `${percentShipped}%` }}
                                                ></div>
                                            </div>
                                            <span className="text-sm font-medium text-neutral-600 w-10">{percentShipped}%</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-center">
                                        {isFullyShipped ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                <FaCheck className="text-xs" /> Shipped
                                            </span>
                                        ) : v.shipped === 0 ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                <FaClock className="text-xs" /> Pending
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                                <FaTruck className="text-xs" /> Partial
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            )
                        })}
                        {variantSales.length === 0 && (
                            <tr>
                                <td colSpan={7} className="px-4 py-8 text-center text-neutral-500">
                                    No variant data available
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>

        {/* Customer & History Section */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Top Customers - Expanded */}
            <div className="lg:col-span-3">
                <div className="bg-white rounded-xl shadow-md p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <FaUserTag className="text-2xl text-indigo-600" />
                            <h3 className="font-bold text-neutral-800 text-xl">Top Customers</h3>
                        </div>
                        <div className="text-sm text-neutral-500">
                            {customerPurchases.length} customers total
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 max-h-[700px] overflow-y-auto">
                        {customerPurchases.map((c, index) => (
                            <div key={c.client_id} className="p-5 bg-gradient-to-br from-neutral-50 to-neutral-100 rounded-xl shadow-sm hover:shadow-md transition-shadow border border-neutral-200">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
                                            {index + 1}
                                        </div>
                                        <div>
                                            <p 
                                                className="font-bold text-lg text-neutral-800 hover:text-indigo-600 cursor-pointer transition-colors" 
                                                onClick={() => router.push(`/clients/details/${c.client_id}`)}
                                            >
                                                {c.client_name}
                                            </p>
                                            <p className="text-sm text-neutral-500">
                                                Customer since {format(new Date(c.last_purchase_date), 'MMM yyyy')}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Key Metrics */}
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                                        <p className="text-2xl font-bold text-indigo-600">{c.total_purchased}</p>
                                        <p className="text-xs text-neutral-600 font-medium">Total Units</p>
                                    </div>
                                    <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                                        <p className="text-2xl font-bold text-green-600">{c.purchase_count}</p>
                                        <p className="text-xs text-neutral-600 font-medium">Orders</p>
                                    </div>
                                </div>

                                {/* Shipping Status Summary */}
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div className="text-center p-2 bg-green-50 rounded-lg border border-green-200">
                                        <div className="flex items-center justify-center gap-1">
                                            <FaTruck className="text-green-600 text-sm" />
                                            <p className="text-lg font-bold text-green-600">{c.total_shipped}</p>
                                        </div>
                                        <p className="text-xs text-green-700 font-medium">Shipped</p>
                                    </div>
                                    <div className="text-center p-2 bg-orange-50 rounded-lg border border-orange-200">
                                        <div className="flex items-center justify-center gap-1">
                                            <FaClock className="text-orange-600 text-sm" />
                                            <p className="text-lg font-bold text-orange-600">{c.total_unshipped}</p>
                                        </div>
                                        <p className="text-xs text-orange-700 font-medium">Pending</p>
                                    </div>
                                </div>

                                {/* Additional Details */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-neutral-600 font-medium">Last Purchase:</span>
                                        <span className="text-neutral-800 font-semibold">{format(new Date(c.last_purchase_date), 'MMM d, yyyy')}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-neutral-600 font-medium">Avg per Order:</span>
                                        <span className="text-neutral-800 font-semibold">{Math.round(c.total_purchased / c.purchase_count)} units</span>
                                    </div>
                                </div>

                                {/* Variants Section */}
                                <div className="mt-4 pt-4 border-t border-neutral-200">
                                    <p className="text-sm font-bold text-neutral-700 mb-3">Variant Details ({c.variants_purchased.length}):</p>
                                    <div className="space-y-2 max-h-64 overflow-y-auto">
                                        {c.variants_purchased
                                            .sort((a, b) => b.quantity - a.quantity)
                                            .map((v, i) => {
                                                const isFullyShipped = v.unshipped === 0
                                                const isPartiallyShipped = v.shipped > 0 && v.unshipped > 0
                                                return (
                                                    <div key={i} className="p-2 bg-white rounded-md shadow-sm">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-3 h-3 bg-indigo-400 rounded-full"></div>
                                                                <span className="text-sm font-medium text-neutral-800">
                                                                    {v.size} / {v.color}
                                                                </span>
                                                            </div>
                                                            <span className="text-sm font-bold text-indigo-600">
                                                                {v.quantity} units
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center justify-between text-xs pl-5">
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-green-600">
                                                                    <FaTruck className="inline mr-1 text-[10px]" />{v.shipped} shipped
                                                                </span>
                                                                {v.unshipped > 0 && (
                                                                    <span className="text-orange-600">
                                                                        <FaClock className="inline mr-1 text-[10px]" />{v.unshipped} pending
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {isFullyShipped ? (
                                                                <FaCheck className="text-green-500" />
                                                            ) : isPartiallyShipped ? (
                                                                <div className="w-12 bg-neutral-200 rounded-full h-1.5">
                                                                    <div 
                                                                        className="h-1.5 rounded-full bg-yellow-500"
                                                                        style={{ width: `${Math.round((v.shipped / v.quantity) * 100)}%` }}
                                                                    ></div>
                                                                </div>
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                    </div>
                                </div>

                                {/* Quick Actions */}
                                <div className="mt-4 pt-3 border-t border-neutral-200">
                                    <button
                                        onClick={() => router.push(`/clients/details/${c.client_id}`)}
                                        className="w-full px-3 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                                    >
                                        View Customer Details
                                    </button>
                                </div>
                            </div>
                        ))}
                        {customerPurchases.length === 0 && (
                            <div className="col-span-full text-center py-12">
                                <FaUsers className="text-6xl text-neutral-300 mx-auto mb-4" />
                                <p className="text-neutral-500 text-lg">No customer purchase history found.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Compact History Table */}
            <div className="lg:col-span-1 bg-white rounded-xl shadow-md p-4">
                <div className="flex items-center gap-3 mb-3">
                    <FaHistory className="text-lg text-indigo-600" />
                    <h3 className="font-semibold text-neutral-700">Recent History</h3>
                </div>
                
                {/* Simplified Filters */}
                <div className="space-y-2 mb-4">
                    <select 
                        value={sourceType} 
                        onChange={e => setSourceType(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-black"
                    >
                        <option value="">All Types</option>
                        <option value="invoice">Invoice</option>
                        <option value="quotation">Quotation</option>
                        <option value="inventory_adjustment">Adjustment</option>
                        <option value="purchase_order">Purchase</option>
                    </select>
                </div>

                <div className="max-h-[500px] overflow-y-auto">
                    <div className="space-y-2">
                        {filteredHistory.slice(0, 15).map(item => (
                            <div key={item.id} className="p-3 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors">
                                <div className="flex items-center justify-between mb-1">
                                    <SourceTypeBadge type={item.source_type} />
                                    <span className="text-xs text-neutral-500">{format(new Date(item.created_at), 'MMM d')}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-neutral-600">{item.size} / {item.color}</span>
                                    <span className={`text-sm font-bold ${item.quantity_change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {item.quantity_change > 0 ? `+${item.quantity_change}` : item.quantity_change}
                                    </span>
                                </div>
                            </div>
                        ))}
                        {filteredHistory.length === 0 && (
                            <div className="text-center py-8">
                                <FaHistory className="text-3xl text-neutral-300 mx-auto mb-2" />
                                <p className="text-neutral-500 text-sm">No history records</p>
                            </div>
                        )}
                        {filteredHistory.length > 15 && (
                            <div className="text-center py-2">
                                <p className="text-xs text-neutral-500">Showing latest 15 of {filteredHistory.length} records</p>
                                <button 
                                    onClick={handleExportCSV}
                                    className="text-xs text-indigo-600 hover:text-indigo-800 mt-1"
                                >
                                    Export all to CSV
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  )
}

// Helper components
const StatCard = ({ title, value, icon: Icon, color }: { title: string, value: string | number, icon: React.ElementType, color: string }) => {
    const colors: { [key: string]: string } = {
      indigo: 'text-indigo-600 bg-indigo-100',
      green: 'text-green-600 bg-green-100',
      purple: 'text-purple-600 bg-purple-100',
      red: 'text-red-600 bg-red-100',
      blue: 'text-blue-600 bg-blue-100',
      yellow: 'text-yellow-600 bg-yellow-100',
    }
    return (
      <div className="bg-white rounded-xl shadow-md p-4">
        <div className="flex items-center gap-4">
            <div className={`p-3 rounded-full ${colors[color]}`}>
                <Icon className="text-2xl" />
            </div>
            <div>
                <p className="text-neutral-600 text-sm font-medium">{title}</p>
                <p className="text-2xl font-bold text-neutral-800">{value}</p>
            </div>
        </div>
      </div>
    )
}

const ChartCard = ({ title, icon: Icon, children }: { title: string, icon: React.ElementType, children: React.ReactNode }) => (
  <div className="bg-white rounded-xl shadow-md p-6">
    <div className="flex items-center gap-3 mb-4">
      <Icon className="text-xl text-indigo-600" />
      <h3 className="font-semibold text-neutral-700 text-lg">{title}</h3>
    </div>
    {children}
  </div>
)

const SourceTypeBadge = ({ type }: { type: string }) => {
    const typeStyles: { [key: string]: string } = {
        invoice: 'bg-blue-100 text-blue-800',
        quotation: 'bg-purple-100 text-purple-800',
        inventory_adjustment: 'bg-yellow-100 text-yellow-800',
        purchase_order: 'bg-green-100 text-green-800',
        default: 'bg-neutral-100 text-neutral-800'
    }
    const style = typeStyles[type] || typeStyles.default
    return (
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${style}`}>
            {type.replace('_', ' ').toUpperCase()}
        </span>
    )
}
