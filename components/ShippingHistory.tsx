// components/ShippingHistory.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { FaTruck, FaBox, FaCheck, FaClock, FaBan, FaTrash, FaDownload, FaEye } from 'react-icons/fa'
import { shippingInvoiceFunctions, ShippingInvoice } from '@/utils/functions/shipping-invoices'
import { Product } from '@/utils/functions/products'
import { format } from 'date-fns'
import { toast } from 'react-hot-toast'

interface ShippingHistoryProps {
  invoiceId: number
  isClientInvoice: boolean
  products: Product[]
  onUpdate?: () => void
  onDownloadPDF?: (shippingInvoiceId: number) => void
}

const ShippingHistory: React.FC<ShippingHistoryProps> = ({
  invoiceId,
  isClientInvoice,
  products,
  onUpdate,
  onDownloadPDF
}) => {
  const [shippingInvoices, setShippingInvoices] = useState<ShippingInvoice[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedShipping, setSelectedShipping] = useState<ShippingInvoice | null>(null)

  useEffect(() => {
    loadShippingInvoices()
  }, [invoiceId])

  const loadShippingInvoices = async () => {
    setIsLoading(true)
    try {
      const data = await shippingInvoiceFunctions.getShippingInvoices(
        invoiceId,
        isClientInvoice
      )
      setShippingInvoices(data)
    } catch (error) {
      console.error('Error loading shipping invoices:', error)
      toast.error('Failed to load shipping history')
    } finally {
      setIsLoading(false)
    }
  }

  const getProductDetails = (productId: string) => {
    return products.find(p => p.id === productId)
  }

  const getVariantDetails = (productId: string, variantId: string) => {
    const product = getProductDetails(productId)
    if (!product || !product.variants) return null
    return product.variants.find(v => v.id === variantId)
  }

  const handleStatusUpdate = async (shippingId: number, newStatus: 'delivered' | 'cancelled') => {
    try {
      await shippingInvoiceFunctions.updateShippingInvoiceStatus(
        shippingId,
        newStatus,
        isClientInvoice,
        newStatus === 'delivered' ? new Date().toISOString() : undefined
      )
      
      toast.success(`Shipping invoice marked as ${newStatus}`)
      loadShippingInvoices()
      
      if (onUpdate) {
        onUpdate()
      }
    } catch (error) {
      console.error('Error updating shipping status:', error)
      toast.error('Failed to update shipping status')
    }
  }

  const handleDelete = async (shippingId: number) => {
    if (!window.confirm('Are you sure you want to delete this shipping invoice?')) {
      return
    }

    try {
      await shippingInvoiceFunctions.deleteShippingInvoice(
        shippingId,
        isClientInvoice
      )
      
      toast.success('Shipping invoice deleted successfully')
      loadShippingInvoices()
      
      if (onUpdate) {
        onUpdate()
      }
    } catch (error) {
      console.error('Error deleting shipping invoice:', error)
      toast.error('Failed to delete shipping invoice')
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'shipped':
        return <FaTruck className="text-blue-500" />
      case 'delivered':
        return <FaCheck className="text-green-500" />
      case 'cancelled':
        return <FaBan className="text-red-500" />
      default:
        return <FaClock className="text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: 'bg-gray-100 text-gray-800',
      shipped: 'bg-blue-100 text-blue-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    }

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusConfig[status as keyof typeof statusConfig]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (shippingInvoices.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <FaTruck className="mx-auto text-4xl mb-2 opacity-50" />
        <p>No shipping invoices created yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h4 className="font-semibold text-gray-700 flex items-center">
        <FaTruck className="mr-2" />
        Shipping History ({shippingInvoices.length})
      </h4>

      <div className="space-y-3">
        {shippingInvoices.map((shipping) => (
          <div
            key={shipping.id}
            className="border rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center">
                {getStatusIcon(shipping.status)}
                <div className="ml-3">
                  <p className="font-medium">
                    Shipping #{shipping.shipping_number}
                  </p>
                  <p className="text-sm text-gray-500">
                    Shipped: {format(new Date(shipping.shipped_at), 'PP')}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {getStatusBadge(shipping.status)}
                
                <div className="flex space-x-1">
                  <button
                    onClick={() => setSelectedShipping(shipping)}
                    className="p-1 text-blue-500 hover:bg-blue-50 rounded"
                    title="View Details"
                  >
                    <FaEye />
                  </button>
                  
                  {onDownloadPDF && (
                    <button
                      onClick={() => onDownloadPDF(shipping.id)}
                      className="p-1 text-purple-500 hover:bg-purple-50 rounded"
                      title="Download PDF"
                    >
                      <FaDownload />
                    </button>
                  )}
                  
                  {shipping.status === 'shipped' && (
                    <button
                      onClick={() => handleStatusUpdate(shipping.id, 'delivered')}
                      className="p-1 text-green-500 hover:bg-green-50 rounded"
                      title="Mark as Delivered"
                    >
                      <FaCheck />
                    </button>
                  )}
                  
                  {shipping.status === 'shipped' && (
                    <button
                      onClick={() => handleStatusUpdate(shipping.id, 'cancelled')}
                      className="p-1 text-orange-500 hover:bg-orange-50 rounded"
                      title="Cancel Shipping"
                    >
                      <FaBan />
                    </button>
                  )}
                  
                  <button
                    onClick={() => handleDelete(shipping.id)}
                    className="p-1 text-red-500 hover:bg-red-50 rounded"
                    title="Delete"
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              {shipping.tracking_number && (
                <div>
                  <span className="text-gray-500">Tracking:</span>
                  <span className="ml-1 font-mono">{shipping.tracking_number}</span>
                </div>
              )}
              
              {shipping.carrier && (
                <div>
                  <span className="text-gray-500">Carrier:</span>
                  <span className="ml-1">{shipping.carrier.toUpperCase()}</span>
                </div>
              )}
              
              {shipping.shipping_method && (
                <div>
                  <span className="text-gray-500">Method:</span>
                  <span className="ml-1 capitalize">{shipping.shipping_method}</span>
                </div>
              )}
              
              <div>
                <span className="text-gray-500">Items:</span>
                <span className="ml-1">
                  {shipping.products.reduce((sum, p) => sum + p.quantity, 0)}
                </span>
              </div>
            </div>

            {shipping.notes && (
              <div className="mt-2 text-sm text-gray-600 italic">
                Note: {shipping.notes}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Detail Modal */}
      {selectedShipping && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 transition-opacity"
              aria-hidden="true"
              onClick={() => setSelectedShipping(null)}
            >
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Shipping Invoice Details
                </h3>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <label className="font-medium text-gray-500">Shipping Number:</label>
                      <p>{selectedShipping.shipping_number}</p>
                    </div>
                    <div>
                      <label className="font-medium text-gray-500">Status:</label>
                      <p>{getStatusBadge(selectedShipping.status)}</p>
                    </div>
                    <div>
                      <label className="font-medium text-gray-500">Shipped Date:</label>
                      <p>{format(new Date(selectedShipping.shipped_at), 'PPP')}</p>
                    </div>
                    {selectedShipping.delivered_at && (
                      <div>
                        <label className="font-medium text-gray-500">Delivered Date:</label>
                        <p>{format(new Date(selectedShipping.delivered_at), 'PPP')}</p>
                      </div>
                    )}
                    {selectedShipping.tracking_number && (
                      <div>
                        <label className="font-medium text-gray-500">Tracking Number:</label>
                        <p className="font-mono">{selectedShipping.tracking_number}</p>
                      </div>
                    )}
                    {selectedShipping.carrier && (
                      <div>
                        <label className="font-medium text-gray-500">Carrier:</label>
                        <p>{selectedShipping.carrier.toUpperCase()}</p>
                      </div>
                    )}
                  </div>

                  {selectedShipping.shipping_address && (
                    <div>
                      <label className="font-medium text-gray-500">Shipping Address:</label>
                      <p className="whitespace-pre-line">{selectedShipping.shipping_address}</p>
                    </div>
                  )}

                  <div>
                    <label className="font-medium text-gray-500">Shipped Products:</label>
                    <div className="mt-2 space-y-2">
                      {selectedShipping.products.map((product, index) => {
                        const productDetails = getProductDetails(product.product_id)
                        const variantDetails = getVariantDetails(product.product_id, product.product_variant_id)
                        
                        return (
                          <div key={index} className="flex items-center p-2 bg-gray-50 rounded">
                            <FaBox className="text-gray-400 mr-2" />
                            <div className="flex-1">
                              <span className="font-medium">
                                {productDetails?.name || 'Unknown Product'}
                              </span>
                              {variantDetails && (
                                <span className="ml-2 text-sm text-gray-500">
                                  ({variantDetails.size} - {variantDetails.color})
                                </span>
                              )}
                            </div>
                            <span className="font-medium">
                              Qty: {product.quantity}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {selectedShipping.notes && (
                    <div>
                      <label className="font-medium text-gray-500">Notes:</label>
                      <p className="text-gray-700">{selectedShipping.notes}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={() => setSelectedShipping(null)}
                  className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Close
                </button>
                
                {onDownloadPDF && (
                  <button
                    type="button"
                    onClick={() => {
                      onDownloadPDF(selectedShipping.id)
                      setSelectedShipping(null)
                    }}
                    className="mr-3 inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-purple-600 text-base font-medium text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 sm:w-auto sm:text-sm"
                  >
                    <FaDownload className="mr-2" />
                    Download PDF
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ShippingHistory