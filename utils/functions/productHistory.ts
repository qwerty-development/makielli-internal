import { supabase } from '../supabase'

export interface ProductHistoryEntry {
  id: string
  product_id: string
  variant_id?: string
  change_type: 'creation' | 'deletion' | 'inventory' | 'price' | 'details' | 'variant'
  field_name?: string
  old_value?: string
  new_value?: string
  quantity_change?: number
  source_type: 'manual' | 'client_invoice' | 'supplier_invoice' | 'adjustment' | 'quotation' | 'return' | 'trigger'
  source_id?: string
  source_reference?: string
  notes?: string
  created_at: string
}

export interface ProductHistoryDetail {
  id: string
  product_id: string
  variant_id: string
  quantity_change: number
  source_type: string
  source_id: string
  source_reference: string
  notes: string
  created_at: string
  product_name: string
  product_photo: string
  product_price: number
  size: string
  color: string
  current_stock: number
  client_id: number
  invoice_order_number: string
  invoice_type: string
  currency: string
  invoice_total: number
  client_name: string
  client_email: string
  client_phone: string
  quotation_id: number
  quotation_order_number: string
}

export interface ProductHistorySummary {
  total_sold: number
  total_purchased: number
  total_adjusted: number
  unique_customers: number
  first_sale_date: string | null
  last_sale_date: string | null
  avg_sale_quantity: number
}

export interface VariantSalesDetail {
  variant_id: string
  size: string
  color: string
  total_sold: number
  current_stock: number
  unique_customers: number
}

export interface CustomerPurchaseHistory {
  client_id: number
  client_name: string
  total_purchased: number
  last_purchase_date: string
  purchase_count: number
  variants_purchased: {
    size: string
    color: string
    quantity: number
  }[]
}

export const analyticsFunctions = {
  /**
   * Record a product change in the history table
   */
  async recordProductChange(entry: Omit<ProductHistoryEntry, 'id' | 'created_at'>): Promise<void> {
    try {
      const { error } = await supabase
        .from('ProductHistory')
        .insert([{
          product_id: entry.product_id,
          variant_id: entry.variant_id || null,
          change_type: entry.change_type,
          field_name: entry.field_name || null,
          old_value: entry.old_value?.toString() || null,
          new_value: entry.new_value?.toString() || null,
          quantity_change: entry.quantity_change || null,
          source_type: entry.source_type,
          source_id: entry.source_id || null,
          source_reference: entry.source_reference || null,
          notes: entry.notes || null
        }])

      if (error) {
        console.error('Error recording product change:', error)
        throw error
      }
    } catch (error) {
      console.error('Failed to record product change:', error)
      // Don't throw here to prevent breaking the main operation
      // throw error
    }
  },

  /**
   * Get product history entries from the base table
   */
  async getProductHistory(
    productId: string,
    options: {
      variantId?: string
      startDate?: Date
      endDate?: Date
      limit?: number
      changeType?: string
    } = {}
  ): Promise<ProductHistoryEntry[]> {
    try {
      let query = supabase
        .from('ProductHistory')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: false })

      if (options.variantId) {
        query = query.eq('variant_id', options.variantId)
      }

      if (options.startDate) {
        query = query.gte('created_at', options.startDate.toISOString())
      }

      if (options.endDate) {
        query = query.lte('created_at', options.endDate.toISOString())
      }

      if (options.changeType) {
        query = query.eq('change_type', options.changeType)
      }

      if (options.limit) {
        query = query.limit(options.limit)
      }

      const { data, error } = await query

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching product history:', error)
      throw error
    }
  },

  /**
   * Get variant-specific history
   */
  async getVariantHistory(
    productId: string,
    variantId: string,
    options: {
      startDate?: Date
      endDate?: Date
      limit?: number
    } = {}
  ): Promise<ProductHistoryEntry[]> {
    return this.getProductHistory(productId, {
      ...options,
      variantId
    })
  },

  /**
   * Get inventory change history only
   */
  async getInventoryHistory(
    productId: string,
    options: {
      variantId?: string
      startDate?: Date
      endDate?: Date
      limit?: number
    } = {}
  ): Promise<ProductHistoryEntry[]> {
    return this.getProductHistory(productId, {
      ...options,
      changeType: 'inventory'
    })
  },

  /**
   * Get recent product changes across all products
   */
  async getRecentChanges(
    limit: number = 50,
    changeType?: string
  ): Promise<(ProductHistoryEntry & { product_name: string; variant_info?: string })[]> {
    try {
      let query = supabase
        .from('ProductHistory')
        .select(`
          *,
          product:Products!inner(name),
          variant:ProductVariants(size, color)
        `)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (changeType) {
        query = query.eq('change_type', changeType)
      }

      const { data, error } = await query

      if (error) throw error

      return (data || []).map(item => ({
        ...item,
        product_name: item.product?.name || 'Unknown Product',
        variant_info: item.variant 
          ? `${item.variant.color} - ${item.variant.size}`
          : undefined
      }))
    } catch (error) {
      console.error('Error fetching recent changes:', error)
      throw error
    }
  }
}

