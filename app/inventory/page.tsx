'use client'

import React, { useState, useEffect, ChangeEvent } from 'react'
import { supabase } from '../../utils/supabase'
import { productFunctions, Product, ProductVariant } from '../../utils/functions/products'
import { toast } from 'react-hot-toast'
import imageCompression from 'browser-image-compression';
import ProductHistoryModal from '@/components/ProductHistoryModal'
import InventoryQuickStats from '@/components/InventoryQuickStats'
import Link from 'next/link'
import { 
  FaHistory, 
  FaChartBar, 
  FaPlus, 
  FaTimes, 
  FaCopy, 
  FaBoxes, 
  FaArrowUp, 
  FaArrowDown,
  FaSearch,
  FaFilter,
  FaEdit,
  FaTrash,
  FaEye,

  FaList,
  FaExclamationTriangle,
  FaCheckCircle,
  FaImage,
  FaSave,
  FaUndo
} from 'react-icons/fa'

// Enhanced variant group interface with all sizes pre-populated
interface ColorVariantGroup {
  color: string
  // Map of size to quantity with variant ID for editing
  sizeQuantities: { [size: string]: { quantity: number; id?: string } }
}

const imageCompressionOptions = {
  maxSizeMB: 0.5,
  maxWidthOrHeight: 1024,
  useWebWorker: true,
  initialQuality: 0.8,
}

const getCompressionOptions = (file: File) => {
  if (file.size > 5 * 1024 * 1024) {
    return {
      maxSizeMB: 0.3,
      maxWidthOrHeight: 800,
      initialQuality: 0.7
    };
  } else if (file.size > 2 * 1024 * 1024) {
    return {
      maxSizeMB: 0.5,
      maxWidthOrHeight: 1024,
      initialQuality: 0.8
    };
  } else {
    return {
      maxSizeMB: 1,
      maxWidthOrHeight: 1280,
      initialQuality: 0.85
    };
  }
}

const compressImage = async (file: File): Promise<File> => {
  try {
    if (!file.type.startsWith('image/') || file.size < 100 * 1024) {
      return file;
    }

    const options = {
      ...imageCompressionOptions,
      ...getCompressionOptions(file)
    };

    console.log('Original file size:', (file.size / 1024 / 1024).toFixed(2) + 'MB');
    const compressedFile = await imageCompression(file, options);
    console.log('Compressed file size:', (compressedFile.size / 1024 / 1024).toFixed(2) + 'MB');

    return new File([compressedFile], `compressed_${file.name}`, {
      type: compressedFile.type
    });
  } catch (error) {
    console.error('Error during image compression:', error);
    return file;
  }
}

