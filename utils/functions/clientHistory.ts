
import { supabase } from '../supabase';

export interface ClientPurchaseHistoryRecord {
  product_id: string;
  product_name: string;
  product_photo: string;
  total_purchased: number;
  purchase_count: number;
  last_purchase_date: string;
  variants: {
    size: string;
    color: string;
    quantity: number;
  }[];
}

export const clientHistoryFunctions = {
  async getClientPurchaseHistory(clientId: number): Promise<ClientPurchaseHistoryRecord[]> {
    try {
      const { data, error } = await supabase
        .from('product_sales_history')
        .select('*')
        .eq('client_id', clientId)
        .lt('quantity_change', 0); // Only sales (negative quantity change)

      if (error) throw error;
      if (!data) return [];

      const productMap = new Map<string, ClientPurchaseHistoryRecord>();

      for (const record of data) {
        if (!productMap.has(record.product_id)) {
          productMap.set(record.product_id, {
            product_id: record.product_id,
            product_name: record.product_name,
            product_photo: record.product_photo,
            total_purchased: 0,
            purchase_count: 0,
            last_purchase_date: record.created_at,
            variants: [],
          });
        }

        const product = productMap.get(record.product_id)!;
        const quantity = Math.abs(record.quantity_change);

        product.total_purchased += quantity;
        product.purchase_count += 1;

        if (new Date(record.created_at) > new Date(product.last_purchase_date)) {
          product.last_purchase_date = record.created_at;
        }

        const variantKey = `${record.size}-${record.color}`;

        let variant = product.variants.find(v => v.size === record.size && v.color === record.color);

        if (!variant) {
          variant = {
            size: record.size,
            color: record.color,
            quantity: 0,
          };
          product.variants.push(variant);
        }

        variant.quantity += quantity;
      }

      // Sort variants within each product for consistent display
      for (const product of productMap.values()) {
        product.variants.sort((a, b) => b.quantity - a.quantity);
      }

      const result = Array.from(productMap.values());
      
      return result.sort((a, b) => b.total_purchased - a.total_purchased);

    } catch (error) {
      console.error('Error fetching client purchase history:', error);
      throw error;
    }
  },
};
