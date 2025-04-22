'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { FaChartLine, FaBoxOpen, FaChartBar, FaExclamationTriangle, FaSearch, FaCalendar } from 'react-icons/fa'
import { analyticsFunctions, TopSellersData, TimeSeriesData, InventoryValueData } from '@/utils/functions/analytics'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'

// Cache to store fetched data with expiration
const dataCache = {
  topSellers: { data: null, timestamp: 0, key: '' },
  timeSeriesData: { data: null, timestamp: 0, key: '' },
  inventoryValue: { data: null, timestamp: 0 },
  lowStockProducts: { data: null, timestamp: 0 }
}

// Cache expiration time in milliseconds (5 minutes)
const CACHE_EXPIRATION = 5 * 60 * 1000

// Card component for summary metrics
const MetricCard = React.memo(({ title, value, icon, className = '' }: any) => (
  <div className={`bg-white rounded-lg shadow-md p-4 ${className}`}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-400">{title}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
      <div className="text-blue text-3xl">{icon}</div>
    </div>
  </div>
))

// DataTable component for displaying tabular data
const DataTable = React.memo(({ data, columns }: any) => (
  <div className="overflow-x-auto bg-white rounded-lg shadow">
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          {columns.map((column: { header: any }, index: React.Key) => (
            <th
              key={index}
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              {column.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {data.map((row: any, rowIndex: React.Key) => (
          <tr key={rowIndex}>
            {columns.map((column: { render: (arg0: any) => any; accessor: string | number }, colIndex: React.Key) => (
              <td key={colIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {column.render ? column.render(row) : row[column.accessor]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
))

// Loading skeleton for tables
const TableSkeleton = () => (
  <div className="animate-pulse">
    <div className="h-8 bg-gray-200 rounded mb-4"></div>
    <div className="h-16 bg-gray-200 rounded mb-2"></div>
    <div className="h-16 bg-gray-200 rounded mb-2"></div>
    <div className="h-16 bg-gray-200 rounded mb-2"></div>
  </div>
)

// Chart skeleton
const ChartSkeleton = () => (
  <div className="animate-pulse h-80">
    <div className="h-full bg-gray-200 rounded"></div>
  </div>
)

export default function AnalyticsDashboard() {
  // State for date range selection
  const [startDate, setStartDate] = useState<Date>(startOfMonth(subMonths(new Date(), 2)))
  const [endDate, setEndDate] = useState<Date>(endOfMonth(new Date()))
  
  // State for data with individual loading states
  const [topSellers, setTopSellers] = useState<TopSellersData[]>([])
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([])
  const [inventoryValue, setInventoryValue] = useState<InventoryValueData | null>(null)
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([])
  
  // Individual loading states
  const [loadingTopSellers, setLoadingTopSellers] = useState<boolean>(true)
  const [loadingTimeSeries, setLoadingTimeSeries] = useState<boolean>(true)
  const [loadingInventoryValue, setLoadingInventoryValue] = useState<boolean>(true)
  const [loadingLowStock, setLoadingLowStock] = useState<boolean>(true)

  // State for active tab
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'inventory'>('overview')

  // Format dates for API calls
  const formattedStartDate = useMemo(() => startDate.toISOString(), [startDate])
  const formattedEndDate = useMemo(() => endDate.toISOString(), [endDate])
  
  // Create a cache key based on date range
  const dateRangeCacheKey = useMemo(() => 
    `${formattedStartDate}_${formattedEndDate}`, 
    [formattedStartDate, formattedEndDate]
  )

  // Fetch top sellers data
  const fetchTopSellers = useCallback(async () => {
    // Check cache first
    if (
      dataCache.topSellers.data && 
      dataCache.topSellers.key === dateRangeCacheKey && 
      Date.now() - dataCache.topSellers.timestamp < CACHE_EXPIRATION
    ) {
      setTopSellers(dataCache.topSellers.data as TopSellersData[])
      setLoadingTopSellers(false)
      return dataCache.topSellers.data
    }

    setLoadingTopSellers(true)
    try {
      const data = await analyticsFunctions.getTopSellingProducts(
        formattedStartDate,
        formattedEndDate
      )
      
      // Update cache
      dataCache.topSellers = {
        data,
        timestamp: Date.now(),
        key: dateRangeCacheKey
      }
      
      setTopSellers(data)
      return data
    } catch (error) {
      console.error('Error fetching top sellers:', error)
      return []
    } finally {
      setLoadingTopSellers(false)
    }
  }, [formattedStartDate, formattedEndDate, dateRangeCacheKey])

  // Fetch time series data
  const fetchTimeSeries = useCallback(async () => {
    // Check cache first
    if (
      dataCache.timeSeriesData.data && 
      dataCache.timeSeriesData.key === dateRangeCacheKey && 
      Date.now() - dataCache.timeSeriesData.timestamp < CACHE_EXPIRATION
    ) {
      setTimeSeriesData(dataCache.timeSeriesData.data as TimeSeriesData[])
      setLoadingTimeSeries(false)
      return dataCache.timeSeriesData.data
    }

    setLoadingTimeSeries(true)
    try {
      const data = await analyticsFunctions.getInventoryTimeSeries(
        formattedStartDate,
        formattedEndDate,
        'day'
      )
      
      // Update cache
      dataCache.timeSeriesData = {
        data,
        timestamp: Date.now(),
        key: dateRangeCacheKey
      }
      
      setTimeSeriesData(data)
      return data
    } catch (error) {
      console.error('Error fetching time series data:', error)
      return []
    } finally {
      setLoadingTimeSeries(false)
    }
  }, [formattedStartDate, formattedEndDate, dateRangeCacheKey])

  // Fetch inventory value
  const fetchInventoryValue = useCallback(async () => {
    // Check cache first
    if (
      dataCache.inventoryValue.data && 
      Date.now() - dataCache.inventoryValue.timestamp < CACHE_EXPIRATION
    ) {
      setInventoryValue(dataCache.inventoryValue.data as InventoryValueData)
      setLoadingInventoryValue(false)
      return dataCache.inventoryValue.data
    }

    setLoadingInventoryValue(true)
    try {
      const data = await analyticsFunctions.getInventoryValue()
      
      // Update cache
      dataCache.inventoryValue = {
        data,
        timestamp: Date.now(),
        key: ''
      }
      
      setInventoryValue(data)
      return data
    } catch (error) {
      console.error('Error fetching inventory value:', error)
      return null
    } finally {
      setLoadingInventoryValue(false)
    }
  }, [])

  // Fetch low stock products
  const fetchLowStockProducts = useCallback(async () => {
    // Check cache first
    if (
      dataCache.lowStockProducts.data && 
      Date.now() - dataCache.lowStockProducts.timestamp < CACHE_EXPIRATION
    ) {
      setLowStockProducts(dataCache.lowStockProducts.data as any[])
      setLoadingLowStock(false)
      return dataCache.lowStockProducts.data
    }

    setLoadingLowStock(true)
    try {
      const data:any = await analyticsFunctions.getLowStockProducts(5)
      
      // Update cache
      dataCache.lowStockProducts = {
        data,
        timestamp: Date.now(),
        key: ''
      }
      
      setLowStockProducts(data)
      return data
    } catch (error) {
      console.error('Error fetching low stock products:', error)
      return []
    } finally {
      setLoadingLowStock(false)
    }
  }, [])

  // Fetch required data based on current tab
  const fetchTabData = useCallback((tab: string) => {
    const fetchPromises: Promise<any>[] = []
    
    // Common data for all tabs
    fetchPromises.push(fetchInventoryValue())
    
    if (tab === 'overview') {
      fetchPromises.push(fetchTopSellers())
      fetchPromises.push(fetchTimeSeries())
      fetchPromises.push(fetchLowStockProducts())
    } else if (tab === 'products') {
      fetchPromises.push(fetchTopSellers())
    } else if (tab === 'inventory') {
      fetchPromises.push(fetchLowStockProducts())
    }
    
    return Promise.all(fetchPromises)
  }, [fetchInventoryValue, fetchTopSellers, fetchTimeSeries, fetchLowStockProducts])

  // Handle tab change - load tab-specific data
  const handleTabChange = useCallback((tab: 'overview' | 'products' | 'inventory') => {
    setActiveTab(tab)
    fetchTabData(tab)
  }, [fetchTabData])

  // Debounced date range change handler to prevent excessive API calls
  const [debouncedFetchData] = useState(() => {
    let timeoutId: NodeJS.Timeout | null = null
    
    return (callback: () => void) => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      
      timeoutId = setTimeout(() => {
        callback()
      }, 500) // 500ms debounce
    }
  })

  // Initial data loading
  useEffect(() => {
    const loadData = () => {
      fetchTabData(activeTab)
    }
    
    debouncedFetchData(loadData)
    
    // Clean up any pending debounced calls
    return () => {
      debouncedFetchData(() => {})
    }
  }, [formattedStartDate, formattedEndDate, activeTab, fetchTabData, debouncedFetchData])

  // Calculate summary metrics with memoization
  const totalSold = useMemo(() =>
    topSellers.reduce((sum, product) => sum + product.quantity_sold, 0),
    [topSellers]
  )

  const inventoryItems = useMemo(() =>
    inventoryValue?.total_items || 0,
    [inventoryValue]
  )

  const inventoryTotalValue = useMemo(() =>
    inventoryValue?.total_value || 0,
    [inventoryValue]
  )

  // Columns for top sellers table - memoized to prevent recreating on each render
  const topSellerColumns = useMemo(() => [
    {
      header: 'Product',
      accessor: 'product_name',
      render: (row: TopSellersData) => (
        <div className="flex items-center">
          {row.product_photo ? (
            <img
              src={row.product_photo}
              alt={row.product_name}
              className="h-10 w-10 object-cover rounded-md mr-2"
              loading="lazy" // Lazy load images
            />
          ) : (
            <div className="h-10 w-10 bg-gray-200 rounded-md mr-2 flex items-center justify-center">
              <FaBoxOpen className="text-gray" />
            </div>
          )}
          <span>{row.product_name}</span>
        </div>
      )
    },
    {
      header: 'Quantity Sold',
      accessor: 'quantity_sold',
    },
    {
      header: 'Most Popular Variant',
      accessor: 'most_popular_variant',
      render: (row: TopSellersData) =>
        row.most_popular_variant
          ? `${row.most_popular_variant.size} - ${row.most_popular_variant.color}`
          : 'N/A'
    },
  ], [])

  // Columns for low stock table - memoized
  const lowStockColumns = useMemo(() => [
    {
      header: 'Product',
      accessor: 'product_name',
    },
    {
      header: 'Size',
      accessor: 'size',
    },
    {
      header: 'Color',
      accessor: 'color',
    },
    {
      header: 'Quantity',
      accessor: 'quantity',
      render: (row: { quantity: number }) => (
        <span className={row.quantity <= 2 ? 'text-red-500 font-bold' : ''}>
          {row.quantity}
        </span>
      )
    },
  ], [])

  // Render functions
  const renderTabs = useCallback(() => (
    <div className="flex border-b mb-6">
      <button
        className={`py-2 px-4 ${activeTab === 'overview'
          ? 'border-b-2 border-blue text-blue'
          : 'text-gray'}`}
        onClick={() => handleTabChange('overview')}
      >
        Overview
      </button>
      <button
        className={`py-2 px-4 ${activeTab === 'products'
          ? 'border-b-2 border-blue text-blue'
          : 'text-gray'}`}
        onClick={() => handleTabChange('products')}
      >
        Products
      </button>
      <button
        className={`py-2 px-4 ${activeTab === 'inventory'
          ? 'border-b-2 border-blue text-blue'
          : 'text-gray'}`}
        onClick={() => handleTabChange('inventory')}
      >
        Inventory
      </button>
    </div>
  ), [activeTab, handleTabChange])

  const renderDatePicker = useCallback(() => (
    <div className="flex flex-wrap mb-6 space-x-4">
      <div className="flex items-center mb-2">
        <span className="mr-2 text-gray">From:</span>
        <DatePicker
          selected={startDate}
          onChange={date => date && setStartDate(date)}
          selectsStart
          startDate={startDate}
          endDate={endDate}
          className="border border-gray rounded p-2"
        />
      </div>
      <div className="flex items-center mb-2">
        <span className="mr-2 text-gray">To:</span>
        <DatePicker
          selected={endDate}
          onChange={date => date && setEndDate(date)}
          selectsEnd
          startDate={startDate}
          endDate={endDate}
          minDate={startDate}
          className="border border-gray rounded p-2"
        />
      </div>
    </div>
  ), [startDate, endDate])

  const renderOverviewTab = useCallback(() => (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Products Sold"
          value={loadingTopSellers ? "Loading..." : totalSold.toLocaleString()}
          icon={<FaBoxOpen />}
        />
        <MetricCard
          title="Inventory Items"
          value={loadingInventoryValue ? "Loading..." : inventoryItems.toLocaleString()}
          icon={<FaBoxOpen />}
        />
        <MetricCard
          title="Inventory Value"
          value={loadingInventoryValue ? "Loading..." : `$${inventoryTotalValue.toFixed(2)}`}
          icon={<FaChartBar />}
        />
      </div>

      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <h2 className="text-lg font-semibold mb-4">Sales and Purchases Over Time</h2>
        {loadingTimeSeries ? (
          <ChartSkeleton />
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={timeSeriesData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="sales"
                  stroke="#1E1E89" // Blue
                  activeDot={{ r: 8 }}
                />
                <Line
                  type="monotone"
                  dataKey="purchases"
                  stroke="#4C5B5C" // Gray
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-4">
          <h2 className="text-lg font-semibold mb-4">Top Selling Products</h2>
          {loadingTopSellers ? (
            <TableSkeleton />
          ) : (
            <DataTable
              data={topSellers.slice(0, 5)}
              columns={topSellerColumns}
            />
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-4">
          <h2 className="text-lg font-semibold mb-4">Low Stock Alert</h2>
          {loadingLowStock ? (
            <TableSkeleton />
          ) : (
            <DataTable
              data={lowStockProducts}
              columns={lowStockColumns}
            />
          )}
        </div>
      </div>
    </div>
  ), [
    loadingTopSellers, 
    loadingInventoryValue, 
    loadingTimeSeries, 
    loadingLowStock, 
    totalSold, 
 
    inventoryItems, 
    inventoryTotalValue, 
    timeSeriesData, 
    topSellers, 
    lowStockProducts, 
    topSellerColumns, 
    lowStockColumns
  ])

  const renderProductsTab = useCallback(() => (
    <div>
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <h2 className="text-lg font-semibold mb-4">Top Selling Products</h2>
        {loadingTopSellers ? (
          <ChartSkeleton />
        ) : (
          <div className="h-80 mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={topSellers.slice(0, 10)}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="product_name" tick={false} />
                <YAxis />
             
                <Legend />
                <Bar
                  dataKey="quantity_sold"
                  fill="#1E1E89" // Blue
                  name="Quantity Sold"
                />
               
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <h3 className="text-md font-semibold mb-2">All Top Sellers</h3>
        {loadingTopSellers ? (
          <TableSkeleton />
        ) : (
          <DataTable
            data={topSellers}
            columns={topSellerColumns}
          />
        )}
      </div>
    </div>
  ), [loadingTopSellers, topSellers, topSellerColumns])

  const renderInventoryTab = useCallback(() => (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <MetricCard
          title="Total Inventory Items"
          value={loadingInventoryValue ? "Loading..." : inventoryItems.toLocaleString()}
          icon={<FaBoxOpen />}
        />
        <MetricCard
          title="Total Inventory Value"
          value={loadingInventoryValue ? "Loading..." : `$${inventoryTotalValue.toFixed(2)}`}
          icon={<FaChartBar />}
        />
        <MetricCard
          title="Low Stock Items"
          value={loadingLowStock ? "Loading..." : lowStockProducts.length.toString()}
          icon={<FaExclamationTriangle />}
          className="bg-red-50"
        />   
      </div>

      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <h2 className="text-lg font-semibold mb-4">Inventory Value by Product</h2>
        {loadingInventoryValue ? (
          <ChartSkeleton />
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={inventoryValue?.by_product.slice(0, 10)}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="product_name" tick={false} />
                <YAxis />
                <Tooltip
                  formatter={(value:any, name) => {
                    if (name === 'value' || name === 'cost')
                      return [`$${value.toFixed(2)}`, name === 'value' ? 'Value' : 'Cost'];
                    return [value, name === 'items' ? 'Items' : name];
                  }}
                  labelFormatter={(label) => {
                    const dataItem = inventoryValue?.by_product.find(item => item.product_name === label);
                    return dataItem ? dataItem.product_name : label;
                  }}
                />
                <Legend />
                <Bar
                  dataKey="items"
                  fill="#1E1E89" // Blue
                  name="Quantity"
                />
                <Bar
                  dataKey="value"
                  fill="#4C5B5C" // Gray
                  name="Value"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-md p-4">
        <h2 className="text-lg font-semibold mb-4">Low Stock Products</h2>
        {loadingLowStock ? (
          <TableSkeleton />
        ) : (
          <DataTable
            data={lowStockProducts}
            columns={lowStockColumns}
          />
        )}
      </div>
    </div>
  ), [
    loadingInventoryValue, 
    loadingLowStock, 
    inventoryItems, 
    inventoryTotalValue, 
    lowStockProducts, 
    inventoryValue, 
    lowStockColumns
  ])

  // Render active tab content
  const renderTabContent = useCallback(() => {
    switch (activeTab) {
      case 'overview':
        return renderOverviewTab()
      case 'products':
        return renderProductsTab()
      case 'inventory':
        return renderInventoryTab()
      default:
        return renderOverviewTab()
    }
  }, [activeTab, renderOverviewTab, renderProductsTab, renderInventoryTab])

  return (
    <div className="p-6 text-gray">
      <h1 className="text-3xl font-bold mb-6">Inventory Analytics</h1>
      {renderDatePicker()}
      {renderTabs()}
      {renderTabContent()}
    </div>
  )
}