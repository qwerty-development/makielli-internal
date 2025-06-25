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

export interface SalesMetrics {
  total_revenue: number;
  total_invoiced: number;
  total_received: number;
  outstanding_amount: number;
  invoice_count: number;
  avg_invoice_value: number;
  return_amount: number;
  net_revenue: number;
}

export interface InventoryMetrics {
  total_items: number;
  total_retail_value: number;
  total_cost_value: number;
  profit_margin: number;
  low_stock_count: number;
  out_of_stock_count: number;
}

export interface ProductPerformance {
  product_id: string;
  product_name: string;
  total_sold: number;
  total_revenue: number;
  avg_price: number;
  profit_margin: number;
  current_stock: number;
  stock_value: number;
  photo?: string;
}

export interface InventoryMovement {
  date: string;
  sales_out: number;
  purchases_in: number;
  adjustments: number;
  net_change: number;
}

export interface ClientMetrics {
  client_id: number;
  client_name: string;
  total_invoiced: number;
  total_paid: number;
  outstanding_balance: number;
  invoice_count: number;
  last_invoice_date: string;
}

export interface LowStockAlert {
  product_id: string;
  product_name: string;
  variant_id: string;
  size: string;
  color: string;
  current_quantity: number;
  recommended_reorder: number;
  days_of_stock: number;
}

export interface PeriodComparison {
  current_period: SalesMetrics;
  previous_period: SalesMetrics;
  growth_rate: number;
  revenue_change: number;
  invoice_count_change: number;
}

// Legacy interfaces for backward compatibility
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

// Cache implementation with better TTL management
class AnalyticsCache {
  private cache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();

