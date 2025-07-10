import { supabase } from '../supabase'
import { calculateClientBalance, getClientBalanceBreakdown } from './balance-reconcilation'

export interface Client {
  client_id: number
  name: string
  email: string
  phone: string
  address: string
  group_id: number | null
  balance: number
  tax_number: string
  company_id: number
}

export interface Company {
  id: number
  name: string
  identification_type: string
  identification_number: string
  bank_account_number: string
  bank_routing_number: string
  bank_name: string
  address: string
  bank_address: string
}

export interface ClientGroup {
  group_id: number
  name: string
}

export const clientFunctions = {
  // Enhanced function to get client with accurate balance
  async getClientById(id: number): Promise<Client | null> {
    try {
      const { data, error } = await supabase
        .from('Clients')
        .select('*')
        .eq('client_id', id)
        .single()

      if (error) throw error
      if (!data) return null

      // Get the calculated balance to ensure accuracy
      const balanceResult = await calculateClientBalance(id)
      
      return {
        ...data,
        balance: balanceResult.calculatedBalance
      }
    } catch (error) {
      console.error('Error fetching client:', error)
      throw error
    }
  },

  // Enhanced function to get all clients with accurate balances
  async getAllClients(): Promise<Client[]> {
    try {
      const { data, error } = await supabase
        .from('Clients')
        .select('*')
        .order('name')

      if (error) throw error
      if (!data) return []

      // For performance, we'll return the database balance but provide a method to recalculate
      // In a production environment, you might want to batch calculate or cache these
      return data
    } catch (error) {
      console.error('Error fetching clients:', error)
      throw error
    }
  },

  // Get clients with calculated balances (slower but accurate)
  async getAllClientsWithCalculatedBalances(): Promise<Client[]> {
    try {
      const { data, error } = await supabase
        .from('Clients')
        .select('*')
        .order('name')

      if (error) throw error
      if (!data) return []

      // Calculate accurate balance for each client
      const clientsWithBalances = await Promise.all(
        data.map(async (client) => {
          const balanceResult = await calculateClientBalance(client.client_id)
          return {
            ...client,
            balance: balanceResult.calculatedBalance
          }
        })
      )

      return clientsWithBalances
    } catch (error) {
      console.error('Error fetching clients with calculated balances:', error)
      throw error
    }
  },

  async getClientsByGroup(groupId: number): Promise<Client[]> {
    try {
      const { data, error } = await supabase
        .from('Clients')
        .select('*')
        .eq('group_id', groupId)
        .order('name')

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching clients by group:', error)
      throw error
    }
  },

  async createClient(client: Omit<Client, 'client_id' | 'balance'>): Promise<Client> {
    try {
      const { data, error } = await supabase
        .from('Clients')
        .insert([{ ...client, balance: 0 }]) // Start with zero balance
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error creating client:', error)
      throw error
    }
  },

  async updateClient(id: number, updates: Partial<Client>): Promise<Client> {
    try {
      // Don't allow direct balance updates - balance should be calculated from transactions
      const { balance, ...safeUpdates } = updates

      const { data, error } = await supabase
        .from('Clients')
        .update(safeUpdates)
        .eq('client_id', id)
        .select()
        .single()

      if (error) throw error

      // Return client with calculated balance
      const balanceResult = await calculateClientBalance(id)
      return {
        ...data,
        balance: balanceResult.calculatedBalance
      }
    } catch (error) {
      console.error('Error updating client:', error)
      throw error
    }
  },

  async deleteClient(id: number): Promise<void> {
    try {
      // Check if client has any invoices or receipts
      const { data: invoices } = await supabase
        .from('ClientInvoices')
        .select('id')
        .eq('client_id', id)
        .limit(1)

      const { data: receipts } = await supabase
        .from('ClientReceipts')
        .select('id')
        .eq('client_id', id)
        .limit(1)

      const { data: quotations } = await supabase
        .from('Quotations')
        .select('id')
        .eq('client_id', id)
        .limit(1)

      if ((invoices && invoices.length > 0) || (receipts && receipts.length > 0) || (quotations && quotations.length > 0)) {
        throw new Error('Cannot delete client with existing invoices, receipts, or quotations. Please remove all related records first.')
      }

      const { error } = await supabase
        .from('Clients')
        .delete()
        .eq('client_id', id)

      if (error) throw error
    } catch (error) {
      console.error('Error deleting client:', error)
      throw error
    }
  },

  // Balance management functions
  async recalculateClientBalance(id: number): Promise<{
    success: boolean
    previousBalance: number
    newBalance: number
    difference: number
    wasUpdated: boolean
  }> {
    try {
      const result = await calculateClientBalance(id)
      
      return {
        success: result.errors.length === 0,
        previousBalance: result.databaseBalance,
        newBalance: result.calculatedBalance,
        difference: result.difference,
        wasUpdated: result.wasUpdated
      }
    } catch (error) {
      console.error('Error recalculating client balance:', error)
      throw error
    }
  },

  async getClientBalanceBreakdown(id: number) {
    try {
      return await getClientBalanceBreakdown(id)
    } catch (error) {
      console.error('Error getting client balance breakdown:', error)
      throw error
    }
  },

  // Client group functions
  async getAllClientGroups(): Promise<ClientGroup[]> {
    try {
      const { data, error } = await supabase
        .from('ClientGroups')
        .select('*')
        .order('name')

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching client groups:', error)
      throw error
    }
  },

  async getClientGroupById(id: number): Promise<ClientGroup | null> {
    try {
      const { data, error } = await supabase
        .from('ClientGroups')
        .select('*')
        .eq('group_id', id)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error fetching client group:', error)
      throw error
    }
  },

  async createClientGroup(group: Omit<ClientGroup, 'group_id'>): Promise<ClientGroup> {
    try {
      const { data, error } = await supabase
        .from('ClientGroups')
        .insert([group])
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error creating client group:', error)
      throw error
    }
  },

  async updateClientGroup(id: number, updates: Partial<ClientGroup>): Promise<ClientGroup> {
    try {
      const { data, error } = await supabase
        .from('ClientGroups')
        .update(updates)
        .eq('group_id', id)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error updating client group:', error)
      throw error
    }
  },

  async deleteClientGroup(id: number): Promise<void> {
    try {
      // Check if any clients belong to this group
      const { data: clients } = await supabase
        .from('Clients')
        .select('client_id')
        .eq('group_id', id)
        .limit(1)

      if (clients && clients.length > 0) {
        throw new Error('Cannot delete client group that contains clients. Please move or remove all clients from this group first.')
      }

      const { error } = await supabase
        .from('ClientGroups')
        .delete()
        .eq('group_id', id)

      if (error) throw error
    } catch (error) {
      console.error('Error deleting client group:', error)
      throw error
    }
  },

  // Company functions
  async getAllCompanies(): Promise<Company[]> {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('name')

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching companies:', error)
      throw error
    }
  },

  async getCompanyById(id: number): Promise<Company | null> {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error fetching company:', error)
      throw error
    }
  },

  async createCompany(company: Omit<Company, 'id'>): Promise<Company> {
    try {
      const { data, error } = await supabase
        .from('companies')
        .insert([company])
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error creating company:', error)
      throw error
    }
  },

  async updateCompany(id: number, updates: Partial<Company>): Promise<Company> {
    try {
      const { data, error } = await supabase
        .from('companies')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error updating company:', error)
      throw error
    }
  },

  async deleteCompany(id: number): Promise<void> {
    try {
      // Check if any clients or suppliers belong to this company
      const { data: clients } = await supabase
        .from('Clients')
        .select('client_id')
        .eq('company_id', id)
        .limit(1)

      const { data: suppliers } = await supabase
        .from('Suppliers')
        .select('id')
        .eq('company_id', id)
        .limit(1)

      if ((clients && clients.length > 0) || (suppliers && suppliers.length > 0)) {
        throw new Error('Cannot delete company that has associated clients or suppliers. Please reassign or remove all related entities first.')
      }

      const { error } = await supabase
        .from('companies')
        .delete()
        .eq('id', id)

      if (error) throw error
    } catch (error) {
      console.error('Error deleting company:', error)
      throw error
    }
  },

  // Search and filter functions
  async searchClients(searchTerm: string): Promise<Client[]> {
    try {
      const { data, error } = await supabase
        .from('Clients')
        .select('*')
        .or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
        .order('name')

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error searching clients:', error)
      throw error
    }
  },

  async getClientsWithOutstandingBalance(): Promise<Client[]> {
    try {
      const { data, error } = await supabase
        .from('Clients')
        .select('*')
        .gt('balance', 0.01)
        .order('balance', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching clients with outstanding balance:', error)
      throw error
    }
  },

  async getClientsWithCreditBalance(): Promise<Client[]> {
    try {
      const { data, error } = await supabase
        .from('Clients')
        .select('*')
        .lt('balance', -0.01)
        .order('balance', { ascending: true })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching clients with credit balance:', error)
      throw error
    }
  },

  // Statistics functions
  async getClientStatistics(): Promise<{
    totalClients: number
    clientsWithOutstandingBalance: number
    clientsWithCreditBalance: number
    totalOutstandingAmount: number
    totalCreditAmount: number
    averageBalance: number
  }> {
    try {
      const { data: clients, error } = await supabase
        .from('Clients')
        .select('balance')

      if (error) throw error
      if (!clients || clients.length === 0) {
        return {
          totalClients: 0,
          clientsWithOutstandingBalance: 0,
          clientsWithCreditBalance: 0,
          totalOutstandingAmount: 0,
          totalCreditAmount: 0,
          averageBalance: 0
        }
      }

      const totalClients = clients.length
      const clientsWithOutstandingBalance = clients.filter(c => c.balance > 0.01).length
      const clientsWithCreditBalance = clients.filter(c => c.balance < -0.01).length
      const totalOutstandingAmount = clients
        .filter(c => c.balance > 0)
        .reduce((sum, c) => sum + c.balance, 0)
      const totalCreditAmount = Math.abs(clients
        .filter(c => c.balance < 0)
        .reduce((sum, c) => sum + c.balance, 0))
      const averageBalance = clients.reduce((sum, c) => sum + c.balance, 0) / totalClients

      return {
        totalClients,
        clientsWithOutstandingBalance,
        clientsWithCreditBalance,
        totalOutstandingAmount,
        totalCreditAmount,
        averageBalance
      }
    } catch (error) {
      console.error('Error getting client statistics:', error)
      throw error
    }
  }
}