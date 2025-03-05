'use client'

import React, { useState, useEffect, ChangeEvent } from 'react'
import { supabase } from '../../utils/supabase'
import { productFunctions, Product, ProductVariant } from '../../utils/functions/products'
import { toast } from 'react-hot-toast'
import { set } from 'lodash'

// Define a group for variants by size.
interface VariantGroup {
  size: string
  // Now we include the optional id so that existing variants are preserved.
  variants: { id?: string; color: string; quantity: number }[]
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
  '46'
]

  // State variables
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showProductForm, setShowProductForm] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [newProduct, setNewProduct] = useState<Omit<Product, 'id' | 'variants'>>({
    name: '',
    photo: '',
    price: 0,
    cost: 0,
    type: 'Stock'
  })
  // Instead of listing individual variants, we now group them by size.
  const [variantGroups, setVariantGroups] = useState<VariantGroup[]>([])
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  // Fetch products when component mounts
  useEffect(() => {
    fetchProducts()
  }, [])

  // Filter products based on search term
  useEffect(() => {
    const filtered = products.filter(product =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase())
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

  // File change and upload functions
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0])
    }
  }

  const handleFileUpload = async (): Promise<string> => {
    if (!selectedFile) {
      throw new Error('No file selected')
    }
    const fileName = `${Date.now()}_${selectedFile.name}`
    const { data, error } = await supabase.storage
      .from('Products')
      .upload(fileName, selectedFile)
    if (error) {
      throw error
    }
    const { data: publicURLData } = supabase.storage
      .from('Products')
      .getPublicUrl(fileName)
    if (!publicURLData) {
      throw new Error('Error getting public URL: No data returned')
    }
    return publicURLData.publicUrl
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

  // Flatten variant groups into a flat array.
  // IMPORTANT: We now include the variant id if present.
  const flattenVariantGroups = (): Partial<ProductVariant>[] => {
    return variantGroups.flatMap(group =>
      group.variants.map(variant => ({
        ...(variant.id ? { id: variant.id } : {}),
        size: group.size,
        color: variant.color,
        quantity: variant.quantity
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
      const newVariants:any = flattenVariantGroups()
      await productFunctions.addProduct(productWithPhoto, newVariants)
      setShowProductForm(false)
      setNewProduct({ name: '', photo: '', price: 0, cost: 0, type: 'Stock' })
      setVariantGroups([])
      setSelectedFile(null)
      fetchProducts()
      toast.success('Product created successfully')
    } catch (err:any) {
      console.error('Error creating product:', err)

      toast.error('Failed to create product'+err.message)
    }
          setNewProduct({ name: '', photo: '', price: 0, cost: 0, type: 'Stock' })
      setVariantGroups([])
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
      const updatedVariants = flattenVariantGroups()
      await productFunctions.updateProduct(id, updatedProduct, updatedVariants)
      setEditingProduct(null)
      setSelectedFile(null)
      fetchProducts()
      toast.success('Product updated successfully')
    } catch (err:any) {
      console.error('Error updating product:', err)

      toast.error('Failed to update product'+err.message)
    }
    setEditingProduct(null)
    setSelectedFile(null)
    setVariantGroups([])
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

        toast.error('Failed to delete product'+err.message)
      }
    }
  }

  // --- Variant Group Handlers ---

  const addVariantGroup = () => {
    // Create a new variant group with default size "M" and empty variant list.
    setVariantGroups([...variantGroups, { size: 'M', variants: [] }])
  }

  const removeVariantGroup = (groupIndex: number) => {
    setVariantGroups(variantGroups.filter((_, i) => i !== groupIndex))
  }

  const updateVariantGroupSize = (groupIndex: number, size: string) => {
    const updatedGroups = [...variantGroups]
    updatedGroups[groupIndex].size = size
    setVariantGroups(updatedGroups)
  }

  const addColorVariantToGroup = (groupIndex: number) => {
    const updatedGroups = [...variantGroups]
    updatedGroups[groupIndex].variants.push({ color: '', quantity: 0 })
    setVariantGroups(updatedGroups)
  }

  const updateColorVariant = (
    groupIndex: number,
    variantIndex: number,
    field: 'color' | 'quantity',
    value: string | number
  ) => {
    const updatedGroups = [...variantGroups]
    updatedGroups[groupIndex].variants[variantIndex] = {
      ...updatedGroups[groupIndex].variants[variantIndex],
      [field]: value
    }
    setVariantGroups(updatedGroups)
  }

  const removeColorVariantFromGroup = (groupIndex: number, variantIndex: number) => {
    const updatedGroups = [...variantGroups]
    updatedGroups[groupIndex].variants = updatedGroups[groupIndex].variants.filter((_, i) => i !== variantIndex)
    setVariantGroups(updatedGroups)
  }

  // When editing a product, we group its variants by size and preserve the variant id.
  const groupVariantsBySize = (variants: ProductVariant[]): VariantGroup[] => {
    const groups: { [size: string]: { id?: string; color: string; quantity: number }[] } = {}
    variants.forEach(variant => {
      if (!groups[variant.size]) {
        groups[variant.size] = []
      }
      groups[variant.size].push({ id: variant.id, color: variant.color, quantity: variant.quantity })
    })
    return Object.keys(groups).map(size => ({
      size,
      variants: groups[size]
    }))
  }



  // --- Rendering ---

  if (isLoading) {
    return <div className='text-center py-10'>Loading...</div>
  }



  return (
    <div className='p-8 text-gray'>
      <h1 className='text-3xl font-bold text-center mb-8'>Product Management</h1>

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
          <input
            type='file'
            onChange={handleFileChange}
            className='w-full p-2 mb-2 text-white border rounded'
          />
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
          <h3 className='text-lg text-white font-semibold mt-4 mb-2'>Variant Groups</h3>
          {variantGroups.map((group, groupIndex) => (
            <div key={groupIndex} className='mb-4 p-2 border rounded'>
              <div className='flex items-center justify-between mb-2'>
                <label className='text-white font-bold'>Size:</label>
                <select
                  value={group.size}
                  onChange={e => updateVariantGroupSize(groupIndex, e.target.value)}
                  className='p-2 border rounded ml-2'>
                  {sizeOptions.map(size => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
                <button
                  type='button'
                  onClick={() => removeVariantGroup(groupIndex)}
                  className='bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-2 rounded ml-4'>
                  Remove Group
                </button>
              </div>
              <div>
                {group.variants.map((variant, variantIndex) => (
                  <div key={variantIndex} className='flex space-x-2 mb-2'>
                    <input
                      type='text'
                      placeholder='Color'
                      value={variant.color}
                      onChange={e => updateColorVariant(groupIndex, variantIndex, 'color', e.target.value)}
                      className='flex-1 p-2 border rounded'
                      required
                    />
                    <input
                      type='number'
                      placeholder='Quantity'
                      value={variant.quantity}
                      onChange={e => updateColorVariant(groupIndex, variantIndex, 'quantity', parseInt(e.target.value) || 0)}
                      className='flex-1 p-2 border rounded'
                      required
                    />
                    <button
                      type='button'
                      onClick={() => removeColorVariantFromGroup(groupIndex, variantIndex)}
                      className='bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-2 rounded'>
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type='button'
                  onClick={() => addColorVariantToGroup(groupIndex)}
                  className='bg-green-500 hover:bg-green-600 text-white font-bold py-1 px-2 rounded'>
                  Add Color
                </button>
              </div>
            </div>
          ))}
          <button
            type='button'
            onClick={addVariantGroup}
            className='bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-full mt-2 mb-2'>
            Add Variant Group
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
            <p className='text-white text-2xl mb-4'>Type: {product.type}</p>
            <p className='text-white text-2xl mb-4'>
              ${product.price ? product.price.toFixed(2) : '0.00'}
            </p>
            <p className='text-white text-2xl mb-4'>
              ${product.cost ? product.cost.toFixed(2) : '0.00'}
            </p>
            <h3 className='font-semibold text-white mb-2'>Variants:</h3>
            <ul className='mb-4'>
              {(product.variants || []).map((variant, index) => (
                <li key={index} className='text-sm text-white'>
                  {variant.size} - {variant.color}: {variant.quantity} in stock
                </li>
              ))}
            </ul>
            <div className='flex justify-between'>
              <button
                onClick={() => {
                  setEditingProduct(product)
                  // When editing, group existing variants by size and preserve their IDs.
                  if (product.variants) {
                    const grouped = groupVariantsBySize(product.variants)
                    setVariantGroups(grouped)
                  }
                }}
                className='bg-blue hover:bg-black text-white font-bold py-2 px-4 rounded'>
                Edit
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
          className='fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full'
          id='edit-modal'>
          <div className='relative top-20 mx-auto p-5 border w-3/4 shadow-lg rounded-md bg-white'>
            <h3 className='text-lg font-medium leading-6 text-gray-900 mb-4'>Edit Product</h3>
            <form onSubmit={handleUpdateProduct} className='mb-8 p-4 bg-gray border border-white rounded-lg'>
              <input
                type='text'
                placeholder='Name'
                value={editingProduct.name}
                onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })}
                className='w-full p-2 mb-2 border rounded'
                required
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
              <input
                type='file'
                onChange={handleFileChange}
                className='w-full p-2 mb-2 border text-white rounded'
              />
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
                  {variantGroups.map((group, groupIndex) => (
                    <div key={groupIndex} className='mb-4 p-2 border rounded'>
                      <div className='flex items-center justify-between mb-2'>
                        <label className='text-white font-bold'>Size:</label>
                        <select
                          value={group.size}
                          onChange={e => updateVariantGroupSize(groupIndex, e.target.value)}
                          className='p-2 border rounded ml-2'>
                          {sizeOptions.map(size => (
                            <option key={size} value={size}>
                              {size}
                            </option>
                          ))}
                        </select>
                        <button
                          type='button'
                          onClick={() => removeVariantGroup(groupIndex)}
                          className='bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-2 rounded ml-4'>
                          Remove Group
                        </button>
                      </div>
                      <div>
                        {group.variants.map((variant, variantIndex) => (
                          <div key={variantIndex} className='flex space-x-2 mb-2'>
                            <input
                              type='text'
                              placeholder='Color'
                              value={variant.color}
                              onChange={e => updateColorVariant(groupIndex, variantIndex, 'color', e.target.value)}
                              className='flex-1 p-2 border rounded'
                              required
                            />
                            <input
                              type='number'
                              placeholder='Quantity'
                              value={variant.quantity}
                              onChange={e => updateColorVariant(groupIndex, variantIndex, 'quantity', parseInt(e.target.value) || 0)}
                              className='flex-1 p-2 border rounded'
                              required
                            />
                            <button
                              type='button'
                              onClick={() => removeColorVariantFromGroup(groupIndex, variantIndex)}
                              className='bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-2 rounded'>
                              Remove
                            </button>
                          </div>
                        ))}
                        <button
                          type='button'
                          onClick={() => addColorVariantToGroup(groupIndex)}
                          className='bg-green-500 hover:bg-green-600 text-white font-bold py-1 px-2 rounded'>
                          Add Color
                        </button>
                      </div>
                    </div>
                  ))}
                  <button
                    type='button'
                    onClick={addVariantGroup}
                    className='bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-full mt-2 mb-2'>
                    Add Variant Group
                  </button>
                </div>
              )}
              <div className='flex justify-end mt-4'>
                <button
                  type='button'
                  onClick={() => {
                    setEditingProduct(null)
                    setSelectedFile(null)
                    setVariantGroups([])
                  }}
                  className='bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded mr-2'>
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

    </div>
  )
}
