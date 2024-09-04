'use client'

import React, { useState, useEffect, ChangeEvent } from 'react'
import { supabase } from '../../utils/supabase'
import {
	productFunctions,
	Product,
	ProductVariant
} from '../../utils/functions/products'
import { toast } from 'react-hot-toast'

export default function ProductsPage() {
	const [products, setProducts] = useState<Product[]>([])
	const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [showProductForm, setShowProductForm] = useState(false)
	const [searchTerm, setSearchTerm] = useState('')
	const [editingProduct, setEditingProduct] = useState<Product | null>(null)
	const [newProduct, setNewProduct] = useState<
		Omit<Product, 'id' | 'variants'>
	>({
		name: '',
		photo: '',
		price: 0,
		cost: 0
	})
	const [newVariants, setNewVariants] = useState<
		Omit<ProductVariant, 'id' | 'product_id'>[]
	>([])
	const [selectedFile, setSelectedFile] = useState<File | null>(null)

	useEffect(() => {
		fetchProducts()
	}, [])

	useEffect(() => {
		const filtered = products.filter(product =>
			product.name.toLowerCase().includes(searchTerm.toLowerCase())
		)
		setFilteredProducts(filtered)
	}, [searchTerm, products])

	const fetchProducts = async () => {
		try {
			setIsLoading(true)
			const productsData = await productFunctions.getAllProducts()
			setProducts(productsData)
			setFilteredProducts(productsData)
			setError(null)
		} catch (error) {
			console.error('Error fetching products:', error)
			setError('Failed to fetch products. Please try again later.')
		} finally {
			setIsLoading(false)
		}
	}

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

	const handleCreateProduct = async (e: React.FormEvent) => {
		e.preventDefault()
		try {
			let photoUrl = ''
			if (selectedFile) {
				photoUrl = await handleFileUpload()
			}
			const productWithPhoto = { ...newProduct, photo: photoUrl }
			await productFunctions.addProduct(productWithPhoto, newVariants)
			setShowProductForm(false)
			setNewProduct({ name: '', photo: '', price: 0, cost: 0 })
			setNewVariants([])
			setSelectedFile(null)
			fetchProducts()
			toast.success('Product created successfully')
		} catch (error) {
			console.error('Error creating product:', error)
			setError('Failed to create product. Please try again.')
			toast.error('Failed to create product')
		}
	}

	const handleUpdateProduct = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!editingProduct) return
		try {
			let photoUrl = editingProduct.photo
			if (selectedFile) {
				if (photoUrl) {
					await handleFileDelete(photoUrl)
				}
				photoUrl = await handleFileUpload()
			}
			const { id, variants, ...productData } = editingProduct
			const updatedProduct = { ...productData, photo: photoUrl }
			await productFunctions.updateProduct(id, updatedProduct, variants)
			setEditingProduct(null)
			setSelectedFile(null)
			fetchProducts()
			toast.success('Product updated successfully')
		} catch (error) {
			console.error('Error updating product:', error)
			setError('Failed to update product. Please try again.')
			toast.error('Failed to update product')
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
			} catch (error) {
				console.error('Error deleting product:', error)
				setError('Failed to delete product. Please try again.')
				toast.error('Failed to delete product')
			}
		}
	}

	const addVariant = () => {
		setNewVariants([...newVariants, { size: '', color: '', quantity: 0 }])
	}

	const updateVariant = (
		index: number,
		field: keyof Omit<ProductVariant, 'id' | 'product_id'>,
		value: string | number
	) => {
		const updatedVariants = [...newVariants]
		updatedVariants[index] = { ...updatedVariants[index], [field]: value }
		setNewVariants(updatedVariants)
	}

	if (isLoading) {
		return <div className='text-center py-10'>Loading...</div>
	}

	if (error) {
		return <div className='text-center py-10 text-red-500'>Error: {error}</div>
	}

	return (
		<div className='p-8 text-gray'>
			<h1 className='text-3xl font-bold text-center mb-8'>
				Product Management
			</h1>

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
				<form
					onSubmit={handleCreateProduct}
					className='mb-8 p-4 bg-gray rounded-lg'>
					<h2 className='text-xl text-white font-bold mb-4'>Add New Product</h2>
					<input
						type='text'
						placeholder='Name'
						value={newProduct.name}
						onChange={e =>
							setNewProduct({ ...newProduct, name: e.target.value })
						}
						className='w-full p-2 mb-2 border rounded'
						required
					/>
					<input
						type='file'
						onChange={handleFileChange}
						className='w-full p-2 mb-2 text-white border rounded'
					/>
					<input
						type='number'
						placeholder='Price '
						value={newProduct.price}
						onChange={e =>
							setNewProduct({ ...newProduct, price: parseInt(e.target.value) })
						}
						className='w-full p-2 mb-2 border rounded'
						required
					/>
					<input
						type='number'
						placeholder='Cost'
						value={newProduct.cost}
						onChange={e =>
							setNewProduct({ ...newProduct, cost: parseInt(e.target.value) })
						}
						className='w-full p-2 mb-2 border rounded'
						required
					/>
					<h3 className='text-lg text-white font-semibold mt-4 mb-2'>
						Variants
					</h3>
					{newVariants.map((variant, index) => (
						<div key={index} className='flex space-x-2 mb-2'>
							<input
								type='text'
								placeholder='Size'
								value={variant.size}
								onChange={e => updateVariant(index, 'size', e.target.value)}
								className='flex-1 p-2 border rounded'
							/>
							<input
								type='text'
								placeholder='Color'
								value={variant.color}
								onChange={e => updateVariant(index, 'color', e.target.value)}
								className='flex-1 p-2 border rounded'
							/>
							<input
								type='number'
								placeholder='Quantity'
								value={variant.quantity}
								onChange={e =>
									updateVariant(index, 'quantity', parseInt(e.target.value))
								}
								className='flex-1 p-2 border rounded'
							/>
							<button
								type='button'
								onClick={() =>
									setNewVariants(newVariants.filter((_, i) => i !== index))
								}
								className='bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded'>
								Remove
							</button>
						</div>
					))}
					<button
						type='button'
						onClick={addVariant}
						className='bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-full mt-2 mb-2'>
						+
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
						<h2 className='text-3xl text-white font-semibold mb-2'>
							{product.name}
						</h2>
						<p className='text-white text-2xl mb-4'>
							${product.price.toFixed(2)}
						</p>
						<p className='text-white text-2xl mb-4'>
							${product.cost.toFixed(2)}
						</p>
						<h3 className='font-semibold text-white mb-2'>Variants:</h3>
						<ul className='mb-4'>
							{product.variants.map((variant, index) => (
								<li key={index} className='text-sm text-white'>
									{variant.size} - {variant.color}: {variant.quantity} in stock
								</li>
							))}
						</ul>
						<div className='flex justify-between'>
							<button
								onClick={() => setEditingProduct(product)}
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
					className='fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full backdrop-blur-sm'
					id='my-modal'>
					<div className='relative top-20 mx-auto p-5 border w-3/4 shadow-lg rounded-md bg-white'>
						<h3 className='text-lg font-medium leading-6 text-gray-900 mb-4'>
							Edit Product
						</h3>
						<form
							onSubmit={handleUpdateProduct}
							className='mb-8 p-4 bg-gray border border-white rounded-lg'>
							<input
								type='text'
								placeholder='Name'
								value={editingProduct.name}
								onChange={e =>
									setEditingProduct({ ...editingProduct, name: e.target.value })
								}
								className='w-full p-2 mb-2 border rounded'
								required
							/>
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
								placeholder='Price '
								value={editingProduct.price}
								onChange={e =>
									setEditingProduct({
										...editingProduct,
										price: parseInt(e.target.value)
									})
								}
								className='w-full p-2 mb-2 border rounded'
								required
							/>
							<input
								type='number'
								placeholder='Cost (in cents)'
								value={editingProduct.cost}
								onChange={e =>
									setEditingProduct({
										...editingProduct,
										cost: parseInt(e.target.value)
									})
								}
								className='w-full p-2 mb-2 border rounded'
								required
							/>
							<h4 className='font-semibold text-white mt-4 mb-2'>Variants:</h4>
							{editingProduct.variants.map((variant, index) => (
								<div key={index} className='flex space-x-2 mb-2'>
									<input
										type='text'
										placeholder='Size'
										value={variant.size}
										onChange={e => {
											const newVariants = [...editingProduct.variants]
											newVariants[index] = {
												...newVariants[index],
												size: e.target.value
											}
											setEditingProduct({
												...editingProduct,
												variants: newVariants
											})
										}}
										className='flex-1 p-2 border rounded'
									/>
									<input
										type='text'
										placeholder='Color'
										value={variant.color}
										onChange={e => {
											const newVariants = [...editingProduct.variants]
											newVariants[index] = {
												...newVariants[index],
												color: e.target.value
											}
											setEditingProduct({
												...editingProduct,
												variants: newVariants
											})
										}}
										className='flex-1 p-2 border rounded'
									/>
									<input
										type='number'
										placeholder='Quantity'
										value={variant.quantity}
										onChange={e => {
											const newVariants = [...editingProduct.variants]
											newVariants[index] = {
												...newVariants[index],
												quantity: parseInt(e.target.value)
											}
											setEditingProduct({
												...editingProduct,
												variants: newVariants
											})
										}}
										className='flex-1 p-2 border rounded'
									/>
									<button
										type='button'
										onClick={() => {
											const newVariants = editingProduct.variants.filter(
												(_, i) => i !== index
											)
											setEditingProduct({
												...editingProduct,
												variants: newVariants
											})
										}}
										className='bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded'>
										Remove
									</button>
								</div>
							))}
							<button
								type='button'
								onClick={() => {
									const newVariants = [
										...editingProduct.variants,
										{ id: '', product_id: '', size: '', color: '', quantity: 0 }
									]
									setEditingProduct({
										...editingProduct,
										variants: newVariants
									})
								}}
								className='bg-blue hover:bg-black text-white font-bold py-2 px-4 rounded mt-2'>
								Add Variant
							</button>
							<div className='flex justify-end mt-4'>
								<button
									type='button'
									onClick={() => {
										setEditingProduct(null)
										setSelectedFile(null)
									}}
									className='bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded mr-2'>
									Cancel
								</button>
								<button
									type='submit'
									className='bg-blue hover:bg-black text-white font-bold py-2 px-4 rounded'>
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
