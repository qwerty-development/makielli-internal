import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import fs from 'fs'
import path from 'path'

export async function POST(request) {
	const { receipt, recipientEmail, activeTab } = await request.json()

	const transporter = nodemailer.createTransport({
		service: 'gmail',
		auth: {
			user: process.env.EMAIL_USER,
			pass: process.env.EMAIL_PASS
		}
	})

	// Create PDF
	const pdfDoc = await PDFDocument.create()
	const page = pdfDoc.addPage([600, 800])
	const { width, height } = page.getSize()
	const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
	const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
	const fontSize = 12

	// Load the logo image
	const logoPath = path.join(process.cwd(), 'public', 'logo', 'logo.png')
	const logoImage = await pdfDoc.embedPng(fs.readFileSync(logoPath))

	// Calculate logo dimensions while maintaining aspect ratio
	const logoWidth = 100
	const logoHeight = logoImage.height * (logoWidth / logoImage.width)

	// Draw the logo
	page.drawImage(logoImage, {
		x: 50,
		y: height - logoHeight - 50,
		width: logoWidth,
		height: logoHeight
	})

	// Helper function to draw text
	const drawText = (text, x, y, options = {}) => {
		page.drawText(text, {
			x,
			y,
			size: fontSize,
			font: options.bold ? boldFont : font,
			color: options.color || rgb(0, 0, 0),
			...options
		})
	}

	// Draw receipt title
	drawText('RECEIPT', 50, height - logoHeight - 100, {
		size: 24,
		bold: true,
		color: rgb(0, 0.53, 0.71)
	})

	const yOffset = logoHeight + 50

	// Draw receipt details
	drawText(`Receipt Number: ${receipt.id}`, 50, height - yOffset - 140, {
		bold: true
	})
	drawText(
		`Date: ${new Date(receipt.paid_at).toLocaleDateString()}`,
		50,
		height - yOffset - 160
	)
	drawText(`Amount: $${receipt.amount.toFixed(2)}`, 50, height - yOffset - 180)
	drawText(`Invoice Number: ${receipt.invoice_id}`, 50, height - yOffset - 200)

	// Draw client/supplier information
	drawText(
		`${activeTab === 'client' ? 'Client' : 'Supplier'} Information:`,
		50,
		height - yOffset - 240,
		{ bold: true }
	)
	drawText(`Email: ${recipientEmail}`, 70, height - yOffset - 260)

	// Draw footer
	drawText('Thank you for your payment!', 50, 50, { color: rgb(0.5, 0.5, 0.5) })

	const pdfBytes = await pdfDoc.save()

	const mailOptions = {
		from: 'noreply@notqwerty.com',
		to: recipientEmail,
		subject: `Receipt #${receipt.id} - ${
			activeTab === 'client' ? 'Client' : 'Supplier'
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
				content: pdfBytes,
				contentType: 'application/pdf'
			}
		]
	}

	try {
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
