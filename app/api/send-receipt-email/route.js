import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { pdf } from '@react-pdf/renderer'
import ReceiptPDF from '@/utils/pdfTemplates/ReceiptPDF'
import { supabase } from '@/utils/supabase'
import { getLogoBase64 } from '@/utils/serverUtils'

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

const fetchInvoiceDetails = async (invoiceId, isClientInvoice) => {
	const table = isClientInvoice ? 'ClientInvoices' : 'SupplierInvoices'
	const { data, error } = await supabase
		.from(table)
		.select('*')
		.eq('id', invoiceId)
		.single()

	if (error) throw error
	return data
}

export async function POST(request) {
	const { receipt, recipientEmail, activeTab } = await request.json()

	const transporter = nodemailer.createTransport({
		service: 'gmail',
		auth: {
			user: process.env.EMAIL_USER,
			pass: process.env.EMAIL_PASS
		}
	})

	try {
		// Fetch additional data
		let entityData, companyData, invoiceData
		const isClient = activeTab === 'client'
		if (isClient) {
			entityData = await fetchClientDetails(receipt.client_id)
		} else {
			entityData = await fetchSupplierDetails(receipt.supplier_id)
		}
		companyData = await fetchCompanyDetails(entityData.company_id)
		invoiceData = await fetchInvoiceDetails(receipt.invoice_id, isClient)

		// Get logo as base64
		const logoBase64 = getLogoBase64()

		// Generate PDF
		const pdfComponent = ReceiptPDF({
			receipt,
			entity: entityData,
			company: companyData,
			invoice: invoiceData,
			isClient,
			logoBase64
		})
		const pdfBuffer = await pdf(pdfComponent).toBuffer()

		const mailOptions = {
			from: 'noreply@notqwerty.com',
			to: 'asif@notqwerty.com',
			subject: `Receipt #${receipt.id} - ${
				isClient ? 'Client' : 'Supplier'
			} Payment`,
			html: `
        <h1>Receipt #${receipt.id}</h1>
        <p>Please find the attached receipt for your records.</p>
        <p>Amount Paid: $${receipt.amount.toFixed(2)}</p>
        <p>Date: ${new Date(receipt.paid_at).toLocaleDateString()}</p>
        <p>If you have any questions, please don't hesitate to contact us.</p>
      `,
			attachments: [
				{
					filename: `Receipt_${receipt.id}.pdf`,
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
		return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
	}
}
