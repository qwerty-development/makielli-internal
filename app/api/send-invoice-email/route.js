import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { getLogoBase64 } from '@/utils/serverUtils'
import { pdf } from '@react-pdf/renderer'
import InvoicePDF from '@/utils/pdfTemplates/InvoicePDF'
import { supabase } from '@/utils/supabase'

const fetchClientDetails = async clientId => {
	const { data, error } = await supabase
		.from('Clients')
		.select('*')
		.eq('client_id', clientId)
		.single()

	if (error) throw error
	return data
}

const fetchSupplierDetails = async supplierId => {
	if (!supplierId) {
		throw new Error('Supplier ID is undefined')
	}
	const { data, error } = await supabase
		.from('Suppliers')
		.select('*')
		.eq('id', supplierId)
		.single()

	if (error) throw error
	return data
}

const fetchCompanyDetails = async companyId => {
	const { data, error } = await supabase
		.from('companies')
		.select('*')
		.eq('id', companyId)
		.single()

	if (error) throw error
	return data
}

const fetchProductDetails = async productVariantId => {
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

	if (error) throw error

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

export async function POST(request) {
	const { invoice, recipientEmail, activeTab } = await request.json()

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
				throw new Error('Client ID is undefined')
			}
			entityData = await fetchClientDetails(invoice.client_id)
		} else {
			if (!invoice.supplier_id) {
				throw new Error('Supplier ID is undefined')
			}
			entityData = await fetchSupplierDetails(invoice.supplier_id)
		}

		if (!entityData.company_id) {
			throw new Error('Company ID is undefined')
		}
		companyData = await fetchCompanyDetails(entityData.company_id)

		// Fetch product details
		const productsWithDetails = await Promise.all(
			invoice.products.map(async product => {
				if (!product.product_variant_id) {
					throw new Error('Product variant ID is undefined')
				}
				const details = await fetchProductDetails(product.product_variant_id)
				return {
					...details,
					quantity: product.quantity,
					note: product.note || ''
				}
			})
		)

		// Calculate subtotal, discounts, and total with return handling
		const subtotal = productsWithDetails.reduce((total, product) => {
			const price =
				activeTab === 'client' ? product.unitPrice : product.unitCost
			const lineTotal = price * product.quantity
			return total + (invoice.type === 'return' ? -lineTotal : lineTotal)
		}, 0)

		const totalDiscount = productsWithDetails.reduce((total, product) => {
			const discount = invoice.discounts?.[product.product_id] || 0
			const lineDiscount = discount * product.quantity
			return total + (invoice.type === 'return' ? -lineDiscount : lineDiscount)
		}, 0)

		const totalBeforeVAT = subtotal - totalDiscount
		const vatAmount = invoice.include_vat ? totalBeforeVAT * 0.11 : 0
		const totalAmount = totalBeforeVAT + vatAmount

		// Generate PDF with return handling
		const pdfComponent = InvoicePDF({
			invoice: {
				...invoice,
				products: productsWithDetails,
				subtotal: Math.abs(subtotal),
				totalDiscount: Math.abs(totalDiscount),
				totalBeforeVAT: Math.abs(totalBeforeVAT),
				vatAmount: Math.abs(vatAmount),
				totalAmount: Math.abs(totalAmount),
				type: invoice.type || 'regular' // Ensure type is passed
			},
			entity: entityData,
			company: companyData,
			isClientInvoice: activeTab === 'client',
			logoBase64
		})

		const pdfBuffer = await pdf(pdfComponent).toBuffer()

		// Prepare email body with return handling
		const isReturn = invoice.type === 'return'
		const emailBody = `
            <h1>${isReturn ? 'Return Invoice' : 'Invoice'} #${invoice.id}</h1>
            <p>Please find the attached ${
							isReturn ? 'return invoice' : 'invoice'
						} for your records.</p>
            ${
							isReturn
								? '<p style="color: #DC2626; font-weight: bold;">This is a return invoice. All amounts shown are credits to your account.</p>'
								: ''
						}
            <p>Subtotal: $${Math.abs(subtotal).toFixed(2)}${
			isReturn ? ' (Credit)' : ''
		}</p>
            <p>Total Discount: $${Math.abs(totalDiscount).toFixed(2)}${
			isReturn ? ' (Credit)' : ''
		}</p>
            <p>Total Before VAT: $${Math.abs(totalBeforeVAT).toFixed(2)}${
			isReturn ? ' (Credit)' : ''
		}</p>
            ${
							invoice.include_vat
								? `<p>VAT (11%): $${Math.abs(vatAmount).toFixed(2)}${
										isReturn ? ' (Credit)' : ''
								  }</p>`
								: ''
						}
            <p>Total Amount: $${Math.abs(totalAmount).toFixed(2)}${
			isReturn ? ' (Credit)' : ''
		}</p>
            <p>If you have any questions, please don't hesitate to contact us.</p>
        `

		const mailOptions = {
			from: 'noreply@yourcompany.com',
			to: 'asif@notqwerty.com',
			subject: `${isReturn ? 'Return Invoice' : 'Invoice'} #${invoice.id} - ${
				activeTab === 'client' ? 'Client' : 'Supplier'
			}`,
			html: emailBody,
			attachments: [
				{
					filename: `${isReturn ? 'Return_Invoice' : 'Invoice'}_${
						invoice.id
					}.pdf`,
					content: pdfBuffer,
					contentType: 'application/pdf'
				}
			]
		}

		await transporter.sendMail(mailOptions)
		return NextResponse.json(
			{ message: 'Email sent successfully' },
			{ status: 200 }
		)
	} catch (error) {
		console.error(error)
		return NextResponse.json(
			{ error: error.message || 'Failed to send email' },
			{ status: 500 }
		)
	}
}
