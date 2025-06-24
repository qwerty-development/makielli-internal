'use client'

import React, { useState, useEffect, ChangeEvent } from 'react'
import { supabase } from '../../utils/supabase'
import { productFunctions, Product, ProductVariant } from '../../utils/functions/products'
import { toast } from 'react-hot-toast'
import imageCompression from 'browser-image-compression';
import ProductHistoryModal from '@/components/ProductHistoryModal'
import Link from 'next/link'
import { FaHistory, FaChartBar, FaPlus, FaTimes, FaCopy } from 'react-icons/fa'

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

  useEffect(() => {
    fetchProducts()
  }, [])

  useEffect(() => {
    const filtered = products.filter(product =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    setFilteredProducts(filtered)
  }, [searchTerm, products])

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
      const newVariants = flattenColorVariantGroups()
      
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
      <div className="space-y-4">
        {/* Quick Actions Bar */}
        <div className="flex flex-col xs:flex-row flex-wrap gap-2 mb-4 p-2 sm:p-3 bg-neutral-100 rounded-lg">
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              placeholder="Fill all"
              className="w-16 sm:w-20 p-1 border rounded text-sm"
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
                const input = document.querySelector(`input[placeholder="Fill all"]:nth-of-type(${groupIndex + 1})`) as HTMLInputElement
                const value = parseInt(input?.value || '0') || 0
                fillAllSizes(groupIndex, value)
                if (input) input.value = ''
              }}
              className="px-2 py-1 bg-blue text-white text-xs rounded hover:bg-indigo-700"
            >
              Fill All
            </button>
          </div>
          
          <button
            type="button"
            onClick={() => clearAllQuantities(groupIndex)}
            className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 w-fit"
          >
            Clear All
          </button>

          {colorVariantGroups.length > 1 && (
            <div className="flex items-center gap-2">
              <select
                className="text-xs p-1 border rounded max-w-[120px] sm:max-w-none"
                onChange={(e) => {
                  const fromIndex = parseInt(e.target.value)
                  if (fromIndex !== groupIndex && fromIndex >= 0) {
                    copyQuantitiesFromColor(fromIndex, groupIndex)
                  }
                  e.target.value = ''
                }}
                defaultValue=""
              >
                <option value="" disabled>Copy from...</option>
                {colorVariantGroups.map((group, idx) => 
                  idx !== groupIndex && group.color ? (
                    <option key={idx} value={idx}>{group.color}</option>
                  ) : null
                )}
              </select>
            </div>
          )}

          <div className="ml-0 xs:ml-auto text-sm font-medium text-neutral-600 mt-1 xs:mt-0">
            Total: {getTotalQuantity()} items
          </div>
        </div>

        {/* Size Grid by Categories */}
        {Object.entries(sizeCategories).map(([categoryName, sizes]) => (
          <div key={categoryName} className="mb-4">
            <h5 className="text-sm font-medium text-neutral-700 mb-2">{categoryName}</h5>
            <div className="grid grid-cols-3 xs:grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-1 sm:gap-2">
              {sizes.map(size => (
                <div key={size} className="flex flex-col items-center">
                  <label className="text-xs font-medium text-neutral-600 mb-1">{size}</label>
                  <input
                    type="number"
                    min="0"
                    value={colorGroup.sizeQuantities[size]?.quantity || 0}
                    onChange={(e) => updateSizeQuantity(groupIndex, size, parseInt(e.target.value) || 0)}
                    className={`w-full p-1 border rounded text-center text-sm ${
                      colorGroup.sizeQuantities[size]?.quantity > 0 
                        ? 'border-green-500 bg-green-50' 
                        : 'border-neutral-300'
                    }`}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (isLoading) {
    return <div className='text-center py-10'>Loading...</div>
  }

  return (
    <div className='p-8 text-gray'>
      <div className="flex justify-between items-center mb-8">
        <h1 className='text-3xl font-bold'>Product Management</h1>
        <div className="flex gap-4">
          <Link href="/analytics" className="bg-blue hover:bg-black text-white px-4 py-2 rounded-lg flex items-center gap-2">
            <FaChartBar />
            <span>Analytics Dashboard</span>
          </Link>
        </div>
      </div>

      <div className='flex justify-between mb-4'>
        <input
          type='text'
          placeholder='Search products...'
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className='flex-grow mr-4 p-2 border rounded'
        />
        <button
          onClick={() => setShowProductForm(!showProductForm)}
          className='bg-blue px-5 py-3 rounded-full hover:bg-black text-lg text-white font-bold'>
          {showProductForm ? '−' : '+'}
        </button>
      </div>

      {showProductForm && (
        <form onSubmit={handleCreateProduct} className='mb-8 p-6 bg-gray rounded-lg'>
          <h2 className='text-xl text-white font-bold mb-6'>Add New Product</h2>
          
          {/* Basic Product Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <input
              type='text'
              placeholder='Product Name'
              value={newProduct.name}
              onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
              className='w-full p-3 border rounded-lg'
              required
            />
            
            <select
              value={newProduct.type}
              onChange={e => setNewProduct({ ...newProduct, type: e.target.value as 'Stock' | 'Sample' })}
              className='w-full p-3 border rounded-lg'
              required
            >
              <option value='' disabled>Select Type</option>
              <option value='Stock'>Stock</option>
              <option value='Sample'>Sample</option>
            </select>

            <input
              type='number'
              placeholder='Price'
              value={newProduct.price}
              onChange={e => setNewProduct({ ...newProduct, price: parseInt(e.target.value) || 0 })}
              className='w-full p-3 border rounded-lg'
              required
            />

            <input
              type='number'
              placeholder='Cost'
              value={newProduct.cost}
              onChange={e => setNewProduct({ ...newProduct, cost: parseInt(e.target.value) || 0 })}
              className='w-full p-3 border rounded-lg'
              required
            />
          </div>

          <textarea
            placeholder='Product Description'
            value={newProduct.description}
            onChange={e => setNewProduct({ ...newProduct, description: e.target.value })}
            className='w-full p-3 mb-4 border rounded-lg'
            rows={3}
          />

          <div className="relative mb-6">
            <input
              type="file"
              onChange={handleFileChange}
              className="w-full p-3 text-white border rounded-lg"
              disabled={isCompressing}
            />
            {isCompressing && (
              <div className="absolute inset-0 flex items-center justify-center bg-neutral-700 bg-opacity-50 rounded-lg">
                <p className="text-white">Compressing image...</p>
              </div>
            )}
          </div>

          {/* Color Variants Section */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className='text-lg text-white font-semibold'>Color Variants & Inventory</h3>
              <button
                type='button'
                onClick={addColorVariantGroup}
                className='bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2'
              >
                <FaPlus /> Add Color
              </button>
            </div>

            {colorVariantGroups.length === 0 && (
              <div className="text-center py-8 text-white bg-neutral-600 rounded-lg">
                <p className="mb-2">No color variants added yet</p>
                <p className="text-sm text-neutral-300">Click "Add Color" to start adding inventory</p>
              </div>
            )}

            {colorVariantGroups.map((colorGroup, colorIndex) => (
              <div key={colorIndex} className='mb-6 p-6 border-2 border-white rounded-lg bg-neutral-700'>
                <div className='flex items-center justify-between mb-4'>
                  <div className="flex items-center gap-4 flex-1">
                    <label className='text-white font-bold text-lg'>Color:</label>
                    <input
                      type='text'
                      placeholder='Enter color name (e.g., "Red", "Navy Blue")'
                      value={colorGroup.color}
                      onChange={e => updateColorVariantGroupColor(colorIndex, e.target.value)}
                      className='flex-1 p-3 border rounded-lg text-lg'
                      required
                    />
                  </div>
                  <button
                    type='button'
                    onClick={() => removeColorVariantGroup(colorIndex)}
                    className='bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2'
                  >
                    <FaTimes /> Remove
                  </button>
                </div>

                {colorGroup.color && (
                  <div className="bg-white p-4 rounded-lg">
                    <h4 className='font-semibold mb-4 text-lg text-neutral-800'>
                      Size & Quantity Grid for {colorGroup.color}
                    </h4>
                    {renderSizeGrid(colorGroup, colorIndex)}
                  </div>
                )}
              </div>
            ))}
          </div>

          <button
            type='submit'
            className='bg-blue hover:bg-black text-white font-bold py-3 px-6 rounded-lg w-full text-lg'
          >
            Create Product
          </button>
        </form>
      )}

      {/* Product Grid */}
      <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6'>
        {filteredProducts.map(product => (
          <div key={product.id} className='bg-gray rounded-lg shadow-md p-6'>
            {product.photo && (
              <img
                src={product.photo}
                alt={product.name}
                className='w-full h-48 object-cover mb-4 rounded'
              />
            )}
            <h2 className='text-3xl text-white font-semibold mb-2'>{product.name}</h2>
            {product.description && (
              <p className='text-white text-sm mb-4 italic'>{product.description}</p>
            )}
            <p className='text-white text-lg mb-2'>Type: {product.type}</p>
            <div className="flex justify-between mb-4">
              <p className='text-white text-lg'>Price: ${product.price ? product.price.toFixed(2) : '0.00'}</p>
              <p className='text-white text-lg'>Cost: ${product.cost ? product.cost.toFixed(2) : '0.00'}</p>
            </div>

            <h3 className='font-semibold text-white mb-2'>Variants:</h3>
            <div className='mb-4 max-h-32 overflow-y-auto'>
              {(product.variants || []).map((variant, index) => (
                <div key={index} className='text-sm text-white flex justify-between items-center py-1 border-b border-neutral-500 last:border-b-0'>
                  <span>
                    {variant.color} - {variant.size}: 
                    <span className={`ml-1 font-medium ${variant.quantity <= 5 ? 'text-red-300' : 'text-green-300'}`}>
                      {variant.quantity}
                    </span>
                  </span>
                  <button
                    onClick={() => handleOpenVariantHistory(product, variant)}
                    className="text-xs bg-blue hover:bg-black p-1 rounded ml-2"
                    title="View variant history"
                  >
                    <FaHistory />
                  </button>
                </div>
              ))}
            </div>

            <div className='flex justify-between mt-4'>
              <button
                onClick={() => {
                  setEditingProduct(product)
                  if (product.variants) {
                    const grouped = groupVariantsByColor(product.variants)
                    setColorVariantGroups(grouped)
                  }
                }}
                className='bg-blue hover:bg-black text-white font-bold py-2 px-4 rounded'>
                Edit
              </button>

              <button
                onClick={() => handleOpenProductHistory(product)}
                className='bg-blue hover:bg-black text-white font-bold py-2 px-3 rounded-full'
                title="View product history"
              >
                <FaHistory />
              </button>

              <button
                onClick={() => handleDeleteProduct(product.id, product.photo)}
                className='bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded'>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Product Modal */}
      {editingProduct && (
        <div className='fixed inset-0 bg-neutral-900 bg-opacity-75 overflow-y-auto h-full w-full z-50'>
          <div className='relative top-10 mx-auto p-5 border w-11/12 max-w-6xl shadow-lg rounded-md bg-white mb-10'>
            <h3 className='text-xl font-bold leading-6 text-neutral-900 mb-6'>Edit Product: {editingProduct.name}</h3>
            
            <form onSubmit={handleUpdateProduct} className='space-y-6'>
              {/* Basic Product Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type='text'
                  placeholder='Product Name'
                  value={editingProduct.name}
                  onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  className='w-full p-3 border rounded-lg'
                  required
                />
                
                <select
                  value={editingProduct.type}
                  onChange={e => setEditingProduct({ ...editingProduct, type: e.target.value as 'Stock' | 'Sample' })}
                  className='w-full p-3 border rounded-lg'
                  required
                >
                  <option value='Stock'>Stock</option>
                  <option value='Sample'>Sample</option>
                </select>

                <input
                  type='number'
                  placeholder='Price'
                  value={editingProduct.price}
                  onChange={e => setEditingProduct({ ...editingProduct, price: parseInt(e.target.value) || 0 })}
                  className='w-full p-3 border rounded-lg'
                  required
                />

                <input
                  type='number'
                  placeholder='Cost'
                  value={editingProduct.cost}
                  onChange={e => setEditingProduct({ ...editingProduct, cost: parseInt(e.target.value) || 0 })}
                  className='w-full p-3 border rounded-lg'
                  required
                />
              </div>

              <textarea
                placeholder='Description'
                value={editingProduct.description || ''}
                onChange={e => setEditingProduct({ ...editingProduct, description: e.target.value })}
                className='w-full p-3 border rounded-lg'
                rows={3}
              />

              <div className="relative">
                <input
                  type="file"
                  onChange={handleFileChange}
                  className="w-full p-3 border rounded-lg"
                  disabled={isCompressing}
                />
                {isCompressing && (
                  <div className="absolute inset-0 flex items-center justify-center bg-neutral-100 bg-opacity-75 rounded-lg">
                    <p>Compressing image...</p>
                  </div>
                )}
              </div>

              {editingProduct.photo && (
                <img
                  src={editingProduct.photo}
                  alt={editingProduct.name}
                  className='w-32 h-32 object-cover rounded-lg'
                />
              )}

              {/* Enhanced Variants Section */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h4 className='text-lg font-semibold'>Color Variants & Inventory</h4>
                  <button
                    type='button'
                    onClick={addColorVariantGroup}
                    className='bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2'
                  >
                    <FaPlus /> Add Color
                  </button>
                </div>

                {colorVariantGroups.map((colorGroup, colorIndex) => (
                  <div key={colorIndex} className='mb-6 p-4 border-2 border-neutral-300 rounded-lg'>
                    <div className='flex items-center justify-between mb-4'>
                      <div className="flex items-center gap-4 flex-1">
                        <label className='font-bold'>Color:</label>
                        <input
                          type='text'
                          placeholder='Color name'
                          value={colorGroup.color}
                          onChange={e => updateColorVariantGroupColor(colorIndex, e.target.value)}
                          className='flex-1 p-2 border rounded-lg'
                          required
                        />
                      </div>
                      <button
                        type='button'
                        onClick={() => removeColorVariantGroup(colorIndex)}
                        className='bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2'
                      >
                        <FaTimes /> Remove
                      </button>
                    </div>

                    {colorGroup.color && renderSizeGrid(colorGroup, colorIndex)}
                  </div>
                ))}
              </div>

              <div className='flex justify-end gap-4 pt-4 border-t'>
                <button
                  type='button'
                  onClick={() => {
                    setEditingProduct(null)
                    setSelectedFile(null)
                    setColorVariantGroups([])
                  }}
                  className='bg-neutral-500 hover:bg-neutral-600 text-white font-bold py-3 px-6 rounded-lg'
                >
                  Cancel
                </button>
                <button 
                  type='submit' 
                  className='bg-blue hover:bg-black text-white font-bold py-3 px-6 rounded-lg'
                >
                  Save Changes
                </button>
              </div>
            </form>
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
  )
}