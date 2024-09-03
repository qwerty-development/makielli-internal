// utils/pdfGenerator.ts
import { pdf } from '@react-pdf/renderer'
import InvoicePDF from './pdfTemplates/InvoicePDF'
import ReceiptPDF from './pdfTemplates/ReceiptPDF'
import QuotationPDF from './pdfTemplates/QuotationPDF'
import { supabase } from './supabase'

const fetchProductDetails = async (productVariantId: string) => {
	const { data, error } = await supabase
		.from('ProductVariants')
		.select(
			`
      id,
      size,
      color,
      Products (
        id,
        name,
        photo,
        price
      )
    `
		)
		.eq('id', productVariantId)
		.single()

	if (error) throw error
	return data
}

const fetchInvoiceForReceipt = async (receiptId: number) => {
	const { data, error } = await supabase
		.from('ClientReceipts')
		.select(
			`
      invoice_id,
      ClientInvoices (
        id,
        products
      )
    `
		)
		.eq('id', receiptId)
		.single()

	if (error) throw error
	return data.ClientInvoices
}

export const generatePDF = async (
	type: 'invoice' | 'receipt' | 'quotation',
	data: any
) => {
	let component: any
	let fileName: string

	let productsWithDetails: any[] = []

	if (type === 'receipt') {
		const invoice: any = await fetchInvoiceForReceipt(data.id)
		if (invoice && invoice.products) {
			productsWithDetails = await Promise.all(
				invoice.products.map(async (product: any) => {
					const details: any = await fetchProductDetails(
						product.product_variant_id
					)
					return {
						...product,
						name: details.Products.name,
						image: details.Products.photo,
						unitPrice: details.Products.price,
						size: details.size,
						color: details.color
					}
				})
			)
		}
	} else {
		productsWithDetails = await Promise.all(
			data.products.map(async (product: any) => {
				const details: any = await fetchProductDetails(
					product.product_variant_id
				)
				return {
					...product,
					name: details.Products.name,
					image: details.Products.photo,
					unitPrice: details.Products.price,
					size: details.size,
					color: details.color
				}
			})
		)
	}

	const enhancedData = { ...data, products: productsWithDetails }

	switch (type) {
		case 'invoice':
			component = InvoicePDF({ invoice: enhancedData })
			fileName = `invoice_${enhancedData.id}.pdf`
			break
		case 'receipt':
			component = ReceiptPDF({ receipt: enhancedData })
			fileName = `receipt_${enhancedData.id}.pdf`
			break
		case 'quotation':
			component = QuotationPDF({ quotation: enhancedData })
			fileName = `quotation_${enhancedData.id}.pdf`
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
