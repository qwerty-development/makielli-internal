import { supabase } from '../supabase'
import { analyticsFunctions } from './product-history'

export interface Product {
	id: string
	name: string
	photo: string
	price: number
	cost: number
	type: 'Stock' | 'Sample',
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

export const productFunctions = {
	async addProduct(
		product: Omit<Product, 'id' | 'variants'>,
		variants: Omit<ProductVariant, 'id' | 'product_id'>[]
	): Promise<Product> {
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

		// Track initial details
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

			// Track initial inventory if quantity > 0
			if (variant.quantity > 0) {
				await analyticsFunctions.recordProductChange({
					productId: newProduct.id,
					variantId: variant.id,
					changeType: 'inventory',
					quantityChange: variant.quantity,
					oldValue: 0,
					newValue: variant.quantity,
					sourceType: 'manual',
					sourceReference: 'Initial stock',
					notes: 'Initial stock'
				})
			}
		}

		return { ...newProduct, variants: newVariants }
	},

	async updateProduct(
		id: string,
		updates: Partial<Omit<Product, 'variants'>>,
		variants: Partial<ProductVariant>[]
	): Promise<Product> {
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

		// Fetch existing variants
		const { data: existingVariants, error: fetchVariantsError } = await supabase
			.from('ProductVariants')
			.select('*')
			.eq('product_id', id)

		if (fetchVariantsError) throw fetchVariantsError

		// Process variant updates
		for (const variant of variants) {
			if (variant.id) {
				// Update existing variant
				const originalVariant = existingVariants.find(v => v.id === variant.id)
				
				if (originalVariant) {
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

					// Track quantity changes
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
							notes: 'Manual inventory adjustment'
						})
					}

					// Update the variant
					const { error } = await supabase
						.from('ProductVariants')
						.update({
							size: variant.size,
							color: variant.color,
							quantity: variant.quantity
						})
						.eq('id', variant.id)

					if (error) throw error
				}
			} else {
				// Check if variant already exists
				const { data: existingVariant } = await supabase
					.from('ProductVariants')
					.select('*')
					.eq('product_id', id)
					.eq('size', variant.size)
					.eq('color', variant.color)
					.maybeSingle()

				if (existingVariant) {
					// Update existing variant
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

					// Track initial inventory
					if (variant.quantity && variant.quantity > 0) {
						await analyticsFunctions.recordProductChange({
							productId: id,
							variantId: newVariant.id,
							changeType: 'inventory',
							quantityChange: variant.quantity,
							oldValue: 0,
							newValue: variant.quantity,
							sourceType: 'manual',
							sourceReference: 'Initial stock for new variant',
							notes: 'Initial stock for new variant'
						})
					}
				}
			}
		}

		// Handle removed variants
		const variantIdsToKeep = variants.filter(v => v.id).map(v => v.id)
		const variantsToRemove = existingVariants.filter(v => !variantIdsToKeep.includes(v.id))

		for (const variantToRemove of variantsToRemove) {
			// Track variant removal
			await analyticsFunctions.recordProductChange({
				productId: id,
				variantId: variantToRemove.id,
				changeType: 'variant',
				newValue: 'removed',
				sourceType: 'manual',
				notes: `Removed variant: ${variantToRemove.size} - ${variantToRemove.color}`
			})

			// Track inventory removal if there was stock
			if (variantToRemove.quantity > 0) {
				await analyticsFunctions.recordProductChange({
					productId: id,
					variantId: variantToRemove.id,
					changeType: 'inventory',
					quantityChange: -variantToRemove.quantity,
					oldValue: variantToRemove.quantity,
					newValue: 0,
					sourceType: 'adjustment',
					sourceReference: 'Stock removed due to variant deletion',
					notes: 'Stock removed due to variant deletion'
				})
			}

			const { error } = await supabase
				.from('ProductVariants')
				.delete()
				.eq('id', variantToRemove.id)

			if (error) throw error
		}

		// Fetch updated variants
		const { data: updatedVariants, error: variantError } = await supabase
			.from('ProductVariants')
			.select('*')
			.eq('product_id', id)

		if (variantError) throw variantError

		return { ...updatedProduct, variants: updatedVariants }
	},

	async getAllProducts(): Promise<Product[]> {
		const { data, error } = await supabase.from('Products').select(`
			*,
			variants:ProductVariants(*)
		`)

		if (error) throw error
		return data || []
	},

	async getProductById(id: string): Promise<Product | null> {
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

	async deleteProduct(id: string): Promise<void> {
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
			if (variant.quantity > 0) {
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

		// Delete the product (variants cascade delete)
		const { error } = await supabase.from('Products').delete().eq('id', id)
		if (error) throw error
	},

	async updateProductVariantQuantity(
		variantId: string,
		quantityChange: number,
		sourceType: 'client_invoice' | 'supplier_invoice' | 'adjustment' | 'manual' | 'quotation' | 'return' = 'manual',
		sourceId: string = '',
		notes: string = ''
	): Promise<ProductVariant> {
		// Get variant info
		const { data: variant, error: variantError } = await supabase
			.from('ProductVariants')
			.select('*')
			.eq('id', variantId)
			.single()

		if (variantError) throw variantError

		// Update quantity
		const { data, error } = await supabase.rpc(
			'update_product_variant_quantity',
			{ variant_id: variantId, quantity_change: quantityChange }
		)

		if (error) throw error

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

		// Record the change - SINGLE CALL ONLY
		await analyticsFunctions.recordProductChange({
			productId: variant.product_id,
			variantId: variantId,
			changeType: 'inventory',
			quantityChange: quantityChange,
			oldValue: variant.quantity,
			newValue: variant.quantity + quantityChange,
			sourceType: sourceType as any,
			sourceId: sourceId,
			sourceReference: sourceReference,
			notes: notes
		})

		return data
	}
}