  set(key: string, data: any, ttl: number = 5 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data as T;
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  invalidatePattern(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }
}

const cache = new AnalyticsCache();

export const analyticsService = {
  /**
   * Get comprehensive sales metrics for a period
   */
  async getSalesMetrics(startDate: string, endDate: string, forceRefresh = false): Promise<SalesMetrics> {
    const cacheKey = `sales_metrics_${startDate}_${endDate}`;
    
    if (!forceRefresh) {
      const cached = cache.get<SalesMetrics>(cacheKey);
      if (cached) return cached;
    }

    const { data: invoices, error } = await supabase
      .from('ClientInvoices')
      .select('*')
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (error) throw error;

    let totalInvoiced = 0;
    let totalReceived = 0;
    let returnAmount = 0;
    let invoiceCount = 0;
    let regularInvoiceCount = 0;

    for (const invoice of invoices || []) {
      if (invoice.type === 'return') {
        returnAmount += Math.abs(invoice.total_price || 0);
      } else {
        totalInvoiced += invoice.total_price || 0;
        totalReceived += (invoice.total_price || 0) - (invoice.remaining_amount || 0);
        regularInvoiceCount++;
      }
      invoiceCount++;
    }

    const outstandingAmount = totalInvoiced - totalReceived;
    const netRevenue = totalReceived - returnAmount;

    const metrics: SalesMetrics = {
      total_revenue: totalReceived,
      total_invoiced: totalInvoiced,
      total_received: totalReceived,
      outstanding_amount: outstandingAmount,
      invoice_count: regularInvoiceCount,
      avg_invoice_value: regularInvoiceCount > 0 ? totalInvoiced / regularInvoiceCount : 0,
      return_amount: returnAmount,
      net_revenue: netRevenue
    };

    cache.set(cacheKey, metrics);
    return metrics;
  },

  /**
   * Get current inventory metrics
   */
  async getInventoryMetrics(forceRefresh = false): Promise<InventoryMetrics> {
    const cacheKey = 'inventory_metrics';
    
    if (!forceRefresh) {
      const cached = cache.get<InventoryMetrics>(cacheKey);
      if (cached) return cached;
    }

    const { data: products, error } = await supabase
      .from('Products')
      .select(`
        id,
        price,
        cost,
        variants:ProductVariants(
          id,
          quantity
        )
      `);

    if (error) throw error;

    let totalItems = 0;
    let totalRetailValue = 0;
    let totalCostValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    for (const product of products || []) {
      for (const variant of product.variants || []) {
        const quantity = variant.quantity || 0;
        totalItems += quantity;
        totalRetailValue += quantity * (product.price || 0);
        totalCostValue += quantity * (product.cost || 0);

        if (quantity === 0) {
          outOfStockCount++;
        } else if (quantity <= 5) {
          lowStockCount++;
        }
      }
    }

    const profitMargin = totalCostValue > 0 ? ((totalRetailValue - totalCostValue) / totalRetailValue) * 100 : 0;

    const metrics: InventoryMetrics = {
      total_items: totalItems,
      total_retail_value: totalRetailValue,
      total_cost_value: totalCostValue,
      profit_margin: profitMargin,
      low_stock_count: lowStockCount,
      out_of_stock_count: outOfStockCount
    };

    cache.set(cacheKey, metrics, 10 * 60 * 1000); // 10 minutes
    return metrics;
  },

  /**
   * Get product performance data
   */
  async getProductPerformance(startDate: string, endDate: string, limit = 20, forceRefresh = false): Promise<ProductPerformance[]> {
    const cacheKey = `product_performance_${startDate}_${endDate}_${limit}`;
    
    if (!forceRefresh) {
      const cached = cache.get<ProductPerformance[]>(cacheKey);
      if (cached) return cached;
    }

    // Get sales data from ProductHistory
    const { data: salesHistory, error: salesError }:any = await supabase
      .from('ProductHistory')
      .select(`
        product_id,
        quantity_change,
        variant_id,
        source_type,
        created_at,
        ProductVariants!inner(
          product_id,
          Products!inner(
            name,
            price,
            cost,
            photo
          )
        )
      `)
      .eq('source_type', 'client_invoice')
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (salesError) throw salesError;

    // Get current inventory
    const { data: currentInventory, error: inventoryError } = await supabase
      .from('Products')
      .select(`
        id,
        name,
        price,
        cost,
        photo,
        variants:ProductVariants(
          quantity
        )
      `);

    if (inventoryError) throw inventoryError;

    const productMap = new Map();

    // Process sales data
    for (const sale of salesHistory || []) {
      const productId = sale.product_id;
      const productData = sale.ProductVariants?.Products;
      
      if (!productData) continue;

      if (!productMap.has(productId)) {
        productMap.set(productId, {
          product_id: productId,
          product_name: productData.name,
          total_sold: 0,
          total_revenue: 0,
          price: productData.price || 0,
          cost: productData.cost || 0,
          photo: productData.photo
        });
      }

      const product = productMap.get(productId);
      const soldQuantity = Math.abs(sale.quantity_change);
      product.total_sold += soldQuantity;
      product.total_revenue += soldQuantity * (productData.price || 0);
    }

    // Add current inventory data
    const performanceData: ProductPerformance[] = [];
    
    for (const product of currentInventory || []) {
      const salesData = productMap.get(product.id) || {
        total_sold: 0,
        total_revenue: 0
      };

      const currentStock = product.variants?.reduce((sum: number, v: any) => sum + (v.quantity || 0), 0) || 0;
      const stockValue = currentStock * (product.price || 0);
      const avgPrice = salesData.total_sold > 0 ? salesData.total_revenue / salesData.total_sold : product.price || 0;
      const profitMargin = product.price > 0 ? ((product.price - (product.cost || 0)) / product.price) * 100 : 0;

      performanceData.push({
        product_id: product.id,
        product_name: product.name,
        total_sold: salesData.total_sold,
        total_revenue: salesData.total_revenue,
        avg_price: avgPrice,
        profit_margin: profitMargin,
        current_stock: currentStock,
        stock_value: stockValue,
        photo: product.photo
      });
    }

    // Sort by total revenue and limit
    const result = performanceData
      .sort((a, b) => b.total_revenue - a.total_revenue)
      .slice(0, limit);

    cache.set(cacheKey, result);
    return result;
  },

  /**
   * Get inventory movement over time
   */
  async getInventoryMovement(startDate: string, endDate: string, interval: 'day' | 'week' | 'month' = 'day', forceRefresh = false): Promise<InventoryMovement[]> {
    const cacheKey = `inventory_movement_${startDate}_${endDate}_${interval}`;
    
    if (!forceRefresh) {
      const cached = cache.get<InventoryMovement[]>(cacheKey);
      if (cached) return cached;
    }

    const { data: history, error } = await supabase
      .from('ProductHistory')
      .select('*')
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: true });

