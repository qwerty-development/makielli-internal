'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { 
  FaChartLine, FaBoxOpen, FaChartBar, FaExclamationTriangle, 
  FaSearch, FaDownload, FaSyncAlt, FaArrowUp, FaArrowDown,
  FaEquals, FaInfoCircle, FaDollarSign, FaUsers, FaShoppingCart, FaEye,
  FaHistory, FaBoxes, FaEdit, FaPalette, FaPlus, FaTrash, FaClock
} from 'react-icons/fa'
import { 
  analyticsService,
  SalesMetrics,
  InventoryMetrics,
  ProductPerformance,
  InventoryMovement,
  ClientMetrics,
  LowStockAlert,
  PeriodComparison
} from '@/utils/functions/analytics'
import { 
  analyticsFunctions, 
  ProductHistoryEntry, 
  ProductHistorySummary 
} from '@/utils/functions/product-history'
import { productFunctions, Product } from '@/utils/functions/products'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, BarChart, Bar,
  PieChart, Pie, Cell, ComposedChart, Area, AreaChart
} from 'recharts'
import { 
  format, subMonths, subWeeks, startOfMonth, endOfMonth, 
  differenceInDays, addDays, subDays
} from 'date-fns'

// Enhanced color palette
const COLORS = ['#1E40AF', '#7C3AED', '#059669', '#DC2626', '#F59E0B', '#8B5CF6', '#10B981', '#EF4444'];

// Enhanced interfaces for product history dashboard data
interface ActivityData {
  date: string
  inventory: number
  price: number
  details: number
  variant: number
  creation: number
  deletion: number
  total: number
}

interface DashboardStats {
  totalProducts: number
  totalVariants: number
  totalInventoryValue: number
  lowStockItems: number
  recentChanges: number
}

// Enhanced skeleton components
const MetricCardSkeleton = () => (
  <div className="bg-white rounded-xl shadow-lg p-6 animate-pulse">
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <div className="h-4 bg-neutral-200 rounded w-24 mb-3"></div>
        <div className="h-8 bg-neutral-200 rounded w-20 mb-2"></div>
        <div className="h-3 bg-neutral-200 rounded w-16"></div>
      </div>
      <div className="w-12 h-12 bg-neutral-200 rounded-full"></div>
    </div>
  </div>
)

const ChartSkeleton = () => (
  <div className="animate-pulse h-80 bg-neutral-100 rounded-lg flex items-center justify-center">
    <div className="text-neutral-600">Loading chart...</div>
  </div>
)

