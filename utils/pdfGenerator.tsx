import { pdf } from '@react-pdf/renderer'
import InvoicePDF from './pdfTemplates/InvoicePDF'
import ReceiptPDF from './pdfTemplates/ReceiptPDF'
import QuotationPDF from './pdfTemplates/QuotationPDF'
import ClientFinancialReportPDF from './pdfTemplates/ClientFinancialReportPDF'
import SupplierFinancialReportPDF from './pdfTemplates/SupplierFinancialReportPDF'
import { supabase } from './supabase'

// Fetch client details. Throws a clear error if not found.
const fetchClientDetails = async (clientId: any) => {
  const { data, error } = await supabase
    .from('Clients')
    .select('*')
    .eq('client_id', clientId)
    .single()

  if (error) {
    throw new Error(`Unable to fetch client details for client_id ${clientId}: ${error.message}`)
  }
  return data
}

// Fetch supplier details.
const fetchSupplierDetails = async (supplierId: any) => {
  const { data, error } = await supabase
    .from('Suppliers')
    .select('*')
    .eq('id', supplierId)
    .single()

  if (error) {
    throw new Error(`Unable to fetch supplier details for supplier_id ${supplierId}: ${error.message}`)
  }
  return data
}

// Fetch company details.
const fetchCompanyDetails = async (companyId: any) => {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('id', companyId)
    .single()

  if (error) {
    throw new Error(`Unable to fetch company details for company_id ${companyId}: ${error.message}`)
  }
  return data
}

// Fetch product details with safe check for productVariantId.
const fetchProductDetails = async (productVariantId: string) => {
  if (!productVariantId || productVariantId.trim() === "") {
    throw new Error("Invalid productVariantId: it is empty or missing.")
  }
  const { data, error } = await supabase
    .from('ProductVariants')
    .select(
      `
      id,
      size,
      color,
      quantity,
      product_id,
      Products (
        id,
        name,
        photo,
        price,
        cost
      )
    `
    )
    .eq('id', productVariantId)
    .single()

  if (error) {
    throw new Error(`Unable to fetch product details for variant_id ${productVariantId}: ${error.message}`)
  }

  let productDetails:any = data.Products
  if (!productDetails) {
    const { data: productData, error: productError } = await supabase
      .from('Products')
      .select('id, name, photo, price, cost')
      .eq('id', data.product_id)
      .single()

    if (productError) {
      throw new Error(`Unable to fetch product details for product_id ${data.product_id}: ${productError.message}`)
    }
    productDetails = productData
  }

  return {
    id: data.id,
    product_id: data.product_id,
    name: productDetails.name,
    image: productDetails.photo,
    unitPrice: productDetails.price,
    unitCost: productDetails.cost,
    color: data.color,
    size: data.size,
    quantity: data.quantity
  }
}

// Fetch invoice details.
const fetchInvoiceDetails = async (invoiceId: any, isClientInvoice: boolean) => {
  const table = isClientInvoice ? 'ClientInvoices' : 'SupplierInvoices'
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('id', invoiceId)
    .single()

  if (error) {
    throw new Error(`Unable to fetch invoice details for invoice_id ${invoiceId}: ${error.message}`)
  }
  return data
}

