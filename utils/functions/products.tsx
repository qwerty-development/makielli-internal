import { supabase } from '../supabase'
import { analyticsFunctions } from './product-history'

export interface Product {
	id: string
	name: string
	photo: string
	price: number
	cost: number
	type: 'Stock' | 'Sample'
	description: string
	variants: ProductVariant[]
}

export interface ProductVariant {
	id: string
	product_id: string
	size: string
	color: string
	quantity: number
}

// Input validation helpers
const validateProduct = (product: Partial<Product>): void => {
	if (!product.name?.trim()) {
		throw new Error('Product name is required')
	}
	if (product.price !== undefined && product.price < 0) {
		throw new Error('Price cannot be negative')
	}
	if (product.cost !== undefined && product.cost < 0) {
		throw new Error('Cost cannot be negative')
	}
}

const validateVariant = (variant: Partial<ProductVariant>): void => {
	if (!variant.size?.trim()) {
		throw new Error('Variant size is required')
	}
	if (!variant.color?.trim()) {
		throw new Error('Variant color is required')
	}
	// NOTE: Negative quantities are now allowed for inventory adjustments
}

export const productFunctions = {
	/**
	 * Add a new product with variants and comprehensive tracking
	 */
	async addProduct(
		product: Omit<Product, 'id' | 'variants'>,
		variants: Omit<ProductVariant, 'id' | 'product_id'>[]
	): Promise<Product> {
		// Validate inputs
		validateProduct(product)
		variants.forEach(validateVariant)

		try {
			// Create the product
			const { data: newProduct, error: productError } = await supabase
				.from('Products')
				.insert([product])
				.select()
				.single()

			if (productError) throw productError

			// Track product creation
			await analyticsFunctions.recordProductChange({
				productId: newProduct.id,
				changeType: 'creation',
				sourceType: 'manual',
				notes: `Created product: ${product.name}`
			})

			// Track initial price and cost
			await analyticsFunctions.recordProductChange({
				productId: newProduct.id,
				changeType: 'price',
				fieldName: 'price',
				oldValue: 0,
				newValue: product.price,
				sourceType: 'manual',
				notes: 'Initial price set'
			})

			await analyticsFunctions.recordProductChange({
				productId: newProduct.id,
				changeType: 'price',
				fieldName: 'cost',
				oldValue: 0,
				newValue: product.cost,
				sourceType: 'manual',
				notes: 'Initial cost set'
			})

			// Create variants - only those that are provided (already filtered by active in frontend)
			const { data: newVariants, error: variantError } = await supabase
				.from('ProductVariants')
				.insert(
					variants.map(variant => ({ ...variant, product_id: newProduct.id }))
				)
				.select()

			if (variantError) throw variantError

			// Track variant creation and initial inventory
			for (const variant of newVariants) {
				// Track variant addition
				await analyticsFunctions.recordProductChange({
					productId: newProduct.id,
					variantId: variant.id,
					changeType: 'variant',
					newValue: 'added',
					sourceType: 'manual',
					notes: `Added variant: ${variant.size} - ${variant.color}`
				})

				// Track initial inventory for any quantity (including 0 and negative for adjustments)
				await analyticsFunctions.recordProductChange({
					productId: newProduct.id,
					variantId: variant.id,
					changeType: 'inventory',
					quantityChange: variant.quantity,
					oldValue: 0,
					newValue: variant.quantity,
					sourceType: 'manual',
					sourceReference: 'Initial stock',
					notes: variant.quantity === 0 ? 'Initial variant with zero stock' : 
						   variant.quantity < 0 ? 'Initial variant with negative adjustment' : 'Initial inventory'
				})
			}

			return { ...newProduct, variants: newVariants }
		} catch (error) {
			console.error('Error adding product:', error)
			throw error
		}
	},

	/**
	 * Get all products with variants
	 */
	async getAllProducts(): Promise<Product[]> {
		const { data, error } = await supabase
			.from('Products')
			.select(`
				*,
				variants:ProductVariants(*)
			`)
			.order('name')

		if (error) throw error
		return data || []
	},

	/**
	 * Get single product by ID with variants
	 */
	async getProduct(id: string): Promise<Product> {
		const { data, error } = await supabase
			.from('Products')
			.select(`
				*,
				variants:ProductVariants(*)
			`)
			.eq('id', id)
			.single()

		if (error) throw error
		return data
	},

	/**
	 * Legacy function name for compatibility
	 */
	async getProductById(id: string): Promise<Product | null> {
		try {
			return await this.getProduct(id)
		} catch (error) {
			console.error('Error getting product by ID:', error)
			return null
		}
	},

	/**
	 * FIXED: Update product with improved variant management - never deletes variants automatically
	 */
	async updateProduct(
		id: string,
		updates: Partial<Omit<Product, 'id' | 'variants'>>,
		variants: Partial<ProductVariant>[]
	): Promise<Product> {
		// Validate inputs
		if (updates) validateProduct(updates)
		variants.forEach(variant => {
			if (variant.size || variant.color) validateVariant(variant)
		})

		try {
			// Get current product data for comparison
			const { data: currentProduct, error: fetchError } = await supabase
				.from('Products')
				.select('*')
				.eq('id', id)
				.single()

			if (fetchError) throw fetchError

			// Track product detail changes
			if (updates.name && updates.name !== currentProduct.name) {
				await analyticsFunctions.recordProductChange({
					productId: id,
					changeType: 'details',
					fieldName: 'name',
					oldValue: currentProduct.name,
					newValue: updates.name,
					sourceType: 'manual'
				})
			}

			if (updates.description !== undefined && updates.description !== currentProduct.description) {
				await analyticsFunctions.recordProductChange({
					productId: id,
					changeType: 'details',
					fieldName: 'description',
					oldValue: currentProduct.description || '',
					newValue: updates.description || '',
					sourceType: 'manual'
				})
			}

			if (updates.price !== undefined && updates.price !== currentProduct.price) {
				await analyticsFunctions.recordProductChange({
					productId: id,
					changeType: 'price',
					fieldName: 'price',
					oldValue: currentProduct.price,
					newValue: updates.price,
					sourceType: 'manual'
				})
			}

			if (updates.cost !== undefined && updates.cost !== currentProduct.cost) {
				await analyticsFunctions.recordProductChange({
					productId: id,
					changeType: 'price',
					fieldName: 'cost',
					oldValue: currentProduct.cost || 0,
					newValue: updates.cost,
					sourceType: 'manual'
				})
			}

			if (updates.type && updates.type !== currentProduct.type) {
				await analyticsFunctions.recordProductChange({
					productId: id,
					changeType: 'details',
					fieldName: 'type',
					oldValue: currentProduct.type,
					newValue: updates.type,
					sourceType: 'manual'
				})
			}

			if (updates.photo && updates.photo !== currentProduct.photo) {
				await analyticsFunctions.recordProductChange({
					productId: id,
					changeType: 'details',
					fieldName: 'photo',
					oldValue: 'Previous photo',
					newValue: 'New photo uploaded',
					sourceType: 'manual'
				})
			}

			// Update the product
			const { data: updatedProduct, error: productError } = await supabase
				.from('Products')
				.update(updates)
				.eq('id', id)
				.select()
				.single()

			if (productError) throw productError

			// FIXED: Process variant updates - only handle provided variants, never auto-delete
			for (const variant of variants) {
				if (variant.id) {
					// Update existing variant
					const { data: originalVariant, error: fetchVariantError } = await supabase
						.from('ProductVariants')
						.select('*')
						.eq('id', variant.id)
						.single()
					
					if (fetchVariantError) {
						console.warn(`Could not fetch original variant ${variant.id}:`, fetchVariantError)
						continue
					}

					// Track size/color changes
					if (variant.size && variant.size !== originalVariant.size) {
						await analyticsFunctions.recordProductChange({
							productId: id,
							variantId: variant.id,
							changeType: 'details',
							fieldName: 'size',
							oldValue: originalVariant.size,
							newValue: variant.size,
							sourceType: 'manual'
						})
					}

					if (variant.color && variant.color !== originalVariant.color) {
						await analyticsFunctions.recordProductChange({
							productId: id,
							variantId: variant.id,
							changeType: 'details',
							fieldName: 'color',
							oldValue: originalVariant.color,
							newValue: variant.color,
							sourceType: 'manual'
						})
					}

					// Track quantity changes (including zero and negative quantities)
					if (variant.quantity !== undefined && variant.quantity !== originalVariant.quantity) {
						const quantityChange = variant.quantity - originalVariant.quantity
						await analyticsFunctions.recordProductChange({
							productId: id,
							variantId: variant.id,
							changeType: 'inventory',
							quantityChange: quantityChange,
							oldValue: originalVariant.quantity,
							newValue: variant.quantity,
							sourceType: 'adjustment',
							sourceReference: 'Manual inventory adjustment',
							notes: variant.quantity === 0 ? 'Set quantity to zero (variant kept)' :
								   variant.quantity < 0 ? 'Negative quantity adjustment' : 'Manual inventory adjustment'
						})
					}

					// Update the variant - always update, even with zero quantity
					const updateData: any = {}
					if (variant.size !== undefined) updateData.size = variant.size
					if (variant.color !== undefined) updateData.color = variant.color
					if (variant.quantity !== undefined) updateData.quantity = variant.quantity

					const { error } = await supabase
						.from('ProductVariants')
						.update(updateData)
						.eq('id', variant.id)

					if (error) throw error
				} else {
					// Create new variant only if explicitly provided (frontend filters by active)
					if (variant.size && variant.color) {
						// Check if variant already exists by size and color
						const { data: existingVariant } = await supabase
							.from('ProductVariants')
							.select('*')
							.eq('product_id', id)
							.eq('size', variant.size)
							.eq('color', variant.color)
							.maybeSingle()

						if (existingVariant) {
							// Update existing variant quantity
							if (variant.quantity !== undefined && variant.quantity !== existingVariant.quantity) {
								const quantityChange = variant.quantity - existingVariant.quantity
								await analyticsFunctions.recordProductChange({
									productId: id,
									variantId: existingVariant.id,
									changeType: 'inventory',
									quantityChange: quantityChange,
									oldValue: existingVariant.quantity,
									newValue: variant.quantity,
									sourceType: 'adjustment',
									sourceReference: 'Manual inventory adjustment',
									notes: 'Manual inventory adjustment'
								})

								const { error } = await supabase
									.from('ProductVariants')
									.update({ quantity: variant.quantity })
									.eq('id', existingVariant.id)

								if (error) throw error
							}
						} else {
							// Create new variant
							const { data: newVariant, error } = await supabase
								.from('ProductVariants')
								.insert({
									size: variant.size,
									color: variant.color,
									quantity: variant.quantity || 0,
									product_id: id
								})
								.select()
								.single()

							if (error) throw error

							// Track new variant
							await analyticsFunctions.recordProductChange({
								productId: id,
								variantId: newVariant.id,
								changeType: 'variant',
								newValue: 'added',
								sourceType: 'manual',
								notes: `Added variant: ${variant.size} - ${variant.color}`
							})

							// Track initial inventory (even if zero)
							await analyticsFunctions.recordProductChange({
								productId: id,
								variantId: newVariant.id,
								changeType: 'inventory',
								quantityChange: variant.quantity || 0,
								oldValue: 0,
								newValue: variant.quantity || 0,
								sourceType: 'manual',
								sourceReference: 'Initial stock for new variant',
								notes: (variant.quantity || 0) === 0 ? 'New variant with zero stock' : 
									   (variant.quantity || 0) < 0 ? 'New variant with negative adjustment' : 'Initial stock for new variant'
							})
						}
					}
				}
			}

			// IMPORTANT: Never automatically delete variants
			// Variants should only be deleted explicitly through the deleteVariant function
			// This ensures that setting quantity to 0 doesn't delete the variant

			// Return updated product with fresh variants
			return await this.getProduct(id)
		} catch (error) {
			console.error('Error updating product:', error)
			throw error
		}
	},

	/**
	 * Delete a product with comprehensive tracking
	 */
	async deleteProduct(id: string): Promise<void> {
		try {
			// Get product info for tracking
			const { data: product, error: fetchError } = await supabase
				.from('Products')
				.select(`
					*,
					variants:ProductVariants(*)
				`)
				.eq('id', id)
				.single()

			if (fetchError) throw fetchError

			// Track deletion of variants and their inventory
			for (const variant of product.variants || []) {
				if (variant.quantity !== 0) { // Track any non-zero quantity removal
					await analyticsFunctions.recordProductChange({
						productId: id,
						variantId: variant.id,
						changeType: 'inventory',
						quantityChange: -variant.quantity,
						oldValue: variant.quantity,
						newValue: 0,
						sourceType: 'adjustment',
						sourceReference: 'Stock removed due to product deletion',
						notes: 'Stock removed due to product deletion'
					})
				}

				await analyticsFunctions.recordProductChange({
					productId: id,
					variantId: variant.id,
					changeType: 'variant',
					newValue: 'removed',
					sourceType: 'manual',
					notes: `Variant deleted: ${variant.size} - ${variant.color}`
				})
			}

			// Track product deletion
			await analyticsFunctions.recordProductChange({
				productId: id,
				changeType: 'deletion',
				sourceType: 'manual',
				notes: `Deleted product: ${product.name}`
			})

			// Delete the product (variants should cascade delete)
			const { error } = await supabase.from('Products').delete().eq('id', id)
			if (error) throw error
		} catch (error) {
			console.error('Error deleting product:', error)
			throw error
		}
	},

	/**
	 * Delete a specific product variant
	 */
	async deleteVariant(variantId: string): Promise<void> {
		try {
			// Get variant details for tracking
			const { data: variant, error: fetchError } = await supabase
				.from('ProductVariants')
				.select('product_id, size, color, quantity')
				.eq('id', variantId)
				.single()

			if (fetchError) throw fetchError

			// Track inventory removal if there was stock
			if (variant.quantity !== 0) {
				await analyticsFunctions.recordProductChange({
					productId: variant.product_id,
					variantId: variantId,
					changeType: 'inventory',
					quantityChange: -variant.quantity,
					oldValue: variant.quantity,
					newValue: 0,
					sourceType: 'adjustment',
					sourceReference: 'Stock removed due to variant deletion',
					notes: 'Stock removed due to variant deletion'
				})
			}

			// Track variant removal
			await analyticsFunctions.recordProductChange({
				productId: variant.product_id,
				variantId: variantId,
				changeType: 'variant',
				newValue: 'removed',
				sourceType: 'manual',
				notes: `Removed variant: ${variant.size} - ${variant.color}`
			})

			const { error } = await supabase
				.from('ProductVariants')
				.delete()
				.eq('id', variantId)

			if (error) throw error
		} catch (error) {
			console.error('Error deleting variant:', error)
			throw error
		}
	},

	/**
	 * Update product variant quantity with comprehensive tracking and validation
	 */
	async updateProductVariantQuantity(
		variantId: string,
		quantityChange: number,
		sourceType: 'client_invoice' | 'supplier_invoice' | 'adjustment' | 'manual' | 'quotation' | 'return' = 'manual',
		sourceId: string = '',
		notes: string = ''
	): Promise<ProductVariant> {
		try {
			// Get current variant data
			const { data: variant, error: fetchError } = await supabase
				.from('ProductVariants')
				.select('*, product_id')
				.eq('id', variantId)
				.single()

			if (fetchError || !variant) {
				throw new Error(`Variant not found: ${variantId}`)
			}

			const oldQuantity = variant.quantity
			const newQuantity = oldQuantity + quantityChange

			// Allow negative quantities for manual adjustments and specific source types
			// Only prevent negative inventory for sales transactions
			if (newQuantity < 0 && sourceType === 'client_invoice') {
				throw new Error(`Insufficient inventory. Current: ${oldQuantity}, Requested change: ${quantityChange}`)
			}

			// Always use direct update - NEVER delete variants for zero quantity
			const { data, error } = await supabase
				.from('ProductVariants')
				.update({ quantity: newQuantity })
				.eq('id', variantId)
				.select()
				.single()

			if (error) throw error
			const updatedVariant = data

			// Build source reference
			let sourceReference = ''
			switch (sourceType) {
				case 'client_invoice':
					sourceReference = `Client Invoice #${sourceId}`
					break
				case 'supplier_invoice':
					sourceReference = `Supplier Invoice #${sourceId}`
					break
				case 'quotation':
					sourceReference = `Quotation #${sourceId}`
					break
				case 'return':
					sourceReference = `Return #${sourceId}`
					break
				default:
					sourceReference = sourceType.charAt(0).toUpperCase() + sourceType.slice(1)
			}

			// Record the change in analytics
			await analyticsFunctions.recordProductChange({
				productId: variant.product_id,
				variantId: variantId,
				changeType: 'inventory',
				quantityChange: quantityChange,
				oldValue: oldQuantity,
				newValue: newQuantity,
				sourceType: sourceType as any,
				sourceId: sourceId,
				sourceReference: sourceReference,
				notes: newQuantity === 0 ? 'Quantity set to zero (variant preserved)' : notes
			})

			return updatedVariant
		} catch (error) {
			console.error('Error updating product variant quantity:', error)
			throw error
		}
	},

	/**
	 * FIXED: Set variant quantity directly (useful for inventory adjustments)
	 */
	async setProductVariantQuantity(
		variantId: string,
		newQuantity: number,
		sourceType: 'client_invoice' | 'supplier_invoice' | 'adjustment' | 'manual' | 'quotation' | 'return' = 'manual',
		sourceId: string = '',
		notes: string = ''
	): Promise<ProductVariant> {
		try {
			// Get current variant data
			const { data: variant, error: fetchError } = await supabase
				.from('ProductVariants')
				.select('*, product_id')
				.eq('id', variantId)
				.single()

			if (fetchError || !variant) {
				throw new Error(`Variant not found: ${variantId}`)
			}

			const oldQuantity = variant.quantity
			const quantityChange = newQuantity - oldQuantity

			// Allow zero and negative quantities - NEVER delete the variant
			const { data, error } = await supabase
				.from('ProductVariants')
				.update({ quantity: newQuantity })
				.eq('id', variantId)
				.select()
				.single()

			if (error) throw error
			const updatedVariant = data

			// Build source reference
			let sourceReference = ''
			switch (sourceType) {
				case 'client_invoice':
					sourceReference = `Client Invoice #${sourceId}`
					break
				case 'supplier_invoice':
					sourceReference = `Supplier Invoice #${sourceId}`
					break
				case 'quotation':
					sourceReference = `Quotation #${sourceId}`
					break
				case 'return':
					sourceReference = `Return #${sourceId}`
					break
				default:
					sourceReference = sourceType.charAt(0).toUpperCase() + sourceType.slice(1)
			}

			// Record the change in analytics
			await analyticsFunctions.recordProductChange({
				productId: variant.product_id,
				variantId: variantId,
				changeType: 'inventory',
				quantityChange: quantityChange,
				oldValue: oldQuantity,
				newValue: newQuantity,
				sourceType: sourceType as any,
				sourceId: sourceId,
				sourceReference: sourceReference,
				notes: newQuantity === 0 ? 'Quantity set to zero (variant preserved)' : 
					   newQuantity < 0 ? 'Negative quantity set (adjustment)' : notes
			})

			return updatedVariant
		} catch (error) {
			console.error('Error setting product variant quantity:', error)
			throw error
		}
	},

	/**
	 * Batch update multiple variant quantities (for performance)
	 */
	async batchUpdateVariantQuantities(
		updates: Array<{
			variantId: string
			quantityChange: number
			sourceType?: 'client_invoice' | 'supplier_invoice' | 'adjustment' | 'manual' | 'quotation' | 'return'
			sourceId?: string
			notes?: string
		}>
	): Promise<ProductVariant[]> {
		const results: ProductVariant[] = []
		
		for (const update of updates) {
			try {
				const result = await this.updateProductVariantQuantity(
					update.variantId,
					update.quantityChange,
					update.sourceType || 'manual',
					update.sourceId || '',
					update.notes || ''
				)
				results.push(result)
			} catch (error) {
				console.error(`Error updating variant ${update.variantId}:`, error)
				throw error
			}
		}
		
		return results
	},

	/**
	 * Get low stock variants (for inventory management)
	 */
	async getLowStockVariants(threshold: number = 5): Promise<(ProductVariant & { product_name: string })[]> {
		const { data, error } = await supabase
			.from('ProductVariants')
			.select(`
				*,
				product:Products(name)
			`)
			.lte('quantity', threshold)
			.gte('quantity', 0) // Only include positive quantities for low stock alerts
			.order('quantity', { ascending: true })

		if (error) throw error

		return data.map(variant => ({
			...variant,
			product_name: variant.product.name
		}))
	},

	/**
	 * Get out of stock variants
	 */
	async getOutOfStockVariants(): Promise<(ProductVariant & { product_name: string })[]> {
		const { data, error } = await supabase
			.from('ProductVariants')
			.select(`
				*,
				product:Products(name)
			`)
			.eq('quantity', 0)
			.order('product_id')

		if (error) throw error

		return data.map(variant => ({
			...variant,
			product_name: variant.product.name
		}))
	},

	/**
	 * Get variants with negative quantities (adjustments)
	 */
	async getNegativeQuantityVariants(): Promise<(ProductVariant & { product_name: string })[]> {
		const { data, error } = await supabase
			.from('ProductVariants')
			.select(`
				*,
				product:Products(name)
			`)
			.lt('quantity', 0)
			.order('quantity', { ascending: true })

		if (error) throw error

		return data.map(variant => ({
			...variant,
			product_name: variant.product.name
		}))
	},

	/**
	 * Get product analytics summary
	 */
	async getProductAnalytics(productId: string): Promise<{
		totalVariants: number
		totalStock: number
		totalStockValue: number
		averagePrice: number
		recentChanges: number
		zeroStockVariants: number
		negativeStockVariants: number
	}> {
		const product = await this.getProduct(productId)
		
		const totalVariants = product.variants.length
		const totalStock = product.variants.reduce((sum, v) => sum + v.quantity, 0)
		const totalStockValue = totalStock * (product.cost || 0)
		const averagePrice = product.price || 0
		const zeroStockVariants = product.variants.filter(v => v.quantity === 0).length
		const negativeStockVariants = product.variants.filter(v => v.quantity < 0).length

		// Get recent changes (last 30 days)
		const thirtyDaysAgo = new Date()
		thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

		const { data: recentChanges, error } = await supabase
			.from('ProductHistory')
			.select('id')
			.eq('product_id', productId)
			.gte('created_at', thirtyDaysAgo.toISOString())

		if (error) console.error('Error fetching recent changes:', error)

		return {
			totalVariants,
			totalStock,
			totalStockValue,
			averagePrice,
			recentChanges: recentChanges?.length || 0,
			zeroStockVariants,
			negativeStockVariants
		}
	},

	/**
	 * Get variant details with product information for invoices and quotations
	 */
	async getVariantWithProductDetails(variantId: string): Promise<{
		id: string
		size: string
		color: string
		quantity: number
		product: {
			id: string
			name: string
			price: number
			photo: string | null
		}
	} | null> {
		try {
			const { data, error } = await supabase
				.from('ProductVariants')
				.select(`
					id,
					size,
					color,
					quantity,
					Products (
						id,
						name,
						price,
						photo
					)
				`)
				.eq('id', variantId)
				.single()

			if (error) {
				console.error('Error fetching variant details:', error)
				return null
			}

			// Transform the data to match expected structure
			return {
				...data,
				product: Array.isArray(data.Products) ? data.Products[0] : data.Products
			} as any
		} catch (error) {
			console.error('Error fetching variant details:', error)
			return null
		}
	},

	/**
	 * Get multiple variant details with product information for invoices and quotations
	 */
	async getVariantsWithProductDetails(variantIds: string[]): Promise<Array<{
		id: string
		size: string
		color: string
		quantity: number
		product: {
			id: string
			name: string
			price: number
			photo: string | null
		}
	}>> {
		try {
			const { data, error } = await supabase
				.from('ProductVariants')
				.select(`
					id,
					size,
					color,
					quantity,
					Products (
						id,
						name,
						price,
						photo
					)
				`)
				.in('id', variantIds)

			if (error) {
				console.error('Error fetching variants details:', error)
				return []
			}

			// Transform the data to match expected structure
			return (data || []).map(item => ({
				...item,
				product: Array.isArray(item.Products) ? item.Products[0] : item.Products
			})) as any
		} catch (error) {
			console.error('Error fetching variants details:', error)
			return []
		}
	}
}