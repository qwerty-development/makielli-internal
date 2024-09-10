// utils/pdfGenerator.ts
import { pdf } from '@react-pdf/renderer'
import InvoicePDF from './pdfTemplates/InvoicePDF'
import ReceiptPDF from './pdfTemplates/ReceiptPDF'
import QuotationPDF from './pdfTemplates/QuotationPDF'
import ClientFinancialReportPDF from './pdfTemplates/ClientFinancialReportPDF'
import { supabase } from './supabase'
import { fetchSupplierFinancialData } from './functions/suppliers'
import SupplierFinancialReportPDF from './pdfTemplates/SupplierFinancialReportPDF'

const fetchClientDetails = async (clientId: any) => {
	const { data, error } = await supabase
		.from('Clients')
		.select('*')
		.eq('client_id', clientId)
		.single()

	if (error) throw error
	return data
}

const fetchCompanyDetails = async (companyId: any) => {
	const { data, error } = await supabase
		.from('companies')
		.select('*')
		.eq('id', companyId)
		.single()

	if (error) throw error
	return data
}

const fetchClientFinancialData = async (clientId: any) => {
	// Fetch invoices
	const { data: invoices, error: invoiceError } = await supabase
		.from('ClientInvoices')
		.select('*')
		.eq('client_id', clientId)

	if (invoiceError) throw invoiceError

	// Fetch receipts
	const { data: receipts, error: receiptError } = await supabase
		.from('ClientReceipts')
		.select('*')
		.eq('client_id', clientId)

	if (receiptError) throw receiptError

	// Combine and sort the data
	const financialData = [
		...invoices.map(invoice => ({
			date: invoice.created_at,
			type: 'invoice',
			id: invoice.id,
			amount: invoice.total_price
		})),
		...receipts.map(receipt => ({
			date: receipt.paid_at,
			type: 'receipt',
			id: receipt.id,
			invoice_id: receipt.invoice_id,
			amount: receipt.amount
		}))
	].sort((a, b) => {
		const dateA = new Date(a.date).getTime()
		const dateB = new Date(b.date).getTime()
		return dateA - dateB
	})

	return financialData
}
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
	type:
		| 'invoice'
		| 'receipt'
		| 'quotation'
		| 'clientFinancialReport'
		| 'supplierFinancialReport',
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
	} else if (type === 'invoice' || type === 'quotation') {
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
		case 'clientFinancialReport':
			console.log(data.clientId)
			const clientData = await fetchClientDetails(data.clientId)
			console.log(clientData)
			const companyData = await fetchCompanyDetails(clientData.company_id)
			const financialData = await fetchClientFinancialData(data.clientId)

			component = ClientFinancialReportPDF({
				clientName: clientData.name,
				clientDetails: clientData,
				companyDetails: companyData,
				financialData: financialData
			})
			fileName = `financial_report_${clientData.name.replace(/\s+/g, '_')}.pdf`

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
