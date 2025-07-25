'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { productHistoryFunctions } from '@/utils/functions/productHistory'
import { 
  FaHistory, 
  FaUsers, 
  FaCalendar, 
  FaBox,
  FaSearch,
  FaSpinner,
  FaEye
} from 'react-icons/fa'
import { format } from 'date-fns'

interface ProductWithHistory {
  id: string
  name: string
  photo: string
  total_sold: number
  unique_customers: number
  last_sale_date: string | null
  current_stock: number
}

export default function ProductsHistoryPage() {
  const router = useRouter()
  const [products, setProducts] = useState<ProductWithHistory[]>([])
  const [filteredProducts, setFilteredProducts] = useState<ProductWithHistory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'total_sold' | 'last_sale' | 'stock'>('total_sold')
  const [showOutOfStock, setShowOutOfStock] = useState(true)

  useEffect(() => {
    fetchProductsWithHistory()
  }, [])

  useEffect(() => {
    filterAndSortProducts()
  }, [products, searchTerm, sortBy, showOutOfStock])

  const fetchProductsWithHistory = async () => {
    try {
      setIsLoading(true)
      const data = await productHistoryFunctions.getAllProductsWithHistory()
      setProducts(data)
    } catch (error) {
      console.error('Error fetching products:', error)
      toast.error('Failed to load product history')
    } finally {
      setIsLoading(false)
    }
  }

  const filterAndSortProducts = () => {
    let filtered = [...products]

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Stock filter
    if (!showOutOfStock) {
      filtered = filtered.filter(p => p.current_stock > 0)
    }

    // Sorting
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
    if (stock === 0) return { text: 'Out of Stock', color: 'text-red-600 bg-red-100' }
    if (stock < 10) return { text: 'Low Stock', color: 'text-yellow-600 bg-yellow-100' }
    return { text: 'In Stock', color: 'text-green-600 bg-green-100' }
  }

  const handleProductClick = (productId: string) => {
    router.push(`/products/history/${productId}`)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <FaSpinner className="animate-spin text-4xl text-blue mb-4 mx-auto" />
          <p className="text-neutral-600">Loading product history...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <FaHistory className="text-3xl text-blue" />
              <h1 className="text-3xl font-bold text-neutral-800">Product History</h1>
            </div>
            <button
              onClick={() => router.push('/inventory')}
              className="px-4 py-2 bg-neutral-200 text-neutral-700 rounded-lg hover:bg-neutral-300 transition-colors"
            >
              Back to Inventory
            </button>
          </div>
          
          <p className="text-neutral-600">
            Track sales history, customer purchases, and inventory movements for all products
          </p>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue focus:border-transparent"
              />
            </div>

            {/* Sort By */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue focus:border-transparent"
            >
              <option value="total_sold">Sort by Total Sold</option>
              <option value="last_sale">Sort by Last Sale</option>
              <option value="stock">Sort by Current Stock</option>
            </select>

            {/* Stock Filter */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showOutOfStock}
                onChange={(e) => setShowOutOfStock(e.target.checked)}
                className="w-4 h-4 text-blue rounded focus:ring-blue"
              />
              <span className="text-neutral-700">Show out of stock products</span>
            </label>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-neutral-600 text-sm">Total Products</p>
                <p className="text-2xl font-bold text-neutral-800">{products.length}</p>
              </div>
              <FaBox className="text-3xl text-blue opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-neutral-600 text-sm">Total Units Sold</p>
                <p className="text-2xl font-bold text-neutral-800">
                  {products.reduce((sum, p) => sum + p.total_sold, 0)}
                </p>
              </div>
              <FaHistory className="text-3xl text-green-600 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-neutral-600 text-sm">Products with Sales</p>
                <p className="text-2xl font-bold text-neutral-800">
                  {products.filter(p => p.total_sold > 0).length}
                </p>
              </div>
              <FaUsers className="text-3xl text-purple-600 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-neutral-600 text-sm">Out of Stock</p>
                <p className="text-2xl font-bold text-neutral-800">
                  {products.filter(p => p.current_stock === 0).length}
                </p>
              </div>
              <FaBox className="text-3xl text-red-600 opacity-20" />
            </div>
          </div>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => {
            const stockStatus = getStockStatus(product.current_stock)
            
            return (
              <div
                key={product.id}
                onClick={() => handleProductClick(product.id)}
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden"
              >
                {/* Product Image */}
                <div className="relative h-48 bg-neutral-100">
                  {product.photo ? (
                    <img
                      src={product.photo}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FaBox className="text-4xl text-neutral-300" />
                    </div>
                  )}
                  
                  {/* Stock Badge */}
                  <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium ${stockStatus.color}`}>
                    {stockStatus.text}
                  </div>
                </div>

                {/* Product Info */}
                <div className="p-4">
                  <h3 className="font-semibold text-lg text-neutral-800 mb-2">{product.name}</h3>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between text-neutral-600">
                      <span className="flex items-center gap-1">
                        <FaHistory className="text-xs" />
                        Total Sold
                      </span>
                      <span className="font-medium text-neutral-800">{product.total_sold} units</span>
                    </div>

                    <div className="flex items-center justify-between text-neutral-600">
                      <span className="flex items-center gap-1">
                        <FaUsers className="text-xs" />
                        Customers
                      </span>
                      <span className="font-medium text-neutral-800">{product.unique_customers}</span>
                    </div>

                    <div className="flex items-center justify-between text-neutral-600">
                      <span className="flex items-center gap-1">
                        <FaBox className="text-xs" />
                        Current Stock
                      </span>
                      <span className="font-medium text-neutral-800">{product.current_stock} units</span>
                    </div>

                    {product.last_sale_date && (
                      <div className="flex items-center justify-between text-neutral-600">
                        <span className="flex items-center gap-1">
                          <FaCalendar className="text-xs" />
                          Last Sale
                        </span>
                        <span className="font-medium text-neutral-800">
                          {format(new Date(product.last_sale_date), 'MMM d, yyyy')}
                        </span>
                      </div>
                    )}
                  </div>

                  <button className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue text-white rounded-lg hover:bg-indigo-600 transition-colors">
                    <FaEye />
                    View History
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {filteredProducts.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <FaBox className="text-6xl text-neutral-300 mx-auto mb-4" />
            <p className="text-neutral-600 text-lg">No products found matching your criteria</p>
          </div>
        )}
      </div>
    </div>
  )
}