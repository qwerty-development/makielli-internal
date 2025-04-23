/* eslint-disable react/display-name */
'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { 
  FaChartLine, FaBoxOpen, FaChartBar, FaExclamationTriangle, 
  FaSearch, FaCalendar, FaDownload, FaSyncAlt, FaArrowUp, 
  FaArrowDown, FaEquals, FaInfoCircle, FaTimes
} from 'react-icons/fa'
import { 
  analyticsFunctions, TopSellersData, TimeSeriesData, 
  InventoryValueData, SalesKPIData 
} from '@/utils/functions/analytics'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, BarChart, Bar, Cell,
  PieChart, Pie, Sector
} from 'recharts'
import { 
  format, subMonths, subWeeks, startOfMonth, endOfMonth, 
  startOfWeek, endOfWeek, isSameDay, parseISO,
  formatDistanceToNow, differenceInDays
} from 'date-fns'

// Skeleton components for loading states
const MetricCardSkeleton = () => (
  <div className="bg-white rounded-lg shadow-md p-4 animate-pulse">
    <div className="flex items-center justify-between">
      <div>
        <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
        <div className="h-8 bg-gray-200 rounded w-16"></div>
      </div>
      <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
    </div>
  </div>
)

const TableSkeleton = () => (
  <div className="animate-pulse">
    <div className="h-8 bg-gray-200 rounded mb-4"></div>
    <div className="h-16 bg-gray-200 rounded mb-2"></div>
    <div className="h-16 bg-gray-200 rounded mb-2"></div>
    <div className="h-16 bg-gray-200 rounded mb-2"></div>
  </div>
)

const ChartSkeleton = () => (
  <div className="animate-pulse h-80">
    <div className="h-full bg-gray-200 rounded"></div>
  </div>
)

