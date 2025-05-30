'use client'

import React, { useState, useEffect, ChangeEvent } from 'react'
import { supabase } from '../../utils/supabase'
import { productFunctions, Product, ProductVariant } from '../../utils/functions/products'
import { toast } from 'react-hot-toast'
import imageCompression from 'browser-image-compression';
import ProductHistoryModal from '@/components/ProductHistoryModal'
import Link from 'next/link'
import { FaHistory, FaChartBar } from 'react-icons/fa'

// Redefine the variant group interface to focus on color first
interface ColorVariantGroup {
  color: string
  // For each color, we track quantities for different sizes with optional variant id
  sizeQuantities: { size: string; quantity: number; id?: string }[]
}

const imageCompressionOptions = {
  maxSizeMB: 0.5,          // Maximum file size in MB
  maxWidthOrHeight: 1024,  // Maximum width/height in pixels
  useWebWorker: true,      // Use web worker for better UI performance
  initialQuality: 0.8,     // Initial quality setting (0 to 1)
}


const getCompressionOptions = (file: File) => {
  // Adjust compression settings based on file size
  if (file.size > 5 * 1024 * 1024) {
    // For very large files (>5MB), use stronger compression
    return {
      maxSizeMB: 0.3,
      maxWidthOrHeight: 800,
      initialQuality: 0.7
    };
  } else if (file.size > 2 * 1024 * 1024) {
    // For medium files (2-5MB)
    return {
      maxSizeMB: 0.5,
      maxWidthOrHeight: 1024,
      initialQuality: 0.8
    };
  } else {
    // For smaller files (<2MB), use lighter compression
    return {
      maxSizeMB: 1,
      maxWidthOrHeight: 1280,
      initialQuality: 0.85
    };
  }
}


const compressImage = async (file: File): Promise<File> => {
  try {
    // Skip compression for small images or non-image files
    if (!file.type.startsWith('image/') || file.size < 100 * 1024) {
      return file;
    }

    // Get dynamic compression options based on file size
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
    'OS',
    'XXS',
    'XS',
    'S',
    'S/M',
    'M',
    'M/L',
    'L',
    'XL',
    '2XL',
    '3XL',
    '36',
    '38',
    '40',
    '42',
    '44',
    '46',
    '50',
    '52',
    '54',
    '56',
    '58'
  ]

  // State variables
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showProductForm, setShowProductForm] = useState(false)
  const [isCompressing, setIsCompressing] = useState(false);
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
  // Using color-first approach for variant groups
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

  // Fetch products when component mounts
  useEffect(() => {
    fetchProducts()
  }, [])

  // Filter products based on search term
  useEffect(() => {
    const filtered = products.filter(product =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    setFilteredProducts(filtered)
  }, [searchTerm, products])

  // Fetch products from the backend.
  const fetchProducts = async () => {
    try {
      setIsLoading(true)
      const productsData = await productFunctions.getAllProducts()
      setProducts(productsData || [])
      setFilteredProducts(productsData || [])

    } catch (err:any) {
      console.error('Error fetching products:', err)
      toast.error('Failed to fetch products. Please try again later.'+err.message)
    } finally {
      setIsLoading(false)
    }
  }

const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
  if (e.target.files && e.target.files.length > 0) {
    const originalFile = e.target.files[0];

    // Show loading state if needed
    // setIsCompressing(true);

    try {
      // Compress the image
      const compressedFile = await compressImage(originalFile);
      setSelectedFile(compressedFile);

      // Optional: Update UI to show compression results
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
    } finally {
      // Clear loading state if needed
      // setIsCompressing(false);
    }
  }
}

