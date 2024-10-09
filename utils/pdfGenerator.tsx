// utils/pdfGenerator.ts
import { pdf } from '@react-pdf/renderer'
import InvoicePDF from './pdfTemplates/InvoicePDF'
import ReceiptPDF from './pdfTemplates/ReceiptPDF'
import QuotationPDF from './pdfTemplates/QuotationPDF'
import ClientFinancialReportPDF from './pdfTemplates/ClientFinancialReportPDF'
import SupplierFinancialReportPDF from './pdfTemplates/SupplierFinancialReportPDF'
import { supabase } from './supabase'

const fetchClientDetails = async (clientId: number) => {
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
        price,
        cost
      )
    `
		)
		.eq('id', productVariantId)
		.single()

	if (error) throw error

	let productDetails: any = data.Products
	if (!productDetails) {
		const { data: productData, error: productError } = await supabase
			.from('Products')
			.select('id, name, photo, price, cost')
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
		unitCost: productDetails.cost,
		color: data.color,
		size: data.size,
		quantity: data.quantity
	}
}

const fetchInvoiceDetails = async (
	invoiceId: number,
	isClientInvoice: boolean
) => {
	const table = isClientInvoice ? 'ClientInvoices' : 'SupplierInvoices'
	const { data, error } = await supabase
		.from(table)
		.select('*')
		.eq('id', invoiceId)
		.single()

	if (error) throw error
	return data
}

const fetchClientFinancialData = async (clientId: number) => {
	const { data: invoices, error: invoiceError } = await supabase
		.from('ClientInvoices')
		.select('*')
		.eq('client_id', clientId)

	if (invoiceError) throw invoiceError

	const { data: receipts, error: receiptError } = await supabase
		.from('ClientReceipts')
		.select('*')
		.eq('client_id', clientId)

	if (receiptError) throw receiptError

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
	const { data: invoices, error: invoiceError } = await supabase
		.from('SupplierInvoices')
		.select('*')
		.eq('supplier_id', supplierId)

	if (invoiceError) throw invoiceError

	const { data: receipts, error: receiptError } = await supabase
		.from('SupplierReceipts')
		.select('*')
		.eq('supplier_id', supplierId)

	if (receiptError) throw receiptError

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

	if (type === 'invoice' || type === 'quotation') {
		const productMap = new Map()

		await Promise.all(
			data.products.map(async (product: any) => {
				const details = await fetchProductDetails(product.product_variant_id)
				const key = `${details.name}-${details.color}`

				if (!productMap.has(key)) {
					productMap.set(key, {
						...details,
						sizes: {},
						totalQuantity: 0,
						notes: new Set()
					})
				}

				const existingProduct = productMap.get(key)
				existingProduct.sizes[details.size] =
					(existingProduct.sizes[details.size] || 0) + product.quantity
				existingProduct.totalQuantity += product.quantity
				if (product.note) {
					existingProduct.notes.add(product.note)
				}
				productMap.set(key, existingProduct)
			})
		)

		data = {
			...data,
			products: Array.from(productMap.values()).map(product => ({
				...product,
				notes: Array.from(product.notes)
			})),
			discounts: data.discounts || {} // Ensure discounts are included
		}
	}

	switch (type) {
		case 'invoice':
			let entityData, companyData, isClientInvoice
			if (data.client_id) {
				isClientInvoice = true
				entityData = await fetchClientDetails(data.client_id)
				companyData = await fetchCompanyDetails(entityData.company_id)
			} else if (data.supplier_id) {
				isClientInvoice = false
				entityData = await fetchSupplierDetails(data.supplier_id)
				companyData = await fetchCompanyDetails(entityData.company_id)
			} else {
				throw new Error('Invalid invoice: missing client_id or supplier_id')
			}
			component = InvoicePDF({
				invoice: data,
				entity: entityData,
				company: companyData,
				isClientInvoice
			})
			fileName = `invoice_${data.id}.pdf`
			break
		case 'receipt':
			let entityData2, companyData2, invoiceData, isClientReceipt
			if (data.client_id) {
				isClientReceipt = true
				entityData2 = await fetchClientDetails(data.client_id)
				companyData2 = await fetchCompanyDetails(entityData2.company_id)
				invoiceData = await fetchInvoiceDetails(data.invoice_id, true)
			} else if (data.supplier_id) {
				isClientReceipt = false
				entityData2 = await fetchSupplierDetails(data.supplier_id)
				companyData2 = await fetchCompanyDetails(entityData2.company_id)
				invoiceData = await fetchInvoiceDetails(data.invoice_id, false)
			} else {
				throw new Error('Invalid receipt: missing client_id or supplier_id')
			}

			component = ReceiptPDF({
				receipt: data,
				entity: entityData2,
				company: companyData2,
				invoice: invoiceData,
				isClient: isClientReceipt
			})
			fileName = `receipt_${data.id}.pdf`
			break
		case 'quotation':
			const quotationClientData = await fetchClientDetails(data.client_id)
			const quotationCompanyData = await fetchCompanyDetails(
				quotationClientData.company_id
			)
			// Ensure the data structure matches what QuotationPDF expects
			const preparedQuotationData = {
				...data,
				products: data.products.map((product: any) => ({
					...product,
					totalQuantity: Object.values(product.sizes as number[]).reduce(
						(sum: number, quantity: number) => sum + quantity,
						0
					),
					notes: Array.isArray(product.notes)
						? product.notes
						: [product.note].filter(Boolean)
				}))
			}
			component = QuotationPDF({
				quotation: preparedQuotationData,
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