// Fetch client financial data.
const fetchClientFinancialData = async (clientId: any) => {
  const { data: invoices, error: invoiceError } = await supabase
    .from('ClientInvoices')
    .select('*')
    .eq('client_id', clientId)

  if (invoiceError) {
    throw new Error(`Unable to fetch invoices for client_id ${clientId}: ${invoiceError.message}`)
  }

  const { data: receipts, error: receiptError } = await supabase
    .from('ClientReceipts')
    .select('*')
    .eq('client_id', clientId)

  if (receiptError) {
    throw new Error(`Unable to fetch receipts for client_id ${clientId}: ${receiptError.message}`)
  }

  const financialData = [
    ...invoices.map(invoice => ({
      date: invoice.created_at,
      type: invoice.type || 'regular',
      id: invoice.id,
      amount: invoice.type === 'return' ? -invoice.total_price : invoice.total_price
    })),
    ...receipts.map(receipt => ({
      date: receipt.paid_at,
      type: 'receipt',
      id: receipt.id,
      invoice_id: receipt.invoice_id,
      amount: receipt.amount
    }))
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  return financialData
}

// Fetch supplier financial data.
const fetchSupplierFinancialData = async (supplierId: any) => {
  const { data: invoices, error: invoiceError } = await supabase
    .from('SupplierInvoices')
    .select('*')
    .eq('supplier_id', supplierId)

  if (invoiceError) {
    throw new Error(`Unable to fetch supplier invoices for supplier_id ${supplierId}: ${invoiceError.message}`)
  }

  const { data: receipts, error: receiptError } = await supabase
    .from('SupplierReceipts')
    .select('*')
    .eq('supplier_id', supplierId)

  if (receiptError) {
    throw new Error(`Unable to fetch supplier receipts for supplier_id ${supplierId}: ${receiptError.message}`)
  }

  const financialData = [
    ...invoices.map(invoice => ({
      date: invoice.created_at,
      type: invoice.type || 'regular',
      id: invoice.id,
      amount: invoice.type === 'return' ? -invoice.total_price : invoice.total_price
    })),
    ...receipts.map(receipt => ({
      date: receipt.paid_at,
      type: 'receipt',
      id: receipt.id,
      invoice_id: receipt.invoice_id,
      amount: receipt.amount
    }))
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  return financialData
}

// Generate the PDF document.
export const generatePDF = async (
  type: string,
  data:any
) => {
  let component:any
  let fileName:any

  // For invoice and quotation, prepare product mapping & defaults.
  if (type === 'invoice' || type === 'quotation') {
    const productMap = new Map()

    // Filter out products with an empty product_variant_id
    const validProducts = data.products.filter(
      (product: { product_variant_id: string }) =>
        product.product_variant_id && product.product_variant_id.trim() !== ""
    )

await Promise.all(
  validProducts.map(async (product:any) => {
    const details = await fetchProductDetails(product.product_variant_id)
    const key = `${details.name}-${details.color}`

    if (!productMap.has(key)) {
      productMap.set(key, {
        ...details,
        sizes: {},
        totalQuantity: 0,
        notes: new Set(),
        discount: data.discounts?.[details.product_id] || 0
      })
    } else {
      // Update existing entry if the current variant has an image and the stored one doesn't
      const existingProduct = productMap.get(key)
      if (!existingProduct.image && details.image) {
        existingProduct.image = details.image
        productMap.set(key, existingProduct)
      }
    }

    const existingProduct = productMap.get(key)
    existingProduct.sizes[details.size] =
      (existingProduct.sizes[details.size] || 0) + product.quantity
    existingProduct.totalQuantity += product.quantity
    if (product.note) {
      existingProduct.notes.add(product.note)
    }
    productMap.set(key, existingProduct)
  })
)


const productsArray = Array.from(productMap.values()).map((product) => ({
  ...product,
  notes: Array.from(product.notes)
}));

// Add sorting to ensure consistent order
productsArray.sort((a, b) => {
  // First sort by product name
  const nameComparison = a.name.localeCompare(b.name);
  if (nameComparison !== 0) return nameComparison;

  // If names are equal, sort by color
  return a.color.localeCompare(b.color);
});

data = {
  ...data,
  products: productsArray,
  discounts: data.discounts || {},
  type: data.type || 'regular',
  payment_info: data.payment_info || 'frisson_llc'
}
  }
  switch (type) {
    case 'invoice': {
      let entityData, companyData, isClientInvoice
      if (data.client_id) {
        isClientInvoice = true
        entityData = await fetchClientDetails(data.client_id)
        companyData = await fetchCompanyDetails(entityData.company_id)
      } else if (data.supplier_id) {
        isClientInvoice = false
        entityData = await fetchSupplierDetails(data.supplier_id)
        companyData = await fetchCompanyDetails(entityData.company_id)
      } else {
        throw new Error('Invalid invoice: missing client_id or supplier_id. Please provide a valid entity.')
      }

      component = InvoicePDF({
        invoice: {
          ...data,
          total_price: Math.abs(data.total_price),
          vat_amount: Math.abs(data.vat_amount || 0),
          type: data.type || 'regular',
          currency: data.currency || 'usd',
          payment_term: data.payment_term || 'N/A',
          delivery_date: data.delivery_date || '',
          payment_info: data.payment_info || 'frisson_llc'
        },
        entity: entityData,
        company: companyData,
        isClientInvoice
      })

      const filePrefix = data.type === 'return' ? 'return_invoice' : 'invoice'
      fileName = `${filePrefix}_${data.id || 'unknown'}.pdf`
      break
    }

    case 'receipt': {
      let entityData2, companyData2, invoiceData, isClientReceipt
      if (data.client_id) {
        isClientReceipt = true
        entityData2 = await fetchClientDetails(data.client_id)
        companyData2 = await fetchCompanyDetails(entityData2.company_id)
        invoiceData = await fetchInvoiceDetails(data.invoice_id, true)
      } else if (data.supplier_id) {
        isClientReceipt = false
        entityData2 = await fetchSupplierDetails(data.supplier_id)
        companyData2 = await fetchCompanyDetails(entityData2.company_id)
        invoiceData = await fetchInvoiceDetails(data.invoice_id, false)
      } else {
        throw new Error('Invalid receipt: missing client_id or supplier_id. Please provide a valid entity.')
      }

      component = ReceiptPDF({
        receipt: data,
        entity: entityData2,
        company: companyData2,
        invoice: invoiceData,
        isClient: isClientReceipt
      })
      fileName = `receipt_${data.id || 'unknown'}.pdf`
      break
    }

    case 'quotation': {
      if (!data.client_id) {
        throw new Error('Invalid quotation: missing client_id. Please provide a valid client.')
      }
      // Fetch base data for quotation.
      const quotationClientData = await fetchClientDetails(data.client_id)
      const quotationCompanyData = await fetchCompanyDetails(
        quotationClientData.company_id
      )

      // Prepare quotation data with defaults.
      const preparedQuotationData = {
        ...data,
        currency: data.currency || 'usd',
        payment_term: data.payment_term || 'N/A',
        delivery_date: data.delivery_date || '',
        order_number: data.order_number || '0',
        discounts: data.discounts || {},
        products: data.products.map((product: { sizes: any; notes: any; note: any }) => ({
          ...product,
          totalQuantity: Object.values(product.sizes || {}).reduce(
            (sum:any, quantity:any) => sum + Number(quantity || 0),
            0
          ),
          notes: Array.isArray(product.notes)
            ? product.notes
            : [product.note].filter(Boolean)
        }))
      }

      component = QuotationPDF({
        quotation: preparedQuotationData,
        client: quotationClientData,
        company: quotationCompanyData,
        logoBase64: data.logoBase64 || ''
      })

      fileName = `quotation_${data.id || 'unknown'}.pdf`
      break
    }

    case 'clientFinancialReport': {
      if (!data.clientId) {
        throw new Error('Invalid client financial report: missing clientId.')
      }
      const clientReportData = await fetchClientDetails(data.clientId)
      const clientCompanyData = await fetchCompanyDetails(clientReportData.company_id)
      const clientFinancialData = await fetchClientFinancialData(data.clientId)

      component = ClientFinancialReportPDF({
        clientName: clientReportData.name,
        clientDetails: clientReportData,
        companyDetails: clientCompanyData,
        financialData: clientFinancialData
      })
      fileName = `financial_report_${clientReportData.name.replace(/\s+/g, '_') || 'client'}.pdf`
      break
    }

    case 'supplierFinancialReport': {
      if (!data.supplierId) {
        throw new Error('Invalid supplier financial report: missing supplierId.')
      }
      const supplierData = await fetchSupplierDetails(data.supplierId)
      const supplierCompanyData = await fetchCompanyDetails(supplierData.company_id)
      const supplierFinancialData = await fetchSupplierFinancialData(data.supplierId)

      component = SupplierFinancialReportPDF({
        supplierName: supplierData.name,
        supplierDetails: supplierData,
        companyDetails: supplierCompanyData,
        financialData: supplierFinancialData
      })
      fileName = `financial_report_${supplierData.name.replace(/\s+/g, '_') || 'supplier'}.pdf`
      break
    }

    default:
      throw new Error(`Invalid PDF type: ${type}. Please choose a valid PDF type.`)
  }

  // Generate the PDF blob and trigger download.
  try {
    const blob = await pdf(component).toBlob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  } catch (err:any) {
    throw new Error(`PDF generation failed: ${err.message}`)
  }
}
