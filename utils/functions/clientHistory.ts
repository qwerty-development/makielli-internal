
import { supabase } from '../supabase';

export interface ClientPurchaseHistoryRecord {
  product_id: string;
  product_name: string;
  product_photo: string;
  total_purchased: number;
  total_shipped: number;
  total_unshipped: number;
  purchase_count: number;
  last_purchase_date: string;
  variants: {
    size: string;
    color: string;
    quantity: number;
    shipped: number;
    unshipped: number;
  }[];
}

export const clientHistoryFunctions = {
  async getClientPurchaseHistory(clientId: number): Promise<ClientPurchaseHistoryRecord[]> {
    try {
      // Use client_invoice_items_expanded as primary source
      const { data: invoiceItems, error: itemsError } = await supabase
        .from('client_invoice_items_expanded')
        .select('invoice_id, product_id, variant_id, quantity, created_at')
        .eq('client_id', clientId);

      if (itemsError) {
        console.warn('client_invoice_items_expanded not available, falling back to product_sales_history:', itemsError);
        return this.getClientPurchaseHistoryFallback(clientId);
      }

      if (!invoiceItems || invoiceItems.length === 0) return [];

      // Get invoice types and shipping status to filter returns and calculate shipping
      const invoiceIds = Array.from(new Set(invoiceItems.map(item => item.invoice_id).filter(Boolean))) as number[];
      
      let invoiceTypeById: Record<number, string> = {};
      let invoiceShippingStatusById: Record<number, string | null> = {};
      
      if (invoiceIds.length > 0) {
        const { data: invoices } = await supabase
          .from('ClientInvoices')
          .select('id, type, shipping_status')
          .in('id', invoiceIds);
        
        (invoices || []).forEach(inv => {
          invoiceTypeById[inv.id] = inv.type || 'regular';
          invoiceShippingStatusById[inv.id] = inv.shipping_status;
        });
      }

      // Filter out return invoices
      const filteredItems = invoiceItems.filter(item => 
        invoiceTypeById[item.invoice_id] !== 'return'
      );

      if (filteredItems.length === 0) return [];

      // Get product IDs to fetch product details
      const productIds = Array.from(new Set(filteredItems.map(item => item.product_id).filter(Boolean))) as string[];
      
      // Fetch product details
      const { data: products } = await supabase
        .from('Products')
        .select('id, name, photo')
        .in('id', productIds);
      
      const productById: Record<string, { name: string; photo: string }> = {};
      (products || []).forEach(p => {
        productById[p.id] = { name: p.name, photo: p.photo };
      });

      // Fetch variant details
      const variantIds = Array.from(new Set(filteredItems.map(item => item.variant_id).filter(Boolean))) as string[];
      const { data: variants } = await supabase
        .from('ProductVariants')
        .select('id, size, color, product_id')
        .in('id', variantIds);
      
      const variantById: Record<string, { size: string; color: string; product_id: string }> = {};
      (variants || []).forEach(v => {
        variantById[v.id] = { size: v.size, color: v.color, product_id: v.product_id };
      });

      // Identify partially shipped invoices that need detailed lookup
      const partiallyShippedInvoiceIds = invoiceIds.filter(id => 
        invoiceShippingStatusById[id] === 'partially_shipped'
      );

      // Fetch shipping invoice details for partially shipped invoices
      let shippedByInvoiceVariant = new Map<string, number>();
      if (partiallyShippedInvoiceIds.length > 0) {
        const { data: shippingInvoices } = await supabase
          .from('ClientShippingInvoices')
          .select('invoice_id, products, status')
          .in('invoice_id', partiallyShippedInvoiceIds)
          .neq('status', 'cancelled');

        if (shippingInvoices) {
          for (const shipment of shippingInvoices) {
            const shipmentProducts = shipment.products as { product_id: string; product_variant_id: string; quantity: number }[] || [];
            for (const product of shipmentProducts) {
              const key = `${shipment.invoice_id}_${product.product_variant_id}`;
              const current = shippedByInvoiceVariant.get(key) || 0;
              shippedByInvoiceVariant.set(key, current + product.quantity);
            }
          }
        }
      }

      // Build product map with shipping data
      const productMap = new Map<string, ClientPurchaseHistoryRecord>();

      for (const item of filteredItems) {
        const productId = item.product_id;
        const variantId = item.variant_id;
        const quantity = Math.abs(Number(item.quantity) || 0);
        
        if (!productId) continue;

        const productInfo = productById[productId] || { name: 'Unknown Product', photo: '' };
        const variantInfo = (variantId && variantById[variantId]) 
          ? variantById[variantId] 
          : { size: '', color: '', product_id: productId };

        // Calculate shipping for this item
        const shippingStatus = invoiceShippingStatusById[item.invoice_id];
        let itemShipped = 0;
        let itemUnshipped = 0;

        if (shippingStatus === null || shippingStatus === undefined || shippingStatus === 'fully_shipped') {
          // Legacy or fully shipped = all shipped
          itemShipped = quantity;
          itemUnshipped = 0;
        } else if (shippingStatus === 'unshipped') {
          itemShipped = 0;
          itemUnshipped = quantity;
        } else if (shippingStatus === 'partially_shipped') {
          const key = `${item.invoice_id}_${variantId}`;
          const shippedQty = shippedByInvoiceVariant.get(key) || 0;
          itemShipped = Math.min(shippedQty, quantity);
          itemUnshipped = Math.max(0, quantity - shippedQty);
        }

        if (!productMap.has(productId)) {
          productMap.set(productId, {
            product_id: productId,
            product_name: productInfo.name,
            product_photo: productInfo.photo,
            total_purchased: 0,
            total_shipped: 0,
            total_unshipped: 0,
            purchase_count: 0,
            last_purchase_date: item.created_at,
            variants: [],
          });
        }

        const product = productMap.get(productId)!;
        product.total_purchased += quantity;
        product.total_shipped += itemShipped;
        product.total_unshipped += itemUnshipped;
        product.purchase_count += 1;

        if (new Date(item.created_at) > new Date(product.last_purchase_date)) {
          product.last_purchase_date = item.created_at;
        }

        // Update or add variant
        let variant = product.variants.find(v => v.size === variantInfo.size && v.color === variantInfo.color);
        if (!variant) {
          variant = {
            size: variantInfo.size,
            color: variantInfo.color,
            quantity: 0,
            shipped: 0,
            unshipped: 0,
          };
          product.variants.push(variant);
        }
        variant.quantity += quantity;
        variant.shipped += itemShipped;
        variant.unshipped += itemUnshipped;
      }

      // Sort variants within each product
      for (const product of productMap.values()) {
        product.variants.sort((a, b) => b.quantity - a.quantity);
      }

      return Array.from(productMap.values()).sort((a, b) => b.total_purchased - a.total_purchased);

    } catch (error) {
      console.error('Error fetching client purchase history:', error);
      throw error;
    }
  },

  // Fallback method using product_sales_history view
  async getClientPurchaseHistoryFallback(clientId: number): Promise<ClientPurchaseHistoryRecord[]> {
    try {
      const { data, error } = await supabase
        .from('product_sales_history')
        .select('*')
        .eq('client_id', clientId)
        .neq('invoice_type', 'return') // Exclude return invoices
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
            total_shipped: 0,
            total_unshipped: 0,
            purchase_count: 0,
            last_purchase_date: record.created_at,
            variants: [],
          });
        }

        const product = productMap.get(record.product_id)!;
        const quantity = Math.abs(record.quantity_change);

        product.total_purchased += quantity;
        // In fallback, assume all shipped (legacy behavior)
        product.total_shipped += quantity;
        product.purchase_count += 1;

        if (new Date(record.created_at) > new Date(product.last_purchase_date)) {
          product.last_purchase_date = record.created_at;
        }

        let variant = product.variants.find(v => v.size === record.size && v.color === record.color);
        if (!variant) {
          variant = {
            size: record.size,
            color: record.color,
            quantity: 0,
            shipped: 0,
            unshipped: 0,
          };
          product.variants.push(variant);
        }
        variant.quantity += quantity;
        variant.shipped += quantity; // Assume shipped in fallback
      }

      // Sort variants within each product
      for (const product of productMap.values()) {
        product.variants.sort((a, b) => b.quantity - a.quantity);
      }

      return Array.from(productMap.values()).sort((a, b) => b.total_purchased - a.total_purchased);

    } catch (error) {
      console.error('Error in fallback client purchase history:', error);
      throw error;
    }
  },
};
