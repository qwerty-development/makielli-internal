import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import fs from 'fs'
import path from 'path'

export async function POST(request) {
	const { invoice, recipientEmail, activeTab } = await request.json()

	const transporter = nodemailer.createTransport({
		service: 'gmail',
		auth: {
			user: process.env.EMAIL_USER,
			pass: process.env.EMAIL_PASS
		}
	})

	// Create PDF
	const pdfDoc = await PDFDocument.create()
	const page = pdfDoc.addPage([600, 800]) // Keep the increased page size
	const { width, height } = page.getSize()
	const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
	const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
	const fontSize = 12

	// Load the logo image
	const logoPath = path.join(process.cwd(), 'public', 'logo', 'logo.png')
	const logoImage = await pdfDoc.embedPng(fs.readFileSync(logoPath))

	// Calculate logo dimensions while maintaining aspect ratio
	const logoWidth = 100 // Adjust this value as needed
	const logoHeight = logoImage.height * (logoWidth / logoImage.width)

	// Draw the logo
	page.drawImage(logoImage, {
		x: 50,
		y: height - logoHeight - 50, // Position from the top with some padding
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

	// Draw invoice title
	drawText('INVOICE', 50, height - logoHeight - 100, {
		size: 24,
		bold: true,
		color: rgb(0, 0.53, 0.71)
	})

	// Adjust all subsequent y-positions by subtracting logoHeight
	const yOffset = logoHeight + 50

	// Draw invoice details
	drawText(`Invoice Number: ${invoice.id}`, 50, height - yOffset - 140, {
		bold: true
	})
	drawText(
		`Date: ${new Date(invoice.created_at).toLocaleDateString()}`,
		50,
		height - yOffset - 160
	)
	drawText(
		`Total Amount: $${invoice.total_price.toFixed(2)}`,
		50,
		height - yOffset - 180
	)
	drawText(
		`Remaining Amount: $${invoice.remaining_amount.toFixed(2)}`,
		50,
		height - yOffset - 200
	)

	// Draw client/supplier information
	drawText(
		`${activeTab === 'client' ? 'Client' : 'Supplier'} Information:`,
		50,
		height - yOffset - 240,
		{ bold: true }
	)
	drawText(
		`Name: ${
			activeTab === 'client' ? invoice.client_name : invoice.supplier_name
		}`,
		70,
		height - yOffset - 260
	)
	drawText(`Email: ${recipientEmail}`, 70, height - yOffset - 280)

	// Draw products table
	drawText('Products:', 50, height - yOffset - 320, { bold: true })
	drawText('Product', 70, height - yOffset - 340, { bold: true })
	drawText('Quantity', 300, height - yOffset - 340, { bold: true })
	drawText('Unit Price', 400, height - yOffset - 340, { bold: true })
	drawText('Total', 500, height - yOffset - 340, { bold: true })

	let productYOffset = yOffset + 360
	invoice.products.forEach((product, index) => {
		drawText(product.name, 70, height - productYOffset)
		drawText(product.quantity.toString(), 300, height - productYOffset)
		drawText(`$${product.unit_price.toFixed(2)}`, 400, height - productYOffset)
		drawText(
			`$${(product.quantity * product.unit_price).toFixed(2)}`,
			500,
			height - productYOffset
		)
		productYOffset += 20
	})

	// Draw note
	if (invoice.note) {
		drawText('Note:', 50, height - productYOffset - 40, { bold: true })
		drawText(invoice.note, 70, height - productYOffset - 60, {
			maxWidth: 480,
			lineHeight: 15
		})
	}

	// Draw footer
	drawText('Thank you for your business!', 50, 50, {
		color: rgb(0.5, 0.5, 0.5)
	})

	const pdfBytes = await pdfDoc.save()

	const mailOptions = {
		from: 'noreply@yourcompany.com',
		to: recipientEmail,
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
