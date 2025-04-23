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

export interface SalesKPIData {
  current_period: {
    total_sales: number;
    invoice_count: number;
    avg_order_value: number;
  };
  prev_period: {
    total_sales: number;
    invoice_count: number;
    avg_order_value: number;
  };
  changes: {
    total_sales_change: number;
    invoice_count_change: number;
    avg_order_value_change: number;
  };
}

// Cache implementation for memory storage with TTL
class AnalyticsCache {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  set(key: string, data: any, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now() + ttl
    });
  }

  get<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (cached.timestamp < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data as T;
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  invalidateAll(): void {
    this.cache.clear();
  }
}

// Global cache instance
const analyticsCache = new AnalyticsCache();

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
    
    // Invalidate caches related to product
    analyticsCache.invalidate(`product_history_${productId}`);
    analyticsCache.invalidate(`variant_history_${variantId}`);
    analyticsCache.invalidate('inventory_value');
    analyticsCache.invalidate('low_stock_products');
    
    // History updates may affect time series data, so invalidate those caches too
    
    return data;
  },

  /**
   * Gets product history for a specific variant with efficient caching
   */
  async getProductVariantHistory(
    variantId: string,
    limit: number = 20,
    forceRefresh: boolean = false
  ): Promise<ProductHistoryEntry[]> {
    const cacheKey = `variant_history_${variantId}_${limit}`;
    
    if (!forceRefresh) {
      const cached = analyticsCache.get<ProductHistoryEntry[]>(cacheKey);
      if (cached) return cached;
    }
    
    const { data, error } = await supabase
      .from('ProductHistory')
      .select('*')
      .eq('variant_id', variantId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    
    analyticsCache.set(cacheKey, data || []);
    return data || [];
  },

  /**
   * Gets product history for a specific product (across all variants) with caching
   */
  async getProductHistory(
    productId: string,
    limit: number = 50,
    forceRefresh: boolean = false
  ): Promise<ProductHistoryEntry[]> {
    const cacheKey = `product_history_${productId}_${limit}`;
    
    if (!forceRefresh) {
      const cached = analyticsCache.get<ProductHistoryEntry[]>(cacheKey);
      if (cached) return cached;
    }
    
    const { data, error } = await supabase
      .from('ProductHistory')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    
    analyticsCache.set(cacheKey, data || []);
    return data || [];
  },

  /**
   * Gets product sales data for a specific time range with caching
   */
  async getProductSales(
    startDate: string,
    endDate: string,
    forceRefresh: boolean = false
  ): Promise<ProductSalesData[]> {
    const cacheKey = `product_sales_${startDate}_${endDate}`;
    
    if (!forceRefresh) {
      const cached = analyticsCache.get<ProductSalesData[]>(cacheKey);
      if (cached) return cached;
    }
    
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
      const variantPromises: Promise<any>[] = [];

      for (const invoice of invoicesData || []) {
        for (const item of invoice.products || []) {
          if (!salesByProduct[item.product_id]) {
            // Create a promise to get the product details
            const productPromise = supabase
              .from('Products')
              .select('name')
              .eq('id', item.product_id)
              .single()
              .then(({ data: productData }) => {
                salesByProduct[item.product_id] = {
                  product_id: item.product_id,
                  product_name: productData?.name || 'Unknown Product',
                  total_sold: 0,
                  total_revenue: 0,
                  variants: []
                };
              });
            
            variantPromises.push(productPromise as Promise<any>);
          }
        }
      }

      // Wait for all product details to be fetched
      await Promise.all(variantPromises);

      // Process the variant data
      for (const invoice of invoicesData || []) {
        for (const item of invoice.products || []) {
          // Update the sales data
          salesByProduct[item.product_id].total_sold += item.quantity;

          // Find variant info
          const variantIndex = salesByProduct[item.product_id].variants.findIndex(
            v => v.id === item.product_variant_id
          );

          if (variantIndex === -1) {
            // Get the variant details
            const variantPromise = supabase
              .from('ProductVariants')
              .select('size, color')
              .eq('id', item.product_variant_id)
              .single()
              .then(({ data: variantData }) => {
                if (variantData) {
                  salesByProduct[item.product_id].variants.push({
                    id: item.product_variant_id,
                    size: variantData.size || 'Unknown',
                    color: variantData.color || 'Unknown',
                    quantity_sold: item.quantity
                  });
                }
              });
            
            variantPromises.push(variantPromise as Promise<any>);
          } else {
            salesByProduct[item.product_id].variants[variantIndex].quantity_sold += item.quantity;
          }
        }
      }

      // Wait for all variant details to be fetched
      await Promise.all(variantPromises);

      const result = Object.values(salesByProduct);
      analyticsCache.set(cacheKey, result);
      return result;
    }

    analyticsCache.set(cacheKey, data || []);
    return data || [];
  },

  /**
   * Gets current inventory value summary with efficient caching
   */
  async getInventoryValue(forceRefresh: boolean = false): Promise<InventoryValueData> {
    const cacheKey = 'inventory_value';
    
    if (!forceRefresh) {
      const cached = analyticsCache.get<InventoryValueData>(cacheKey);
      if (cached) return cached;
    }
    
    try {
      // Try to use the optimized RPC first
      const { data, error } = await supabase.rpc('get_inventory_value_summary');
      
      if (!error && data) {
        const inventoryData: InventoryValueData = {
          total_value: data.total_value,
          total_cost: data.total_cost,
          total_items: data.total_items,
          by_product: data.by_product
        };
        
        analyticsCache.set(cacheKey, inventoryData, 15 * 60 * 1000); // 15 minute cache for inventory
        return inventoryData;
      }
    } catch (err) {
      console.log('RPC not available, falling back to client-side calculation');
    }
    
    // Fallback to the original implementation
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

    const inventoryData: InventoryValueData = {
      total_value: totalValue,
      total_cost: totalCost,
      total_items: totalItems,
      by_product: byProduct
    };
    
    analyticsCache.set(cacheKey, inventoryData, 15 * 60 * 1000); // 15 minute cache for inventory
    return inventoryData;
  },

  /**
   * Gets top selling products for a specific time range using the optimized RPC
   */
  async getTopSellingProducts(
    startDate: string,
    endDate: string,
    limit: number = 10,
    forceRefresh: boolean = false
  ): Promise<TopSellersData[]> {
    const cacheKey = `top_sellers_${startDate}_${endDate}_${limit}`;
    
    if (!forceRefresh) {
      const cached = analyticsCache.get<TopSellersData[]>(cacheKey);
      if (cached) return cached;
    }
    
    try {
      // Try to use the optimized RPC first
      const { data, error } = await supabase.rpc('get_top_selling_products', {
        start_date: startDate,
        end_date: endDate,
        items_limit: limit
      });
      
      if (!error && data) {
        const topSellers: TopSellersData[] = data.map((item: any) => ({
          product_id: item.product_id,
          product_name: item.product_name,
          quantity_sold: item.quantity_sold,
          revenue: item.revenue,
          product_photo: item.product_photo,
          most_popular_variant: item.popular_variant_size ? {
            size: item.popular_variant_size,
            color: item.popular_variant_color
          } : null
        }));
        
        analyticsCache.set(cacheKey, topSellers);
        return topSellers;
      }
    } catch (err) {
      console.log('RPC not available, falling back to client-side calculation');
    }
    
    // Fallback to the original implementation
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
      if (invoice.type === 'return') continue; // Skip return invoices
      
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
    const productPromises: Promise<void>[] = [];

    for (const productId in productSales) {
      const productPromise = (async () => {
        const { data: product, error: productError } = await supabase
          .from('Products')
          .select('name, price, photo')
          .eq('id', productId)
          .single();

        if (productError) return;

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
      })();
      
      productPromises.push(productPromise);
    }

    await Promise.all(productPromises);

    // Sort by quantity sold in descending order and limit results
    const result = topSellers
      .sort((a, b) => b.quantity_sold - a.quantity_sold)
      .slice(0, limit);
    
    analyticsCache.set(cacheKey, result);
    return result;
  },

  /**
   * Gets inventory changes over time for charting using optimized RPC
   */
  async getInventoryTimeSeries(
    startDate: string,
    endDate: string,
    interval: 'day' | 'week' | 'month' = 'day',
    forceRefresh: boolean = false
  ): Promise<TimeSeriesData[]> {
    const cacheKey = `time_series_${startDate}_${endDate}_${interval}`;
    
    if (!forceRefresh) {
      const cached = analyticsCache.get<TimeSeriesData[]>(cacheKey);
      if (cached) return cached;
    }
    
    try {
      // Try to use the optimized RPC first
      const { data, error } = await supabase.rpc('get_inventory_time_series', {
        start_date: startDate,
        end_date: endDate,
        time_interval: interval
      });
      
      if (!error && data) {
        analyticsCache.set(cacheKey, data);
        return data;
      }
    } catch (err) {
      console.log('RPC not available, falling back to client-side calculation');
    }

    // Fallback to the original implementation
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
    const sortedResult = result.sort((a, b) => a.date.localeCompare(b.date));
    analyticsCache.set(cacheKey, sortedResult);
    return sortedResult;
  },

  /**
   * Gets low stock products that need restocking using optimized RPC
   */
  async getLowStockProducts(
    threshold: number = 5,
    forceRefresh: boolean = false
  ): Promise<{
    product_id: string;
    product_name: string;
    variant_id: string;
    size: string;
    color: string;
    quantity: number;
  }[]> {
    const cacheKey = `low_stock_products_${threshold}`;
    
    if (!forceRefresh) {
      const cached = analyticsCache.get<{
        product_id: string;
        product_name: string;
        variant_id: string;
        size: string;
        color: string;
        quantity: number;
      }[]>(cacheKey);
      if (cached) return cached;
    }
    
    try {
      // Try to use the optimized RPC first
      const { data, error } = await supabase.rpc('get_low_stock_products', {
        threshold
      });
      
      if (!error && data) {
        analyticsCache.set(cacheKey, data, 10 * 60 * 1000); // 10 minute cache
        return data;
      }
    } catch (err) {
      console.log('RPC not available, falling back to client-side calculation');
    }
    
    // Fallback to the original implementation
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

    const result = (variants || []).map((variant: any) => ({
      product_id: variant.product_id,
      product_name: variant.Products.name,
      variant_id: variant.id,
      size: variant.size,
      color: variant.color,
      quantity: variant.quantity
    }));
    
    analyticsCache.set(cacheKey, result, 10 * 60 * 1000); // 10 minute cache
    return result;
  },
  
  /**
   * Gets sales KPIs with period comparison
   */
  async getSalesKPIs(
    currentStart: string,
    currentEnd: string,
    previousStart: string,
    previousEnd: string,
    forceRefresh: boolean = false
  ): Promise<SalesKPIData> {
    const cacheKey = `sales_kpis_${currentStart}_${currentEnd}_${previousStart}_${previousEnd}`;
    
    if (!forceRefresh) {
      const cached = analyticsCache.get<SalesKPIData>(cacheKey);
      if (cached) return cached;
    }
    
    try {
      // Try to use the optimized RPC first
      const { data, error } = await supabase.rpc('get_sales_kpis', {
        current_start: currentStart,
        current_end: currentEnd,
        prev_start: previousStart,
        prev_end: previousEnd
      });
      
      if (!error && data) {
        analyticsCache.set(cacheKey, data);
        return data;
      }
    } catch (err) {
      console.log('RPC not available, falling back to client-side calculation');
    }
    
    // Fallback implementation
    async function getPeriodMetrics(start: string, end: string) {
      const { data, error } = await supabase
        .from('ClientInvoices')
        .select('total_price')
        .gte('created_at', start)
        .lte('created_at', end)
        .eq('type', 'regular');
        
      if (error) throw error;
      
      const totalSales = data.reduce((sum, invoice) => sum + (invoice.total_price || 0), 0);
      const invoiceCount = data.length;
      const avgOrderValue = invoiceCount > 0 ? totalSales / invoiceCount : 0;
      
      return {
        total_sales: totalSales,
        invoice_count: invoiceCount,
        avg_order_value: avgOrderValue
      };
    }
    
    const currentPeriod = await getPeriodMetrics(currentStart, currentEnd);
    const prevPeriod = await getPeriodMetrics(previousStart, previousEnd);
    
    // Calculate percentage changes
    const calculatePercentChange = (current: number, previous: number) => {
      if (previous === 0) return 0;
      return ((current - previous) / previous) * 100;
    };
    
    const result: SalesKPIData = {
      current_period: currentPeriod,
      prev_period: prevPeriod,
      changes: {
        total_sales_change: calculatePercentChange(
          currentPeriod.total_sales, 
          prevPeriod.total_sales
        ),
        invoice_count_change: calculatePercentChange(
          currentPeriod.invoice_count, 
          prevPeriod.invoice_count
        ),
        avg_order_value_change: calculatePercentChange(
          currentPeriod.avg_order_value, 
          prevPeriod.avg_order_value
        )
      }
    };
    
    analyticsCache.set(cacheKey, result);
    return result;
  },
  
  /**
   * Clear analytics cache to force fresh data
   */
  clearCache(): void {
    analyticsCache.invalidateAll();
  }
};