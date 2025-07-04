import { supabase } from '../supabase'

// Types for the product history system
export interface ProductHistoryEntry {
  id: string
  product_id: string
  variant_id?: string
  change_type: 'inventory' | 'price' | 'details' | 'variant' | 'creation' | 'deletion'
  field_name?: string // For detail changes (e.g., 'name', 'description', 'cost')
  old_value?: string | number
  new_value?: string | number
  quantity_change?: number
  source_type: 'manual' | 'invoice' | 'order' | 'return' | 'adjustment' | 'import' | 'system' | 'client_invoice' | 'supplier_invoice' | 'quotation'
  source_id?: string
  source_reference?: string // e.g., "Invoice #123", "Order #456"
  user_id?: string
  user_email?: string
  notes?: string
  created_at: string
}

export interface ProductHistorySummary {
  total_in: number
  total_out: number
  current_quantity: number
  last_updated: string
  total_transactions: number
}

export const analyticsFunctions = {
  // Main function to record any product change
  async recordProductChange(params: {
    productId: string
    variantId?: string
    changeType: ProductHistoryEntry['change_type']
    fieldName?: string
    oldValue?: string | number
    newValue?: string | number
    quantityChange?: number
    sourceType: ProductHistoryEntry['source_type']
    sourceId?: string
    sourceReference?: string
    notes?: string
    userId?: string
    userEmail?: string
  }): Promise<void> {
    try {
      const historyEntry = {
        product_id: params.productId,
        variant_id: params.variantId,
        change_type: params.changeType,
        field_name: params.fieldName,
        old_value: params.oldValue?.toString(),
        new_value: params.newValue?.toString(),
        quantity_change: params.quantityChange,
        source_type: params.sourceType,
        source_id: params.sourceId,
        source_reference: params.sourceReference,
        user_id: params.userId,
        user_email: params.userEmail,
        notes: params.notes,
        created_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('ProductHistory')
        .insert(historyEntry)

      if (error) {
        console.error('Error inserting product history:', error)
        throw error
      }
    } catch (error) {
      console.error('Error recording product change:', error)
      // Don't throw - we don't want history tracking to break the main operation
    }
  },

  // Simplified function for inventory changes - NOW EXPORTED
  async recordInventoryChange(
    productId: string,
    variantId: string,
    quantityChange: number,
    sourceType: ProductHistoryEntry['source_type'],
    sourceId: string = '',
    notes: string = ''
  ): Promise<void> {
    try {
      // Get current quantity for the variant
      const { data: variant, error: variantError } = await supabase
        .from('ProductVariants')
        .select('quantity')
        .eq('id', variantId)
        .single()

      if (variantError) {
        console.error('Error fetching variant:', variantError)
        throw variantError
      }

      const currentQty = variant?.quantity || 0
      const newQty = currentQty + quantityChange

      await this.recordProductChange({
        productId,
        variantId,
        changeType: 'inventory',
        quantityChange,
        oldValue: currentQty,
        newValue: newQty,
        sourceType,
        sourceId,
        notes
      })
    } catch (error) {
      console.error('Error in recordInventoryChange:', error)
    }
  },

  // Get product history with better organization
  async getProductHistory(
    productId: string,
    options: {
      variantId?: string
      changeType?: ProductHistoryEntry['change_type']
      startDate?: Date
      endDate?: Date
      limit?: number
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

      if (options.changeType) {
        query = query.eq('change_type', options.changeType)
      }

      if (options.startDate) {
        query = query.gte('created_at', options.startDate.toISOString())
      }

      if (options.endDate) {
        query = query.lte('created_at', options.endDate.toISOString())
      }

      if (options.limit) {
        query = query.limit(options.limit)
      }

      const { data, error } = await query

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching product history:', error)
      return []
    }
  },

  // Get inventory summary for a product or variant
  async getInventorySummary(
    productId: string,
    variantId?: string
  ): Promise<ProductHistorySummary | null> {
    try {
      let query = supabase
        .from('ProductHistory')
        .select('*')
        .eq('product_id', productId)
        .eq('change_type', 'inventory')

      if (variantId) {
        query = query.eq('variant_id', variantId)
      }

      const { data, error } = await query

      if (error) throw error
      if (!data || data.length === 0) return null

      // Calculate summary
      let totalIn = 0
      let totalOut = 0
      let currentQuantity = 0

      data.forEach(entry => {
        const change = entry.quantity_change || 0
        if (change > 0) {
          totalIn += change
        } else {
          totalOut += Math.abs(change)
        }
      })

      // Get current quantity from the latest entry
      const latestEntry = data[0]
      currentQuantity = parseInt(latestEntry.new_value) || 0

      return {
        total_in: totalIn,
        total_out: totalOut,
        current_quantity: currentQuantity,
        last_updated: latestEntry.created_at,
        total_transactions: data.length
      }
    } catch (error) {
      console.error('Error getting inventory summary:', error)
      return null
    }
  },

  // Get timeline of all changes for a product
  async getProductTimeline(
    productId: string,
    limit: number = 50
  ): Promise<ProductHistoryEntry[]> {
    try {
      const { data, error } = await supabase
        .from('ProductHistory')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching product timeline:', error)
      return []
    }
  },

  // Utility function to format history entries for display
  formatHistoryEntry(entry: ProductHistoryEntry): string {
    switch (entry.change_type) {
      case 'inventory':
        const qty = entry.quantity_change || 0
        const action = qty > 0 ? 'Added' : 'Removed'
        return `${action} ${Math.abs(qty)} units${entry.source_reference ? ` (${entry.source_reference})` : ''}`
      
      case 'price':
        return `Price changed from $${entry.old_value} to $${entry.new_value}`
      
      case 'details':
        return `${entry.field_name} updated${entry.old_value ? ` from "${entry.old_value}"` : ''} to "${entry.new_value}"`
      
      case 'variant':
        return `Variant ${entry.new_value === 'added' ? 'added' : 'removed'}`
      
      case 'creation':
        return 'Product created'
      
      case 'deletion':
        return 'Product deleted'
      
      default:
        return entry.notes || 'Unknown change'
    }
  },

  // Helper to get change type icon/color
  getChangeTypeDisplay(changeType: ProductHistoryEntry['change_type']): {
    icon: string
    color: string
    label: string
  } {
    switch (changeType) {
      case 'inventory':
        return { icon: '📦', color: 'blue', label: 'Inventory' }
      case 'price':
        return { icon: '💰', color: 'green', label: 'Price' }
      case 'details':
        return { icon: '📝', color: 'purple', label: 'Details' }
      case 'variant':
        return { icon: '🎨', color: 'orange', label: 'Variant' }
      case 'creation':
        return { icon: '✨', color: 'teal', label: 'Created' }
      case 'deletion':
        return { icon: '🗑️', color: 'red', label: 'Deleted' }
      default:
        return { icon: '❓', color: 'gray', label: 'Other' }
    }
  }
}