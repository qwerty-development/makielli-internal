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
		note: '' // Add this if you have notes for individual products
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

		// Generate PDF
		const pdfComponent = InvoicePDF({
			invoice: { ...invoice, products: productsWithDetails },
			entity: entityData,
			company: companyData,
			isClientInvoice: activeTab === 'client',
			logoBase64
		})
		const pdfBuffer = await pdf(pdfComponent).toBuffer()

		const mailOptions = {
			from: 'noreply@yourcompany.com',
			to: 'asif@notqwerty.com',
			subject: `Invoice #${invoice.id} - ${
				activeTab === 'client' ? 'Client' : 'Supplier'
			} Invoice`,
			html: `
        <h1>Invoice #${invoice.id}</h1>
        <p>Please find the attached invoice for your records.</p>
        <p>Total Amount: $${invoice.total_price.toFixed(2)}</p>
        <p>If you have any questions, please don't hesitate to contact us.</p>
      `,
			attachments: [
				{
					filename: `Invoice_${invoice.id}.pdf`,
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
