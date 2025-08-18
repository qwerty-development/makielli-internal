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
  FaTag
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
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-6">
                <StatCard title="Total Sold" value={summary.total_sold} icon={FaHistory} color="green" />
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
                        <Bar dataKey="current_stock" fill={COLORS.info} name="Current Stock" />
                    </BarChart>
                </ResponsiveContainer>
            </ChartCard>
        </div>

        {/* Customer & History Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Top Customers */}
            <div className="lg:col-span-1">
                <div className="bg-white rounded-xl shadow-md p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <FaUserTag className="text-xl text-indigo-600" />
                        <h3 className="font-semibold text-neutral-700 text-lg">Top Customers</h3>
                    </div>
                    <div className="space-y-4 max-h-[600px] overflow-y-auto">
                        {customerPurchases.map(c => (
                            <div key={c.client_id} className="p-3 bg-neutral-50 rounded-lg">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-semibold text-neutral-800 hover:text-indigo-600 cursor-pointer" onClick={() => router.push(`/clients/details/${c.client_id}`)}>{c.client_name}</p>
                                        <p className="text-sm text-neutral-500">Last purchase: {format(new Date(c.last_purchase_date), 'MMM d, yyyy')}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-indigo-600">{c.total_purchased} units</p>
                                        <p className="text-sm text-neutral-500">in {c.purchase_count} orders</p>
                                    </div>
                                </div>
                                <div className="mt-2 pt-2 border-t border-neutral-200">
                                    <p className="text-xs font-semibold text-neutral-600 mb-1">Variants Purchased:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {c.variants_purchased.map((v, i) => (
                                            <span key={i} className="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs rounded-full">
                                                {v.size} / {v.color} ({v.quantity})
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                         {customerPurchases.length === 0 && (
                            <p className="text-neutral-500 text-center py-4">No customer purchase history found.</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Detailed History Table */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center gap-3 mb-4">
                    <FaHistory className="text-xl text-indigo-600" />
                    <h3 className="font-semibold text-neutral-700 text-lg">Detailed History</h3>
                </div>
                {/* Filters for table */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-4 bg-neutral-50 rounded-lg">
                    <DatePicker
                        selectsRange={true}
                        startDate={dateRange[0] || undefined}
                        endDate={dateRange[1] || undefined}
                        onChange={(update) => setDateRange(update || [null, null])}
                        isClearable={true}
                        placeholderText="Filter by date"
                        className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                    <SearchableSelect
                        options={clients}
                        value={selectedClientId}
                        onChange={(value) => setSelectedClientId(value ? Number(value) : null)}
                        placeholder="Filter by client"
                        label="Clients"
                        idField="client_id"
                    />
                    <select 
                        value={sourceType} 
                        onChange={e => setSourceType(e.target.value)}
                        className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-black"
                    >
                        <option value="">All Source Types</option>
                        <option value="invoice">Invoice</option>
                        <option value="quotation">Quotation</option>
                        <option value="inventory_adjustment">Inventory Adjustment</option>
                        <option value="purchase_order">Purchase Order</option>
                    </select>
                </div>

                <div className="max-h-[600px] overflow-y-auto">
                    <table className="w-full text-sm text-left text-neutral-600">
                        <thead className="text-xs text-neutral-700 uppercase bg-neutral-100 sticky top-0">
                            <tr>
                                <th scope="col" className="px-4 py-3">Date</th>
                                <th scope="col" className="px-4 py-3">Type</th>
                                <th scope="col" className="px-4 py-3">Reference</th>
                                <th scope="col" className="px-4 py-3">Quantity</th>
                                <th scope="col" className="px-4 py-3">Variant</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredHistory.map(item => (
                                <tr key={item.id} className="border-b hover:bg-neutral-50">
                                    <td className="px-4 py-3 font-medium">{format(new Date(item.created_at), 'MMM d, yyyy')}</td>
                                    <td className="px-4 py-3"><SourceTypeBadge type={item.source_type} /></td>
                                    <td className="px-4 py-3 font-mono text-xs">{item.invoice_order_number || item.quotation_order_number || item.source_reference}</td>
                                    <td className={`px-4 py-3 font-bold ${item.quantity_change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {item.quantity_change > 0 ? `+${item.quantity_change}` : item.quantity_change}
                                    </td>
                                    <td className="px-4 py-3">{item.size} / {item.color}</td>
                                </tr>
                            ))}
                            {filteredHistory.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="text-center py-8 text-neutral-500">No history records match your filters.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
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
