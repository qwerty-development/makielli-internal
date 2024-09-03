import { supabase } from '../supabase'

export interface Supplier {
	id: string
	name: string
	location: string
	phone: string
	balance: number
}

export const supplierFunctions = {
	async getAllSuppliers(): Promise<Supplier[]> {
		const { data, error } = await supabase.from('Suppliers').select('*')

		if (error) throw error
		return data || []
	},

	async getSupplierById(id: string): Promise<Supplier | null> {
		const { data, error } = await supabase
			.from('Suppliers')
			.select('*')
			.eq('id', id)
			.single()

		if (error) throw error
		return data
	},

	async addSupplier(supplier: Omit<Supplier, 'id'>): Promise<Supplier> {
		const { data, error } = await supabase
			.from('Suppliers')
			.insert([supplier])
			.select()
			.single()

		if (error) throw error
		return data
	},

	async updateSupplier(
		id: string,
		updates: Partial<Supplier>
	): Promise<Supplier> {
		const { data, error } = await supabase
			.from('Suppliers')
			.update(updates)
			.eq('id', id)
			.select()
			.single()

		if (error) throw error
		return data
	},

	async deleteSupplier(id: string): Promise<void> {
		const { error } = await supabase.from('Suppliers').delete().eq('id', id)

		if (error) throw error
	}
}

export const fetchSupplierFinancialData = async (supplierId: string) => {
	const { data: invoices, error: invoiceError } = await supabase
		.from('SupplierInvoices')
		.select('id, created_at, total_price')
		.eq('supplier_id', supplierId)

	if (invoiceError) throw invoiceError

	const { data: receipts, error: receiptError } = await supabase
		.from('SupplierReceipts')
		.select('id, paid_at, amount')
		.eq('supplier_id', supplierId)

	if (receiptError) throw receiptError

	const financialData = [
		...invoices.map(invoice => ({
			id: invoice.id,
			date: invoice.created_at,
			amount: invoice.total_price,
			type: 'invoice'
		})),
		...receipts.map(receipt => ({
			id: receipt.id,
			date: receipt.paid_at,
			amount: -receipt.amount, // Negative amount for receipts
			type: 'receipt'
		}))
	].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

	return financialData
}
