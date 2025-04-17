import { supabase } from '../supabase'
import { analyticsFunctions } from './analytics'

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

		const { data: newVariants, error: variantError } = await supabase
			.from('ProductVariants')
			.insert(
				variants.map(variant => ({ ...variant, product_id: newProduct.id }))
			)
			.select()

		if (variantError) throw variantError

    // Record history for new variants
    for (const variant of newVariants) {
      try {
        await analyticsFunctions.recordProductHistory(
          variant.product_id,
          variant.id,
          variant.quantity,
          0,
          variant.quantity,
          'manual',
          'initial_setup',
          'Initial product setup'
        )
      } catch (error) {
        console.error('Error recording product history:', error)
        // Continue even if analytics recording fails
      }
    }

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

  // Fetch existing variants for the product
  const { data: existingVariants, error: fetchError } = await supabase
    .from('ProductVariants')
    .select('*')
    .eq('product_id', id)

  if (fetchError) throw fetchError

  // Process each provided variant (for update or insert)
  for (const variant of variants) {
    if (variant.id) {
      // Find the original variant to compare quantity
      const originalVariant = existingVariants.find(v => v.id === variant.id)

      // Update existing variant by id
      const { data: updatedVariant, error } = await supabase
        .from('ProductVariants')
        .update({
          size: variant.size,
          color: variant.color,
          quantity: variant.quantity
        })
        .eq('id', variant.id)
        .select()
        .single()

      if (error) throw error

      // Record history if quantity changed
      if (originalVariant && variant.quantity !== undefined &&
          originalVariant.quantity !== variant.quantity) {
        try {
          await analyticsFunctions.recordProductHistory(
            id,
            variant.id,
            variant.quantity - originalVariant.quantity,
            originalVariant.quantity,
            variant.quantity,
            'manual',
            'manual_update',
            'Manual quantity update'
          )
        } catch (error) {
          console.error('Error recording product history:', error)
          // Continue even if analytics recording fails
        }
      }
    } else {
      // Check if a variant with same product_id, size, and color already exists
      const { data: existingVariant, error: checkError } = await supabase
        .from('ProductVariants')
        .select('*')
        .eq('product_id', id)
        .eq('size', variant.size)
        .eq('color', variant.color)
        .maybeSingle()
      if (checkError) throw checkError

      if (existingVariant) {
        // Update that variant with the new quantity instead of inserting a duplicate
        const { data: updatedVariant, error } = await supabase
          .from('ProductVariants')
          .update({ quantity: variant.quantity })
          .eq('id', existingVariant.id)
          .select()
          .single()

        if (error) throw error

        // Record history if quantity changed
        if (variant.quantity !== undefined && existingVariant.quantity !== variant.quantity) {
          try {
            await analyticsFunctions.recordProductHistory(
              id,
              existingVariant.id,
              variant.quantity - existingVariant.quantity,
              existingVariant.quantity,
              variant.quantity,
              'manual',
              'manual_update',
              'Manual quantity update'
            )
          } catch (error) {
            console.error('Error recording product history:', error)
            // Continue even if analytics recording fails
          }
        }
      } else {
        // Insert as new variant if not found
        const { data: newVariant, error } = await supabase
          .from('ProductVariants')
          .insert({
            size: variant.size,
            color: variant.color,
            quantity: variant.quantity,
            product_id: id
          })
          .select()
          .single()

        if (error) throw error

        // Record history for new variant
        if (variant.quantity && variant.quantity > 0) {
          try {
            await analyticsFunctions.recordProductHistory(
              id,
              newVariant.id,
              variant.quantity,
              0,
              variant.quantity,
              'manual',
              'new_variant',
              'New variant added'
            )
          } catch (error) {
            console.error('Error recording product history:', error)
            // Continue even if analytics recording fails
          }
        }
      }
    }
  }

  // Remove variants that are no longer present
  const variantIdsToKeep = variants.filter(v => v.id).map(v => v.id)
  const variantIdsToRemove = existingVariants
    .filter(v => !variantIdsToKeep.includes(v.id))
    .map(v => v.id)

  if (variantIdsToRemove.length > 0) {
    // Record history for removed variants
    for (const variantId of variantIdsToRemove) {
      const removedVariant = existingVariants.find(v => v.id === variantId)
      if (removedVariant) {
        try {
          await analyticsFunctions.recordProductHistory(
            id,
            variantId,
            -removedVariant.quantity,
            removedVariant.quantity,
            0,
            'manual',
            'variant_removed',
            'Variant removed'
          )
        } catch (error) {
          console.error('Error recording product history:', error)
          // Continue even if analytics recording fails
        }
      }
    }

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
    // Get the product variants first to record history
    const { data: variants, error: variantError } = await supabase
      .from('ProductVariants')
      .select('*')
      .eq('product_id', id)

    if (variantError) throw variantError

    // Record history for all variants being deleted
    for (const variant of variants || []) {
      try {
        await analyticsFunctions.recordProductHistory(
          id,
          variant.id,
          -variant.quantity,
          variant.quantity,
          0,
          'manual',
          'product_deleted',
          'Product deleted'
        )
      } catch (error) {
        console.error('Error recording product history:', error)
        // Continue even if analytics recording fails
      }
    }

    // Delete the product (which will cascade delete variants)
		const { error } = await supabase.from('Products').delete().eq('id', id)
		if (error) throw error
	},

	async updateProductVariantQuantity(
		variantId: string,
		quantityChange: number,
    sourceType: 'client_invoice' | 'supplier_invoice' | 'adjustment' | 'manual' | 'quotation' = 'manual',
    sourceId: string = '',
    notes: string = ''
	): Promise<ProductVariant> {
    // Get the current variant information
    const { data: variant, error: variantError } = await supabase
      .from('ProductVariants')
      .select('*')
      .eq('id', variantId)
      .single()

    if (variantError) throw variantError

    const previousQuantity = variant.quantity
    const newQuantity = previousQuantity + quantityChange

    // Update the variant quantity
		const { data, error } = await supabase.rpc(
			'update_product_variant_quantity',
			{ variant_id: variantId, quantity_change: quantityChange }
		)

		if (error) throw error

    // Record the history
    try {
      await analyticsFunctions.recordProductHistory(
        variant.product_id,
        variantId,
        quantityChange,
        previousQuantity,
        newQuantity,
        sourceType,
        sourceId,
        notes
      )
    } catch (error) {
      console.error('Error recording product history:', error)
      // Continue even if analytics recording fails
    }

		return data
	}
}