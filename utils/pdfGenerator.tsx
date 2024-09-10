// utils/pdfGenerator.ts
import { pdf } from '@react-pdf/renderer'
import InvoicePDF from './pdfTemplates/InvoicePDF'
import ReceiptPDF from './pdfTemplates/ReceiptPDF'
import QuotationPDF from './pdfTemplates/QuotationPDF'
import ClientFinancialReportPDF from './pdfTemplates/ClientFinancialReportPDF'
import { supabase } from './supabase'

import SupplierFinancialReportPDF from './pdfTemplates/SupplierFinancialReportPDF'

const fetchClientDetails: any = async (clientId: number) => {
	const { data, error } = await supabase
		.from('Clients')
		.select('*')
		.eq('client_id', clientId)
		.single()

	if (error) throw error
	return data
}

const fetchSupplierDetails = async (supplierId: string) => {
	const { data, error } = await supabase
		.from('Suppliers')
		.select('*')
		.eq('id', supplierId)
		.single()

	if (error) throw error
	return data
}

const fetchCompanyDetails = async (companyId: number) => {
	const { data, error } = await supabase
		.from('companies')
		.select('*')
		.eq('id', companyId)
		.single()

	if (error) throw error
	return data
}

const fetchProductDetails = async (productVariantId: string) => {
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
        price
      )
    `
		)
		.eq('id', productVariantId)
		.single()

	if (error) throw error

	// If Products is not available, fetch the product details separately
	let productDetails: any = data.Products
	if (!productDetails) {
		const { data: productData, error: productError } = await supabase
			.from('Products')
			.select('id, name, photo, price')
			.eq('id', data.product_id)
			.single()

		if (productError) throw productError
		productDetails = productData
	}

	return {
		id: data.id,
		product_id: data.product_id,
		name: productDetails.name,
		image: productDetails.photo,
		unitPrice: productDetails.price,
		size: data.size,
		color: data.color,
		quantity: data.quantity,
		note: '' // Add this if you have notes for individual products
	}
}

const fetchClientFinancialData = async (clientId: number) => {
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
	].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

	return financialData
}

const fetchSupplierFinancialData = async (supplierId: string) => {
	// Fetch invoices
	const { data: invoices, error: invoiceError } = await supabase
		.from('SupplierInvoices')
		.select('*')
		.eq('supplier_id', supplierId)

	if (invoiceError) throw invoiceError

	// Fetch receipts
	const { data: receipts, error: receiptError } = await supabase
		.from('SupplierReceipts')
		.select('*')
		.eq('supplier_id', supplierId)

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
	].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

	return financialData
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

	if (type === 'invoice' || type === 'quotation') {
		productsWithDetails = await Promise.all(
			data.products.map(async (product: any) => {
				const details = await fetchProductDetails(product.product_variant_id)
				return {
					...details,
					quantity: product.quantity,
					note: product.note || ''
				}
			})
		)
		data = { ...data, products: productsWithDetails }
	}

	switch (type) {
		case 'invoice':
			const clientData = await fetchClientDetails(data.client_id)
			const companyData = await fetchCompanyDetails(clientData.company_id)
			component = InvoicePDF({
				invoice: data,
				client: clientData,
				company: companyData
			})
			fileName = `invoice_${data.id}.pdf`
			break
		case 'receipt':
			component = ReceiptPDF({ receipt: data })
			fileName = `receipt_${data.id}.pdf`
			break
		case 'quotation':
			const quotationClientData = await fetchClientDetails(data.client_id)
			const quotationCompanyData = await fetchCompanyDetails(
				quotationClientData.company_id
			)
			component = QuotationPDF({
				quotation: data,
				client: quotationClientData,
				company: quotationCompanyData
			})
			fileName = `quotation_${data.id}.pdf`
			break
		case 'clientFinancialReport':
			const clientReportData = await fetchClientDetails(data.clientId)
			const clientCompanyData = await fetchCompanyDetails(
				clientReportData.company_id
			)
			const clientFinancialData = await fetchClientFinancialData(data.clientId)

			component = ClientFinancialReportPDF({
				clientName: clientReportData.name,
				clientDetails: clientReportData,
				companyDetails: clientCompanyData,
				financialData: clientFinancialData
			})
			fileName = `financial_report_${clientReportData.name.replace(
				/\s+/g,
				'_'
			)}.pdf`
			break
		case 'supplierFinancialReport':
			const supplierData = await fetchSupplierDetails(data.supplierId)
			const supplierCompanyData = await fetchCompanyDetails(
				supplierData.company_id
			)
			const supplierFinancialData = await fetchSupplierFinancialData(
				data.supplierId
			)

			component = SupplierFinancialReportPDF({
				supplierName: supplierData.name,
				supplierDetails: supplierData,
				companyDetails: supplierCompanyData,
				financialData: supplierFinancialData
			})
			fileName = `financial_report_${supplierData.name.replace(
				/\s+/g,
				'_'
			)}.pdf`
			break
		default:
			throw new Error(`Invalid PDF type: ${type}`)
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