// Enhanced metric card component
const MetricCard = React.memo(({ 
  title, 
  value, 
  subtitle,
  icon, 
  trend = null, 
  trendValue = 0,
  className = '',
  loading = false,
  info = null,
  color = 'blue'
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral' | null;
  trendValue?: number;
  className?: string;
  loading?: boolean;
  info?: string | null;
  color?: string;
}) => {
  const [showInfo, setShowInfo] = useState(false);
  
  if (loading) {
    return <MetricCardSkeleton />;
  }
  
  let trendIcon, trendColor;
  
  if (trend === 'up') {
    trendIcon = <FaArrowUp className="mr-1" />;
    trendColor = trendValue > 0 ? 'text-green-600' : 'text-red-600';
  } else if (trend === 'down') {
    trendIcon = <FaArrowDown className="mr-1" />;
    trendColor = trendValue < 0 ? 'text-red-600' : 'text-green-600';
  } else if (trend === 'neutral') {
    trendIcon = <FaEquals className="mr-1" />;
    trendColor = 'text-neutral-500';
  }
  
  const colorMap = {
    blue: 'text-indigo-600',
    green: 'text-green-600',
    purple: 'text-purple-600',
    orange: 'text-orange-600',
    red: 'text-red-600'
  };
  
  return (
    <div className={`bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 p-6 relative ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center">
            <p className="text-sm font-medium text-neutral-600">{title}</p>
            {info && (
              <div className="relative ml-2">
                <FaInfoCircle 
                  className="text-neutral-600 hover:text-indigo-600 cursor-pointer transition-colors" 
                  onMouseEnter={() => setShowInfo(true)}
                  onMouseLeave={() => setShowInfo(false)}
                  onClick={() => setShowInfo(!showInfo)}
                />
                {showInfo && (
                  <div className="absolute z-10 bg-white p-3 rounded-lg shadow-lg text-xs w-64 left-0 top-6 border text-neutral-600">
                    {info}
                  </div>
                )}
              </div>
            )}
          </div>
          <p className="text-3xl font-bold text-neutral-900 mt-2">{value}</p>
          {subtitle && (
            <p className="text-sm text-neutral-500 mt-1">{subtitle}</p>
          )}
          {trend && (
            <div className={`flex items-center text-sm mt-2 ${trendColor}`}>
              {trendIcon}
              <span className="font-medium">{Math.abs(Math.round(trendValue * 10) / 10)}%</span>
              <span className="ml-1 text-neutral-500">vs last period</span>
            </div>
          )}
        </div>
        <div className={`text-4xl ${colorMap[color as keyof typeof colorMap] || colorMap.blue}`}>
          {icon}
        </div>
      </div>
    </div>
  );
});

MetricCard.displayName = 'MetricCard';

// Enhanced data table
const DataTable = React.memo(({ 
  data, 
  columns, 
  loading = false,
  emptyMessage = "No data available",
  maxHeight = "400px"
}: {
  data: any[];
  columns: { header: string; accessor: string; render?: (row: any) => React.ReactNode; className?: string }[];
  loading?: boolean;
  emptyMessage?: string;
  maxHeight?: string;
}) => {
  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-12 bg-neutral-200 rounded"></div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-neutral-100 rounded"></div>
        ))}
      </div>
    );
  }
  
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center text-neutral-500">
        <FaBoxOpen className="mx-auto text-4xl mb-4 text-neutral-600" />
        {emptyMessage}
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="overflow-x-auto" style={{ maxHeight }}>
        <table className="min-w-full">
          <thead className="bg-neutral-50 sticky top-0">
            <tr>
              {columns.map((column, index) => (
                <th
                  key={index}
                  className={`px-6 py-4 text-left text-xs font-semibold text-neutral-600 uppercase tracking-wider ${column.className || ''}`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 text-neutral-700" >
            {data.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-neutral-50 transition-colors">
                {columns.map((column, colIndex) => (
                  <td key={colIndex} className={`px-6 py-4 text-sm ${column.className || 'text-neutral-900'}`}>
                    {column.render ? column.render(row) : row[column.accessor]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});

DataTable.displayName = 'DataTable';

// Custom chart tooltip
const CustomTooltip = ({ active, payload, label, formatter }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 border border-neutral-200 shadow-lg rounded-lg">
        <p className="font-semibold text-neutral-800 mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.color }} className="text-sm">
            <span className="font-medium">{entry.name}:</span>{' '}
            {formatter ? formatter(entry.value) : entry.value.toLocaleString()}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Date range presets
const dateRangePresets = [
  { label: 'Last 7 Days', startDate: () => subWeeks(new Date(), 1), endDate: () => new Date() },
  { label: 'Last 30 Days', startDate: () => subMonths(new Date(), 1), endDate: () => new Date() },
  { label: 'This Month', startDate: () => startOfMonth(new Date()), endDate: () => endOfMonth(new Date()) },
  { label: 'Last Month', startDate: () => startOfMonth(subMonths(new Date(), 1)), endDate: () => endOfMonth(subMonths(new Date(), 1)) },
  { label: 'Last 3 Months', startDate: () => subMonths(new Date(), 3), endDate: () => new Date() },
  { label: 'Year to Date', startDate: () => new Date(new Date().getFullYear(), 0, 1), endDate: () => new Date() }
];

export default function AnalyticsDashboard() {
  // State management
  const [startDate, setStartDate] = useState<Date>(subMonths(new Date(), 1));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState<'overview' | 'sales' | 'inventory' | 'clients' | 'activity'>('overview');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  
  // Analytics service data state
  const [salesMetrics, setSalesMetrics] = useState<SalesMetrics | null>(null);
  const [inventoryMetrics, setInventoryMetrics] = useState<InventoryMetrics | null>(null);
  const [productPerformance, setProductPerformance] = useState<ProductPerformance[]>([]);
  const [inventoryMovement, setInventoryMovement] = useState<InventoryMovement[]>([]);
  const [clientMetrics, setClientMetrics] = useState<ClientMetrics[]>([]);
  const [lowStockAlerts, setLowStockAlerts] = useState<LowStockAlert[]>([]);
  const [periodComparison, setPeriodComparison] = useState<PeriodComparison | null>(null);

  // Product history data state
  const [products, setProducts] = useState<Product[]>([])
  const [recentHistory, setRecentHistory] = useState<ProductHistoryEntry[]>([])
  const [activityData, setActivityData] = useState<ActivityData[]>([])
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalProducts: 0,
    totalVariants: 0,
    totalInventoryValue: 0,
    lowStockItems: 0,
    recentChanges: 0
  })

  // Format dates for API
  const formattedStartDate = useMemo(() => startDate.toISOString(), [startDate]);
  const formattedEndDate = useMemo(() => endDate.toISOString(), [endDate]);

  // Calculate previous period
  const { prevStartDate, prevEndDate } = useMemo(() => {
    const daysDiff = differenceInDays(endDate, startDate);
    const prevEnd = new Date(startDate);
    prevEnd.setDate(prevEnd.getDate() - 1);
    const prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - daysDiff);
    
    return {
      prevStartDate: prevStart.toISOString(),
      prevEndDate: prevEnd.toISOString()
    };
  }, [startDate, endDate]);

  // Enhanced data fetching functions
  const fetchAnalyticsData = useCallback(async (forceRefresh = false) => {
    try {
      const [
        salesData,
        inventoryData,
        productData,
        movementData,
        clientData,
        lowStockData,
        comparisonData
      ] = await Promise.all([
        analyticsService.getSalesMetrics(formattedStartDate, formattedEndDate, forceRefresh),
        analyticsService.getInventoryMetrics(forceRefresh),
        analyticsService.getProductPerformance(formattedStartDate, formattedEndDate, 20, forceRefresh),
        analyticsService.getInventoryMovement(formattedStartDate, formattedEndDate, 'day', forceRefresh),
        analyticsService.getClientMetrics(formattedStartDate, formattedEndDate, 1000, forceRefresh),
        analyticsService.getLowStockAlerts(5, forceRefresh),
        analyticsService.getPeriodComparison(formattedStartDate, formattedEndDate, prevStartDate, prevEndDate, forceRefresh)
      ]);

      setSalesMetrics(salesData);
      setInventoryMetrics(inventoryData);
      setProductPerformance(productData);
      setInventoryMovement(movementData);
      setClientMetrics(clientData);
      setLowStockAlerts(lowStockData);
      setPeriodComparison(comparisonData);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
    }
  }, [formattedStartDate, formattedEndDate, prevStartDate, prevEndDate]);

  const fetchProductHistoryData = useCallback(async () => {
    try {
      // Fetch all products
      const productsData = await productFunctions.getAllProducts()
      setProducts(productsData)

      // Calculate product-based stats
      let totalVariants = 0
      let totalValue = 0
      let lowStock = 0

      productsData.forEach(product => {
        totalVariants += product.variants?.length || 0
        product.variants?.forEach(variant => {
          totalValue += variant.quantity * product.price
          if (variant.quantity <= 5) lowStock++
        })
      })

      // Fetch recent history for all products (limited timeframe for performance)
      const dateRange = differenceInDays(endDate, startDate)
      const historyPromises = productsData.map(p => 
        analyticsFunctions.getProductHistory(p.id, {
          startDate: startDate,
          endDate: endDate,
          limit: 50
        })
      )
      
      const allHistory = (await Promise.all(historyPromises)).flat()
      const sortedHistory = allHistory.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      
      setRecentHistory(sortedHistory.slice(0, 20))

      // Process activity data for chart
      const activityMap = new Map<string, ActivityData>()
      
      for (let i = 0; i <= dateRange; i++) {
        const date = format(addDays(startDate, i), 'yyyy-MM-dd')
        activityMap.set(date, {
          date: format(addDays(startDate, i), 'MMM dd'),
          inventory: 0,
          price: 0,
          details: 0,
          variant: 0,
          creation: 0,
          deletion: 0,
          total: 0
        })
      }

      allHistory.forEach(entry => {
        const date = format(new Date(entry.created_at), 'yyyy-MM-dd')
        const activity = activityMap.get(date)
        if (activity) {
          activity[entry.change_type as keyof ActivityData]++
          activity.total++
        }
      })

      setActivityData(Array.from(activityMap.values()))

      setDashboardStats({
        totalProducts: productsData.length,
        totalVariants,
        totalInventoryValue: totalValue,
        lowStockItems: lowStock,
        recentChanges: allHistory.length
      })
    } catch (error) {
      console.error('Error fetching product history data:', error)
    }
  }, [startDate, endDate])

  const fetchAllData = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    try {
      await Promise.all([
        fetchAnalyticsData(forceRefresh),
        fetchProductHistoryData()
      ]);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchAnalyticsData, fetchProductHistoryData]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    analyticsService.clearCache();
    await fetchAllData(true);
    setRefreshing(false);
  }, [fetchAllData]);

  const handleDateChange = useCallback((start: Date, end: Date) => {
    setStartDate(start);
    setEndDate(end);
  }, []);

  // Initial data load
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Enhanced helper functions for product history
  const getTopMovingProducts = useCallback(() => {
    const productMovement = new Map<string, { product: Product, changes: number }>()
    
    recentHistory.forEach(entry => {
      if (entry.change_type === 'inventory') {
        const product = products.find(p => p.id === entry.product_id)
        if (product) {
          const current = productMovement.get(product.id) || { product, changes: 0 }
          current.changes += Math.abs(entry.quantity_change || 0)
          productMovement.set(product.id, current)
        }
      }
    })

    return Array.from(productMovement.values())
      .sort((a, b) => b.changes - a.changes)
      .slice(0, 5)
  }, [recentHistory, products])

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
      case 'blue': return 'bg-blue-100 text-blue-600'
      case 'green': return 'bg-green-100 text-green-600'
      case 'purple': return 'bg-purple-100 text-purple-600'
      case 'orange': return 'bg-orange-100 text-orange-600'
      case 'teal': return 'bg-teal-100 text-teal-600'
      case 'red': return 'bg-red-100 text-red-600'
      default: return 'bg-gray-100 text-gray-600'
    }
  }

  // Export functions
  const exportToCSV = useCallback((data: any[], filename: string) => {
    if (!data || data.length === 0) return;
    
    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = typeof row[header] === 'object' ? JSON.stringify(row[header]) : row[header];
          return `"${String(value).replace(/"/g, '""')}"`;
        }).join(',')
      )
    ];
    
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  // Render components
  const renderDateSelector = () => (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
      <div className="flex flex-wrap items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-neutral-800">Analytics Period</h3>
        <div className="flex flex-wrap gap-2">
          {dateRangePresets.map((preset, index) => (
            <button
              key={index}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-neutral-100 text-neutral-700 hover:bg-indigo-100 hover:text-indigo-700 transition-colors"
              onClick={() => handleDateChange(preset.startDate(), preset.endDate())}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>
      
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-neutral-600">From:</span>
          <DatePicker
            selected={startDate}
            onChange={(date) => date && handleDateChange(date, endDate)}
            selectsStart
            startDate={startDate}
            endDate={endDate}
            className="border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-neutral-600">To:</span>
          <DatePicker
            selected={endDate}
            onChange={(date) => date && handleDateChange(startDate, date)}
            selectsEnd
            startDate={startDate}
            endDate={endDate}
            minDate={startDate}
            className="border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        
        <div className="ml-auto flex items-center gap-4">
          <div className="text-sm text-neutral-600">
            <span className="font-medium">{differenceInDays(endDate, startDate) + 1} days</span> selected
          </div>
          <button 
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <FaSyncAlt className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>
    </div>
  );

  const renderTabs = () => (
    <div className="flex border-b border-neutral-200 mb-8">
      {[
        { key: 'overview', label: 'Overview', icon: <FaChartLine /> },
        { key: 'sales', label: 'Sales Analysis', icon: <FaDollarSign /> },
        { key: 'inventory', label: 'Inventory', icon: <FaBoxOpen /> },
        { key: 'clients', label: 'Clients', icon: <FaUsers /> },
        { key: 'activity', label: 'Product Activity', icon: <FaHistory /> }
      ].map((tab) => (
        <button
          key={tab.key}
          className={`flex items-center gap-2 py-4 px-6 font-medium transition-colors ${
            activeTab === tab.key
              ? 'border-b-2 border-indigo-600 text-indigo-600'
              : 'text-neutral-600 hover:text-indigo-600'
          }`}
          onClick={() => setActiveTab(tab.key as any)}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  );

  const renderOverviewTab = () => (
    <div className="space-y-8">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Revenue"
          value={salesMetrics ? `$${salesMetrics.total_revenue.toLocaleString()}` : '$0'}
          subtitle={salesMetrics ? `${salesMetrics.invoice_count} invoices` : '0 invoices'}
          icon={<FaDollarSign />}
          trend={periodComparison?.revenue_change !== undefined ? (
            periodComparison?.revenue_change > 0 ? 'up' : periodComparison?.revenue_change < 0 ? 'down' : 'neutral'
          ) : 'neutral'}
          trendValue={periodComparison?.revenue_change || 0}
          loading={loading}
          info="Total revenue received (not including outstanding amounts)"
          color="green"
        />
        
        <MetricCard
          title="Outstanding Amount"
          value={salesMetrics ? `$${salesMetrics.outstanding_amount.toLocaleString()}` : '$0'}
          subtitle="Unpaid invoices"
          icon={<FaExclamationTriangle />}
          loading={loading}
          info="Total amount pending payment from clients"
          color="orange"
        />
        
        <MetricCard
          title="Inventory Value"
          value={`$${dashboardStats.totalInventoryValue.toLocaleString()}`}
          subtitle={`${dashboardStats.totalVariants.toLocaleString()} variants`}
          icon={<FaBoxOpen />}
          loading={loading}
          info="Current inventory value at retail prices"
          color="blue"
        />
        
        <MetricCard
          title="Recent Activity"
          value={dashboardStats.recentChanges.toString()}
          subtitle="Product changes"
          icon={<FaHistory />}
          loading={loading}
          info="Total product changes in selected period"
          color="purple"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Revenue Trend */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-neutral-800">Revenue Trend</h3>
            <button
              className="text-indigo-600 hover:text-indigo-800 text-sm flex items-center gap-1"
              onClick={() => exportToCSV(inventoryMovement, 'revenue_trend.csv')}
            >
              <FaDownload /> Export
            </button>
          </div>
          {loading ? (
            <ChartSkeleton />
          ) : (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={inventoryMovement}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => format(new Date(value), 'MMM d')}
                    stroke="#666"
                  />
                  <YAxis stroke="#666" />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="sales_out"
                    name="Sales"
                    stroke="#1E40AF"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="purchases_in"
                    name="Purchases"
                    stroke="#059669"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Product Activity Timeline */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-neutral-800">Product Activity Timeline</h3>
            <button
              className="text-indigo-600 hover:text-indigo-800 text-sm flex items-center gap-1"
              onClick={() => exportToCSV(activityData, 'product_activity.csv')}
            >
              <FaDownload /> Export
            </button>
          </div>
          {loading ? (
            <ChartSkeleton />
          ) : (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" stroke="#666" />
                  <YAxis stroke="#666" />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Area type="monotone" dataKey="inventory" stackId="1" stroke="#3B82F6" fill="#3B82F6" name="Inventory" />
                  <Area type="monotone" dataKey="price" stackId="1" stroke="#10B981" fill="#10B981" name="Price Changes" />
                  <Area type="monotone" dataKey="details" stackId="1" stroke="#8B5CF6" fill="#8B5CF6" name="Detail Updates" />
                  <Area type="monotone" dataKey="variant" stackId="1" stroke="#F59E0B" fill="#F59E0B" name="Variant Changes" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Top Moving Products */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-bold text-neutral-800 mb-6">Top Moving Products</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {getTopMovingProducts().map((item, index) => (
            <div key={item.product.id} className="flex items-center gap-3 p-4 bg-neutral-50 rounded-lg">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              >
                {index + 1}
              </div>
              <div className="flex-1">
                <p className="font-medium text-neutral-900">{item.product.name}</p>
                <p className="text-sm text-neutral-600">{item.changes} units moved</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Low Stock Alerts */}
      {lowStockAlerts.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-2 mb-6">
            <FaExclamationTriangle className="text-orange-500 text-xl" />
            <h3 className="text-lg font-bold text-neutral-800">Low Stock Alerts</h3>
            <span className="bg-orange-100 text-orange-800 text-xs font-medium px-2 py-1 rounded-full">
              {lowStockAlerts.length}
            </span>
          </div>
          <DataTable
            data={lowStockAlerts.slice(0, 5)}
            columns={[
              { header: 'Product', accessor: 'product_name' },
              { header: 'Variant', accessor: 'size', render: (row) => `${row.size} - ${row.color}` },
              { header: 'Current Stock', accessor: 'current_quantity', className: 'font-bold' },
              { header: 'Days Left', accessor: 'days_of_stock', render: (row) => `${row.days_of_stock} days` },
              { header: 'Recommended Order', accessor: 'recommended_reorder', className: 'text-indigo-600 font-medium' }
            ]}
            loading={loading}
            emptyMessage="All products are well stocked!"
            maxHeight="300px"
          />
        </div>
      )}
    </div>
  );

  const renderSalesTab = () => (
    <div className="space-y-8">
      {/* Sales KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          title="Total Invoiced"
          value={salesMetrics ? `$${salesMetrics.total_invoiced.toLocaleString()}` : '$0'}
          subtitle="Gross invoices"
          icon={<FaShoppingCart />}
          loading={loading}
          info="Total amount invoiced (including unpaid amounts)"
          color="blue"
        />
        <MetricCard
          title="Average Invoice"
          value={salesMetrics ? `$${salesMetrics.avg_invoice_value.toLocaleString()}` : '$0'}
          subtitle="Per invoice"
          icon={<FaChartBar />}
          loading={loading}
          info="Average value per invoice"
          color="green"
        />
        <MetricCard
          title="Returns"
          value={salesMetrics ? `$${salesMetrics.return_amount.toLocaleString()}` : '$0'}
          subtitle="Return invoices"
          icon={<BarChart/>}
          loading={loading}
          info="Total amount of return invoices"
          color="red"
        />
      </div>

      {/* Period Comparison Chart */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-bold text-neutral-800 mb-6">Period Comparison</h3>
        {loading || !periodComparison ? (
          <ChartSkeleton />
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  {
                    name: 'Previous Period',
                    revenue: periodComparison.previous_period.total_revenue,
                    invoices: periodComparison.previous_period.invoice_count
                  },
                  {
                    name: 'Current Period',
                    revenue: periodComparison.current_period.total_revenue,
                    invoices: periodComparison.current_period.invoice_count
                  }
                ]}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" stroke="#666" />
                <YAxis yAxisId="left" orientation="left" stroke="#1E40AF" />
                <YAxis yAxisId="right" orientation="right" stroke="#059669" />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar yAxisId="left" dataKey="revenue" name="Revenue ($)" fill="#1E40AF" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="invoices" name="Invoice Count" fill="#059669" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Product Performance Table */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-neutral-800">Product Performance</h3>
          <button
            className="text-indigo-600 hover:text-indigo-800 text-sm flex items-center gap-1"
            onClick={() => exportToCSV(productPerformance, 'product_performance.csv')}
          >
            <FaDownload /> Export All
          </button>
        </div>
        <DataTable
          data={productPerformance}
          columns={[
            {
              header: 'Product',
              accessor: 'product_name',
              render: (row) => (
                <div className="flex items-center gap-3">
                  {row.photo ? (
                    <img src={row.photo} alt={row.product_name} className="h-12 w-12 object-cover rounded-lg" />
                  ) : (
                    <div className="h-12 w-12 bg-neutral-200 rounded-lg flex items-center justify-center">
                      <FaBoxOpen className="text-neutral-600" />
                    </div>
                  )}
                  <span className="font-medium">{row.product_name}</span>
                </div>
              )
            },
            { header: 'Sold', accessor: 'total_sold', className: 'text-center' },
            { header: 'Revenue', accessor: 'total_revenue', render: (row) => `$${row.total_revenue.toLocaleString()}` },
            { header: 'Avg Price', accessor: 'avg_price', render: (row) => `$${row.avg_price.toFixed(2)}` },
            { header: 'Margin', accessor: 'profit_margin', render: (row) => `${row.profit_margin.toFixed(1)}%` },
            { header: 'Stock', accessor: 'current_stock', className: 'text-center font-medium' }
          ]}
          loading={loading}
          emptyMessage="No sales data available for this period"
        />
      </div>
    </div>
  );

  const renderInventoryTab = () => (
    <div className="space-y-8">
      {/* Inventory KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricCard
          title="Total Items"
          value={inventoryMetrics ? inventoryMetrics.total_items.toLocaleString() : '0'}
          subtitle="In stock"
          icon={<FaBoxOpen />}
          loading={loading}
          color="blue"
        />
        <MetricCard
          title="Retail Value"
          value={inventoryMetrics ? `$${inventoryMetrics.total_retail_value.toLocaleString()}` : '$0'}
          subtitle="At selling price"
          icon={<FaDollarSign />}
          loading={loading}
          color="green"
        />
        <MetricCard
          title="Cost Value"
          value={inventoryMetrics ? `$${inventoryMetrics.total_cost_value.toLocaleString()}` : '$0'}
          subtitle="At cost price"
          icon={<FaChartBar />}
          loading={loading}
          color="orange"
        />
        <MetricCard
          title="Low Stock Items"
          value={inventoryMetrics ? inventoryMetrics.low_stock_count.toString() : '0'}
          subtitle="Need attention"
          icon={<FaExclamationTriangle />}
          loading={loading}
          color="red"
        />
      </div>

      {/* Inventory Movement Chart */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-neutral-800">Inventory Movement</h3>
          <button
            className="text-indigo-600 hover:text-indigo-800 text-sm flex items-center gap-1"
            onClick={() => exportToCSV(inventoryMovement, 'inventory_movement.csv')}
          >
            <FaDownload /> Export
          </button>
        </div>
        {loading ? (
          <ChartSkeleton />
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={inventoryMovement}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => format(new Date(value), 'MMM d')}
                  stroke="#666"
                />
                <YAxis stroke="#666" />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="purchases_in" name="Purchases In" fill="#059669" radius={[2, 2, 0, 0]} />
                <Bar dataKey="sales_out" name="Sales Out" fill="#DC2626" radius={[2, 2, 0, 0]} />
                <Line type="monotone" dataKey="net_change" name="Net Change" stroke="#1E40AF" strokeWidth={3} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Low Stock Alerts */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center gap-2 mb-6">
          <FaExclamationTriangle className="text-orange-500 text-xl" />
          <h3 className="text-lg font-bold text-neutral-800">Stock Alerts & Recommendations</h3>
        </div>
        <DataTable
          data={lowStockAlerts}
          columns={[
            { header: 'Product', accessor: 'product_name', className: 'font-medium' },
            { header: 'Variant', accessor: 'size', render: (row) => `${row.size} - ${row.color}` },
            { 
              header: 'Current Stock', 
              accessor: 'current_quantity',
              className: 'text-center',
              render: (row) => (
                <span className={`font-bold ${row.current_quantity === 0 ? 'text-red-600' : row.current_quantity <= 2 ? 'text-orange-600' : 'text-neutral-900'}`}>
                  {row.current_quantity}
                </span>
              )
            },
            { 
              header: 'Days of Stock', 
              accessor: 'days_of_stock',
              className: 'text-center',
              render: (row) => (
                <span className={`${row.days_of_stock <= 7 ? 'text-red-600 font-bold' : row.days_of_stock <= 14 ? 'text-orange-600' : 'text-neutral-900'}`}>
                  {row.days_of_stock} days
                </span>
              )
            },
            { 
              header: 'Recommended Order', 
              accessor: 'recommended_reorder',
              className: 'text-center text-indigo-600 font-medium'
            }
          ]}
          loading={loading}
          emptyMessage="All products are well stocked!"
        />
      </div>
    </div>
  );

  const renderClientsTab = () => (
    <div className="space-y-8">
      {/* Client Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          title="Active Clients"
          value={clientMetrics.length.toString()}
          subtitle="With orders this period"
          icon={<FaUsers />}
          loading={loading}
          color="blue"
        />
        <MetricCard
          title="Total Outstanding"
          value={`$${clientMetrics.reduce((sum, client) => sum + client.outstanding_balance, 0).toLocaleString()}`}
          subtitle="Across all clients"
          icon={<FaExclamationTriangle />}
          loading={loading}
          color="orange"
        />
        <MetricCard
          title="Average Invoice Value"
          value={`$${salesMetrics?.avg_invoice_value.toFixed(0) || '0'}`}
          subtitle="Per invoice"
          icon={<FaChartBar />}
          loading={loading}
          color="green"
        />
      </div>

      {/* Client Performance Table */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-neutral-800">Client Performance</h3>
          <button
            className="text-indigo-600 hover:text-indigo-800 text-sm flex items-center gap-1"
            onClick={() => exportToCSV(clientMetrics, 'client_performance.csv')}
          >
            <FaDownload /> Export
          </button>
        </div>
        <DataTable
          data={clientMetrics}
          columns={[
            { header: 'Client', accessor: 'client_name', className: 'font-medium' },
            { header: 'Total Invoiced', accessor: 'total_invoiced', render: (row) => `$${row.total_invoiced.toLocaleString()}` },
            { header: 'Paid', accessor: 'total_paid', render: (row) => `$${row.total_paid.toLocaleString()}` },
            { 
              header: 'Outstanding', 
              accessor: 'outstanding_balance',
              render: (row) => (
                <span className={`font-medium ${row.outstanding_balance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                  ${row.outstanding_balance.toLocaleString()}
                </span>
              )
            },
            { header: 'Invoices', accessor: 'invoice_count', className: 'text-center' },
            { 
              header: 'Last Invoice', 
              accessor: 'last_invoice_date',
              render: (row) => format(new Date(row.last_invoice_date), 'MMM d, yyyy')
            }
          ]}
          loading={loading}
          emptyMessage="No client activity in this period"
        />
      </div>
    </div>
  );

  const renderActivityTab = () => (
    <div className="space-y-8">
      {/* Product Activity Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricCard
          title="Total Products"
          value={dashboardStats.totalProducts.toString()}
          subtitle="In catalog"
          icon={<FaBoxes />}
          loading={loading}
          color="blue"
        />
        <MetricCard
          title="Total Variants"
          value={dashboardStats.totalVariants.toString()}
          subtitle="Product variants"
          icon={<FaPalette />}
          loading={loading}
          color="purple"
        />
        <MetricCard
          title="Recent Changes"
          value={dashboardStats.recentChanges.toString()}
          subtitle="In selected period"
          icon={<FaHistory />}
          loading={loading}
          color="orange"
        />
        <MetricCard
          title="Low Stock Items"
          value={dashboardStats.lowStockItems.toString()}
          subtitle="Need attention"
          icon={<FaExclamationTriangle />}
          loading={loading}
          color="red"
        />
      </div>

      {/* Activity Timeline Chart */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-neutral-800">Product Activity Breakdown</h3>
          <button
            className="text-indigo-600 hover:text-indigo-800 text-sm flex items-center gap-1"
            onClick={() => exportToCSV(activityData, 'activity_breakdown.csv')}
          >
            <FaDownload /> Export
          </button>
        </div>
        {loading ? (
          <ChartSkeleton />
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" stroke="#666" />
                <YAxis stroke="#666" />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="inventory" name="Inventory Changes" fill="#3B82F6" stackId="a" />
                <Bar dataKey="price" name="Price Changes" fill="#10B981" stackId="a" />
                <Bar dataKey="details" name="Detail Updates" fill="#8B5CF6" stackId="a" />
                <Bar dataKey="variant" name="Variant Changes" fill="#F59E0B" stackId="a" />
                <Bar dataKey="creation" name="New Products" fill="#06B6D4" stackId="a" />
                <Bar dataKey="deletion" name="Deletions" fill="#EF4444" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Recent Product Activity */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-neutral-800">Recent Product Activity</h3>
          <button
            className="text-indigo-600 hover:text-indigo-800 text-sm flex items-center gap-1"
            onClick={() => exportToCSV(recentHistory, 'recent_activity.csv')}
          >
            <FaDownload /> Export
          </button>
        </div>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {recentHistory.length === 0 ? (
            <div className="text-center py-8 text-neutral-500">
              <FaHistory className="mx-auto text-4xl mb-4 text-neutral-600" />
              No recent activity found
            </div>
          ) : (
            recentHistory.map((entry) => {
              const product = products.find(p => p.id === entry.product_id)
              
              return (
                <div key={entry.id} className="flex items-center justify-between py-3 border-b border-neutral-100 last:border-b-0">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getChangeColor(entry.change_type)}`}>
                      {getChangeIcon(entry.change_type)}
                    </div>
                    <div>
                      <p className="font-medium text-neutral-900">{product?.name || 'Unknown Product'}</p>
                      <p className="text-sm text-neutral-600">
                        {analyticsFunctions.formatHistoryEntry(entry)}
                      </p>
                      {entry.source_reference && (
                        <p className="text-xs text-neutral-500">
                          Source: {entry.source_reference}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-neutral-500">
                      {format(new Date(entry.created_at), 'MMM dd, HH:mm')}
                    </p>
                    {entry.user_email && (
                      <p className="text-xs text-neutral-400">{entry.user_email}</p>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Top Moving Products in Activity Tab */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-bold text-neutral-800 mb-6">Most Active Products</h3>
        {getTopMovingProducts().length === 0 ? (
          <div className="text-center py-8 text-neutral-500">
            <FaBoxes className="mx-auto text-4xl mb-4 text-neutral-600" />
            No product movement data available
          </div>
        ) : (
          <div className="space-y-4">
            {getTopMovingProducts().map((item, index) => (
              <div key={item.product.id} className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  >
                    {index + 1}
                  </div>
                  <div className="flex items-center gap-3">
                    {item.product.photo ? (
                      <img src={item.product.photo} alt={item.product.name} className="h-12 w-12 object-cover rounded-lg" />
                    ) : (
                      <div className="h-12 w-12 bg-neutral-200 rounded-lg flex items-center justify-center">
                        <FaBoxes className="text-neutral-600" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-neutral-900">{item.product.name}</p>
                      <p className="text-sm text-neutral-600">{item.changes} units moved</p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-neutral-900">
                    ${(item.product.price * item.changes).toLocaleString()}
                  </p>
                  <p className="text-xs text-neutral-500">total value</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-neutral-900 mb-2">Business Analytics</h1>
          <p className="text-neutral-600">Comprehensive insights into your business performance and product activity</p>
        </div>
        
        {renderDateSelector()}
        {renderTabs()}
        
        {/* Tab Content */}
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'sales' && renderSalesTab()}
        {activeTab === 'inventory' && renderInventoryTab()}
        {activeTab === 'clients' && renderClientsTab()}
        {activeTab === 'activity' && renderActivityTab()}
      </div>
    </div>
  );
}