import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { getLogoBase64 } from '@/utils/serverUtils'
import { pdf } from '@react-pdf/renderer'
import InvoicePDF from '@/utils/pdfTemplates/InvoicePDF'
import { supabase } from '@/utils/supabase'
import { format } from 'date-fns'

// Fetch client details with clear error messaging
const fetchClientDetails = async (clientId) => {
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

// Fetch supplier details with safe check
const fetchSupplierDetails = async (supplierId) => {
  if (!supplierId) {
    throw new Error('Supplier ID is undefined.')
  }
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

// Fetch company details
const fetchCompanyDetails = async (companyId) => {
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

// Fetch product details with a safe check on productVariantId
const fetchProductDetails = async (productVariantId) => {
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

  return {
    id: data.id,
    product_id: data.product_id,
    name: data.Products.name,
    image: data.Products.photo,
    unitPrice: data.Products.price,
    unitCost: data.Products.cost,
    size: data.size,
    color: data.color,
    quantity: data.quantity,
    note: ''
  }
}

// Fetch invoice details
const fetchInvoiceDetails = async (invoiceId, isClientInvoice) => {
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

export async function POST(request) {
  const { invoice, recipientEmail, activeTab } = await request.json()

  // Set up nodemailer transporter.
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  })

  try {
    // Fetch additional data
    const logoBase64 = getLogoBase64()
    let entityData, companyData
    if (activeTab === 'client') {
      if (!invoice.client_id) {
        throw new Error('Invalid invoice: Client ID is undefined.')
      }
      entityData = await fetchClientDetails(invoice.client_id)
    } else {
      if (!invoice.supplier_id) {
        throw new Error('Invalid invoice: Supplier ID is undefined.')
      }
      entityData = await fetchSupplierDetails(invoice.supplier_id)
    }

    if (!entityData.company_id) {
      throw new Error('Invalid invoice: Company ID is undefined for the provided entity.')
    }
    companyData = await fetchCompanyDetails(entityData.company_id)

    // Ensure invoice.products is an array
    const invoiceProducts = Array.isArray(invoice.products) ? invoice.products : []


const productsWithDetails = await Promise.all(
  invoiceProducts.map(async (product) => {
    if (!product.product_variant_id) {
      throw new Error('Invalid invoice: A product is missing its product_variant_id.')
    }
    const details = await fetchProductDetails(product.product_variant_id)
    return {
      ...details,

      quantity: Number(product.quantity || 0),
      note: product.note || ''
    }
  })
)


productsWithDetails.sort((a, b) => {
  // First sort by product name
  const nameComparison = a.name.localeCompare(b.name);
  if (nameComparison !== 0) return nameComparison;

  // If names are equal, sort by color
  return a.color.localeCompare(b.color);
});

    // Calculate subtotal, total discount, VAT and totalAmount with proper handling for returns.
    const subtotal = productsWithDetails.reduce((total, product) => {
      const price = activeTab === 'client' ? Number(product.unitPrice || 0) : Number(product.unitCost || 0)
      const lineTotal = price * Number(product.quantity || 0)
      return total + (invoice.type === 'return' ? -lineTotal : lineTotal)
    }, 0)

    const totalDiscount = productsWithDetails.reduce((total, product) => {
      const discount = invoice.discounts?.[product.product_id] || 0
      const lineDiscount = discount * Number(product.quantity || 0)
      return total + (invoice.type === 'return' ? -lineDiscount : lineDiscount)
    }, 0)

    const totalBeforeVAT = subtotal - totalDiscount
    const vatAmount = invoice.include_vat ? totalBeforeVAT * 0.11 : 0
    const totalAmount = totalBeforeVAT + vatAmount
    const currencySymbol = invoice.currency === 'euro' ? '€' : '$'


const pdfComponent = InvoicePDF({
  invoice: {
    ...invoice,

    products: productsWithDetails.map(product => ({
      ...product,
      totalQuantity: product.quantity,
      sizes: { [product.size]: product.quantity },
      notes: product.note ? [product.note] : []
    })),
    subtotal: Math.abs(subtotal),
    totalDiscount: Math.abs(totalDiscount),
    totalBeforeVAT: Math.abs(totalBeforeVAT),
    vatAmount: Math.abs(vatAmount),
    totalAmount: Math.abs(totalAmount),
    type: invoice.type || 'regular',
    currency: invoice.currency || 'usd',
    payment_term: invoice.payment_term || 'N/A',
    delivery_date: invoice.delivery_date || '',
    payment_info: invoice.payment_info || 'frisson_llc'
  },
  entity: entityData,
  company: companyData,
  isClientInvoice: activeTab === 'client',
  logoBase64
})

    const pdfBuffer = await pdf(pdfComponent).toBuffer()

    // Prepare email content with safe defaults and formatted numbers
    const isReturn = invoice.type === 'return'
    const emailBody = `
      <h1>${isReturn ? 'Return Invoice' : 'Invoice'} #${invoice.id || 'unknown'}</h1>
      <p>Please find the attached ${isReturn ? 'return invoice' : 'invoice'} for your records.</p>
      ${
        isReturn
          ? '<p style="color: #DC2626; font-weight: bold;">This is a return invoice. All amounts shown are credits to your account.</p>'
          : ''
      }
      <p>Subtotal: ${currencySymbol}${Math.abs(subtotal).toFixed(2)}${isReturn ? ' (Credit)' : ''}</p>
      <p>Total Discount: ${currencySymbol}${Math.abs(totalDiscount).toFixed(2)}${isReturn ? ' (Credit)' : ''}</p>
      <p>Total Before VAT: ${currencySymbol}${Math.abs(totalBeforeVAT).toFixed(2)}${isReturn ? ' (Credit)' : ''}</p>
      ${
        invoice.include_vat
          ? `<p>VAT (11%): ${currencySymbol}${Math.abs(vatAmount).toFixed(2)}${isReturn ? ' (Credit)' : ''}</p>`
          : ''
      }
      <p>Total Amount: ${currencySymbol}${Math.abs(totalAmount).toFixed(2)}${isReturn ? ' (Credit)' : ''}</p>
      ${invoice.payment_term ? `<p>Payment Term: ${invoice.payment_term}</p>` : ''}
      ${
        invoice.delivery_date
          ? `<p>Delivery Date: ${format(new Date(invoice.delivery_date), 'PP')}</p>`
          : ''
      }
      <p>If you have any questions, please don't hesitate to contact us.</p>
    `

    const mailOptions = {
      from: 'noreply@notqwerty.com',
      to: recipientEmail,
      subject: `${isReturn ? 'Return Invoice' : 'Invoice'} #${invoice.id || 'unknown'} - ${activeTab === 'client' ? 'Client' : 'Supplier'}`,
      html: emailBody,
      attachments: [
        {
          filename: `${isReturn ? 'Return_Invoice' : 'Invoice'}_${invoice.id || 'unknown'}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    }

    await transporter.sendMail(mailOptions)
    return NextResponse.json({ message: 'Email sent successfully' }, { status: 200 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: error.message || 'Failed to send email' }, { status: 500 })
  }
}