export const productHistoryFunctions:any = {
  // Get complete product history with all details (tries advanced view first, falls back to basic)
  async getProductHistory(
    productId: string,
    filters?: {
      startDate?: Date
      endDate?: Date
      clientId?: number
      variantId?: string
      sourceType?: string
    }
  ): Promise<ProductHistoryDetail[]> {
    try {
      // First try the advanced view with sales details
      let query = supabase
        .from('product_sales_history')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: false })

      if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate.toISOString())
      }
      if (filters?.endDate) {
        query = query.lte('created_at', filters.endDate.toISOString())
      }
      if (filters?.clientId) {
        query = query.eq('client_id', filters.clientId)
      }
      if (filters?.variantId) {
        query = query.eq('variant_id', filters.variantId)
      }
      if (filters?.sourceType) {
        query = query.eq('source_type', filters.sourceType)
      }

      const { data, error } = await query

      if (error) {
        console.warn('product_sales_history view not found or error occurred, falling back to basic history:', error)
        // Fallback to basic history
        return this.getBasicProductHistory(productId, filters)
      }
      return data || []
    } catch (error) {
      console.error('Error fetching product history, trying fallback:', error)
      return this.getBasicProductHistory(productId, filters)
    }
  },

  // Fallback method using basic ProductHistory table with joins
  async getBasicProductHistory(
    productId: string,
    filters?: {
      startDate?: Date
      endDate?: Date
      variantId?: string
      sourceType?: string
    }
  ): Promise<Partial<ProductHistoryDetail>[]> {
    try {
      let query = supabase
        .from('ProductHistory')
        .select(`
          *,
          product:Products!inner(name, photo, price),
          variant:ProductVariants(size, color, quantity)
        `)
        .eq('product_id', productId)
        .eq('change_type', 'inventory')
        .order('created_at', { ascending: false })

      if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate.toISOString())
      }
      if (filters?.endDate) {
        query = query.lte('created_at', filters.endDate.toISOString())
      }
      if (filters?.variantId) {
        query = query.eq('variant_id', filters.variantId)
      }
      if (filters?.sourceType) {
        query = query.eq('source_type', filters.sourceType)
      }

      const { data, error } = await query

      if (error) throw error

      return (data || []).map(item => ({
        id: item.id,
        product_id: item.product_id,
        variant_id: item.variant_id || '',
        quantity_change: item.quantity_change || 0,
        source_type: item.source_type,
        source_id: item.source_id || '',
        source_reference: item.source_reference || '',
        notes: item.notes || '',
        created_at: item.created_at,
        product_name: item.product?.name || 'Unknown',
        product_photo: item.product?.photo || '',
        product_price: item.product?.price || 0,
        size: item.variant?.size || '',
        color: item.variant?.color || '',
        current_stock: item.variant?.quantity || 0,
        client_id: 0,
        invoice_order_number: '',
        invoice_type: '',
        currency: '',
        invoice_total: 0,
        client_name: '',
        client_email: '',
        client_phone: '',
        quotation_id: 0,
        quotation_order_number: ''
      }))
    } catch (error) {
      console.error('Error fetching basic product history:', error)
      throw error
    }
  },

  // Get product history summary (tries RPC first, falls back to calculation)
  async getProductHistorySummary(productId: string): Promise<ProductHistorySummary> {
    try {
      // First try the RPC function
      const { data, error }: any = await supabase
        .rpc('get_product_history_summary', { p_product_id: productId })
        .single()

      if (error) {
        console.warn('RPC get_product_history_summary not found, calculating manually:', error)
        return this.calculateProductHistorySummary(productId)
      }
      return data
    } catch (error) {
      console.error('Error fetching product history summary, calculating manually:', error)
      return this.calculateProductHistorySummary(productId)
    }
  },

  // Fallback calculation for summary
  async calculateProductHistorySummary(productId: string): Promise<ProductHistorySummary> {
    try {
      const { data, error } = await supabase
        .from('ProductHistory')
        .select('quantity_change, source_type, created_at')
        .eq('product_id', productId)
        .eq('change_type', 'inventory')

      if (error) throw error

      const history = data || []
      
      const total_sold = Math.abs(history
        .filter(h => h.source_type === 'client_invoice' && (h.quantity_change || 0) < 0)
        .reduce((sum, h) => sum + (h.quantity_change || 0), 0))
      
      const total_purchased = history
        .filter(h => h.source_type === 'supplier_invoice' && (h.quantity_change || 0) > 0)
        .reduce((sum, h) => sum + (h.quantity_change || 0), 0)
      
      const total_adjusted = history
        .filter(h => ['adjustment', 'manual', 'trigger'].includes(h.source_type))
        .reduce((sum, h) => sum + Math.abs(h.quantity_change || 0), 0)

      const salesHistory = history.filter(h => h.source_type === 'client_invoice' && (h.quantity_change || 0) < 0)
      const unique_customers = 0 // Would need to join with invoice data to get this accurately
      const first_sale_date = salesHistory.length > 0 ? salesHistory[salesHistory.length - 1].created_at : null
      const last_sale_date = salesHistory.length > 0 ? salesHistory[0].created_at : null
      const avg_sale_quantity = salesHistory.length > 0 ? total_sold / salesHistory.length : 0

      return {
        total_sold,
        total_purchased,
        total_adjusted,
        unique_customers,
        first_sale_date,
        last_sale_date,
        avg_sale_quantity
      }
    } catch (error) {
      console.error('Error calculating product history summary:', error)
      // Return empty summary on error
      return {
        total_sold: 0,
        total_purchased: 0,
        total_adjusted: 0,
        unique_customers: 0,
        first_sale_date: null,
        last_sale_date: null,
        avg_sale_quantity: 0
      }
    }
  },

  // Get variant-specific sales details (tries RPC first, falls back to calculation)
  async getVariantSalesDetails(productId: string): Promise<VariantSalesDetail[]> {
    try {
      // First try the RPC function
      const { data, error } = await supabase
        .rpc('get_variant_sales_details', { p_product_id: productId })

      if (error) {
        console.warn('RPC get_variant_sales_details not found, calculating manually:', error)
        return this.calculateVariantSalesDetails(productId)
      }
      return data || []
    } catch (error) {
      console.error('Error fetching variant sales details, calculating manually:', error)
      return this.calculateVariantSalesDetails(productId)
    }
  },

  // Fallback calculation for variant sales details
  async calculateVariantSalesDetails(productId: string): Promise<VariantSalesDetail[]> {
    try {
      // Get all variants for this product
      const { data: variants, error: variantsError } = await supabase
        .from('ProductVariants')
        .select('id, size, color, quantity')
        .eq('product_id', productId)

      if (variantsError) throw variantsError

      // Get sales history for each variant
      const variantSalesDetails = await Promise.all(
        (variants || []).map(async (variant) => {
          const { data: salesHistory, error: historyError } = await supabase
            .from('ProductHistory')
            .select('quantity_change')
            .eq('product_id', productId)
            .eq('variant_id', variant.id)
            .eq('change_type', 'inventory')
            .eq('source_type', 'client_invoice')
            .lt('quantity_change', 0)

          if (historyError) {
            console.error('Error fetching variant history:', historyError)
            return {
              variant_id: variant.id,
              size: variant.size,
              color: variant.color,
              total_sold: 0,
              current_stock: variant.quantity,
              unique_customers: 0
            }
          }

          const total_sold = Math.abs((salesHistory || [])
            .reduce((sum, h) => sum + (h.quantity_change || 0), 0))

          return {
            variant_id: variant.id,
            size: variant.size,
            color: variant.color,
            total_sold,
            current_stock: variant.quantity,
            unique_customers: 0 // Would need invoice data to calculate this
          }
        })
      )

      return variantSalesDetails.sort((a, b) => b.total_sold - a.total_sold)
    } catch (error) {
      console.error('Error calculating variant sales details:', error)
      return []
    }
  },

  // Get customer purchase history for a product
  async getCustomerPurchaseHistory(productId: string): Promise<CustomerPurchaseHistory[]> {
    try {
      // Try the advanced view first
      const { data: historyData, error: historyError } = await supabase
        .from('product_sales_history')
        .select('*')
        .eq('product_id', productId)
        .lt('quantity_change', 0) // Only sales (negative changes)
        .not('client_id', 'is', null)
        .not('client_name', 'is', null) // Ensure we have customer names

      if (historyError) {
        console.warn('product_sales_history view not available, using fallback method:', historyError)
        return this.getBasicCustomerPurchaseHistory(productId)
      }

      // Group by customer
      const customerMap = new Map<number, CustomerPurchaseHistory>()

      for (const record of historyData || []) {
        const clientId = record.client_id
        const clientName = record.client_name
        
        // Skip if no client info
        if (!clientId || !clientName || clientName === 'N/A') continue

        if (!customerMap.has(clientId)) {
          customerMap.set(clientId, {
            client_id: clientId,
            client_name: clientName,
            total_purchased: 0,
            last_purchase_date: record.created_at,
            purchase_count: 0,
            variants_purchased: []
          })
        }

        const customer = customerMap.get(clientId)!
        customer.total_purchased += Math.abs(record.quantity_change)
        customer.purchase_count += 1
        
        if (new Date(record.created_at) > new Date(customer.last_purchase_date)) {
          customer.last_purchase_date = record.created_at
        }

        // Add variant info
        const existingVariant = customer.variants_purchased.find(
          v => v.size === record.size && v.color === record.color
        )
        
        if (existingVariant) {
          existingVariant.quantity += Math.abs(record.quantity_change)
        } else {
          customer.variants_purchased.push({
            size: record.size,
            color: record.color,
            quantity: Math.abs(record.quantity_change)
          })
        }
      }

      return Array.from(customerMap.values()).sort(
        (a, b) => b.total_purchased - a.total_purchased
      )
    } catch (error) {
      console.error('Error fetching customer purchase history:', error)
      return this.getBasicCustomerPurchaseHistory(productId)
    }
  },

  // Fallback method for customer purchase history
  async getBasicCustomerPurchaseHistory(productId: string): Promise<CustomerPurchaseHistory[]> {
    try {
      // This would require joining ProductHistory with invoice data
      // For now, return empty array since we don't have the full sales view
      console.warn('Basic customer purchase history not implemented - requires sales data integration')
      return []
    } catch (error) {
      console.error('Error in basic customer purchase history:', error)
      return []
    }
  },

  // Get all products with basic history info for list view
  async getAllProductsWithHistory(): Promise<{
    id: string
    name: string
    photo: string
    total_sold: number
    unique_customers: number
    last_sale_date: string | null
    current_stock: number
  }[]> {
    try {
      // Get all products
      const { data: products, error: productsError } = await supabase
        .from('Products')
        .select(`
          id,
          name,
          photo,
          variants:ProductVariants(quantity)
        `)

      if (productsError) throw productsError

      // Get history summary for each product
      const productsWithHistory = await Promise.all(
        (products || []).map(async (product) => {
          const summary = await this.getProductHistorySummary(product.id)
          const currentStock = product.variants?.reduce(
            (sum: number, v: any) => sum + (v.quantity || 0), 
            0
          ) || 0

          return {
            id: product.id,
            name: product.name,
            photo: product.photo,
            total_sold: summary.total_sold,
            unique_customers: summary.unique_customers,
            last_sale_date: summary.last_sale_date,
            current_stock: currentStock
          }
        })
      )

      return productsWithHistory.sort((a, b) => b.total_sold - a.total_sold)
    } catch (error) {
      console.error('Error fetching all products with history:', error)
      throw error
    }
  },

  // Export product history to CSV
  async exportProductHistoryToCSV(productId: string): Promise<string> {
    try {
      const history = await this.getProductHistory(productId)
      
      const headers = [
        'Date',
        'Type',
        'Order/Invoice #',
        'Customer',
        'Size',
        'Color',
        'Quantity',
        'Notes'
      ]

      const rows = history.map((record: { created_at: string | number | Date; source_type: string; invoice_order_number: any; quotation_order_number: any; source_reference: any; client_name: any; size: any; color: any; quantity_change: number; notes: any }) => [
        new Date(record.created_at).toLocaleDateString(),
        record.source_type.replace('_', ' ').toUpperCase(),
        record.invoice_order_number || record.quotation_order_number || record.source_reference || '',
        record.client_name || 'N/A',
        record.size,
        record.color,
        Math.abs(record.quantity_change).toString(),
        record.notes || ''
      ])

      const csv = [
        headers.join(','),
        ...rows.map((row: any[]) => row.map((cell: any) => `"${cell}"`).join(','))
      ].join('\n')

      return csv
    } catch (error) {
      console.error('Error exporting product history:', error)
      throw error
    }
  },

  // Get comprehensive product analytics
  async getProductAnalytics(
    productId: string,
    options: {
      startDate?: Date
      endDate?: Date
    } = {}
  ): Promise<{
    totalInventoryChanges: number
    totalQuantityIn: number
    totalQuantityOut: number
    netQuantityChange: number
    lastActivityDate: string | null
    mostActiveVariant: string | null
    changesBySource: Record<string, number>
    zeroStockVariants: number
    negativeStockVariants: number
  }> {
    try {
      let query = supabase
        .from('ProductHistory')
        .select('*')
        .eq('product_id', productId)
        .eq('change_type', 'inventory')

      if (options.startDate) {
        query = query.gte('created_at', options.startDate.toISOString())
      }

      if (options.endDate) {
        query = query.lte('created_at', options.endDate.toISOString())
      }

      const { data, error } = await query

      if (error) throw error

      const history = data || []
      const totalInventoryChanges = history.length
      const totalQuantityIn = history
        .filter(h => (h.quantity_change || 0) > 0)
        .reduce((sum, h) => sum + (h.quantity_change || 0), 0)
      const totalQuantityOut = Math.abs(history
        .filter(h => (h.quantity_change || 0) < 0)
        .reduce((sum, h) => sum + (h.quantity_change || 0), 0))
      const netQuantityChange = totalQuantityIn - totalQuantityOut

      const lastActivityDate = history.length > 0 ? history[0].created_at : null

      // Find most active variant
      const variantCounts: Record<string, number> = {}
      history.forEach(h => {
        if (h.variant_id) {
          variantCounts[h.variant_id] = (variantCounts[h.variant_id] || 0) + 1
        }
      })
      const mostActiveVariant = Object.keys(variantCounts).length > 0 
        ? Object.keys(variantCounts).reduce((a, b) => variantCounts[a] > variantCounts[b] ? a : b)
        : null

      // Changes by source
      const changesBySource: Record<string, number> = {}
      history.forEach(h => {
        changesBySource[h.source_type] = (changesBySource[h.source_type] || 0) + 1
      })

      // Get current variant stats
      const { data: variants, error: variantsError } = await supabase
        .from('ProductVariants')
        .select('quantity')
        .eq('product_id', productId)

      const zeroStockVariants = variants?.filter(v => v.quantity === 0).length || 0
      const negativeStockVariants = variants?.filter(v => v.quantity < 0).length || 0

      return {
        totalInventoryChanges,
        totalQuantityIn,
        totalQuantityOut,
        netQuantityChange,
        lastActivityDate,
        mostActiveVariant,
        changesBySource,
        zeroStockVariants,
        negativeStockVariants
      }
    } catch (error) {
      console.error('Error getting product analytics:', error)
      throw error
    }
  }
}