// components/ShippingInvoiceModal.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { FaTruck, FaSpinner, FaExclamationTriangle, FaBox, FaCheck } from 'react-icons/fa'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { toast } from 'react-hot-toast'
import { shippingInvoiceFunctions, ShippingProduct, ShippedQuantities } from '@/utils/functions/shipping-invoices'
import { Product, ProductVariant } from '@/utils/functions/products'
import { supabase } from '@/utils/supabase'

interface ShippingInvoiceModalProps {
  isOpen: boolean
  onClose: () => void
  invoice: any
  products: Product[]
  isClientInvoice: boolean
  onSuccess: () => void
}

const ShippingInvoiceModal: React.FC<ShippingInvoiceModalProps> = ({
  isOpen,
  onClose,
  invoice,
  products,
  isClientInvoice,
  onSuccess
}) => {
  const [isLoading, setIsLoading] = useState(false)
  const [shippedQuantities, setShippedQuantities] = useState<ShippedQuantities>({})
  const [selectedProducts, setSelectedProducts] = useState<{ [variantId: string]: number }>({})
  const [shippingData, setShippingData] = useState({
    tracking_number: '',
    carrier: '',
    shipping_method: 'standard',
    shipping_address: '',
    shipping_cost: 0,
    notes: '',
    shipped_at: new Date()
  })
  const [errors, setErrors] = useState<string[]>([])

  useEffect(() => {
    if (isOpen && invoice) {
      loadShippedQuantities()
      initializeSelection()
    }
  }, [isOpen, invoice])

  const loadShippedQuantities = async () => {
    try {
      const quantities = await shippingInvoiceFunctions.getShippedQuantities(
        invoice.id,
        isClientInvoice
      )
      setShippedQuantities(quantities)
    } catch (error) {
      console.error('Error loading shipped quantities:', error)
      toast.error('Failed to load shipping data')
    }
  }

  const initializeSelection = () => {
    // Initialize with all remaining quantities selected
    const selection: { [variantId: string]: number } = {}
    
    if (invoice.products) {
      for (const product of invoice.products) {
        // Default to 0, user will select what to ship
        selection[product.product_variant_id] = 0
      }
    }
    
    setSelectedProducts(selection)

    // Pre-fill shipping address for client invoices
    if (isClientInvoice && invoice.client_id) {
      loadClientAddress(invoice.client_id)
    }
  }

  const loadClientAddress = async (clientId: number) => {
    try {
      const { data, error } = await supabase
        .from('Clients')
        .select('address')
        .eq('client_id', clientId)
        .single()

      if (data && data.address) {
        setShippingData(prev => ({ ...prev, shipping_address: data.address }))
      }
    } catch (error) {
      console.error('Error loading client address:', error)
    }
  }

  const getProductDetails = (productId: string) => {
    return products.find(p => p.id === productId)
  }

  const getVariantDetails = (productId: string, variantId: string): ProductVariant | null => {
    const product = getProductDetails(productId)
    if (!product || !product.variants) return null
    return product.variants.find(v => v.id === variantId) || null
  }

  const handleQuantityChange = (variantId: string, value: number) => {
    const maxQuantity = shippedQuantities[variantId]?.remaining || 0
    const finalValue = Math.min(Math.max(0, value), maxQuantity)
    
    setSelectedProducts(prev => ({
      ...prev,
      [variantId]: finalValue
    }))
  }

  const selectAllRemaining = () => {
    const selection: { [variantId: string]: number } = {}
    
    for (const variantId in shippedQuantities) {
      selection[variantId] = shippedQuantities[variantId].remaining
    }
    
    setSelectedProducts(selection)
    toast.success('Selected all remaining quantities')
  }

  const validateShipping = (): boolean => {
    const newErrors: string[] = []

    // Check if any products are selected
    const hasSelectedProducts = Object.values(selectedProducts).some(qty => qty > 0)
    if (!hasSelectedProducts) {
      newErrors.push('Please select at least one product to ship')
    }

    // Validate quantities
    for (const variantId in selectedProducts) {
      const quantity = selectedProducts[variantId]
      if (quantity > 0) {
        const maxQuantity = shippedQuantities[variantId]?.remaining || 0
        if (quantity > maxQuantity) {
          newErrors.push(`Invalid quantity for variant ${variantId}`)
        }
      }
    }

    if (!shippingData.shipped_at) {
      newErrors.push('Shipping date is required')
    }

    if (!shippingData.shipping_address?.trim()) {
      newErrors.push('Shipping address is required')
    }

    setErrors(newErrors)
    return newErrors.length === 0
  }

  const handleCreateShippingInvoice = async () => {
    if (!validateShipping()) {
      toast.error('Please fix validation errors')
      return
    }

    setIsLoading(true)

    try {
      // Build shipping products array
      const shippingProducts: ShippingProduct[] = []
      
      for (const invoiceProduct of invoice.products || []) {
        const quantity = selectedProducts[invoiceProduct.product_variant_id] || 0
        if (quantity > 0) {
          shippingProducts.push({
            product_id: invoiceProduct.product_id,
            product_variant_id: invoiceProduct.product_variant_id,
            quantity: quantity,
            note: invoiceProduct.note || ''
          })
        }
      }

      if (shippingProducts.length === 0) {
        throw new Error('No products selected for shipping')
      }

      // Create shipping invoice
      await shippingInvoiceFunctions.createShippingInvoice(
        invoice.id,
        shippingProducts,
        {
          ...shippingData,
          shipped_at: shippingData.shipped_at.toISOString()
        },
        isClientInvoice
      )

      toast.success('Shipping invoice created successfully')
      onSuccess()
      handleClose()
    } catch (error: any) {
      console.error('Error creating shipping invoice:', error)
      toast.error(error.message || 'Failed to create shipping invoice')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setSelectedProducts({})
    setShippingData({
      tracking_number: '',
      carrier: '',
      shipping_method: 'standard',
      shipping_address: '',
      shipping_cost: 0,
      notes: '',
      shipped_at: new Date()
    })
    setErrors([])
    onClose()
  }

  if (!isOpen) return null

  const totalSelectedQuantity = Object.values(selectedProducts).reduce((sum, qty) => sum + qty, 0)
  const totalRemainingQuantity = Object.values(shippedQuantities).reduce((sum, q) => sum + q.remaining, 0)

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
          &#8203;
        </span>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center mb-4">
              <FaTruck className="text-blue-500 text-2xl mr-3" />
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Create Shipping Invoice
              </h3>
            </div>

            <div className="mb-4 p-3 bg-blue-50 border-l-4 border-blue-400 text-blue-700">
              <p className="text-sm">
                Invoice #{invoice.id} - Order #{invoice.order_number}
              </p>
              <p className="text-xs mt-1">
                Total Remaining: {totalRemainingQuantity} items | 
                Selected for Shipping: {totalSelectedQuantity} items
              </p>
            </div>

            {errors.length > 0 && (
              <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-400">
                <div className="flex">
                  <FaExclamationTriangle className="text-red-400 mt-1 mr-2" />
                  <div>
                    <h4 className="text-sm font-medium text-red-800">Please fix the following errors:</h4>
                    <ul className="list-disc list-inside text-sm text-red-700 mt-1">
                      {errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            <div className="max-h-96 overflow-y-auto">
              {/* Product Selection Section */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-semibold text-gray-700">Select Products to Ship</h4>
                  <button
                    type="button"
                    onClick={selectAllRemaining}
                    className="text-sm bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                  >
                    Select All Remaining
                  </button>
                </div>

                <div className="space-y-3">
                  {invoice.products?.map((invoiceProduct: any) => {
                    const product = getProductDetails(invoiceProduct.product_id)
                    const variant = getVariantDetails(invoiceProduct.product_id, invoiceProduct.product_variant_id)
                    const quantities = shippedQuantities[invoiceProduct.product_variant_id] || {
                      ordered: 0,
                      shipped: 0,
                      remaining: 0
                    }

                    if (!product || !variant) return null

                    return (
                      <div
                        key={invoiceProduct.product_variant_id}
                        className={`border rounded-lg p-3 ${
                          quantities.remaining === 0 ? 'bg-gray-50 opacity-60' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center">
                              <FaBox className="text-gray-400 mr-2" />
                              <span className="font-medium">{product.name}</span>
                              <span className="ml-2 text-sm text-gray-500">
                                ({variant.size} - {variant.color})
                              </span>
                            </div>
                            <div className="mt-1 text-xs text-gray-500">
                              Ordered: {quantities.ordered} | 
                              Shipped: {quantities.shipped} | 
                              Remaining: {quantities.remaining}
                            </div>
                          </div>

                          <div className="flex items-center ml-4">
                            <label className="mr-2 text-sm">Ship:</label>
                            <input
                              type="number"
                              min="0"
                              max={quantities.remaining}
                              value={selectedProducts[invoiceProduct.product_variant_id] || 0}
                              onChange={(e) => handleQuantityChange(
                                invoiceProduct.product_variant_id,
                                parseInt(e.target.value) || 0
                              )}
                              disabled={quantities.remaining === 0}
                              className="w-20 px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="ml-2 text-sm text-gray-500">
                              / {quantities.remaining}
                            </span>
                            {selectedProducts[invoiceProduct.product_variant_id] === quantities.remaining && 
                             quantities.remaining > 0 && (
                              <FaCheck className="ml-2 text-green-500" />
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Shipping Details Section */}
              <div className="border-t pt-4">
                <h4 className="font-semibold text-gray-700 mb-3">Shipping Details</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Shipping Date <span className="text-red-500">*</span>
                    </label>
                    <DatePicker
                      selected={shippingData.shipped_at}
                      onChange={(date) => setShippingData(prev => ({
                        ...prev,
                        shipped_at: date || new Date()
                      }))}
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      dateFormat="yyyy-MM-dd"
                      maxDate={new Date()}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Carrier
                    </label>
                    <select
                      value={shippingData.carrier}
                      onChange={(e) => setShippingData(prev => ({
                        ...prev,
                        carrier: e.target.value
                      }))}
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Carrier</option>
                      <option value="fedex">FedEx</option>
                      <option value="ups">UPS</option>
                      <option value="dhl">DHL</option>
                      <option value="usps">USPS</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tracking Number
                    </label>
                    <input
                      type="text"
                      value={shippingData.tracking_number}
                      onChange={(e) => setShippingData(prev => ({
                        ...prev,
                        tracking_number: e.target.value
                      }))}
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter tracking number"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Shipping Method
                    </label>
                    <select
                      value={shippingData.shipping_method}
                      onChange={(e) => setShippingData(prev => ({
                        ...prev,
                        shipping_method: e.target.value
                      }))}
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="standard">Standard</option>
                      <option value="express">Express</option>
                      <option value="overnight">Overnight</option>
                      <option value="ground">Ground</option>
                      <option value="air">Air</option>
                      <option value="sea">Sea</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Shipping Cost
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={shippingData.shipping_cost}
                      onChange={(e) => setShippingData(prev => ({
                        ...prev,
                        shipping_cost: parseFloat(e.target.value) || 0
                      }))}
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Shipping Address <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={shippingData.shipping_address}
                    onChange={(e) => setShippingData(prev => ({
                      ...prev,
                      shipping_address: e.target.value
                    }))}
                    rows={3}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter shipping address"
                  />
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={shippingData.notes}
                    onChange={(e) => setShippingData(prev => ({
                      ...prev,
                      notes: e.target.value
                    }))}
                    rows={2}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Optional notes"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={handleCreateShippingInvoice}
              disabled={isLoading || totalSelectedQuantity === 0}
              className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm ${
                isLoading || totalSelectedQuantity === 0
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
              }`}
            >
              {isLoading ? (
                <>
                  <FaSpinner className="animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                'Create Shipping Invoice'
              )}
            </button>
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ShippingInvoiceModal