    if (error) throw error;

    const movementMap = new Map<string, InventoryMovement>();

    for (const record of history || []) {
      let dateKey: string;
      const date = new Date(record.created_at);

      switch (interval) {
        case 'day':
          dateKey = date.toISOString().split('T')[0];
          break;
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          dateKey = weekStart.toISOString().split('T')[0];
          break;
        case 'month':
          dateKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
          break;
        default:
          dateKey = date.toISOString().split('T')[0];
      }

      if (!movementMap.has(dateKey)) {
        movementMap.set(dateKey, {
          date: dateKey,
          sales_out: 0,
          purchases_in: 0,
          adjustments: 0,
          net_change: 0
        });
      }

      const movement = movementMap.get(dateKey)!;
      const quantityChange = record.quantity_change;

      switch (record.source_type) {
        case 'client_invoice':
          movement.sales_out += Math.abs(quantityChange);
          break;
        case 'supplier_invoice':
          movement.purchases_in += Math.abs(quantityChange);
          break;
        case 'adjustment':
        case 'manual':
          movement.adjustments += quantityChange;
          break;
      }

      movement.net_change += quantityChange;
    }

    const result = Array.from(movementMap.values()).sort((a, b) => a.date.localeCompare(b.date));
    cache.set(cacheKey, result);
    return result;
  },

  /**
   * Get client metrics
   */
  async getClientMetrics(startDate: string, endDate: string, limit = 10, forceRefresh = false): Promise<ClientMetrics[]> {
    const cacheKey = `client_metrics_${startDate}_${endDate}_${limit}`;
    
    if (!forceRefresh) {
      const cached = cache.get<ClientMetrics[]>(cacheKey);
      if (cached) return cached;
    }

    const { data: invoices, error }:any = await supabase
      .from('ClientInvoices')
      .select(`
        client_id,
        total_price,
        remaining_amount,
        created_at,
        type,
        Clients!inner(
          name
        )
      `)
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .neq('type', 'return');

    if (error) throw error;

    const clientMap = new Map();

    for (const invoice of invoices || []) {
      const clientId = invoice.client_id;
      const clientName = invoice.Clients?.name || 'Unknown Client';

      if (!clientMap.has(clientId)) {
        clientMap.set(clientId, {
          client_id: clientId,
          client_name: clientName,
          total_invoiced: 0,
          total_paid: 0,
          outstanding_balance: 0,
          invoice_count: 0,
          last_invoice_date: invoice.created_at
        });
      }

      const client = clientMap.get(clientId);
      client.total_invoiced += invoice.total_price || 0;
      client.total_paid += (invoice.total_price || 0) - (invoice.remaining_amount || 0);
      client.outstanding_balance += invoice.remaining_amount || 0;
      client.invoice_count++;
      
      if (new Date(invoice.created_at) > new Date(client.last_invoice_date)) {
        client.last_invoice_date = invoice.created_at;
      }
    }

    const result = Array.from(clientMap.values())
      .sort((a, b) => b.total_invoiced - a.total_invoiced)
      .slice(0, limit);

    cache.set(cacheKey, result);
    return result;
  },

  /**
   * Get low stock alerts with recommendations
   */
  async getLowStockAlerts(threshold = 5, forceRefresh = false): Promise<LowStockAlert[]> {
    const cacheKey = `low_stock_alerts_${threshold}`;
    
    if (!forceRefresh) {
      const cached = cache.get<LowStockAlert[]>(cacheKey);
      if (cached) return cached;
    }

    const { data: variants, error }:any = await supabase
      .from('ProductVariants')
      .select(`
        id,
        product_id,
        size,
        color,
        quantity,
        Products!inner(
          name
        )
      `)
      .lte('quantity', threshold)
      .order('quantity', { ascending: true });

    if (error) throw error;

    // Get sales velocity for each variant (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: salesHistory, error: salesError }:any = await supabase
      .from('ProductHistory')
      .select('variant_id, quantity_change')
      .eq('source_type', 'client_invoice')
      .gte('created_at', thirtyDaysAgo.toISOString());

    if (salesError) throw salesError;

    const salesVelocity = new Map();
    for (const sale of salesHistory || []) {
      const variantId = sale.variant_id;
      const sold = Math.abs(sale.quantity_change);
      salesVelocity.set(variantId, (salesVelocity.get(variantId) || 0) + sold);
    }

    const alerts: LowStockAlert[] = [];

    for (const variant of variants || []) {
      const velocity = salesVelocity.get(variant.id) || 0;
      const dailyVelocity = velocity / 30;
      const daysOfStock = dailyVelocity > 0 ? variant.quantity / dailyVelocity : 999;
      const recommendedReorder = Math.max(Math.ceil(dailyVelocity * 30), 10); // 30 days worth or minimum 10

      alerts.push({
        product_id: variant.product_id,
        product_name: variant.Products?.name || 'Unknown Product',
        variant_id: variant.id,
        size: variant.size || 'Unknown',
        color: variant.color || 'Unknown',
        current_quantity: variant.quantity,
        recommended_reorder: recommendedReorder,
        days_of_stock: Math.round(daysOfStock)
      });
    }

    cache.set(cacheKey, alerts, 15 * 60 * 1000); // 15 minutes
    return alerts;
  },

  /**
   * Get period comparison data
   */
  async getPeriodComparison(
    currentStart: string,
    currentEnd: string,
    previousStart: string,
    previousEnd: string,
    forceRefresh = false
  ): Promise<PeriodComparison> {
    const cacheKey = `period_comparison_${currentStart}_${currentEnd}_${previousStart}_${previousEnd}`;
    
    if (!forceRefresh) {
      const cached = cache.get<PeriodComparison>(cacheKey);
      if (cached) return cached;
    }

    const [currentPeriod, previousPeriod] = await Promise.all([
      this.getSalesMetrics(currentStart, currentEnd, forceRefresh),
      this.getSalesMetrics(previousStart, previousEnd, forceRefresh)
    ]);

    const revenueChange = previousPeriod.total_revenue > 0 
      ? ((currentPeriod.total_revenue - previousPeriod.total_revenue) / previousPeriod.total_revenue) * 100 
      : 0;

    const invoiceCountChange = previousPeriod.invoice_count > 0 
      ? ((currentPeriod.invoice_count - previousPeriod.invoice_count) / previousPeriod.invoice_count) * 100 
      : 0;

    const growthRate = revenueChange;

    const comparison: PeriodComparison = {
      current_period: currentPeriod,
      previous_period: previousPeriod,
      growth_rate: growthRate,
      revenue_change: revenueChange,
      invoice_count_change: invoiceCountChange
    };

    cache.set(cacheKey, comparison);
    return comparison;
  },

  /**
   * Clear cache
   */
  clearCache(): void {
    cache.clear();
  },

  /**
   * Invalidate specific cache patterns
   */
  invalidateCache(pattern: string): void {
    cache.invalidatePattern(pattern);
  },

  /**
   * Record product history (for compatibility with existing product functions)
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
    
    // Invalidate relevant caches
    cache.invalidatePattern('inventory_metrics');
    cache.invalidatePattern('inventory_movement');
    cache.invalidatePattern('product_performance');
    cache.invalidatePattern('low_stock_alerts');
    
    return data;
  },

  /**
   * Get product history for analytics
   */
  async getProductHistory(productId: string, limit: number = 50): Promise<ProductHistoryEntry[]> {
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
   * Get variant history for analytics
   */
  async getVariantHistory(variantId: string, limit: number = 20): Promise<ProductHistoryEntry[]> {
    const { data, error } = await supabase
      .from('ProductHistory')
      .select('*')
      .eq('variant_id', variantId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }
};

// Legacy functions for backward compatibility
export const analyticsFunctions = {
  /**
   * Record product history entry
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
    return analyticsService.recordProductHistory(
      productId,
      variantId,
      quantityChange,
      previousQuantity,
      newQuantity,
      sourceType,
      sourceId,
      notes
    );
  },

  /**
   * Get product variant history
   */
  async getProductVariantHistory(
    variantId: string,
    limit: number = 20,
    forceRefresh: boolean = false
  ): Promise<ProductHistoryEntry[]> {
    return analyticsService.getVariantHistory(variantId, limit);
  },

  /**
   * Get product history
   */
  async getProductHistory(
    productId: string,
    limit: number = 50,
    forceRefresh: boolean = false
  ): Promise<ProductHistoryEntry[]> {
    return analyticsService.getProductHistory(productId, limit);
  },

  /**
   * Get top selling products (legacy format)
   */
  async getTopSellingProducts(
    startDate: string,
    endDate: string,
    limit: number = 10,
    forceRefresh: boolean = false
  ): Promise<TopSellersData[]> {
    const performance = await analyticsService.getProductPerformance(startDate, endDate, limit, forceRefresh);
    
    return performance.map(product => ({
      product_id: product.product_id,
      product_name: product.product_name,
      quantity_sold: product.total_sold,
      revenue: product.total_revenue,
      product_photo: product.photo || null,
      most_popular_variant: null // Would need additional logic to determine most popular variant
    }));
  },

  /**
   * Get inventory value (legacy format)
   */
  async getInventoryValue(forceRefresh: boolean = false): Promise<InventoryValueData> {
    const metrics = await analyticsService.getInventoryMetrics(forceRefresh);
    const performance = await analyticsService.getProductPerformance('1900-01-01', '2100-01-01', 1000, forceRefresh);
    
    return {
      total_value: metrics.total_retail_value,
      total_cost: metrics.total_cost_value,
      total_items: metrics.total_items,
      by_product: performance.map(product => ({
        product_id: product.product_id,
        product_name: product.product_name,
        value: product.stock_value,
        cost: product.stock_value * (product.profit_margin / 100), // Approximation
        items: product.current_stock
      }))
    };
  },

  /**
   * Get inventory time series (legacy format)
   */
  async getInventoryTimeSeries(
    startDate: string,
    endDate: string,
    interval: 'day' | 'week' | 'month' = 'day',
    forceRefresh: boolean = false
  ): Promise<TimeSeriesData[]> {
    const movement = await analyticsService.getInventoryMovement(startDate, endDate, interval, forceRefresh);
    
    return movement.map(data => ({
      date: data.date,
      sales: data.sales_out,
      purchases: data.purchases_in
    }));
  },

  /**
   * Get low stock products (legacy format)
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
    const alerts = await analyticsService.getLowStockAlerts(threshold, forceRefresh);
    
    return alerts.map(alert => ({
      product_id: alert.product_id,
      product_name: alert.product_name,
      variant_id: alert.variant_id,
      size: alert.size,
      color: alert.color,
      quantity: alert.current_quantity
    }));
  },

  /**
   * Get sales KPIs (legacy format)
   */
  async getSalesKPIs(
    currentStart: string,
    currentEnd: string,
    previousStart: string,
    previousEnd: string,
    forceRefresh: boolean = false
  ): Promise<SalesKPIData> {
    const comparison = await analyticsService.getPeriodComparison(
      currentStart,
      currentEnd,
      previousStart,
      previousEnd,
      forceRefresh
    );
    
    return {
      current_period: {
        total_sales: comparison.current_period.total_revenue,
        invoice_count: comparison.current_period.invoice_count,
        avg_order_value: comparison.current_period.avg_invoice_value
      },
      prev_period: {
        total_sales: comparison.previous_period.total_revenue,
        invoice_count: comparison.previous_period.invoice_count,
        avg_order_value: comparison.previous_period.avg_invoice_value
      },
      changes: {
        total_sales_change: comparison.revenue_change,
        invoice_count_change: comparison.invoice_count_change,
        avg_order_value_change: 0 // Would need additional calculation
      }
    };
  },

  /**
   * Clear analytics cache
   */
  clearCache(): void {
    analyticsService.clearCache();
  }
};