const handleFileUpload = async (): Promise<string> => {
  if (!selectedFile) {
    throw new Error('No file selected');
  }

  // Generate a unique filename with timestamp
  const timestamp = Date.now();
  const fileExtension = selectedFile.name.split('.').pop();
  const fileName = `${timestamp}_product_image.${fileExtension}`;

  // Upload the compressed file
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

  // Flatten color variant groups into format expected by database
  const flattenColorVariantGroups = (): Partial<ProductVariant>[] => {
    return colorVariantGroups.flatMap(colorGroup =>
      colorGroup.sizeQuantities.map(sizeQty => ({
        ...(sizeQty.id ? { id: sizeQty.id } : {}),
        color: colorGroup.color,
        size: sizeQty.size,
        quantity: sizeQty.quantity
      }))
    )
  }

  // Create new product handler
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      let photoUrl = ''
      if (selectedFile) {
        photoUrl = await handleFileUpload()
      }
      const productWithPhoto = { ...newProduct, photo: photoUrl }
      const newVariants:any = flattenColorVariantGroups()
      await productFunctions.addProduct(productWithPhoto, newVariants)
      setShowProductForm(false)
      setNewProduct({ name: '', description: '', photo: '', price: 0, cost: 0, type: 'Stock' })
      setColorVariantGroups([])
      setSelectedFile(null)
      fetchProducts()
      toast.success('Product created successfully')
    } catch (err:any) {
      console.error('Error creating product:', err)
      toast.error('Failed to create product: '+err.message)
    }
    setNewProduct({ name: '', description: '', photo: '', price: 0, cost: 0, type: 'Stock' })
    setColorVariantGroups([])
    setSelectedFile(null)
  }

  // Update product handler (for editing)
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
      fetchProducts()
      toast.success('Product updated successfully')
    } catch (err:any) {
      console.error('Error updating product:', err)
      toast.error('Failed to update product: '+err.message)
    }
    setEditingProduct(null)
    setSelectedFile(null)
    setColorVariantGroups([])
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
      } catch (err:any) {
        console.error('Error deleting product:', err)
        toast.error('Failed to delete product: '+err.message)
      }
    }
  }

  // --- Color Variant Group Handlers ---

  const addColorVariantGroup = () => {
    // Create a new color group with empty size quantities
    setColorVariantGroups([...colorVariantGroups, { color: '', sizeQuantities: [] }])
  }

  const removeColorVariantGroup = (groupIndex: number) => {
    setColorVariantGroups(colorVariantGroups.filter((_, i) => i !== groupIndex))
  }

  const updateColorVariantGroupColor = (groupIndex: number, color: string) => {
    const updatedGroups = [...colorVariantGroups]
    updatedGroups[groupIndex].color = color
    setColorVariantGroups(updatedGroups)
  }

  const addSizeToColorVariant = (groupIndex: number, size: string = sizeOptions[0]) => {
    const updatedGroups = [...colorVariantGroups]
    // Check if this size already exists for this color
    const sizeExists = updatedGroups[groupIndex].sizeQuantities.some(sq => sq.size === size)
    if (!sizeExists) {
      updatedGroups[groupIndex].sizeQuantities.push({ size, quantity: 0 })
      setColorVariantGroups(updatedGroups)
    } else {
      toast.error(`Size ${size} already exists for this color`)
    }
  }

  const updateSizeQuantity = (
    groupIndex: number,
    sizeIndex: number,
    field: 'size' | 'quantity',
    value: string | number
  ) => {
    const updatedGroups = [...colorVariantGroups]

    if (field === 'size') {
      // Check if the new size already exists in this color group
      const sizeExists = updatedGroups[groupIndex].sizeQuantities.some(
        (sq, idx) => idx !== sizeIndex && sq.size === value
      )

      if (sizeExists) {
        toast.error(`Size ${value} already exists for this color`)
        return
      }
    }

    updatedGroups[groupIndex].sizeQuantities[sizeIndex] = {
      ...updatedGroups[groupIndex].sizeQuantities[sizeIndex],
      [field]: value
    }
    setColorVariantGroups(updatedGroups)
  }

  const removeSizeFromColorVariant = (groupIndex: number, sizeIndex: number) => {
    const updatedGroups = [...colorVariantGroups]
    updatedGroups[groupIndex].sizeQuantities = updatedGroups[groupIndex].sizeQuantities.filter(
      (_, i) => i !== sizeIndex
    )
    setColorVariantGroups(updatedGroups)
  }

  // Convert from database variant format to color-first format
  const groupVariantsByColor = (variants: ProductVariant[]): ColorVariantGroup[] => {
    const groups: { [color: string]: { size: string; quantity: number; id?: string }[] } = {}

    variants.forEach(variant => {
      if (!groups[variant.color]) {
        groups[variant.color] = []
      }
      groups[variant.color].push({ id: variant.id, size: variant.size, quantity: variant.quantity })
    })

    return Object.keys(groups).map(color => ({
      color,
      sizeQuantities: groups[color]
    }))
  }

  // Handle opening history modal for a product
  const handleOpenProductHistory = (product: Product) => {
    setSelectedProductHistory({
      id: product.id,
      name: product.name
    })
    setHistoryModalOpen(true)
  }

  // Handle opening history modal for a specific variant
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

  // --- Rendering ---

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
        <form onSubmit={handleCreateProduct} className='mb-8 p-4 bg-gray rounded-lg'>
          <h2 className='text-xl text-white font-bold mb-4'>Add New Product</h2>
          <input
            type='text'
            placeholder='Name'
            value={newProduct.name}
            onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
            className='w-full p-2 mb-2 border rounded'
            required
          />
          <textarea
            placeholder='Description'
            value={newProduct.description}
            onChange={e => setNewProduct({ ...newProduct, description: e.target.value })}
            className='w-full p-2 mb-2 border rounded'
            rows={3}
          />
    <div className="relative">
  <input
    type="file"
    onChange={handleFileChange}
    className="w-full p-2 mb-2 text-white border rounded"
    disabled={isCompressing}
  />
  {isCompressing && (
    <div className="absolute inset-0 flex items-center justify-center bg-neutral-700 bg-opacity-50 rounded">
      <p className="text-white">Compressing image...</p>
    </div>
  )}
