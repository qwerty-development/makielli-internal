import { supabase } from '../supabase'

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

export const productHistoryFunctions = {
  // Get complete product history with all details
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

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching product history:', error)
      throw error
    }
  },

  // Get product history summary
  async getProductHistorySummary(productId: string): Promise<ProductHistorySummary> {
    try {
      const { data, error }:any = await supabase
        .rpc('get_product_history_summary', { p_product_id: productId })
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error fetching product history summary:', error)
      throw error
    }
  },

  // Get variant-specific sales details
  async getVariantSalesDetails(productId: string): Promise<VariantSalesDetail[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_variant_sales_details', { p_product_id: productId })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching variant sales details:', error)
      throw error
    }
  },

  // Get customer purchase history for a product
  async getCustomerPurchaseHistory(productId: string): Promise<CustomerPurchaseHistory[]> {
    try {
      const { data: historyData, error: historyError } = await supabase
        .from('product_sales_history')
        .select('*')
        .eq('product_id', productId)
        .lt('quantity_change', 0) // Only sales (negative changes)
        .not('client_id', 'is', null)

      if (historyError) throw historyError

      // Group by customer
      const customerMap = new Map<number, CustomerPurchaseHistory>()

      for (const record of historyData || []) {
        const clientId = record.client_id
        if (!clientId) continue

        if (!customerMap.has(clientId)) {
          customerMap.set(clientId, {
            client_id: clientId,
            client_name: record.client_name,
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
      throw error
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

      const rows = history.map(record => [
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
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n')

      return csv
    } catch (error) {
      console.error('Error exporting product history:', error)
      throw error
    }
  }
}