import { supabase } from '../supabase';

export interface ProductHistoryEntry {
  id: string;
  product_id: string;
  variant_id: string;
  quantity_change: number;
  previous_quantity: number;
  new_quantity: number;
  source_type: 'client_invoice' | 'supplier_invoice' | 'adjustment' | 'manual' | 'quotation';
  source_id: string;
  created_at: string;
  notes: string;
}

export interface ProductSalesData {
  product_id: string;
  product_name: string;
  total_sold: number;
  total_revenue: number;
  variants: {
    id: string;
    size: string;
    color: string;
    quantity_sold: number;
  }[];
}

export interface InventoryValueData {
  total_value: number;
  total_cost: number;
  total_items: number;
  by_product: {
    product_id: string;
    product_name: string;
    value: number;
    cost: number;
    items: number;
  }[];
}

export interface TimeSeriesData {
  date: string;
  sales: number;
  purchases: number;
}

export interface TopSellersData {
  product_id: string;
  product_name: string;
  quantity_sold: number;
  revenue: number;
  product_photo: string | null;
  most_popular_variant: {
    size: string;
    color: string;
  } | null;
}

/**
 * Analytics functions for inventory and sales data
 */
export const analyticsFunctions = {
  /**
   * Records a product history entry in the database
   */
  async recordProductHistory(
    productId: string,
    variantId: string,
    quantityChange: number,
    previousQuantity: number,
    newQuantity: number,
    sourceType: 'client_invoice' | 'supplier_invoice' | 'adjustment' | 'manual' | 'quotation',
    sourceId: string,
    notes: string = ''
  ): Promise<ProductHistoryEntry> {
    const { data, error } = await supabase
      .from('ProductHistory')
      .insert({
        product_id: productId,
        variant_id: variantId,
        quantity_change: quantityChange,
        previous_quantity: previousQuantity,
        new_quantity: newQuantity,
        source_type: sourceType,
        source_id: sourceId,
        notes
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Gets product history for a specific variant
   */
  async getProductVariantHistory(
    variantId: string,
    limit: number = 20
  ): Promise<ProductHistoryEntry[]> {
    const { data, error } = await supabase
      .from('ProductHistory')
      .select('*')
      .eq('variant_id', variantId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  /**
   * Gets product history for a specific product (across all variants)
   */
  async getProductHistory(
    productId: string,
    limit: number = 50
  ): Promise<ProductHistoryEntry[]> {
    const { data, error } = await supabase
      .from('ProductHistory')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  /**
   * Gets product sales data for a specific time range
   */
  async getProductSales(
    startDate: string,
    endDate: string
  ): Promise<ProductSalesData[]> {
    // This is a more complex query that joins multiple tables
    const { data, error } = await supabase.rpc('get_product_sales', {
      start_date: startDate,
      end_date: endDate
    });

    if (error) {
      console.error('Error fetching product sales:', error);

      // As a fallback (if the RPC doesn't exist yet), perform a simpler query
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('ClientInvoices')
        .select('*')
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      if (invoicesError) throw invoicesError;

      // Process the data manually (simplified version)
      const salesByProduct: {[key: string]: ProductSalesData} = {};

      for (const invoice of invoicesData || []) {
        for (const item of invoice.products || []) {
          if (!salesByProduct[item.product_id]) {
            // Get the product details
            const { data: productData } = await supabase
              .from('Products')
              .select('name')
              .eq('id', item.product_id)
              .single();

            salesByProduct[item.product_id] = {
              product_id: item.product_id,
              product_name: productData?.name || 'Unknown Product',
              total_sold: 0,
              total_revenue: 0,
              variants: []
            };
          }

          // Update the sales data
          salesByProduct[item.product_id].total_sold += item.quantity;

          // Find variant info
          const variantIndex = salesByProduct[item.product_id].variants.findIndex(
            v => v.id === item.product_variant_id
          );

          if (variantIndex === -1) {
            // Get the variant details
            const { data: variantData } = await supabase
              .from('ProductVariants')
              .select('size, color')
              .eq('id', item.product_variant_id)
              .single();

            salesByProduct[item.product_id].variants.push({
              id: item.product_variant_id,
              size: variantData?.size || 'Unknown',
              color: variantData?.color || 'Unknown',
              quantity_sold: item.quantity
            });
          } else {
            salesByProduct[item.product_id].variants[variantIndex].quantity_sold += item.quantity;
          }
        }
      }

      return Object.values(salesByProduct);
    }

    return data || [];
  },

  /**
   * Gets current inventory value summary
   */
  async getInventoryValue(): Promise<InventoryValueData> {
    // Get all products with their variants
    const { data: products, error: productsError } = await supabase
      .from('Products')
      .select(`
        id,
        name,
        price,
        cost,
        variants:ProductVariants(*)
      `);

    if (productsError) throw productsError;

    let totalValue = 0;
    let totalCost = 0;
    let totalItems = 0;
    const byProduct: InventoryValueData['by_product'] = [];

    for (const product of products || []) {
      let productValue = 0;
      let productCost = 0;
      let productItems = 0;

      for (const variant of product.variants || []) {
        productValue += product.price * variant.quantity;
        productCost += product.cost * variant.quantity;
        productItems += variant.quantity;
      }

      totalValue += productValue;
      totalCost += productCost;
      totalItems += productItems;

      byProduct.push({
        product_id: product.id,
        product_name: product.name,
        value: productValue,
        cost: productCost,
        items: productItems
      });
    }

    return {
      total_value: totalValue,
      total_cost: totalCost,
      total_items: totalItems,
      by_product: byProduct
    };
  },

  /**
   * Gets top selling products for a specific time range
   */
  async getTopSellingProducts(
    startDate: string,
    endDate: string,
    limit: number = 10
  ): Promise<TopSellersData[]> {
    // Query client invoices within the date range
    const { data: invoices, error: invoicesError } = await supabase
      .from('ClientInvoices')
      .select('*')
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (invoicesError) throw invoicesError;

    // Process the invoices to find top selling products
    const productSales: {[key: string]: {
      quantity: number;
      revenue: number;
      variantSales: {[key: string]: number};
    }} = {};

    for (const invoice of invoices || []) {
      for (const item of invoice.products || []) {
        if (!productSales[item.product_id]) {
          productSales[item.product_id] = {
            quantity: 0,
            revenue: 0,
            variantSales: {}
          };
        }

        productSales[item.product_id].quantity += item.quantity;

        // Add variant sales
        if (!productSales[item.product_id].variantSales[item.product_variant_id]) {
          productSales[item.product_id].variantSales[item.product_variant_id] = 0;
        }
        productSales[item.product_id].variantSales[item.product_variant_id] += item.quantity;
      }
    }

    // Get product details and calculate revenue
    const topSellers: TopSellersData[] = [];

    for (const productId in productSales) {
      const { data: product, error: productError } = await supabase
        .from('Products')
        .select('name, price, photo')
        .eq('id', productId)
        .single();

      if (productError) continue;

      // Find most popular variant
      let mostPopularVariantId = '';
      let maxQuantity = 0;

      for (const variantId in productSales[productId].variantSales) {
        const qty = productSales[productId].variantSales[variantId];
        if (qty > maxQuantity) {
          maxQuantity = qty;
          mostPopularVariantId = variantId;
        }
      }

      let mostPopularVariant = null;

      if (mostPopularVariantId) {
        const { data: variant, error: variantError } = await supabase
          .from('ProductVariants')
          .select('size, color')
          .eq('id', mostPopularVariantId)
          .single();

        if (!variantError) {
          mostPopularVariant = {
            size: variant.size,
            color: variant.color
          };
        }
      }

      // Calculate revenue
      const revenue = productSales[productId].quantity * product.price;

      topSellers.push({
        product_id: productId,
        product_name: product.name,
        quantity_sold: productSales[productId].quantity,
        revenue: revenue,
        product_photo: product.photo,
        most_popular_variant: mostPopularVariant
      });
    }

    // Sort by quantity sold in descending order and limit results
    return topSellers
      .sort((a, b) => b.quantity_sold - a.quantity_sold)
      .slice(0, limit);
  },

  /**
   * Gets inventory changes over time for charting
   */
  async getInventoryTimeSeries(
    startDate: string,
    endDate: string,
    interval: 'day' | 'week' | 'month' = 'day'
  ): Promise<TimeSeriesData[]> {
    // Use RPC if available, otherwise calculate manually
    const { data, error } = await supabase.rpc('get_inventory_time_series', {
      start_date: startDate,
      end_date: endDate,
      time_interval: interval
    });

    if (error) {
      console.error('Error fetching time series data:', error);

      // As a fallback, calculate a simplified version
      const { data: historyData, error: historyError } = await supabase
        .from('ProductHistory')
        .select('*')
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('created_at', { ascending: true });

      if (historyError) throw historyError;

      // Group by date according to interval
      const timeSeriesMap: {[key: string]: {sales: number, purchases: number}} = {};

      for (const entry of historyData || []) {
        let dateKey: string;
        const date = new Date(entry.created_at);

        if (interval === 'day') {
          dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
        } else if (interval === 'week') {
          // Get the first day of the week (Sunday)
          const day = date.getDay();
          const diff = date.getDate() - day;
          const firstDay = new Date(date);
          firstDay.setDate(diff);
          dateKey = firstDay.toISOString().split('T')[0];
        } else {
          // Month
          dateKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        }

        if (!timeSeriesMap[dateKey]) {
          timeSeriesMap[dateKey] = { sales: 0, purchases: 0 };
        }

        // Add to sales or purchases based on source_type
        if (entry.source_type === 'client_invoice') {
          timeSeriesMap[dateKey].sales += Math.abs(entry.quantity_change);
        } else if (entry.source_type === 'supplier_invoice') {
          timeSeriesMap[dateKey].purchases += Math.abs(entry.quantity_change);
        }
      }

      // Convert map to array
      const result: TimeSeriesData[] = Object.keys(timeSeriesMap).map(date => ({
        date,
        sales: timeSeriesMap[date].sales,
        purchases: timeSeriesMap[date].purchases
      }));

      // Sort by date
      return result.sort((a, b) => a.date.localeCompare(b.date));
    }

    return data || [];
  },

  /**
   * Gets low stock products that need restocking
   */
  async getLowStockProducts(threshold: number = 5): Promise<{
    product_id: string;
    product_name: string;
    variant_id: string;
    size: string;
    color: string;
    quantity: number;
  }[]> {
    const { data: variants, error } = await supabase
      .from('ProductVariants')
      .select(`
        id,
        product_id,
        size,
        color,
        quantity,
        Products(name)
      `)
      .lte('quantity', threshold)
      .order('quantity', { ascending: true });

    if (error) throw error;

    return (variants || []).map(variant => ({
      product_id: variant.product_id,
      product_name: variant.Products.name,
      variant_id: variant.id,
      size: variant.size,
      color: variant.color,
      quantity: variant.quantity
    }));
  }
};