</div>
          <select
            value={newProduct.type}
            onChange={e =>
              setNewProduct({ ...newProduct, type: e.target.value as 'Stock' | 'Sample' })
            }
            className='w-full p-2 mb-2 border rounded'
            required>
            <option value='' disabled>
              Select Type
            </option>
            <option value='Stock'>Stock</option>
            <option value='Sample'>Sample</option>
          </select>
          <input
            type='number'
            placeholder='Price'
            value={newProduct.price}
            onChange={e => setNewProduct({ ...newProduct, price: parseInt(e.target.value) || 0 })}
            className='w-full p-2 mb-2 border rounded'
            required
          />
          <input
            type='number'
            placeholder='Cost'
            value={newProduct.cost}
            onChange={e => setNewProduct({ ...newProduct, cost: parseInt(e.target.value) || 0 })}
            className='w-full p-2 mb-2 border rounded'
            required
          />
          <h3 className='text-lg text-white font-semibold mt-4 mb-2'>Color Variants</h3>
          {colorVariantGroups.map((colorGroup, colorIndex) => (
            <div key={colorIndex} className='mb-4 p-4 border border-white rounded'>
              <div className='flex items-center justify-between mb-2'>
                <label className='text-white font-bold'>Color:</label>
                <input
                  type='text'
                  placeholder='Color name'
                  value={colorGroup.color}
                  onChange={e => updateColorVariantGroupColor(colorIndex, e.target.value)}
                  className='p-2 border rounded ml-2 flex-grow'
                  required
                />
                <button
                  type='button'
                  onClick={() => removeColorVariantGroup(colorIndex)}
                  className='bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-2 rounded ml-4'>
                  Remove Color
                </button>
              </div>

              <div className='mt-3 mb-3'>
                <h4 className='text-white font-semibold mb-2'>Sizes for {colorGroup.color || 'this color'}</h4>
                {colorGroup.sizeQuantities.map((sizeQty, sizeIndex) => (
                  <div key={sizeIndex} className='flex space-x-2 mb-2'>
                    <select
                      value={sizeQty.size}
                      onChange={e => updateSizeQuantity(colorIndex, sizeIndex, 'size', e.target.value)}
                      className='p-2 border rounded w-1/3'
                      required
                    >
                      {sizeOptions.map(size => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                    <input
                      type='number'
                      placeholder='Quantity'
                      value={sizeQty.quantity}
                      onChange={e => updateSizeQuantity(colorIndex, sizeIndex, 'quantity', parseInt(e.target.value) || 0)}
                      className='flex-1 p-2 border rounded'
                      required
                    />
                    <button
                      type='button'
                      onClick={() => removeSizeFromColorVariant(colorIndex, sizeIndex)}
                      className='bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-2 rounded'>
                      Remove
                    </button>
                  </div>
                ))}

                <button
                  type='button'
                  onClick={() => addSizeToColorVariant(colorIndex)}
                  className='bg-green-500 hover:bg-green-600 text-white font-bold py-1 px-2 rounded mt-2'>
                  Add Size
                </button>
              </div>
            </div>
          ))}

          <button
            type='button'
            onClick={addColorVariantGroup}
            className='bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-full mt-2 mb-4'>
            Add Color Variant
          </button>

          <button
            type='submit'
            className='bg-blue hover:bg-black text-white font-bold py-2 px-4 rounded mt-4 block w-full'>
            Create Product
          </button>
        </form>
      )}

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
            <ul className='mb-4'>
              {(product.variants || []).map((variant, index) => (
                <li key={index} className='text-sm text-white flex justify-between items-center py-1'>
                  <span>
                    {variant.color} - {variant.size}: {variant.quantity} in stock
                  </span>
                  <button
                    onClick={() => handleOpenVariantHistory(product, variant)}
                    className="text-xs bg-blue hover:bg-black p-1 rounded ml-2"
                    title="View variant history"
                  >
                    <FaHistory />
                  </button>
                </li>
              ))}
            </ul>

            <div className='flex justify-between mt-4'>
              <button
                onClick={() => {
                  setEditingProduct(product)
                  // When editing, group existing variants by color and preserve their IDs
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

      {editingProduct && (
        <div
          className='fixed inset-0 bg-neutral-600 bg-opacity-50 overflow-y-auto h-full w-full'
          id='edit-modal'>
          <div className='relative top-20 mx-auto p-5 border w-3/4 shadow-lg rounded-md bg-white'>
            <h3 className='text-lg font-medium leading-6 text-neutral-900 mb-4'>Edit Product</h3>
            <form onSubmit={handleUpdateProduct} className='mb-8 p-4 bg-gray border border-white rounded-lg'>
              <input
                type='text'
                placeholder='Name'
                value={editingProduct.name}
                onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })}
                className='w-full p-2 mb-2 border rounded'
                required
              />
              <textarea
                placeholder='Description'
                value={editingProduct.description || ''}
                onChange={e => setEditingProduct({ ...editingProduct, description: e.target.value })}
                className='w-full p-2 mb-2 border rounded'
                rows={3}
              />
              <select
                value={editingProduct.type}
                onChange={e =>
                  setEditingProduct({ ...editingProduct, type: e.target.value as 'Stock' | 'Sample' })
                }
                className='w-full p-2 mb-2 border rounded'
                required>
                <option value='Stock'>Stock</option>
                <option value='Sample'>Sample</option>
              </select>
          <div className="relative">
  <input
    type="file"
    onChange={handleFileChange}
    className="w-full p-2 mb-2 text-white border rounded"
    disabled={isCompressing}
  />
  {isCompressing && (
    <div className="absolute inset-0 flex items-center justify-center bg-neutral-700 bg-opacity-50 rounded">
      <p className="text-white">Compressing image...</p>
    </div>
  )}
</div>
              {editingProduct.photo && (
                <img
                  src={editingProduct.photo}
                  alt={editingProduct.name}
                  className='w-full h-48 object-cover mb-4 rounded'
                />
              )}
              <input
                type='number'
                placeholder='Price'
                value={editingProduct.price}
                onChange={e =>
                  setEditingProduct({ ...editingProduct, price: parseInt(e.target.value) || 0 })
                }
                className='w-full p-2 mb-2 border rounded'
                required
              />
              <input
                type='number'
                placeholder='Cost'
                value={editingProduct.cost}
                onChange={e =>
                  setEditingProduct({ ...editingProduct, cost: parseInt(e.target.value) || 0 })
                }
                className='w-full p-2 mb-2 border rounded'
                required
              />
              <h4 className='font-semibold text-white mt-4 mb-2'>Variants</h4>
              {editingProduct.variants && (
                <div className='mb-4'>
                  {colorVariantGroups.map((colorGroup, colorIndex) => (
                    <div key={colorIndex} className='mb-4 p-4 border border-white rounded'>
                      <div className='flex items-center justify-between mb-2'>
                        <label className='text-white font-bold'>Color:</label>
                        <input
                          type='text'
                          placeholder='Color name'
                          value={colorGroup.color}
                          onChange={e => updateColorVariantGroupColor(colorIndex, e.target.value)}
                          className='p-2 border rounded ml-2 flex-grow'
                          required
                        />
                        <button
                          type='button'
                          onClick={() => removeColorVariantGroup(colorIndex)}
                          className='bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-2 rounded ml-4'>
                          Remove Color
                        </button>
                      </div>

                      <div className='mt-3 mb-3'>
                        <h4 className='text-white font-semibold mb-2'>Sizes for {colorGroup.color || 'this color'}</h4>
                        {colorGroup.sizeQuantities.map((sizeQty, sizeIndex) => (
                          <div key={sizeIndex} className='flex space-x-2 mb-2'>
                            <select
                              value={sizeQty.size}
                              onChange={e => updateSizeQuantity(colorIndex, sizeIndex, 'size', e.target.value)}
                              className='p-2 border rounded w-1/3'
                              required
                            >
                              {sizeOptions.map(size => (
                                <option key={size} value={size}>
                                  {size}
                                </option>
                              ))}
                            </select>
                            <input
                              type='number'
                              placeholder='Quantity'
                              value={sizeQty.quantity}
                              onChange={e => updateSizeQuantity(colorIndex, sizeIndex, 'quantity', parseInt(e.target.value) || 0)}
                              className='flex-1 p-2 border rounded'
                              required
                            />
                            <button
                              type='button'
                              onClick={() => removeSizeFromColorVariant(colorIndex, sizeIndex)}
                              className='bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-2 rounded'>
                              Remove
                            </button>
                          </div>
                        ))}

                        <button
                          type='button'
                          onClick={() => addSizeToColorVariant(colorIndex)}
                          className='bg-green-500 hover:bg-green-600 text-white font-bold py-1 px-2 rounded mt-2'>
                          Add Size
                        </button>
                      </div>
                    </div>
                  ))}

                  <button
                    type='button'
                    onClick={addColorVariantGroup}
                    className='bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-full mt-2 mb-4'>
                    Add Color Variant
                  </button>
                </div>
              )}
              <div className='flex justify-end mt-4'>
                <button
                  type='button'
                  onClick={() => {
                    setEditingProduct(null)
                    setSelectedFile(null)
                    setColorVariantGroups([])
                  }}
                  className='bg-neutral-500 hover:bg-neutral-600 text-white font-bold py-2 px-4 rounded mr-2'>
                  Cancel
                </button>
                <button type='submit' className='bg-blue hover:bg-black text-white font-bold py-2 px-4 rounded'>
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