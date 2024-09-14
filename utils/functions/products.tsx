import { supabase } from '../supabase'

export interface Product {
	id: string
	name: string
	photo: string
	price: number
	cost: number
	type: 'Stock' | 'Sample'
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

		const { data: newVariants, error: variantError } = await supabase
			.from('ProductVariants')
			.insert(
				variants.map(variant => ({ ...variant, product_id: newProduct.id }))
			)
			.select()

		if (variantError) throw variantError

		return { ...newProduct, variants: newVariants }
	},

	// Add cost when updating a product
	async updateProduct(
		id: string,
		updates: Partial<Omit<Product, 'variants'>>,
		variants: Partial<ProductVariant>[]
	): Promise<Product> {
		const { data: updatedProduct, error: productError } = await supabase
			.from('Products')
			.update(updates)
			.eq('id', id)
			.select()
			.single()

		if (productError) throw productError

		// Fetch existing variants
		const { data: existingVariants, error: fetchError } = await supabase
			.from('ProductVariants')
			.select('*')
			.eq('product_id', id)

		if (fetchError) throw fetchError

		// Update existing variants and add new ones
		for (const variant of variants) {
			if (variant.id) {
				// Update existing variant
				const { error } = await supabase
					.from('ProductVariants')
					.update({
						size: variant.size,
						color: variant.color,
						quantity: variant.quantity
					})
					.eq('id', variant.id)
				if (error) throw error
			} else {
				// Add new variant
				const { error } = await supabase.from('ProductVariants').insert({
					size: variant.size,
					color: variant.color,
					quantity: variant.quantity,
					product_id: id
				})
				if (error) throw error
			}
		}

		// Remove variants that are no longer present
		const variantIdsToKeep = variants.filter(v => v.id).map(v => v.id)
		const variantIdsToRemove = existingVariants
			.filter(v => !variantIdsToKeep.includes(v.id))
			.map(v => v.id)

		if (variantIdsToRemove.length > 0) {
			const { error } = await supabase
				.from('ProductVariants')
				.delete()
				.in('id', variantIdsToRemove)
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

	// Fetch 'cost' along with products
	async getAllProducts(): Promise<Product[]> {
		const { data, error } = await supabase.from('Products').select(`
                *,
                variants:ProductVariants(*)
            `)

		if (error) throw error
		return data || []
	},

	// Fetch 'cost' along with product by ID
	async getProductById(id: string): Promise<Product | null> {
		const { data, error } = await supabase
			.from('Products')
			.select(
				`
                *,
                variants:ProductVariants(*)
            `
			)
			.eq('id', id)
			.single()

		if (error) throw error
		return data
	},

	async deleteProduct(id: string): Promise<void> {
		const { error } = await supabase.from('Products').delete().eq('id', id)

		if (error) throw error
	},

	async updateProductVariantQuantity(
		variantId: string,
		quantityChange: number
	): Promise<ProductVariant> {
		const { data, error } = await supabase.rpc(
			'update_product_variant_quantity',
			{ variant_id: variantId, quantity_change: quantityChange }
		)

		if (error) throw error
		return data
	}
}
