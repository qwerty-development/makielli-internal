import { supabase } from '../supabase';

export interface Product {
    id: string;
    name: string;
    photo: string;
    price: number;
    variants: ProductVariant[];
  }
  
  export interface ProductVariant {
    id: string;
    product_id: string;
    size: string;
    color: string;
    quantity: number;
  }

  export const productFunctions = {
    async getAllProducts(): Promise<Product[]> {
      const { data, error } = await supabase
        .from('Products')
        .select(`
          *,
          variants:ProductVariants(*)
        `);
      
      if (error) throw error;
      return data || [];
    },
  
    async getProductById(id: string): Promise<Product | null> {
      const { data, error } = await supabase
        .from('Products')
        .select(`
          *,
          variants:ProductVariants(*)
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    },
  
    async addProduct(product: Omit<Product, 'id' | 'variants'>, variants: Omit<ProductVariant, 'id' | 'product_id'>[]): Promise<Product> {
      const { data: newProduct, error: productError } = await supabase
        .from('Products')
        .insert([product])
        .select()
        .single();
      
      if (productError) throw productError;
  
      const { data: newVariants, error: variantError } = await supabase
        .from('ProductVariants')
        .insert(variants.map(variant => ({ ...variant, product_id: newProduct.id })))
        .select();
  
      if (variantError) throw variantError;
  
      return { ...newProduct, variants: newVariants };
    },
  
    async updateProduct(id: string, updates: Partial<Omit<Product, 'variants'>>, variants: ProductVariant[]): Promise<Product> {
      const { data: updatedProduct, error: productError } = await supabase
        .from('Products')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (productError) throw productError;
  
      // Delete existing variants
      await supabase
        .from('ProductVariants')
        .delete()
        .eq('product_id', id);
  
      // Insert new variants
      const { data: newVariants, error: variantError } = await supabase
        .from('ProductVariants')
        .insert(variants.map(variant => ({ ...variant, product_id: id })))
        .select();
  
      if (variantError) throw variantError;
  
      return { ...updatedProduct, variants: newVariants };
    },
  
    async deleteProduct(id: string): Promise<void> {
      const { error } = await supabase
        .from('Products')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
  
    async updateProductVariantQuantity(variantId: string, quantityChange: number): Promise<ProductVariant> {
      const { data, error } = await supabase
        .rpc('update_product_variant_quantity', { variant_id: variantId, quantity_change: quantityChange });
      
      if (error) throw error;
      return data;
    }
  };