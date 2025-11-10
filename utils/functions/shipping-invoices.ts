// utils/functions/shipping-invoices.tsx

import { supabase } from '../supabase'

export interface ShippingProduct {
  product_id: string
  product_variant_id: string
  quantity: number
  note?: string
}

export interface ShippingInvoice {
  id: number
  invoice_id: number
  client_id?: number
  supplier_id?: string
  shipping_number: string
  created_at: string
  shipped_at: string
  products: ShippingProduct[]
  tracking_number?: string
  carrier?: string
  shipping_method?: string
  shipping_address?: string
  shipping_cost: number
  notes?: string
  files: string[]
  status: 'pending' | 'shipped' | 'delivered' | 'cancelled'
  delivered_at?: string
}

export interface ShippedQuantities {
  [variantId: string]: {
    ordered: number
    shipped: number
    remaining: number
  }
}

export const shippingInvoiceFunctions = {
  // Generate unique shipping number
  generateShippingNumber: async (isClient: boolean): Promise<string> => {
    const prefix = isClient ? 'CSH' : 'SSH'
    const date = new Date()
    const year = date.getFullYear().toString().slice(-2)
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    
    // Get count of shipping invoices this month
    const table = isClient ? 'ClientShippingInvoices' : 'SupplierShippingInvoices'
    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1).toISOString()
    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59).toISOString()
    
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfMonth)
      .lte('created_at', endOfMonth)
    
    if (error) {
      console.error('Error getting shipping invoice count:', error)
      // Fallback to timestamp
      return `${prefix}-${year}${month}-${Date.now().toString().slice(-6)}`
    }
    
    const sequenceNumber = ((count || 0) + 1).toString().padStart(4, '0')
    return `${prefix}-${year}${month}-${sequenceNumber}`
  },

  // Create shipping invoice
  createShippingInvoice: async (
    invoiceId: number,
    products: ShippingProduct[],
    shippingData: {
      tracking_number?: string
      carrier?: string
      shipping_method?: string
      shipping_address?: string
      shipping_cost?: number
      notes?: string
      shipped_at?: string
    },
    isClient: boolean
  ): Promise<ShippingInvoice> => {
    try {
      // First, validate that we're not shipping more than ordered
      const validation = await shippingInvoiceFunctions.validateShippingQuantities(
        invoiceId,
        products,
        isClient
      )
      
      if (!validation.isValid) {
        throw new Error(`Invalid shipping quantities: ${validation.errors.join(', ')}`)
      }

      // Get invoice details to get client/supplier ID
      const invoiceTable = isClient ? 'ClientInvoices' : 'SupplierInvoices'
      const { data: invoice, error: invoiceError } = await supabase
        .from(invoiceTable)
        .select('*')
        .eq('id', invoiceId)
        .single()

      if (invoiceError || !invoice) {
        throw new Error('Invoice not found')
      }

      const shippingNumber = await shippingInvoiceFunctions.generateShippingNumber(isClient)
      const table = isClient ? 'ClientShippingInvoices' : 'SupplierShippingInvoices'
      
      const shippingInvoiceData: any = {
        invoice_id: invoiceId,
        shipping_number: shippingNumber,
        products: products,
        tracking_number: shippingData.tracking_number,
        carrier: shippingData.carrier,
        shipping_method: shippingData.shipping_method,
        shipping_address: shippingData.shipping_address,
        shipping_cost: shippingData.shipping_cost || 0,
        notes: shippingData.notes,
        shipped_at: shippingData.shipped_at || new Date().toISOString(),
        status: 'shipped'
      }

      if (isClient) {
        shippingInvoiceData.client_id = invoice.client_id
      } else {
        shippingInvoiceData.supplier_id = invoice.supplier_id
      }

      const { data, error } = await supabase
        .from(table)
        .insert([shippingInvoiceData])
        .select()
        .single()

      if (error) throw error

      // Update invoice shipping status
      await shippingInvoiceFunctions.updateInvoiceShippingStatus(invoiceId, isClient)

      return data
    } catch (error) {
      console.error('Error creating shipping invoice:', error)
      throw error
    }
  },

  // Get all shipping invoices for an invoice
  getShippingInvoices: async (
    invoiceId: number,
    isClient: boolean
  ): Promise<ShippingInvoice[]> => {
    try {
      const table = isClient ? 'ClientShippingInvoices' : 'SupplierShippingInvoices'
      
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('invoice_id', invoiceId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching shipping invoices:', error)
      throw error
    }
  },

  // Calculate shipped quantities for an invoice
  getShippedQuantities: async (
    invoiceId: number,
    isClient: boolean
  ): Promise<ShippedQuantities> => {
    try {
      // Get original invoice
      const invoiceTable = isClient ? 'ClientInvoices' : 'SupplierInvoices'
      const { data: invoice, error: invoiceError } = await supabase
        .from(invoiceTable)
        .select('products')
        .eq('id', invoiceId)
        .single()

      if (invoiceError || !invoice) {
        throw new Error('Invoice not found')
      }

      // Get all shipping invoices
      const shippingInvoices = await shippingInvoiceFunctions.getShippingInvoices(
        invoiceId,
        isClient
      )

      // Calculate quantities
      const quantities: ShippedQuantities = {}

      // Initialize with ordered quantities
      for (const product of invoice.products || []) {
        quantities[product.product_variant_id] = {
          ordered: product.quantity,
          shipped: 0,
          remaining: product.quantity
        }
      }

      // Add up shipped quantities (excluding cancelled shipments)
      for (const shippingInvoice of shippingInvoices) {
        if (shippingInvoice.status !== 'cancelled') {
          for (const product of shippingInvoice.products || []) {
            if (quantities[product.product_variant_id]) {
              quantities[product.product_variant_id].shipped += product.quantity
              quantities[product.product_variant_id].remaining = 
                quantities[product.product_variant_id].ordered - 
                quantities[product.product_variant_id].shipped
            }
          }
        }
      }

      return quantities
    } catch (error) {
      console.error('Error calculating shipped quantities:', error)
      throw error
    }
  },

  // Validate shipping quantities
  validateShippingQuantities: async (
    invoiceId: number,
    products: ShippingProduct[],
    isClient: boolean
  ): Promise<{ isValid: boolean; errors: string[] }> => {
    try {
      const quantities = await shippingInvoiceFunctions.getShippedQuantities(
        invoiceId,
        isClient
      )

      const errors: string[] = []

      for (const product of products) {
        const variantQuantities = quantities[product.product_variant_id]
        
        if (!variantQuantities) {
          errors.push(`Product variant ${product.product_variant_id} not found in invoice`)
          continue
        }

        if (product.quantity > variantQuantities.remaining) {
          errors.push(
            `Cannot ship ${product.quantity} units of variant ${product.product_variant_id}. ` +
            `Only ${variantQuantities.remaining} units remaining (${variantQuantities.ordered} ordered, ${variantQuantities.shipped} already shipped)`
          )
        }
      }

      return {
        isValid: errors.length === 0,
        errors
      }
    } catch (error) {
      console.error('Error validating shipping quantities:', error)
      return {
        isValid: false,
        errors: ['Failed to validate shipping quantities']
      }
    }
  },

  // Update invoice shipping status based on shipped quantities
  updateInvoiceShippingStatus: async (
    invoiceId: number,
    isClient: boolean
  ): Promise<void> => {
    try {
      const quantities = await shippingInvoiceFunctions.getShippedQuantities(
        invoiceId,
        isClient
      )

      let totalOrdered = 0
      let totalShipped = 0

      for (const variantId in quantities) {
        totalOrdered += quantities[variantId].ordered
        totalShipped += quantities[variantId].shipped
      }

      let shippingStatus: 'unshipped' | 'partially_shipped' | 'fully_shipped'
      
      if (totalShipped === 0) {
        shippingStatus = 'unshipped'
      } else if (totalShipped >= totalOrdered) {
        shippingStatus = 'fully_shipped'
      } else {
        shippingStatus = 'partially_shipped'
      }

      const table = isClient ? 'ClientInvoices' : 'SupplierInvoices'
      
      const { error } = await supabase
        .from(table)
        .update({ shipping_status: shippingStatus })
        .eq('id', invoiceId)

      if (error) throw error
    } catch (error) {
      console.error('Error updating invoice shipping status:', error)
      throw error
    }
  },

  // Update shipping invoice status
  updateShippingInvoiceStatus: async (
    shippingInvoiceId: number,
    status: 'pending' | 'shipped' | 'delivered' | 'cancelled',
    isClient: boolean,
    deliveredAt?: string
  ): Promise<void> => {
    try {
      const table = isClient ? 'ClientShippingInvoices' : 'SupplierShippingInvoices'
      
      const updateData: any = { status }
      if (status === 'delivered' && deliveredAt) {
        updateData.delivered_at = deliveredAt
      }

      const { error } = await supabase
        .from(table)
        .update(updateData)
        .eq('id', shippingInvoiceId)

      if (error) throw error

      // Always update the invoice shipping status when shipping invoice status changes
      const { data: shippingInvoice, error: fetchError } = await supabase
        .from(table)
        .select('invoice_id')
        .eq('id', shippingInvoiceId)
        .single()

      if (!fetchError && shippingInvoice) {
        await shippingInvoiceFunctions.updateInvoiceShippingStatus(
          shippingInvoice.invoice_id,
          isClient
        )
      }
    } catch (error) {
      console.error('Error updating shipping invoice status:', error)
      throw error
    }
  },

  // Delete shipping invoice
  deleteShippingInvoice: async (
    shippingInvoiceId: number,
    isClient: boolean
  ): Promise<void> => {
    try {
      const table = isClient ? 'ClientShippingInvoices' : 'SupplierShippingInvoices'
      
      // Get invoice ID before deletion
      const { data: shippingInvoice, error: fetchError } = await supabase
        .from(table)
        .select('invoice_id')
        .eq('id', shippingInvoiceId)
        .single()

      if (fetchError) throw fetchError

      // Delete the shipping invoice
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', shippingInvoiceId)

      if (error) throw error

      // Update invoice shipping status
      if (shippingInvoice) {
        await shippingInvoiceFunctions.updateInvoiceShippingStatus(
          shippingInvoice.invoice_id,
          isClient
        )
      }
    } catch (error) {
      console.error('Error deleting shipping invoice:', error)
      throw error
    }
  },

  // Get all shipping invoices with filters
  getAllShippingInvoices: async (
    isClient: boolean,
    filters?: {
      status?: string
      startDate?: Date
      endDate?: Date
      entityId?: number | string
      searchTerm?: string
    }
  ): Promise<ShippingInvoice[]> => {
    try {
      const table = isClient ? 'ClientShippingInvoices' : 'SupplierShippingInvoices'
      let query = supabase.from(table).select('*')

      if (filters?.status) {
        query = query.eq('status', filters.status)
      }

      if (filters?.startDate) {
        query = query.gte('shipped_at', filters.startDate.toISOString())
      }

      if (filters?.endDate) {
        query = query.lte('shipped_at', filters.endDate.toISOString())
      }

      if (filters?.entityId) {
        const field = isClient ? 'client_id' : 'supplier_id'
        query = query.eq(field, filters.entityId)
      }

      if (filters?.searchTerm) {
        query = query.or(
          `shipping_number.ilike.%${filters.searchTerm}%,tracking_number.ilike.%${filters.searchTerm}%`
        )
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching all shipping invoices:', error)
      throw error
    }
  }
}