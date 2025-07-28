'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { productHistoryFunctions } from '@/utils/functions/productHistory'
import { clientFunctions, Client } from '@/utils/functions/clients'
import { supabase } from '@/utils/supabase'
import SearchableSelect from '@/components/SearchableSelect'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { 
  FaHistory, 
  FaUsers, 
  FaCalendar, 
  FaBox,
  FaSearch,
  FaSpinner,
  FaEye,
  FaChartBar,
  FaChartPie,
  FaFilter,
  FaFileCsv,
  FaArrowLeft
} from 'react-icons/fa'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

interface ProductWithHistory {
  id: string
  name: string
  photo: string
  total_sold: number
  unique_customers: number
  last_sale_date: string | null
  current_stock: number
}

const COLORS = {
  primary: '#4F46E5',
  secondary: '#10B981',
  danger: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
  light: '#F9FAFB',
  dark: '#1F2937',
};

const PIE_CHART_COLORS = {
  inStock: '#10B981',
  lowStock: '#F59E0B',
  outOfStock: '#EF4444',
};


export default function ProductsHistoryPage() {
  const router = useRouter()
  const [products, setProducts] = useState<ProductWithHistory[]>([])
  const [filteredProducts, setFilteredProducts] = useState<ProductWithHistory[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'total_sold' | 'last_sale' | 'stock'>('total_sold')
  const [showOutOfStock, setShowOutOfStock] = useState(true)
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null)
  const [clientProductIds, setClientProductIds] = useState<Set<string> | null>(null)
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([subMonths(new Date(), 1), new Date()]);

  useEffect(() => {
    fetchInitialData()
  }, [])

  useEffect(() => {
    filterAndSortProducts()
  }, [products, searchTerm, sortBy, showOutOfStock, clientProductIds, dateRange])

  useEffect(() => {
    const fetchClientProducts = async () => {
      if (selectedClientId) {
        try {
          const { data, error } = await supabase
            .from('product_sales_history')
            .select('product_id')
            .eq('client_id', selectedClientId)

          if (error) throw error
          
          setClientProductIds(new Set(data.map(item => item.product_id)))
        } catch (error) {
          console.error('Error fetching client products:', error)
          toast.error('Failed to filter by client')
          setClientProductIds(new Set())
        }
      } else {
        setClientProductIds(null)
      }
    }
    fetchClientProducts()
  }, [selectedClientId])

  const fetchInitialData = async () => {
    try {
      setIsLoading(true)
      const [productsData, clientsData] = await Promise.all([
        productHistoryFunctions.getAllProductsWithHistory(),
        clientFunctions.getAllClients()
      ])
      setProducts(productsData)
      setClients(clientsData)
    } catch (error) {
      console.error('Error fetching initial data:', error)
      toast.error('Failed to load page data')
    } finally {
      setIsLoading(false)
    }
  }

  const filterAndSortProducts = () => {
    let filtered = [...products]

    if (searchTerm) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (!showOutOfStock) {
      filtered = filtered.filter(p => p.current_stock > 0)
    }

    if (clientProductIds) {
      filtered = filtered.filter(p => clientProductIds.has(p.id))
    }
    
    const [startDate, endDate] = dateRange;
    if (startDate && endDate) {
        endDate.setHours(23, 59, 59, 999);
        filtered = filtered.filter(p => {
            if (!p.last_sale_date) return false;
            const saleDate = new Date(p.last_sale_date);
            return saleDate >= startDate && saleDate <= endDate;
        });
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'total_sold':
          return b.total_sold - a.total_sold
        case 'last_sale':
          if (!a.last_sale_date && !b.last_sale_date) return 0
          if (!a.last_sale_date) return 1
          if (!b.last_sale_date) return -1
          return new Date(b.last_sale_date).getTime() - new Date(a.last_sale_date).getTime()
        case 'stock':
          return b.current_stock - a.current_stock
        default:
          return 0
      }
    })

    setFilteredProducts(filtered)
  }

  const getStockStatus = (stock: number) => {
    if (stock === 0) return { text: 'Out of Stock', color: 'text-red-600 bg-red-100', pieColor: PIE_CHART_COLORS.outOfStock }
    if (stock < 10) return { text: 'Low Stock', color: 'text-yellow-600 bg-yellow-100', pieColor: PIE_CHART_COLORS.lowStock }
    return { text: 'In Stock', color: 'text-green-600 bg-green-100', pieColor: PIE_CHART_COLORS.inStock }
  }

  const handleProductClick = (productId: string) => {
    router.push(`/products/history/${productId}`)
  }

  const summaryStats = useMemo(() => {
    const totalUnitsSold = filteredProducts.reduce((sum, p) => sum + p.total_sold, 0)
    const productsWithSales = filteredProducts.filter(p => p.total_sold > 0).length
    const outOfStockCount = filteredProducts.filter(p => p.current_stock === 0).length
    return {
      totalProducts: filteredProducts.length,
      totalUnitsSold,
      productsWithSales,
      outOfStockCount
    }
  }, [filteredProducts])

  const chartData = useMemo(() => {
    const topSold = filteredProducts.slice(0, 5).map(p => ({ name: p.name, sold: p.total_sold }))
    
    const stockStatusCounts = { inStock: 0, lowStock: 0, outOfStock: 0 }
    filteredProducts.forEach(p => {
      if (p.current_stock === 0) stockStatusCounts.outOfStock++
      else if (p.current_stock < 10) stockStatusCounts.lowStock++
      else stockStatusCounts.inStock++
    })
    const stockPieData = [
      { name: 'In Stock', value: stockStatusCounts.inStock, color: PIE_CHART_COLORS.inStock },
      { name: 'Low Stock', value: stockStatusCounts.lowStock, color: PIE_CHART_COLORS.lowStock },
      { name: 'Out of Stock', value: stockStatusCounts.outOfStock, color: PIE_CHART_COLORS.outOfStock },
    ].filter(item => item.value > 0)

    return { topSold, stockPieData }
  }, [filteredProducts])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-center">
          <FaSpinner className="animate-spin text-4xl text-indigo-600 mb-4 mx-auto" />
          <p className="text-neutral-600 text-lg">Loading Product Intelligence...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-8xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-indigo-100 p-3 rounded-full">
                <FaHistory className="text-3xl text-indigo-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-neutral-800">Product Intelligence</h1>
                <p className="text-neutral-500 mt-1">Insights into sales, stock, and customer behavior.</p>
              </div>
            </div>
            <button
              onClick={() => router.push('/inventory')}
              className="mt-4 sm:mt-0 flex items-center gap-2 px-4 py-2 bg-neutral-200 text-neutral-700 rounded-lg hover:bg-neutral-300 transition-colors"
            >
              <FaArrowLeft />
              Back to Inventory
            </button>
            <button
              onClick={() => selectedClientId && router.push(`/clients/history/${selectedClientId}`)}
              disabled={!selectedClientId}
              className="mt-4 sm:mt-0 flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-indigo-300 disabled:cursor-not-allowed"
            >
              <FaUsers />
              View Client History
            </button>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <FaFilter className="text-indigo-600" />
            <h2 className="text-xl font-semibold text-neutral-700">Filters</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="relative lg:col-span-2">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Search products by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <SearchableSelect
              options={clients}
              value={selectedClientId}
              onChange={(value) => setSelectedClientId(value ? Number(value) : null)}
              placeholder="Filter by client"
              label="Clients"
              idField="client_id"
            />
            <DatePicker
                selectsRange={true}
                startDate={dateRange[0] || undefined}
                endDate={dateRange[1] || undefined}
                onChange={(update) => setDateRange(update || [null, null])}
                isClearable={true}
                placeholderText="Filter by last sale date"
                className="w-full px-4 py-2 border border-neutral-300 text-black rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-black"
            >
              <option value="total_sold">Sort by: Most Sold</option>
              <option value="last_sale">Sort by: Last Sale</option>
              <option value="stock">Sort by: Stock Level</option>
            </select>
          </div>
        </div>

        {/* Summary & Visualizations */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Stats */}
          <div className="lg:col-span-1 grid grid-cols-1 sm:grid-cols-2 gap-6">
            <StatCard title="Filtered Products" value={summaryStats.totalProducts} icon={FaBox} color="indigo" />
            <StatCard title="Total Units Sold" value={summaryStats.totalUnitsSold} icon={FaHistory} color="green" />
            <StatCard title="Active Products" value={summaryStats.productsWithSales} description="Products with at least one sale" icon={FaUsers} color="purple" />
            <StatCard title="Out of Stock" value={summaryStats.outOfStockCount} icon={FaBox} color="red" />
          </div>
          
          {/* Charts */}
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-5 gap-6 text-black">
            <ChartCard title="Top 5 Best-Selling Products" icon={FaChartBar}>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData.topSold} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="sold" fill={COLORS.primary} name="Units Sold" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Stock Distribution" icon={FaChartPie} className="md:col-span-2">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={chartData.stockPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {chartData.stockPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => {
            const stockStatus = getStockStatus(product.current_stock)
            
            return (
              <div
                key={product.id}
                onClick={() => handleProductClick(product.id)}
                className="bg-white rounded-xl shadow-md hover:shadow-xl transition-shadow duration-300 cursor-pointer overflow-hidden flex flex-col"
              >
                <div className="relative h-48 bg-neutral-100">
                  {product.photo ? (
                    <img src={product.photo} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-neutral-200">
                      <FaBox className="text-5xl text-neutral-400" />
                    </div>
                  )}
                  <div className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-semibold ${stockStatus.color}`}>
                    {stockStatus.text}
                  </div>
                </div>

                <div className="p-4 flex flex-col flex-grow">
                  <h3 className="font-bold text-lg text-neutral-800 mb-2 truncate">{product.name}</h3>
                  
                  <div className="space-y-2 text-sm flex-grow">
                    <InfoRow icon={FaHistory} label="Total Sold" value={`${product.total_sold} units`} />
                    <InfoRow icon={FaUsers} label="Customers" value={product.unique_customers} />
                    <InfoRow icon={FaBox} label="Current Stock" value={`${product.current_stock} units`} />
                    {product.last_sale_date && (
                      <InfoRow icon={FaCalendar} label="Last Sale" value={format(new Date(product.last_sale_date), 'MMM d, yyyy')} />
                    )}
                  </div>

                  <button className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold">
                    <FaEye />
                    View Detailed History
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {filteredProducts.length === 0 && !isLoading && (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center col-span-full">
            <FaBox className="text-6xl text-neutral-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-neutral-700">No Products Found</h3>
            <p className="text-neutral-500 mt-2">Try adjusting your search or filter criteria.</p>
          </div>
        )}
      </div>
    </div>
  )
}

// Helper components for cleaner structure

const StatCard = ({ title, value, icon: Icon, color, description }: { title: string, value: string | number, icon: React.ElementType, color: string, description?: string }) => {
  const colors: { [key: string]: string } = {
    indigo: 'text-indigo-600 bg-indigo-100',
    green: 'text-green-600 bg-green-100',
    purple: 'text-purple-600 bg-purple-100',
    red: 'text-red-600 bg-red-100',
  }
  return (
    <div className="bg-white rounded-xl shadow-md p-4 flex items-center gap-4">
      <div className={`p-3 rounded-full ${colors[color]}`}>
        <Icon className="text-2xl" />
      </div>
      <div>
        <p className="text-neutral-600 text-sm font-medium">{title}</p>
        <p className="text-2xl font-bold text-neutral-800">{value}</p>
        {description && <p className="text-xs text-neutral-500">{description}</p>}
      </div>
    </div>
  )
}

const ChartCard = ({ title, icon: Icon, children, className = 'md:col-span-3' }: { title: string, icon: React.ElementType, children: React.ReactNode, className?: string }) => (
  <div className={`bg-white rounded-xl shadow-md p-6 ${className}`}>
    <div className="flex items-center gap-3 mb-4">
      <Icon className="text-xl text-indigo-600" />
      <h3 className="font-semibold text-neutral-700 text-lg">{title}</h3>
    </div>
    {children}
  </div>
)

const InfoRow = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: string | number }) => (
  <div className="flex items-center justify-between text-neutral-600">
    <span className="flex items-center gap-2">
      <Icon className="text-indigo-500" />
      {label}
    </span>
    <span className="font-semibold text-neutral-800">{value}</span>
  </div>
)