export default function ProductsPage() {
  const sizeOptions = [
    'OS', 'XXS', 'XS', 'S', 'S/M', 'M', 'M/L', 'L', 'XL', '2XL', '3XL',
    '36', '38', '40', '42', '44', '46', '48', '50', '52', '54', '56', '58'
  ]

  // State variables
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showProductForm, setShowProductForm] = useState(false)
  const [isCompressing, setIsCompressing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [newProduct, setNewProduct] = useState<Omit<Product, 'id' | 'variants'>>({
    name: '',
    description: '',
    photo: '',
    price: 0,
    cost: 0,
    type: 'Stock'
  })
  
  // Enhanced color variant groups with all sizes pre-populated
  const [colorVariantGroups, setColorVariantGroups] = useState<ColorVariantGroup[]>([])
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  // State for product history modal
  const [historyModalOpen, setHistoryModalOpen] = useState(false)
  const [selectedProductHistory, setSelectedProductHistory] = useState<{
    id: string;
    name: string;
    variantId?: string;
    variantInfo?: {
      size: string;
      color: string;
    };
  } | null>(null)

  // View state for enhanced inventory display
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  const [sortBy, setSortBy] = useState<'name' | 'total_stock' | 'low_stock' | 'recent_activity'>('name')
  const [filterByStock, setFilterByStock] = useState<'all' | 'low' | 'out'>('all')

  useEffect(() => {
    fetchProducts()
  }, [])

  useEffect(() => {
    let filtered = products.filter(product =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()))
    )

    // Apply stock filter
    if (filterByStock === 'low') {
      filtered = filtered.filter(product => 
        product.variants?.some(variant => variant.quantity > 0 && variant.quantity <= 5)
      )
    } else if (filterByStock === 'out') {
      filtered = filtered.filter(product => 
        product.variants?.every(variant => variant.quantity === 0)
      )
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'total_stock':
          const totalA = a.variants?.reduce((sum, v) => sum + v.quantity, 0) || 0
          const totalB = b.variants?.reduce((sum, v) => sum + v.quantity, 0) || 0
          return totalB - totalA
        case 'low_stock':
          const lowStockA = a.variants?.filter(v => v.quantity > 0 && v.quantity <= 5).length || 0
          const lowStockB = b.variants?.filter(v => v.quantity > 0 && v.quantity <= 5).length || 0
          return lowStockB - lowStockA
        default:
          return 0
      }
    })

    setFilteredProducts(filtered)
  }, [searchTerm, products, filterByStock, sortBy])

  const fetchProducts = async () => {
    try {
      setIsLoading(true)
      const productsData = await productFunctions.getAllProducts()
      setProducts(productsData || [])
      setFilteredProducts(productsData || [])
    } catch (err: any) {
      console.error('Error fetching products:', err)
      toast.error('Failed to fetch products. Please try again later.' + err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const originalFile = e.target.files[0];

      try {
        const compressedFile = await compressImage(originalFile);
        setSelectedFile(compressedFile);

        if (compressedFile.size !== originalFile.size) {
          const originalSizeMB = (originalFile.size / 1024 / 1024).toFixed(2);
          const compressedSizeMB = (compressedFile.size / 1024 / 1024).toFixed(2);
          toast.success(
            `Image compressed: ${originalSizeMB}MB → ${compressedSizeMB}MB (${
              Math.round((1 - compressedFile.size / originalFile.size) * 100)
            }% reduction)`
          );
        }
      } catch (error) {
        console.error('Error handling file:', error);
        toast.error('Failed to process image. Using original file instead.');
        setSelectedFile(originalFile);
      }
    }
  }

  const handleFileUpload = async (): Promise<string> => {
    if (!selectedFile) {
      throw new Error('No file selected');
    }

    const timestamp = Date.now();
    const fileExtension = selectedFile.name.split('.').pop();
    const fileName = `${timestamp}_product_image.${fileExtension}`;

    const { data, error } = await supabase.storage
      .from('Products')
      .upload(fileName, selectedFile);

    if (error) {
      throw error;
    }

    const { data: publicURLData } = supabase.storage
      .from('Products')
      .getPublicUrl(fileName);

    if (!publicURLData) {
      throw new Error('Error getting public URL: No data returned');
    }

    return publicURLData.publicUrl;
  }

  const handleFileDelete = async (fileUrl: string) => {
    const decodedUrl = decodeURIComponent(fileUrl)
    const fileName = decodedUrl.split('/').pop()
    if (!fileName) {
      throw new Error('Could not extract file name from URL')
    }
    const { error: deleteError } = await supabase.storage
      .from('Products')
      .remove([fileName])
    if (deleteError) {
      throw deleteError
    }
  }

  // Create initial size quantities object with all sizes set to 0
  const createInitialSizeQuantities = (): { [size: string]: { quantity: number; id?: string } } => {
    const sizeQuantities: { [size: string]: { quantity: number; id?: string } } = {}
    sizeOptions.forEach(size => {
      sizeQuantities[size] = { quantity: 0 }
    })
    return sizeQuantities
  }

  // Flatten color variant groups into format expected by database (filter out zero quantities)
  const flattenColorVariantGroups = (): Partial<ProductVariant>[] => {
    return colorVariantGroups.flatMap(colorGroup =>
      Object.entries(colorGroup.sizeQuantities)
        .filter(([_, sizeData]) => sizeData.quantity > 0) // Only include non-zero quantities
        .map(([size, sizeData]) => ({
          ...(sizeData.id ? { id: sizeData.id } : {}),
          color: colorGroup.color,
          size,
          quantity: sizeData.quantity
        }))
    )
  }

  // Enhanced color variant group handlers
  const addColorVariantGroup = () => {
    const newGroup: ColorVariantGroup = {
      color: '',
      sizeQuantities: createInitialSizeQuantities()
    }
    setColorVariantGroups([...colorVariantGroups, newGroup])
  }

  const removeColorVariantGroup = (groupIndex: number) => {
    setColorVariantGroups(colorVariantGroups.filter((_, i) => i !== groupIndex))
  }

  const updateColorVariantGroupColor = (groupIndex: number, color: string) => {
    const updatedGroups = [...colorVariantGroups]
    updatedGroups[groupIndex].color = color
    setColorVariantGroups(updatedGroups)
  }

  const updateSizeQuantity = (groupIndex: number, size: string, quantity: number) => {
    const updatedGroups = [...colorVariantGroups]
    updatedGroups[groupIndex].sizeQuantities[size] = {
      ...updatedGroups[groupIndex].sizeQuantities[size],
      quantity: Math.max(0, quantity) // Ensure quantity is not negative
    }
    setColorVariantGroups(updatedGroups)
  }

  // Copy quantities from one color to another
  const copyQuantitiesFromColor = (fromIndex: number, toIndex: number) => {
    const updatedGroups = [...colorVariantGroups]
    const fromGroup = updatedGroups[fromIndex]
    
    Object.entries(fromGroup.sizeQuantities).forEach(([size, sizeData]) => {
      updatedGroups[toIndex].sizeQuantities[size] = {
        ...updatedGroups[toIndex].sizeQuantities[size],
        quantity: sizeData.quantity
      }
    })
    
    setColorVariantGroups(updatedGroups)
    toast.success(`Quantities copied from ${fromGroup.color} to ${updatedGroups[toIndex].color}`)
  }

  // Fill all sizes with the same quantity for a color
  const fillAllSizes = (groupIndex: number, quantity: number) => {
    const updatedGroups = [...colorVariantGroups]
    Object.keys(updatedGroups[groupIndex].sizeQuantities).forEach(size => {
      updatedGroups[groupIndex].sizeQuantities[size] = {
        ...updatedGroups[groupIndex].sizeQuantities[size],
        quantity: Math.max(0, quantity)
      }
    })
    setColorVariantGroups(updatedGroups)
  }

  // Clear all quantities for a color
  const clearAllQuantities = (groupIndex: number) => {
    const updatedGroups = [...colorVariantGroups]
    Object.keys(updatedGroups[groupIndex].sizeQuantities).forEach(size => {
      updatedGroups[groupIndex].sizeQuantities[size] = {
        ...updatedGroups[groupIndex].sizeQuantities[size],
        quantity: 0
      }
    })
    setColorVariantGroups(updatedGroups)
  }

  // Convert from database variant format to enhanced color-first format
  const groupVariantsByColor = (variants: ProductVariant[]): ColorVariantGroup[] => {
    const groups: { [color: string]: { [size: string]: { quantity: number; id?: string } } } = {}

    // Initialize all colors found in variants
    variants.forEach(variant => {
      if (!groups[variant.color]) {
        groups[variant.color] = createInitialSizeQuantities()
      }
      groups[variant.color][variant.size] = {
        quantity: variant.quantity,
        id: variant.id
      }
    })

    return Object.keys(groups).map(color => ({
      color,
      sizeQuantities: groups[color]
    }))
  }

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate that at least one color has been added
    if (colorVariantGroups.length === 0) {
      toast.error('Please add at least one color variant')
      return
    }

    // Validate that each color has a name
    const invalidColors = colorVariantGroups.filter(group => !group.color.trim())
    if (invalidColors.length > 0) {
      toast.error('Please provide names for all color variants')
      return
    }

    // Check if any variants have quantities > 0
    const hasValidVariants = colorVariantGroups.some(group => 
      Object.values(group.sizeQuantities).some(sizeData => sizeData.quantity > 0)
    )

    if (!hasValidVariants) {
      toast.error('Please add quantities for at least one size in any color')
      return
    }

    try {
      let photoUrl = ''
      if (selectedFile) {
        photoUrl = await handleFileUpload()
      }
      const productWithPhoto = { ...newProduct, photo: photoUrl }
      const newVariants:any = flattenColorVariantGroups()
      
      await productFunctions.addProduct(productWithPhoto, newVariants)
      
      // Reset form
      setShowProductForm(false)
      setNewProduct({ name: '', description: '', photo: '', price: 0, cost: 0, type: 'Stock' })
      setColorVariantGroups([])
      setSelectedFile(null)
      
      fetchProducts()
      toast.success('Product created successfully')
    } catch (err: any) {
      console.error('Error creating product:', err)
      toast.error('Failed to create product: ' + err.message)
    }
  }

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingProduct) return

    try {
      let photoUrl = editingProduct.photo || ''
      if (selectedFile) {
        if (photoUrl) {
          await handleFileDelete(photoUrl)
        }
        photoUrl = await handleFileUpload()
      }
      
      const { id, variants, ...productData } = editingProduct
      const updatedProduct = { ...productData, photo: photoUrl }
      const updatedVariants = flattenColorVariantGroups()
      
      await productFunctions.updateProduct(id, updatedProduct, updatedVariants)
      
      setEditingProduct(null)
      setSelectedFile(null)
      setColorVariantGroups([])
      
      fetchProducts()
      toast.success('Product updated successfully')
    } catch (err: any) {
      console.error('Error updating product:', err)
      toast.error('Failed to update product: ' + err.message)
    }
  }

  const handleDeleteProduct = async (id: string, photoUrl: string) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        if (photoUrl) {
          await handleFileDelete(photoUrl)
        }
        await productFunctions.deleteProduct(id)
        fetchProducts()
        toast.success('Product deleted successfully')
      } catch (err: any) {
        console.error('Error deleting product:', err)
        toast.error('Failed to delete product: ' + err.message)
      }
    }
  }

  const handleOpenProductHistory = (product: Product) => {
    setSelectedProductHistory({
      id: product.id,
      name: product.name
    })
    setHistoryModalOpen(true)
  }

  const handleOpenVariantHistory = (product: Product, variant: ProductVariant) => {
    setSelectedProductHistory({
      id: product.id,
      name: product.name,
      variantId: variant.id,
      variantInfo: {
        size: variant.size,
        color: variant.color
      }
    })
    setHistoryModalOpen(true)
  }

  // Get inventory summary stats
  const getInventoryStats = () => {
    const totalProducts = products.length
    const totalVariants = products.reduce((sum, product) => sum + (product.variants?.length || 0), 0)
    const totalStock = products.reduce((sum, product) => 
      sum + (product.variants?.reduce((variantSum, variant) => variantSum + variant.quantity, 0) || 0), 0
    )
    const lowStockVariants = products.reduce((sum, product) => 
      sum + (product.variants?.filter(variant => variant.quantity > 0 && variant.quantity <= 5).length || 0), 0
    )
    const outOfStockVariants = products.reduce((sum, product) => 
      sum + (product.variants?.filter(variant => variant.quantity === 0).length || 0), 0
    )

    return {
      totalProducts,
      totalVariants,
      totalStock,
      lowStockVariants,
      outOfStockVariants
    }
  }

  const stats = getInventoryStats()

  // Size categories for better organization
  const sizeCategories = {
    'General': ['OS'],
    'Letter Sizes': ['XXS', 'XS', 'S', 'S/M', 'M', 'M/L', 'L', 'XL', '2XL', '3XL'],
    'Numeric Sizes': ['36', '38', '40', '42', '44', '46', '48', '50', '52', '54', '56', '58']
  }

  // Render the enhanced size grid for a color group
  const renderSizeGrid = (colorGroup: ColorVariantGroup, groupIndex: number) => {
    const getTotalQuantity = () => {
      return Object.values(colorGroup.sizeQuantities).reduce((sum, sizeData) => sum + sizeData.quantity, 0)
    }

    return (
      <div className="space-y-6">
        {/* Enhanced Quick Actions Bar */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                placeholder="Qty"
                className="w-20 h-9 px-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const value = parseInt((e.target as HTMLInputElement).value) || 0
                    fillAllSizes(groupIndex, value)
                    ;(e.target as HTMLInputElement).value = ''
                  }
                }}
              />
              <button
                type="button"
                onClick={() => {
                  const input = document.querySelector(`input[placeholder="Qty"]:nth-of-type(${groupIndex + 1})`) as HTMLInputElement
                  const value = parseInt(input?.value || '0') || 0
                  fillAllSizes(groupIndex, value)
                  if (input) input.value = ''
                }}
                className="h-9 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-all duration-200 flex items-center gap-2"
              >
                <FaArrowUp className="w-3 h-3" />
                Fill All
              </button>
            </div>
            
            <button
              type="button"
              onClick={() => clearAllQuantities(groupIndex)}
              className="h-9 px-4 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-all duration-200 flex items-center gap-2"
            >
              <FaTimes className="w-3 h-3" />
              Clear
            </button>

            {colorVariantGroups.length > 1 && (
              <div className="flex items-center gap-2">
                <select
                  className="h-9 px-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                  onChange={(e) => {
                    const fromIndex = parseInt(e.target.value)
                    if (fromIndex !== groupIndex && fromIndex >= 0) {
                      copyQuantitiesFromColor(fromIndex, groupIndex)
                    }
                    e.target.value = ''
                  }}
                  defaultValue=""
                >
                  <option value="" disabled>Copy from color...</option>
                  {colorVariantGroups.map((group, idx) => 
                    idx !== groupIndex && group.color ? (
                      <option key={idx} value={idx}>{group.color}</option>
                    ) : null
                  )}
                </select>
              </div>
            )}

            <div className="ml-auto flex items-center gap-2">
              <span className="text-sm text-slate-600">Total:</span>
              <span className="text-lg font-semibold text-slate-900">{getTotalQuantity()}</span>
              <span className="text-sm text-slate-500">items</span>
            </div>
          </div>
        </div>

        {/* Enhanced Size Grid by Categories */}
        {Object.entries(sizeCategories).map(([categoryName, sizes]) => (
          <div key={categoryName} className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
              <h5 className="text-sm font-semibold text-slate-800">{categoryName}</h5>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-3">
                {sizes.map(size => (
                  <div key={size} className="flex flex-col items-center space-y-2">
                    <label className="text-xs font-medium text-slate-600 min-h-[16px]">{size}</label>
                    <input
                      type="number"
                      min="0"
                      value={colorGroup.sizeQuantities[size]?.quantity || 0}
                      onChange={(e) => updateSizeQuantity(groupIndex, size, parseInt(e.target.value) || 0)}
                      className={`w-full h-10 px-2 border rounded-lg text-center text-sm font-medium transition-all duration-200 ${
                        colorGroup.sizeQuantities[size]?.quantity > 0 
                          ? 'border-emerald-400 bg-emerald-50 text-emerald-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500' 
                          : 'border-slate-300 bg-white text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
                      }`}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Enhanced table view for inventory
  const renderTableView = () => (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {filteredProducts.length === 0 ? (
        <div className="text-center py-16">
          <FaList className="mx-auto h-16 w-16 text-slate-400 mb-4" />
          <h3 className="text-xl font-semibold text-slate-900 mb-2">No products found</h3>
          <p className="text-slate-600 mb-6 max-w-md mx-auto">
            {searchTerm || filterByStock !== 'all' 
              ? 'Try adjusting your search or filter criteria to find products.'
              : 'Get started by adding your first product to the inventory.'
            }
          </p>
          {!searchTerm && filterByStock === 'all' && (
            <button
              onClick={() => setShowProductForm(true)}
              className='inline-flex items-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-all duration-200 shadow-sm'
            >
              <FaPlus className="w-4 h-4 mr-2" />
              Add First Product
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Stock Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Variants
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {filteredProducts.map((product) => {
                const totalStock = product.variants?.reduce((sum, variant) => sum + variant.quantity, 0) || 0
                const lowStockCount = product.variants?.filter(v => v.quantity > 0 && v.quantity <= 5).length || 0
                const outOfStockCount = product.variants?.filter(v => v.quantity === 0).length || 0
                
                return (
                  <tr key={product.id} className="hover:bg-slate-50 transition-colors duration-150">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0 h-12 w-12">
                          {product.photo ? (
                            <img className="h-12 w-12 rounded-xl object-cover border border-slate-200" src={product.photo} alt={product.name} />
                          ) : (
                            <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center border border-slate-200">
                              <FaImage className="text-slate-400 w-5 h-5" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-slate-900 truncate">{product.name}</div>
                          <div className="text-xs text-slate-600 mt-1">
                            Price: <span className="font-medium text-slate-700">${product.price?.toFixed(2)}</span> • 
                            Cost: <span className="font-medium text-slate-700">${product.cost?.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        product.type === 'Stock' 
                          ? 'bg-indigo-100 text-indigo-800' 
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {product.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg font-bold text-slate-900">{totalStock}</span>
                          <span className="text-sm text-slate-500">total</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {outOfStockCount > 0 && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-xs font-medium bg-red-100 text-red-700">
                              {outOfStockCount} out
                            </span>
                          )}
                          {lowStockCount > 0 && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-xs font-medium bg-amber-100 text-amber-700">
                              {lowStockCount} low
                            </span>
                          )}
                          {outOfStockCount === 0 && lowStockCount === 0 && totalStock > 0 && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-xs font-medium bg-emerald-100 text-emerald-700">
                              <FaCheckCircle className="w-3 h-3 mr-1" />
                              Good
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-slate-600 font-medium">{product.variants?.length || 0} variants</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleOpenProductHistory(product)}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all duration-200"
                          title="View history"
                        >
                          <FaHistory className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingProduct(product)
                            if (product.variants) {
                              const grouped = groupVariantsByColor(product.variants)
                              setColorVariantGroups(grouped)
                            }
                          }}
                          className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all duration-200"
                          title="Edit product"
                        >
                          <FaEdit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(product.id, product.photo)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                          title="Delete product"
                        >
                          <FaTrash className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )

  if (isLoading) {
    return (
      <div className='min-h-screen bg-slate-50 flex items-center justify-center'>
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="text-slate-600 font-medium">Loading inventory...</p>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-slate-50 text-gray'>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Enhanced Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div>
              <h1 className='text-3xl font-bold text-slate-900'>Inventory Management</h1>
              <p className="text-slate-600 mt-1">Manage your product inventory and stock levels</p>
            </div>
            <div className="flex items-center space-x-3">
              <Link 
                href="/analytics" 
                className="inline-flex items-center px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-all duration-200 shadow-sm"
              >
                <FaChartBar className="w-4 h-4 mr-2" />
                Analytics
              </Link>
              <button
                onClick={() => setShowProductForm(!showProductForm)}
                className='inline-flex items-center px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-all duration-200 shadow-sm'
              >
                {showProductForm ? (
                  <>
                    <FaTimes className="w-4 h-4 mr-2" />
                    Cancel
                  </>
                ) : (
                  <>
                    <FaPlus className="w-4 h-4 mr-2" />
                    Add Product
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Enhanced Stats Dashboard */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total Products</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{stats.totalProducts}</p>
              </div>
              <div className="h-12 w-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                <FaBoxes className="h-6 w-6 text-indigo-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total Variants</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{stats.totalVariants}</p>
              </div>
              <div className="h-12 w-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                <FaCopy className="h-6 w-6 text-indigo-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total Stock</p>
                <p className="text-2xl font-bold text-emerald-700 mt-1">{stats.totalStock}</p>
              </div>
              <div className="h-12 w-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                <FaArrowUp className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Low Stock</p>
                <p className="text-2xl font-bold text-amber-700 mt-1">{stats.lowStockVariants}</p>
              </div>
              <div className="h-12 w-12 bg-amber-100 rounded-lg flex items-center justify-center">
                <FaExclamationTriangle className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Out of Stock</p>
                <p className="text-2xl font-bold text-red-700 mt-1">{stats.outOfStockVariants}</p>
              </div>
              <div className="h-12 w-12 bg-red-100 rounded-lg flex items-center justify-center">
                <FaArrowDown className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Controls */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 flex-1 lg:max-w-2xl">
              <div className="relative flex-1">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type='text'
                  placeholder='Search products...'
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className='w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all'
                />
              </div>
              
              <select
                value={filterByStock}
                onChange={(e) => setFilterByStock(e.target.value as any)}
                className="px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-sm text-gray"
              >
                <option value="all">All Stock</option>
                <option value="low">Low Stock</option>
                <option value="out">Out of Stock</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-sm"
              >
                <option value="name">Sort by Name</option>
                <option value="total_stock">Sort by Stock</option>
                <option value="low_stock">Sort by Low Stock</option>
              </select>
            </div>

            <div className="flex items-center space-x-2 bg-slate-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  viewMode === 'grid' 
                    ? 'bg-white text-slate-900 shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FaBoxes className="w-4 h-4 mr-2" />
                Grid
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  viewMode === 'table' 
                    ? 'bg-white text-slate-900 shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FaList className="w-4 h-4 mr-2" />
                Table
              </button>
            </div>
          </div>
        </div>

        {/* Enhanced Add Product Form */}
        {showProductForm && (
          <div className='mb-8'>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                <h2 className='text-lg font-semibold text-slate-900'>Add New Product</h2>
                <p className="text-sm text-slate-600 mt-1">Create a new product with variants and inventory</p>
              </div>
              
              <form onSubmit={handleCreateProduct} className='p-6 space-y-8'>
                {/* Basic Information Section */}
                <div>
                  <h3 className="text-base font-semibold text-slate-900 mb-4">Basic Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Product Name</label>
                      <input
                        type='text'
                        placeholder='Enter product name'
                        value={newProduct.name}
                        onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
                        className='w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all'
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Product Type</label>
                      <select
                        value={newProduct.type}
                        onChange={e => setNewProduct({ ...newProduct, type: e.target.value as 'Stock' | 'Sample' })}
                        className='w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white'
                        required
                      >
                        <option value='' disabled>Select type</option>
                        <option value='Stock'>Stock</option>
                        <option value='Sample'>Sample</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Price ($)</label>
                      <input
                        type='number'
                        placeholder='0.00'
                        value={newProduct.price}
                        onChange={e => setNewProduct({ ...newProduct, price: parseFloat(e.target.value) || 0 })}
                        className='w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all'
                        step="0.01"
                        min="0"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Cost ($)</label>
                      <input
                        type='number'
                        placeholder='0.00'
                        value={newProduct.cost}
                        onChange={e => setNewProduct({ ...newProduct, cost: parseFloat(e.target.value) || 0 })}
                        className='w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all'
                        step="0.01"
                        min="0"
                        required
                      />
                    </div>
                  </div>

                  <div className="mt-6">
                    <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
                    <textarea
                      placeholder='Product description (optional)'
                      value={newProduct.description}
                      onChange={e => setNewProduct({ ...newProduct, description: e.target.value })}
                      className='w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all'
                      rows={3}
                    />
                  </div>
                </div>

                {/* Image Upload Section */}
                <div>
                  <h3 className="text-base font-semibold text-slate-900 mb-4">Product Image</h3>
                  <div className="relative">
                    <input
                      type="file"
                      onChange={handleFileChange}
                      accept="image/*"
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                      disabled={isCompressing}
                    />
                    {isCompressing && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                          <span className="text-sm text-slate-600">Compressing image...</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Color Variants Section */}
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className='text-base font-semibold text-slate-900'>Color Variants & Inventory</h3>
                      <p className="text-sm text-slate-600 mt-1">Add different colors and their size quantities</p>
                    </div>
                    <button
                      type='button'
                      onClick={addColorVariantGroup}
                      className='inline-flex items-center px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-all duration-200 shadow-sm'
                    >
                      <FaPlus className="w-4 h-4 mr-2" />
                      Add Color
                    </button>
                  </div>

                  {colorVariantGroups.length === 0 && (
                    <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-300">
                      <FaBoxes className="mx-auto h-12 w-12 text-slate-400 mb-4" />
                      <h3 className="text-lg font-medium text-slate-900 mb-2">No colors added yet</h3>
                      <p className="text-slate-600 mb-4">Start by adding your first color variant</p>
                      <button
                        type='button'
                        onClick={addColorVariantGroup}
                        className='inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-all duration-200'
                      >
                        <FaPlus className="w-4 h-4 mr-2" />
                        Add First Color
                      </button>
                    </div>
                  )}

                  {colorVariantGroups.map((colorGroup, colorIndex) => (
                    <div key={colorIndex} className='mb-8 bg-slate-50 rounded-xl border border-slate-200 overflow-hidden'>
                      <div className='bg-white px-6 py-4 border-b border-slate-200'>
                        <div className='flex items-center justify-between'>
                          <div className="flex items-center space-x-4 flex-1">
                            <label className='text-sm font-medium text-slate-700'>Color Name:</label>
                            <input
                              type='text'
                              placeholder='e.g., Navy Blue, Crimson Red'
                              value={colorGroup.color}
                              onChange={e => updateColorVariantGroupColor(colorIndex, e.target.value)}
                              className='flex-1 max-w-md px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all'
                              required
                            />
                          </div>
                          <button
                            type='button'
                            onClick={() => removeColorVariantGroup(colorIndex)}
                            className='inline-flex items-center px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 font-medium rounded-lg transition-all duration-200'
                          >
                            <FaTimes className="w-4 h-4 mr-2" />
                            Remove
                          </button>
                        </div>
                      </div>

                      {colorGroup.color && (
                        <div className="p-6">
                          <h4 className='font-medium text-slate-900 mb-4'>
                            Size & Quantity Grid for "{colorGroup.color}"
                          </h4>
                          {renderSizeGrid(colorGroup, colorIndex)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Form Actions */}
                <div className="flex justify-end space-x-4 pt-6 border-t border-slate-200">
                  <button
                    type='button'
                    onClick={() => {
                      setShowProductForm(false)
                      setNewProduct({ name: '', description: '', photo: '', price: 0, cost: 0, type: 'Stock' })
                      setColorVariantGroups([])
                      setSelectedFile(null)
                    }}
                    className='inline-flex items-center px-6 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition-all duration-200'
                  >
                    <FaUndo className="w-4 h-4 mr-2" />
                    Cancel
                  </button>
                  <button
                    type='submit'
                    className='inline-flex items-center px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-all duration-200 shadow-sm'
                  >
                    <FaSave className="w-4 h-4 mr-2" />
                    Create Product
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Products Display */}
        {viewMode === 'table' ? renderTableView() : (
          <>
            {filteredProducts.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
                <FaBoxes className="mx-auto h-16 w-16 text-slate-400 mb-4" />
                <h3 className="text-xl font-semibold text-slate-900 mb-2">No products found</h3>
                <p className="text-slate-600 mb-6 max-w-md mx-auto">
                  {searchTerm || filterByStock !== 'all' 
                    ? 'Try adjusting your search or filter criteria to find products.'
                    : 'Get started by adding your first product to the inventory.'
                  }
                </p>
                {!searchTerm && filterByStock === 'all' && (
                  <button
                    onClick={() => setShowProductForm(true)}
                    className='inline-flex items-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-all duration-200 shadow-sm'
                  >
                    <FaPlus className="w-4 h-4 mr-2" />
                    Add First Product
                  </button>
                )}
              </div>
            ) : (
              <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'>
                {filteredProducts.map(product => {
                  const totalStock = product.variants?.reduce((sum, variant) => sum + variant.quantity, 0) || 0
                  const lowStockCount = product.variants?.filter(v => v.quantity > 0 && v.quantity <= 5).length || 0
                  const outOfStockCount = product.variants?.filter(v => v.quantity === 0).length || 0
                  
                  return (
                    <div key={product.id} className='bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-all duration-200 group flex flex-col h-full'>
                      {/* Product Image */}
                      <div className="aspect-square bg-slate-100 relative overflow-hidden">
                        {product.photo ? (
                          <img
                            src={product.photo}
                            alt={product.name}
                            className='w-full h-full object-cover group-hover:scale-105 transition-transform duration-200'
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <FaImage className="w-12 h-12 text-slate-400" />
                          </div>
                        )}
                        <div className="absolute top-3 left-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            product.type === 'Stock' 
                              ? 'bg-indigo-100 text-indigo-800' 
                              : 'bg-purple-100 text-purple-800'
                          }`}>
                            {product.type}
                          </span>
                        </div>
                      </div>
                      
                      {/* Product Info - Flexible content area */}
                      <div className="p-5 flex flex-col flex-1">
                        <div className="mb-3">
                          <h3 className='text-lg font-semibold text-slate-900 truncate' title={product.name}>
                            {product.name}
                          </h3>
                          {product.description && (
                            <p className='text-sm text-slate-600 mt-1 line-clamp-2'>{product.description}</p>
                          )}
                        </div>
                        
                        {/* Price Info */}
                        <div className="flex justify-between text-sm mb-4">
                          <div>
                            <span className="text-slate-500">Price:</span>
                            <span className="font-semibold text-slate-900 ml-1">${product.price?.toFixed(2) || '0.00'}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">Cost:</span>
                            <span className="font-semibold text-slate-900 ml-1">${product.cost?.toFixed(2) || '0.00'}</span>
                          </div>
                        </div>

                        {/* Stock Overview */}
                        <div className="mb-4 p-3 bg-slate-50 rounded-lg">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-slate-700">Stock Overview</span>
                            <span className="text-lg font-bold text-slate-900">{totalStock}</span>
                          </div>
                          
                          <div className="flex items-center space-x-2 text-xs">
                            <span className="text-slate-600">{product.variants?.length || 0} variants</span>
                            {outOfStockCount > 0 && (
                              <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded font-medium">
                                {outOfStockCount} out
                              </span>
                            )}
                            {lowStockCount > 0 && (
                              <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded font-medium">
                                {lowStockCount} low
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Variants Preview - Fixed height container */}
                        <div className="mb-4 flex-1">
                          <h4 className='text-sm font-medium text-slate-700 mb-2'>Recent Variants</h4>
                          <div className='h-16 overflow-y-auto bg-slate-50 rounded-lg p-2'>
                            {(product.variants || []).length > 0 ? (
                              <div className="space-y-1">
                                {(product.variants || []).slice(0, 4).map((variant, index) => (
                                  <div key={index} className='flex justify-between items-center text-xs bg-white px-2 py-1 rounded border border-slate-100'>
                                    <span className="text-slate-700 truncate flex-1 font-medium">
                                      {variant.color} - {variant.size}
                                    </span>
                                    <div className="flex items-center space-x-2 ml-2">
                                      <span className={`font-semibold text-xs ${
                                        variant.quantity === 0 ? 'text-red-600' : 
                                        variant.quantity <= 5 ? 'text-amber-600' : 'text-emerald-600'
                                      }`}>
                                        {variant.quantity}
                                      </span>
                                      <button
                                        onClick={() => handleOpenVariantHistory(product, variant)}
                                        className="p-0.5 text-slate-400 hover:text-indigo-600 rounded transition-colors"
                                        title="View history"
                                      >
                                        <FaHistory className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                                {(product.variants?.length || 0) > 4 && (
                                  <div className="text-xs text-slate-500 text-center py-1 font-medium">
                                    +{(product.variants?.length || 0) - 4} more variants
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="h-full flex items-center justify-center">
                                <span className="text-xs text-slate-400 font-medium">No variants available</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons - Always at bottom */}
                        <div className='flex items-center justify-between space-x-2 mt-auto'>
                          <button
                            onClick={() => {
                              setEditingProduct(product)
                              if (product.variants) {
                                const grouped = groupVariantsByColor(product.variants)
                                setColorVariantGroups(grouped)
                              }
                            }}
                            className='flex-1 inline-flex items-center justify-center px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-all duration-200'
                          >
                            <FaEdit className="w-3 h-3 mr-1.5" />
                            Edit
                          </button>

                          <button
                            onClick={() => handleOpenProductHistory(product)}
                            className='p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all duration-200'
                            title="View history"
                          >
                            <FaHistory className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleDeleteProduct(product.id, product.photo)}
                            className='p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200'
                            title="Delete product"
                          >
                            <FaTrash className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* Enhanced Edit Product Modal */}
        {editingProduct && (
          <div className='fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4'>
            <div className='bg-white rounded-xl shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden'>
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className='text-lg font-semibold text-slate-900'>Edit Product</h3>
                    <p className="text-sm text-slate-600">{editingProduct.name}</p>
                  </div>
                  <button
                    onClick={() => {
                      setEditingProduct(null)
                      setSelectedFile(null)
                      setColorVariantGroups([])
                    }}
                    className='p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-all duration-200'
                  >
                    <FaTimes className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              <div className="overflow-y-auto max-h-[calc(90vh-200px)]">
                <form onSubmit={handleUpdateProduct} className='p-6 space-y-8'>
                  {/* Basic Product Information */}
                  <div>
                    <h4 className="text-base font-semibold text-slate-900 mb-4">Basic Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Product Name</label>
                        <input
                          type='text'
                          value={editingProduct.name}
                          onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })}
                          className='w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all'
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Product Type</label>
                        <select
                          value={editingProduct.type}
                          onChange={e => setEditingProduct({ ...editingProduct, type: e.target.value as 'Stock' | 'Sample' })}
                          className='w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white'
                          required
                        >
                          <option value='Stock'>Stock</option>
                          <option value='Sample'>Sample</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Price ($)</label>
                        <input
                          type='number'
                          value={editingProduct.price}
                          onChange={e => setEditingProduct({ ...editingProduct, price: parseFloat(e.target.value) || 0 })}
                          className='w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all'
                          step="0.01"
                          min="0"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Cost ($)</label>
                        <input
                          type='number'
                          value={editingProduct.cost}
                          onChange={e => setEditingProduct({ ...editingProduct, cost: parseFloat(e.target.value) || 0 })}
                          className='w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all'
                          step="0.01"
                          min="0"
                          required
                        />
                      </div>
                    </div>

                    <div className="mt-6">
                      <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
                      <textarea
                        value={editingProduct.description || ''}
                        onChange={e => setEditingProduct({ ...editingProduct, description: e.target.value })}
                        className='w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all'
                        rows={3}
                      />
                    </div>
                  </div>

                  {/* Image Section */}
                  <div>
                    <h4 className="text-base font-semibold text-slate-900 mb-4">Product Image</h4>
                    <div className="flex items-start space-x-6">
                      <div className="flex-1">
                        <input
                          type="file"
                          onChange={handleFileChange}
                          accept="image/*"
                          className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                          disabled={isCompressing}
                        />
                        {isCompressing && (
                          <div className="mt-2 flex items-center space-x-2 text-sm text-slate-600">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                            <span>Compressing image...</span>
                          </div>
                        )}
                      </div>
                      {editingProduct.photo && (
                        <div className="flex-shrink-0">
                          <img
                            src={editingProduct.photo}
                            alt={editingProduct.name}
                            className='w-20 h-20 object-cover rounded-lg border border-slate-200'
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Color Variants Section */}
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h4 className='text-base font-semibold text-slate-900'>Color Variants & Inventory</h4>
                        <p className="text-sm text-slate-600 mt-1">Manage colors and their size quantities</p>
                      </div>
                      <button
                        type='button'
                        onClick={addColorVariantGroup}
                        className='inline-flex items-center px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-all duration-200 shadow-sm'
                      >
                        <FaPlus className="w-4 h-4 mr-2" />
                        Add Color
                      </button>
                    </div>

                    {colorVariantGroups.map((colorGroup, colorIndex) => (
                      <div key={colorIndex} className='mb-8 bg-slate-50 rounded-xl border border-slate-200 overflow-hidden'>
                        <div className='bg-white px-6 py-4 border-b border-slate-200'>
                          <div className='flex items-center justify-between'>
                            <div className="flex items-center space-x-4 flex-1">
                              <label className='text-sm font-medium text-slate-700'>Color:</label>
                              <input
                                type='text'
                                placeholder='Color name'
                                value={colorGroup.color}
                                onChange={e => updateColorVariantGroupColor(colorIndex, e.target.value)}
                                className='flex-1 max-w-md px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all'
                                required
                              />
                            </div>
                            <button
                              type='button'
                              onClick={() => removeColorVariantGroup(colorIndex)}
                              className='inline-flex items-center px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 font-medium rounded-lg transition-all duration-200'
                            >
                              <FaTimes className="w-4 h-4 mr-2" />
                              Remove
                            </button>
                          </div>
                        </div>

                        {colorGroup.color && (
                          <div className="p-6">
                            {renderSizeGrid(colorGroup, colorIndex)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </form>
              </div>

              {/* Modal Footer */}
              <div className='bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end space-x-4'>
                <button
                  type='button'
                  onClick={() => {
                    setEditingProduct(null)
                    setSelectedFile(null)
                    setColorVariantGroups([])
                  }}
                  className='inline-flex items-center px-6 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition-all duration-200'
                >
                  <FaUndo className="w-4 h-4 mr-2" />
                  Cancel
                </button>
                <button 
                  onClick={handleUpdateProduct}
                  className='inline-flex items-center px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-all duration-200 shadow-sm'
                >
                  <FaSave className="w-4 h-4 mr-2" />
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Product History Modal */}
        {historyModalOpen && selectedProductHistory && (
          <ProductHistoryModal
            isOpen={historyModalOpen}
            onClose={() => {
              setHistoryModalOpen(false);
              setSelectedProductHistory(null);
            }}
            productId={selectedProductHistory.id}
            productName={selectedProductHistory.name}
            variantId={selectedProductHistory.variantId}
            variantInfo={selectedProductHistory.variantInfo}
          />
        )}
      </div>
    </div>
  )
}