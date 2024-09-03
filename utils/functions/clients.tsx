import { supabase } from '../supabase'

export interface Client {
	client_id: number
	name: string
	email: string
	phone: string
	address: string
	group_id: number
	balance: number
}

export interface ClientGroup {
	group_id: number
	name: string
}

export const clientFunctions = {
	async getAllClients(): Promise<Client[]> {
		const { data, error } = await supabase.from('Clients').select('*')

		if (error) throw error
		return data || []
	},

	async getClientById(id: number): Promise<Client | null> {
		const { data, error } = await supabase
			.from('Clients')
			.select('*')
			.eq('client_id', id)
			.single()

		if (error) throw error
		return data
	},

	async getAllClientGroups(): Promise<ClientGroup[]> {
		const { data, error } = await supabase.from('ClientGroups').select('*')

		if (error) throw error
		return data || []
	},

	async getClientGroupById(id: number): Promise<ClientGroup | null> {
		const { data, error } = await supabase
			.from('ClientGroups')
			.select('*')
			.eq('group_id', id)
			.single()

		if (error) throw error
		return data
	},

	async getClientsByGroup(groupId: number): Promise<Client[]> {
		const { data, error } = await supabase
			.from('Clients')
			.select('*')
			.eq('group_id', groupId)

		if (error) throw error
		return data || []
	},

	async createClient(clientData: Omit<Client, 'client_id'>): Promise<Client> {
		const { data, error } = await supabase
			.from('Clients')
			.insert([clientData])
			.select()
			.single()

		if (error) throw error
		return data
	},

	async createGroup(
		groupData: Omit<ClientGroup, 'group_id'>
	): Promise<ClientGroup> {
		const { data, error } = await supabase
			.from('ClientGroups')
			.insert([groupData])
			.select()
			.single()

		if (error) throw error
		return data
	},

	async updateClient(id: number, clientData: Partial<Client>): Promise<Client> {
		const { data, error } = await supabase
			.from('Clients')
			.update(clientData)
			.eq('client_id', id)
			.select()
			.single()

		if (error) throw error
		return data
	},

	async deleteClient(id: number): Promise<void> {
		const { error } = await supabase
			.from('Clients')
			.delete()
			.eq('client_id', id)

		if (error) throw error
	},

	async updateClientGroup(
		id: number,
		groupData: Partial<ClientGroup>
	): Promise<ClientGroup> {
		const { data, error } = await supabase
			.from('ClientGroups')
			.update(groupData)
			.eq('group_id', id)
			.select()
			.single()

		if (error) throw error
		return data
	},

	async deleteClientGroup(id: number): Promise<void> {
		const { error } = await supabase
			.from('ClientGroups')
			.delete()
			.eq('group_id', id)

		if (error) throw error
	}
}

export const fetchClientFinancialData = async (clientId: number) => {
	const { data: invoices, error: invoiceError } = await supabase
		.from('ClientInvoices')
		.select('id, created_at, total_price')
		.eq('client_id', clientId)

	if (invoiceError) throw invoiceError

	const { data: receipts, error: receiptError } = await supabase
		.from('ClientReceipts')
		.select('id, paid_at, amount')
		.eq('client_id', clientId)

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
