// utils/pdfGenerator.ts
import { pdf } from '@react-pdf/renderer'
import InvoicePDF from './pdfTemplates/InvoicePDF'
import ReceiptPDF from './pdfTemplates/ReceiptPDF'
import QuotationPDF from './pdfTemplates/QuotationPDF'

export const generatePDF = async (
	type: 'invoice' | 'receipt' | 'quotation',
	data: any
) => {
	let component: any
	let fileName

	switch (type) {
		case 'invoice':
			component = InvoicePDF({ invoice: data as any })
			fileName = `invoice_${(data as any).id}.pdf`
			break
		case 'receipt':
			component = ReceiptPDF({ receipt: data as any })
			fileName = `receipt_${(data as any).id}.pdf`
			break
		case 'quotation':
			component = QuotationPDF({ quotation: data as any })
			fileName = `quotation_${(data as any).id}.pdf`
			break
		default:
			throw new Error('Invalid PDF type')
	}

	const blob = await pdf(component).toBlob()
	const url = URL.createObjectURL(blob)
	const link = document.createElement('a')
	link.href = url
	link.download = fileName
	document.body.appendChild(link)
	link.click()
	document.body.removeChild(link)
}
