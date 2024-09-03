import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

export async function POST(request) {
	const { type, data, recipientEmail } = await request.json()

	// Create transporter
	const transporter = nodemailer.createTransport({
		service: 'gmail',
		auth: {
			user: process.env.EMAIL_USER,
			pass: process.env.EMAIL_PASS
		}
	})

	// Generate PDF
	const pdfDoc = await PDFDocument.create()
	const page = pdfDoc.addPage([600, 400])
	const { width, height } = page.getSize()
	const font = await pdfDoc.embedFont(StandardFonts.Helvetica)

	// Add content to PDF based on type (invoice, receipt, or quotation)
	// This is a simplified version. You should add more details based on the data
	page.drawText(`${type.charAt(0).toUpperCase() + type.slice(1)}`, {
		x: 50,
		y: height - 50,
		size: 24,
		font,
		color: rgb(0, 0, 0)
	})

	page.drawText(
		`Date: ${new Date(data.created_at || data.paid_at).toLocaleDateString()}`,
		{
			x: 50,
			y: height - 100,
			size: 12,
			font,
			color: rgb(0, 0, 0)
		}
	)

	page.drawText(`Total: $${data.total_price || data.amount}`, {
		x: 50,
		y: height - 120,
		size: 12,
		font,
		color: rgb(0, 0, 0)
	})

	const pdfBytes = await pdfDoc.save()

	const mailOptions = {
		from: process.env.EMAIL_USER,
		to: recipientEmail,
		subject: `Your ${type} from Our Company`,
		html: `
      <h1>${type.charAt(0).toUpperCase() + type.slice(1)}</h1>
      <p>Please find your ${type} attached.</p>
      <p>Thank you for your business!</p>
    `,
		attachments: [
			{
				filename: `${type}.pdf`,
				content: pdfBytes,
				contentType: 'application/pdf'
			}
		]
	}

	try {
		await transporter.sendMail(mailOptions)
		return NextResponse.json({ message: 'Email sent successfully' })
	} catch (error) {
		console.error('Error sending email:', error)
		return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
	}
}
