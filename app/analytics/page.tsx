'use client'

import React, { useState, useEffect, useMemo } from 'react'
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

// Card component for summary metrics
const MetricCard = ({ title, value, icon, className = '' }:any) => (
  <div className={`bg-white rounded-lg shadow-md p-4 ${className}`}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-400">{title}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
      <div className="text-blue text-3xl">{icon}</div>
    </div>
  </div>
)

// DataTable component for displaying tabular data
const DataTable = ({ data, columns }:any) => (
  <div className="overflow-x-auto bg-white rounded-lg shadow">
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          {columns.map((column: { header: string | number | bigint | boolean | React.ReactElement<any, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | Promise<React.AwaitedReactNode> | null | undefined }, index: React.Key | null | undefined) => (
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
        {data.map((row: { [ x: string ]: string | number | bigint | boolean | React.ReactElement<any, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | Promise<React.AwaitedReactNode> | null | undefined }, rowIndex: React.Key | null | undefined) => (
          <tr key={rowIndex}>
            {columns.map((column: { render: (arg0: any) => string | number | bigint | boolean | React.ReactElement<any, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | Promise<React.AwaitedReactNode> | null | undefined; accessor: string | number }, colIndex: React.Key | null | undefined) => (
              <td key={colIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {column.render ? column.render(row) : row[column.accessor]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)

export default function AnalyticsDashboard() {
  // State for date range selection
  const [startDate, setStartDate] = useState<Date>(startOfMonth(subMonths(new Date(), 2)))
  const [endDate, setEndDate] = useState<Date>(endOfMonth(new Date()))

  // State for data
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [topSellers, setTopSellers] = useState<TopSellersData[]>([])
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([])
  const [inventoryValue, setInventoryValue] = useState<InventoryValueData | null>(null)
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([])

  // State for active tab
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'inventory'>('overview')

  // Format dates for API calls
  const formattedStartDate = useMemo(() => startDate.toISOString(), [startDate])
  const formattedEndDate = useMemo(() => endDate.toISOString(), [endDate])

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        // Get top selling products
        const topProducts = await analyticsFunctions.getTopSellingProducts(
          formattedStartDate,
          formattedEndDate
        )
        setTopSellers(topProducts)

        // Get time series data
        const timeSeries = await analyticsFunctions.getInventoryTimeSeries(
          formattedStartDate,
          formattedEndDate,
          'day'  // Can be day, week, or month
        )
        setTimeSeriesData(timeSeries)

        // Get inventory value
        const inventoryData = await analyticsFunctions.getInventoryValue()
        setInventoryValue(inventoryData)

        // Get low stock products
        const lowStock = await analyticsFunctions.getLowStockProducts(5)
        setLowStockProducts(lowStock)
      } catch (error) {
        console.error('Error fetching analytics data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [formattedStartDate, formattedEndDate])

  // Calculate summary metrics
  const totalSold = useMemo(() =>
    topSellers.reduce((sum, product) => sum + product.quantity_sold, 0),
    [topSellers]
  )

  const totalRevenue = useMemo(() =>
    topSellers.reduce((sum, product) => sum + product.revenue, 0),
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

  // Columns for top sellers table
  const topSellerColumns = [
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
      header: 'Revenue',
      accessor: 'revenue',
      render: (row: TopSellersData) => `$${row.revenue.toFixed(2)}`
    },
    {
      header: 'Most Popular Variant',
      accessor: 'most_popular_variant',
      render: (row: TopSellersData) =>
        row.most_popular_variant
          ? `${row.most_popular_variant.size} - ${row.most_popular_variant.color}`
          : 'N/A'
    },
  ]

  // Columns for low stock table
  const lowStockColumns = [
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
      render: (row: { quantity: any |string | number | bigint | boolean | React.ReactElement<any, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | Promise<React.AwaitedReactNode> | null | undefined }) => (
        <span className={row.quantity <= 2 ? 'text-red-500 font-bold' : ''}>
          {row.quantity}
        </span>
      )
    },
  ]

  const renderTabs = () => (
    <div className="flex border-b mb-6">
      <button
        className={`py-2 px-4 ${activeTab === 'overview'
          ? 'border-b-2 border-blue text-blue'
          : 'text-gray'}`}
        onClick={() => setActiveTab('overview')}
      >
        Overview
      </button>
      <button
        className={`py-2 px-4 ${activeTab === 'products'
          ? 'border-b-2 border-blue text-blue'
          : 'text-gray'}`}
        onClick={() => setActiveTab('products')}
      >
        Products
      </button>
      <button
        className={`py-2 px-4 ${activeTab === 'inventory'
          ? 'border-b-2 border-blue text-blue'
          : 'text-gray'}`}
        onClick={() => setActiveTab('inventory')}
      >
        Inventory
      </button>
    </div>
  )

  const renderDatePicker = () => (
    <div className="flex mb-6 space-x-4">
      <div className="flex items-center">
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
      <div className="flex items-center">
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
  )

  const renderOverviewTab = () => (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Products Sold"
          value={totalSold.toLocaleString()}
          icon={<FaBoxOpen />}
        />
        <MetricCard
          title="Total Revenue"
          value={`$${totalRevenue.toFixed(2)}`}
          icon={<FaChartLine />}
        />
        <MetricCard
          title="Inventory Items"
          value={inventoryItems.toLocaleString()}
          icon={<FaBoxOpen />}
        />
        <MetricCard
          title="Inventory Value"
          value={`$${inventoryTotalValue.toFixed(2)}`}
          icon={<FaChartBar />}
        />
      </div>

      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <h2 className="text-lg font-semibold mb-4">Sales and Purchases Over Time</h2>
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-4">
          <h2 className="text-lg font-semibold mb-4">Top Selling Products</h2>
          <DataTable
            data={topSellers.slice(0, 5)}
            columns={topSellerColumns}
          />
        </div>

        <div className="bg-white rounded-lg shadow-md p-4">
          <h2 className="text-lg font-semibold mb-4">Low Stock Alert</h2>
          <DataTable
            data={lowStockProducts}
            columns={lowStockColumns}
          />
        </div>
      </div>
    </div>
  )

  const renderProductsTab = () => (
    <div>
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <h2 className="text-lg font-semibold mb-4">Top Selling Products</h2>
        <div className="h-80 mb-6">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={topSellers.slice(0, 10)}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="product_name" tick={false} />
              <YAxis />
              <Tooltip
                formatter={(value:any, name) => {
                  if (name === 'revenue') return [`$${value.toFixed(2)}`, 'Revenue'];
                  return [value, name === 'quantity_sold' ? 'Quantity Sold' : name];
                }}
                labelFormatter={(label, items) => {
                  const dataItem = topSellers.find(item => item.product_name === label);
                  return dataItem ? dataItem.product_name : label;
                }}
              />
              <Legend />
              <Bar
                dataKey="quantity_sold"
                fill="#1E1E89" // Blue
                name="Quantity Sold"
              />
              <Bar
                dataKey="revenue"
                fill="#4C5B5C" // Gray
                name="Revenue"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <h3 className="text-md font-semibold mb-2">All Top Sellers</h3>
        <DataTable
          data={topSellers}
          columns={topSellerColumns}
        />
      </div>
    </div>
  )

  const renderInventoryTab = () => (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <MetricCard
          title="Total Inventory Items"
          value={inventoryItems.toLocaleString()}
          icon={<FaBoxOpen />}
        />
        <MetricCard
          title="Total Inventory Value"
          value={`$${inventoryTotalValue.toFixed(2)}`}
          icon={<FaChartBar />}
        />
        <MetricCard
          title="Low Stock Items"
          value={lowStockProducts.length.toString()}
          icon={<FaExclamationTriangle />}
          className="bg-red-50"
        />
      </div>

      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <h2 className="text-lg font-semibold mb-4">Inventory Value by Product</h2>
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
      </div>

      <div className="bg-white rounded-lg shadow-md p-4">
        <h2 className="text-lg font-semibold mb-4">Low Stock Products</h2>
        <DataTable
          data={lowStockProducts}
          columns={lowStockColumns}
        />
      </div>
    </div>
  )

  const renderTabContent = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue"></div>
        </div>
      )
    }

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
  }

  return (
    <div className="p-6 text-gray">
      <h1 className="text-3xl font-bold mb-6">Inventory Analytics</h1>

      {renderDatePicker()}
      {renderTabs()}
      {renderTabContent()}
    </div>
  )
}