// Card component for summary metrics with trend indicator
const MetricCard = React.memo(({ 
  title, 
  value, 
  icon, 
  trend = null, 
  trendValue = 0,
  className = '',
  loading = false,
  info = null
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral' | null;
  trendValue?: number;
  className?: string;
  loading?: boolean;
  info?: string | null;
}) => {
  const [showInfo, setShowInfo] = useState(false);
  
  if (loading) {
    return <MetricCardSkeleton />;
  }
  
  let trendIcon, trendColor;
  
  if (trend === 'up') {
    trendIcon = <FaArrowUp className="mr-1" />;
    trendColor = trendValue > 0 ? 'text-green-500' : 'text-red-500';
  } else if (trend === 'down') {
    trendIcon = <FaArrowDown className="mr-1" />;
    trendColor = trendValue < 0 ? 'text-green-500' : 'text-red-500';
  } else if (trend === 'neutral') {
    trendIcon = <FaEquals className="mr-1" />;
    trendColor = 'text-gray-500';
  }
  
  return (
    <div className={`bg-white rounded-lg shadow-md p-4 relative ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center">
            <p className="text-sm text-gray-400">{title}</p>
            {info && (
              <div className="relative ml-1">
                <FaInfoCircle 
                  className="text-gray-400 hover:text-blue cursor-pointer" 
                  onMouseEnter={() => setShowInfo(true)}
                  onMouseLeave={() => setShowInfo(false)}
                  onClick={() => setShowInfo(!showInfo)}
                />
                {showInfo && (
                  <div className="absolute z-10 bg-white p-2 rounded shadow-lg text-xs w-48 left-0 top-6 text-gray-800">
                    {info}
                  </div>
                )}
              </div>
            )}
          </div>
          <p className="text-2xl font-bold">{value}</p>
          {trend && (
            <div className={`flex items-center text-sm ${trendColor}`}>
              {trendIcon}
              <span>{Math.abs(Math.round(trendValue * 10) / 10)}%</span>
            </div>
          )}
        </div>
        <div className="text-blue text-3xl">{icon}</div>
      </div>
    </div>
  );
});

// DataTable component for displaying tabular data
const DataTable = React.memo(({ 
  data, 
  columns, 
  loading = false,
  emptyMessage = "No data available"
}: {
  data: any[];
  columns: { header: string; accessor: string; render?: (row: any) => React.ReactNode }[];
  loading?: boolean;
  emptyMessage?: string;
}) => {
  if (loading) {
    return <TableSkeleton />;
  }
  
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
        {emptyMessage}
      </div>
    );
  }
  
  return (
    <div className="overflow-x-auto bg-white rounded-lg shadow">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((column, index) => (
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
          {data.map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-gray-50">
              {columns.map((column, colIndex) => (
                <td key={colIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {column.render ? column.render(row) : row[column.accessor]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});

// Custom tooltip for charts
const CustomTooltip = ({ active, payload, label, valuePrefix = '', valueSuffix = '' }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-200 shadow-md rounded">
        <p className="font-medium text-sm">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.color }} className="text-sm">
            {entry.name}: {valuePrefix}{entry.value.toLocaleString()}{valueSuffix}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Custom active shape for pie chart
const renderActiveShape = (props: any) => {
  const { 
    cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle,
    fill, payload, percent, value 
  } = props;
  
  const sin = Math.sin(-midAngle * Math.PI / 180);
  const cos = Math.cos(-midAngle * Math.PI / 180);
  const sx = cx + (outerRadius + 10) * cos;
  const sy = cy + (outerRadius + 10) * sin;
  const mx = cx + (outerRadius + 30) * cos;
  const my = cy + (outerRadius + 30) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * 22;
  const ey = my;
  const textAnchor = cos >= 0 ? 'start' : 'end';

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 6}
        outerRadius={outerRadius + 10}
        fill={fill}
      />
      <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
      <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} textAnchor={textAnchor} fill="#333">{payload.name}</text>
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} dy={18} textAnchor={textAnchor} fill="#999">
        {`${value} units (${(percent * 100).toFixed(2)}%)`}
      </text>
    </g>
  );
};

// Tab panel component
const TabPanel = ({ children, value, index }: { children: React.ReactNode, value: string, index: string }) => {
  return (
    <div className={value === index ? 'block' : 'hidden'}>
      {children}
    </div>
  );
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
  // State for date range selection
  const [startDate, setStartDate] = useState<Date>(subMonths(new Date(), 1));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [prevStartDate, setPrevStartDate] = useState<Date>(subMonths(startDate, 1));
 
  const [customRange, setCustomRange] = useState<boolean>(false);
  
  // Helper function to calculate previous period
  const subDays = (date: Date, days: number) => {
    const result = new Date(date);
    result.setDate(date.getDate() - days);
    return result;
  };
  const [prevEndDate, setPrevEndDate] = useState<Date>(subDays(startDate, 1));
  // Function to update both current and previous period dates
  const updateDateRanges = (start: Date, end: Date) => {
    setStartDate(start);
    setEndDate(end);
    
    // Calculate previous period of same length
    const daysDiff = differenceInDays(end, start);
    const prevStart = subDays(start, daysDiff + 1);
    const prevEnd = subDays(start, 1);
    
    setPrevStartDate(prevStart);
    setPrevEndDate(prevEnd);
  };
  
  // State for data
  const [topSellers, setTopSellers] = useState<TopSellersData[]>([]);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);
  const [inventoryValue, setInventoryValue] = useState<InventoryValueData | null>(null);
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);
  const [salesKPIs, setSalesKPIs] = useState<SalesKPIData | null>(null);
  
  // Individual loading states
  const [loadingTopSellers, setLoadingTopSellers] = useState<boolean>(true);
  const [loadingTimeSeries, setLoadingTimeSeries] = useState<boolean>(true);
  const [loadingInventoryValue, setLoadingInventoryValue] = useState<boolean>(true);
  const [loadingLowStock, setLoadingLowStock] = useState<boolean>(true);
  const [loadingSalesKPIs, setLoadingSalesKPIs] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // State for active tab
  const [activeTab, setActiveTab] = useState<'overview' | 'sales' | 'inventory'>('overview');
  
  // State for active pie chart segment
  const [activePieIndex, setActivePieIndex] = useState<number>(0);
  
  // Format dates for API calls
  const formattedStartDate = useMemo(() => startDate.toISOString(), [startDate]);
  const formattedEndDate = useMemo(() => endDate.toISOString(), [endDate]);
  const formattedPrevStartDate = useMemo(() => prevStartDate.toISOString(), [prevStartDate]);
  const formattedPrevEndDate = useMemo(() => prevEndDate.toISOString(), [prevEndDate]);
  
  // Function to clear cache and refresh all data
  const refreshAllData = useCallback(async () => {
    setRefreshing(true);
    analyticsFunctions.clearCache();
    
    try {
      await Promise.all([
        fetchTopSellers(true),
        fetchTimeSeries(true),
        fetchInventoryValue(true),
        fetchLowStockProducts(true),
        fetchSalesKPIs(true)
      ]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  }, [
    formattedStartDate, 
    formattedEndDate, 
    formattedPrevStartDate, 
    formattedPrevEndDate
  ]);

  // Data fetching functions
  const fetchTopSellers = useCallback(async (forceRefresh: boolean = false) => {
    setLoadingTopSellers(true);
    try {
      const data = await analyticsFunctions.getTopSellingProducts(
        formattedStartDate,
        formattedEndDate,
        10,
        forceRefresh
      );
      setTopSellers(data);
      return data;
    } catch (error) {
      console.error('Error fetching top sellers:', error);
      return [];
    } finally {
      setLoadingTopSellers(false);
    }
  }, [formattedStartDate, formattedEndDate]);

  const fetchTimeSeries = useCallback(async (forceRefresh: boolean = false) => {
    setLoadingTimeSeries(true);
    try {
      const data = await analyticsFunctions.getInventoryTimeSeries(
        formattedStartDate,
        formattedEndDate,
        'day',
        forceRefresh
      );
      setTimeSeriesData(data);
      return data;
    } catch (error) {
      console.error('Error fetching time series data:', error);
      return [];
    } finally {
      setLoadingTimeSeries(false);
    }
  }, [formattedStartDate, formattedEndDate]);

  const fetchInventoryValue = useCallback(async (forceRefresh: boolean = false) => {
    setLoadingInventoryValue(true);
    try {
      const data = await analyticsFunctions.getInventoryValue(forceRefresh);
      setInventoryValue(data);
      return data;
    } catch (error) {
      console.error('Error fetching inventory value:', error);
      return null;
    } finally {
      setLoadingInventoryValue(false);
    }
  }, []);

  const fetchLowStockProducts = useCallback(async (forceRefresh: boolean = false) => {
    setLoadingLowStock(true);
    try {
      const data = await analyticsFunctions.getLowStockProducts(5, forceRefresh);
      setLowStockProducts(data);
      return data;
    } catch (error) {
      console.error('Error fetching low stock products:', error);
      return [];
    } finally {
      setLoadingLowStock(false);
    }
  }, []);
  
  const fetchSalesKPIs = useCallback(async (forceRefresh: boolean = false) => {
    setLoadingSalesKPIs(true);
    try {
      const data = await analyticsFunctions.getSalesKPIs(
        formattedStartDate,
        formattedEndDate,
        formattedPrevStartDate,
        formattedPrevEndDate,
        forceRefresh
      );
      setSalesKPIs(data);
      return data;
    } catch (error) {
      console.error('Error fetching sales KPIs:', error);
      return null;
    } finally {
      setLoadingSalesKPIs(false);
    }
  }, [formattedStartDate, formattedEndDate, formattedPrevStartDate, formattedPrevEndDate]);

  // Fetch data based on active tab
  const fetchTabData = useCallback((tab: string, forceRefresh: boolean = false) => {
    // Common data for all tabs
    fetchInventoryValue(forceRefresh);
    
    if (tab === 'overview' || tab === 'sales') {
      fetchTopSellers(forceRefresh);
      fetchTimeSeries(forceRefresh);
      fetchSalesKPIs(forceRefresh);
    }
    
    if (tab === 'overview' || tab === 'inventory') {
      fetchLowStockProducts(forceRefresh);
    }
  }, [
    fetchInventoryValue, 
    fetchTopSellers, 
    fetchTimeSeries, 
    fetchLowStockProducts,
    fetchSalesKPIs
  ]);

  // Handle tab change
  const handleTabChange = useCallback((tab: 'overview' | 'sales' | 'inventory') => {
    setActiveTab(tab);
    fetchTabData(tab);
  }, [fetchTabData]);
  
  // Handle date preset selection
  const handleDatePresetSelect = useCallback((preset: { 
    startDate: () => Date; 
    endDate: () => Date 
  }) => {
    const newStartDate = preset.startDate();
    const newEndDate = preset.endDate();
    updateDateRanges(newStartDate, newEndDate);
    setCustomRange(false);
  }, []);

  // Initial data loading
  useEffect(() => {
    fetchTabData(activeTab);
  }, [activeTab, formattedStartDate, formattedEndDate, fetchTabData]);

  // Derived metrics
  const totalSold = useMemo(() =>
    topSellers.reduce((sum, product) => sum + product.quantity_sold, 0),
    [topSellers]
  );

  const totalRevenue = useMemo(() =>
    topSellers.reduce((sum, product) => sum + product.revenue, 0),
    [topSellers]
  );

  const inventoryItems = useMemo(() =>
    inventoryValue?.total_items || 0,
    [inventoryValue]
  );

  const inventoryTotalValue = useMemo(() =>
    inventoryValue?.total_value || 0,
    [inventoryValue]
  );
  
  // Prepare data for pie chart
  const inventoryPieData = useMemo(() => {
    if (!inventoryValue) return [];
    
    // Group small items into "Others" category for cleaner chart
    const threshold = inventoryValue.total_items * 0.03; // 3% threshold
    
    const mainItems = [] as any[];
    let othersValue = 0;
    let othersItems = 0;
    
    inventoryValue.by_product.forEach(product => {
      if (product.items > threshold) {
        mainItems.push({
          name: product.product_name,
          value: product.items
        });
      } else {
        othersValue += product.value;
        othersItems += product.items;
      }
    });
    
    if (othersItems > 0) {
      mainItems.push({
        name: 'Others',
        value: othersItems
      });
    }
    
    return mainItems.sort((a, b) => b.value - a.value);
  }, [inventoryValue]);
  
  // Prepare data for sales comparison chart
  const salesComparisonData = useMemo(() => {
    if (!salesKPIs) return [];
    
    return [
      {
        name: 'Current Period',
        sales: salesKPIs.current_period.total_sales,
        orders: salesKPIs.current_period.invoice_count
      },
      {
        name: 'Previous Period',
        sales: salesKPIs.prev_period.total_sales,
        orders: salesKPIs.prev_period.invoice_count
      }
    ];
  }, [salesKPIs]);
  
  // Columns for tables - memoized
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
              loading="lazy"
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
  ], []);

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
  ], []);
  
  // CSV export function
  const exportToCSV = useCallback((data: any[], filename: string) => {
    if (!data || data.length === 0) return;
    
    // Create headers based on first item keys
    const headers = Object.keys(data[0]);
    
    // Create CSV rows
    const csvRows = [
      headers.join(','), // Header row
      ...data.map(row => 
        headers.map(header => {
          // Handle objects and arrays
          const value = typeof row[header] === 'object' ? 
            JSON.stringify(row[header]) : row[header];
          
          // Escape commas and quotes
          return `"${String(value).replace(/"/g, '""')}"`;
        }).join(',')
      )
    ];
    
    // Create blob and download
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

  // Render date range selector
  const renderDateSelector = useCallback(() => (
    <div className="bg-white rounded-lg shadow-md p-4 mb-6">
      <div className="flex flex-wrap items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Date Range</h3>
        <div className="flex space-x-2">
          {dateRangePresets.map((preset, index) => (
            <button
              key={index}
              className={`px-3 py-1 text-sm rounded ${
                !customRange && 
                isSameDay(preset.startDate(), startDate) && 
                isSameDay(preset.endDate(), endDate)
                  ? 'bg-blue text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              onClick={() => handleDatePresetSelect(preset)}
            >
              {preset.label}
            </button>
          ))}
          <button
            className={`px-3 py-1 text-sm rounded ${
              customRange
                ? 'bg-blue text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            onClick={() => setCustomRange(true)}
          >
            Custom
          </button>
        </div>
      </div>
      
      {customRange && (
        <div className="flex flex-wrap items-center space-x-4">
          <div className="flex items-center mb-2">
            <span className="mr-2 text-gray">From:</span>
            <DatePicker
              selected={startDate}
              onChange={date => {
                if (date) {
                  if (date >= endDate) {
                    // Ensure start date is before end date
                    setStartDate(new Date(endDate.getTime() - 86400000)); // 1 day before
                  } else {
                    setStartDate(date);
                    
                    // Adjust previous period
                    const daysDiff = differenceInDays(endDate, date);
                    const prevStart = subDays(date, daysDiff + 1);
                    const prevEnd = subDays(date, 1);
                    
                    setPrevStartDate(prevStart);
                    setPrevEndDate(prevEnd);
                  }
                }
              }}
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
              onChange={date => {
                if (date) {
                  setEndDate(date);
                  
                  // Adjust previous period
                  const daysDiff = differenceInDays(date, startDate);
                  const prevStart = subDays(startDate, daysDiff + 1);
                  const prevEnd = subDays(startDate, 1);
                  
                  setPrevStartDate(prevStart);
                  setPrevEndDate(prevEnd);
                }
              }}
              selectsEnd
              startDate={startDate}
              endDate={endDate}
              minDate={startDate}
              className="border border-gray rounded p-2"
            />
          </div>
          <div className="text-sm text-gray-500">
            Previous period: {format(prevStartDate, 'MMM d, yyyy')} - {format(prevEndDate, 'MMM d, yyyy')}
          </div>
        </div>
      )}
      
      <div className="flex justify-between items-center mt-4">
        <div className="text-sm text-gray-500">
          {format(startDate, 'MMM d, yyyy')} - {format(endDate, 'MMM d, yyyy')}
          <span className="ml-2">({differenceInDays(endDate, startDate) + 1} days)</span>
        </div>
        <button 
          className="flex items-center px-3 py-2 bg-blue text-white rounded hover:bg-blue-700"
          onClick={refreshAllData}
          disabled={refreshing}
        >
          {refreshing ? (
            <>
              <FaSyncAlt className="animate-spin mr-2" /> Refreshing...
            </>
          ) : (
            <>
              <FaSyncAlt className="mr-2" /> Refresh Data
            </>
          )}
        </button>
      </div>
    </div>
  ), [
    startDate, 
    endDate, 
    prevStartDate, 
    prevEndDate, 
    customRange, 
    handleDatePresetSelect,
    refreshAllData,
    refreshing
  ]);

  // Render tabs
  const renderTabs = useCallback(() => (
    <div className="flex border-b mb-6">
      <button
        className={`py-3 px-6 font-medium ${activeTab === 'overview'
          ? 'border-b-2 border-blue text-blue'
          : 'text-gray hover:text-blue'}`}
        onClick={() => handleTabChange('overview')}
      >
        Overview
      </button>
      <button
        className={`py-3 px-6 font-medium ${activeTab === 'sales'
          ? 'border-b-2 border-blue text-blue'
          : 'text-gray hover:text-blue'}`}
        onClick={() => handleTabChange('sales')}
      >
        Sales Analysis
      </button>
      <button
        className={`py-3 px-6 font-medium ${activeTab === 'inventory'
          ? 'border-b-2 border-blue text-blue'
          : 'text-gray hover:text-blue'}`}
        onClick={() => handleTabChange('inventory')}
      >
        Inventory
      </button>
    </div>
  ), [activeTab, handleTabChange]);

  // Render Overview tab
  const renderOverviewTab = useCallback(() => (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Products Sold"
          value={loadingTopSellers ? "Loading..." : totalSold.toLocaleString()}
          icon={<FaBoxOpen />}
          loading={loadingTopSellers}
          trend={salesKPIs ? (salesKPIs.changes.invoice_count_change > 0 ? 'up' : 'down') : null}
          trendValue={salesKPIs?.changes.invoice_count_change || 0}
          info="Total number of products sold during the selected period"
        />
        <MetricCard
          title="Total Revenue"
          value={loadingTopSellers ? "Loading..." : `$${totalRevenue.toFixed(2)}`}
          icon={<FaChartLine />}
          loading={loadingTopSellers}
          trend={salesKPIs ? (salesKPIs.changes.total_sales_change > 0 ? 'up' : 'down') : null}
          trendValue={salesKPIs?.changes.total_sales_change || 0}
          info="Total revenue generated during the selected period"
        />
        <MetricCard
          title="Inventory Items"
          value={loadingInventoryValue ? "Loading..." : inventoryItems.toLocaleString()}
          icon={<FaBoxOpen />}
          loading={loadingInventoryValue}
          info="Current total number of items in inventory"
        />
        <MetricCard
          title="Inventory Value"
          value={loadingInventoryValue ? "Loading..." : `$${inventoryTotalValue.toFixed(2)}`}
          icon={<FaChartBar />}
          loading={loadingInventoryValue}
          info="Current total value of inventory at retail prices"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Sales and Purchases Over Time</h2>
            <button
              className="text-blue hover:text-blue-700 text-sm flex items-center"
              onClick={() => exportToCSV(timeSeriesData, 'sales_purchases_time_series.csv')}
              disabled={loadingTimeSeries || timeSeriesData.length === 0}
            >
              <FaDownload className="mr-1" /> Export
            </button>
          </div>
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
                  <XAxis 
                    dataKey="date"
                    tickFormatter={(value) => {
                      try {
                        return format(new Date(value), 'MMM d');
                      } catch (e) {
                        return value;
                      }
                    }}
                  />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="sales"
                    name="Sales"
                    stroke="#1E1E89"
                    activeDot={{ r: 8 }}
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="purchases"
                    name="Purchases"
                    stroke="#4C5B5C"
                    activeDot={{ r: 6 }}
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Inventory Distribution</h2>
            <button
              className="text-blue hover:text-blue-700 text-sm flex items-center"
              onClick={() => 
                exportToCSV(
                  inventoryValue?.by_product.map(p => ({
                    product_name: p.product_name,
                    items: p.items,
                    value: p.value,
                    cost: p.cost
                  })) || [], 
                  'inventory_distribution.csv'
                )
              }
              disabled={loadingInventoryValue || !inventoryValue}
            >
              <FaDownload className="mr-1" /> Export
            </button>
          </div>
          
          {loadingInventoryValue ? (
            <ChartSkeleton />
          ) : (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    activeIndex={activePieIndex}
                    activeShape={renderActiveShape}
                    data={inventoryPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    fill="#1E1E89"
                    dataKey="value"
                    onMouseEnter={(_, index) => setActivePieIndex(index)}
                  />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Top Selling Products</h2>
            <button
              className="text-blue hover:text-blue-700 text-sm flex items-center"
              onClick={() => exportToCSV(topSellers, 'top_selling_products.csv')}
              disabled={loadingTopSellers || topSellers.length === 0}
            >
              <FaDownload className="mr-1" /> Export
            </button>
          </div>
          <DataTable
            data={topSellers.slice(0, 5)}
            columns={topSellerColumns}
            loading={loadingTopSellers}
            emptyMessage="No sales data available for the selected period"
          />
        </div>

        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Low Stock Alert</h2>
            <button
              className="text-blue hover:text-blue-700 text-sm flex items-center"
              onClick={() => exportToCSV(lowStockProducts, 'low_stock_products.csv')}
              disabled={loadingLowStock || lowStockProducts.length === 0}
            >
              <FaDownload className="mr-1" /> Export
            </button>
          </div>
          <DataTable
            data={lowStockProducts}
            columns={lowStockColumns}
            loading={loadingLowStock}
            emptyMessage="No low stock products found"
          />
        </div>
      </div>
    </div>
  ), [
    loadingTopSellers,
    loadingInventoryValue,
    loadingTimeSeries,
    loadingLowStock,
    totalSold,
    totalRevenue,
    inventoryItems,
    inventoryTotalValue,
    timeSeriesData,
    topSellers,
    lowStockProducts,
    topSellerColumns,
    lowStockColumns,
    inventoryPieData,
    activePieIndex,
    salesKPIs,
    exportToCSV
  ]);

  // Render Sales Analysis tab
  const renderSalesTab = useCallback(() => (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <MetricCard
          title="Total Revenue"
          value={loadingSalesKPIs || !salesKPIs ? "Loading..." : `$${salesKPIs.current_period.total_sales.toFixed(2)}`}
          icon={<FaChartLine />}
          loading={loadingSalesKPIs}
          trend={salesKPIs!.changes.total_sales_change > 0 ? 'up' : 'down'}
          trendValue={salesKPIs?.changes.total_sales_change || 0}
          info="Total revenue during the selected period compared to previous period of same length"
        />
        <MetricCard
          title="Order Count"
          value={loadingSalesKPIs || !salesKPIs ? "Loading..." : salesKPIs.current_period.invoice_count.toString()}
          icon={<FaChartBar />}
          loading={loadingSalesKPIs}
          trend={salesKPIs!.changes.invoice_count_change > 0 ? 'up' : 'down'}
          trendValue={salesKPIs?.changes.invoice_count_change || 0}
          info="Number of orders during the selected period compared to previous period"
        />
        <MetricCard
          title="Average Order Value"
          value={loadingSalesKPIs || !salesKPIs ? "Loading..." : `$${salesKPIs.current_period.avg_order_value.toFixed(2)}`}
          icon={<FaChartLine />}
          loading={loadingSalesKPIs}
          trend={salesKPIs!.changes.avg_order_value_change > 0 ? 'up' : 'down'}
          trendValue={salesKPIs?.changes.avg_order_value_change || 0}
          info="Average value per order during the selected period compared to previous period"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Period Comparison</h2>
            <div className="text-sm text-gray-500">
              Current: {format(startDate, 'MMM d')} - {format(endDate, 'MMM d')} vs. 
              Previous: {format(prevStartDate, 'MMM d')} - {format(prevEndDate, 'MMM d')}
            </div>
          </div>
          {loadingSalesKPIs ? (
            <ChartSkeleton />
          ) : (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={salesComparisonData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis yAxisId="left" orientation="left" stroke="#1E1E89" />
                  <YAxis yAxisId="right" orientation="right" stroke="#4C5B5C" />
                  <Tooltip content={<CustomTooltip valuePrefix="$" />} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="sales" name="Sales ($)" fill="#1E1E89" />
                  <Bar yAxisId="right" dataKey="orders" name="Order Count" fill="#4C5B5C" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Sales Trend</h2>
          </div>
          
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
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => {
                      try {
                        return format(new Date(value), 'MMM d');
                      } catch (e) {
                        return value;
                      }
                    }}
                  />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="sales"
                    name="Sales"
                    stroke="#1E1E89"
                    dot={{ r: 3 }}
                    activeDot={{ r: 8 }}
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Top Selling Products</h2>
          <button
            className="text-blue hover:text-blue-700 text-sm flex items-center"
            onClick={() => exportToCSV(topSellers, 'top_selling_products.csv')}
            disabled={loadingTopSellers || topSellers.length === 0}
          >
            <FaDownload className="mr-1" /> Export
          </button>
        </div>
        
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
                <XAxis dataKey="product_name" angle={-45} textAnchor="end" height={80} />
                <YAxis yAxisId="left" orientation="left" stroke="#1E1E89" />
                <YAxis yAxisId="right" orientation="right" stroke="#4C5B5C" />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar
                  yAxisId="left"
                  dataKey="quantity_sold"
                  name="Quantity Sold"
                  fill="#1E1E89"
                />
                <Bar
                  yAxisId="right"
                  dataKey="revenue"
                  name="Revenue ($)"
                  fill="#4C5B5C"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        
        <DataTable
          data={topSellers}
          columns={topSellerColumns}
          loading={loadingTopSellers}
          emptyMessage="No sales data available for the selected period"
        />
      </div>
    </div>
  ), [
    loadingSalesKPIs,
    loadingTopSellers,
    loadingTimeSeries,
    salesKPIs,
    topSellers,
    topSellerColumns,
    timeSeriesData,
    salesComparisonData,
    startDate,
    endDate,
    prevStartDate,
    prevEndDate,
    exportToCSV
  ]);

  // Render Inventory tab
  const renderInventoryTab = useCallback(() => (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <MetricCard
          title="Total Items"
          value={loadingInventoryValue ? "Loading..." : inventoryItems.toLocaleString()}
          icon={<FaBoxOpen />}
          loading={loadingInventoryValue}
          info="Current total number of items in inventory"
        />
        <MetricCard
          title="Total Value (Retail)"
          value={loadingInventoryValue ? "Loading..." : `$${inventoryValue?.total_value.toFixed(2) || '0.00'}`}
          icon={<FaChartBar />}
          loading={loadingInventoryValue}
          info="Current total value of inventory at retail prices"
        />
        <MetricCard
          title="Total Cost"
          value={loadingInventoryValue ? "Loading..." : `$${inventoryValue?.total_cost.toFixed(2) || '0.00'}`}
          icon={<FaChartLine />}
          loading={loadingInventoryValue}
          info="Current total cost of inventory at purchase prices"
          className={inventoryValue && inventoryValue.total_cost > 0 ? 
            (inventoryValue.total_value / inventoryValue.total_cost > 2 ? 'border-l-4 border-green-500' : '') : ''}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Inventory Distribution</h2>
            <button
              className="text-blue hover:text-blue-700 text-sm flex items-center"
              onClick={() => 
                exportToCSV(
                  inventoryValue?.by_product.map(p => ({
                    product_name: p.product_name,
                    items: p.items,
                    value: p.value,
                    cost: p.cost
                  })) || [], 
                  'inventory_distribution.csv'
                )
              }
              disabled={loadingInventoryValue || !inventoryValue}
            >
              <FaDownload className="mr-1" /> Export
            </button>
          </div>
          
          {loadingInventoryValue ? (
            <ChartSkeleton />
          ) : (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    activeIndex={activePieIndex}
                    activeShape={renderActiveShape}
                    data={inventoryPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    fill="#1E1E89"
                    dataKey="value"
                    onMouseEnter={(_, index) => setActivePieIndex(index)}
                  />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          
          <div className="mt-4">
            <h3 className="font-semibold text-sm mb-2">Top 5 Products by Quantity</h3>
            <div className="space-y-2">
              {loadingInventoryValue ? (
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                </div>
              ) : (
                inventoryValue?.by_product
                  .sort((a, b) => b.items - a.items)
                  .slice(0, 5)
                  .map((product, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span>{product.product_name}</span>
                      <span>{product.items} items (${product.value.toFixed(2)})</span>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Inventory Movement</h2>
          </div>
          
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
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => {
                      try {
                        return format(new Date(value), 'MMM d');
                      } catch (e) {
                        return value;
                      }
                    }}
                  />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="purchases"
                    name="Purchases (In)"
                    stroke="#3B7302"
                    dot={{ r: 3 }}
                    activeDot={{ r: 8 }}
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="sales"
                    name="Sales (Out)"
                    stroke="#CB3234"
                    dot={{ r: 3 }}
                    activeDot={{ r: 8 }}
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          
          <div className="mt-4">
            <h3 className="font-semibold text-sm mb-2">Inventory Movement Summary</h3>
            {loadingTimeSeries ? (
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Total Items Purchased:</span>
                  <span className="font-medium">{timeSeriesData.reduce((sum, day) => sum + day.purchases, 0)} items</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Items Sold:</span>
                  <span className="font-medium">{timeSeriesData.reduce((sum, day) => sum + day.sales, 0)} items</span>
                </div>
                <div className="flex justify-between">
                  <span>Net Inventory Change:</span>
                  <span className={`font-medium ${
                    timeSeriesData.reduce((sum, day) => sum + day.purchases - day.sales, 0) >= 0 ? 
                    'text-green-600' : 'text-red-600'
                  }`}>
                    {timeSeriesData.reduce((sum, day) => sum + day.purchases - day.sales, 0)} items
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="flex items-center text-lg font-semibold">
            <FaExclamationTriangle className="text-yellow-500 mr-2" /> 
            Low Stock Products
          </h2>
          <button
            className="text-blue hover:text-blue-700 text-sm flex items-center"
            onClick={() => exportToCSV(lowStockProducts, 'low_stock_products.csv')}
            disabled={loadingLowStock || lowStockProducts.length === 0}
          >
            <FaDownload className="mr-1" /> Export
          </button>
        </div>
        
        <DataTable
          data={lowStockProducts}
          columns={lowStockColumns}
          loading={loadingLowStock}
          emptyMessage="No low stock products found - inventory levels are healthy"
        />
        
        {!loadingLowStock && lowStockProducts.length > 0 && (
          <div className="mt-4 p-4 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800">
            <h3 className="font-bold">Restock Recommendation</h3>
            <p className="text-sm mt-1">
              You have {lowStockProducts.length} product variants with low stock levels. 
              Consider restocking these items soon to avoid stockouts.
            </p>
          </div>
        )}
      </div>
    </div>
  ), [
    loadingInventoryValue,
    loadingLowStock,
    loadingTimeSeries,
    inventoryItems,
    inventoryValue,
    lowStockProducts,
    lowStockColumns,
    inventoryPieData,
    activePieIndex,
    timeSeriesData,
    exportToCSV
  ]);

  return (
    <div className="p-6 text-gray max-w-7xl mx-auto bg-neutral-400">
      <h1 className="text-3xl font-bold mb-6">Inventory Analytics</h1>
      
      {renderDateSelector()}
      {renderTabs()}
      
      <TabPanel value={activeTab} index="overview">
        {renderOverviewTab()}
      </TabPanel>
      
      <TabPanel value={activeTab} index="sales">
        {renderSalesTab()}
      </TabPanel>
      
      <TabPanel value={activeTab} index="inventory">
        {renderInventoryTab()}
      </TabPanel>
    </div>
  );
}