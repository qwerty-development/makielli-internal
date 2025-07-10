import { supabase } from '../supabase'

export interface BalanceReconciliationResult {
  clientId: number
  clientName: string
  calculatedBalance: number
  databaseBalance: number
  difference: number
  isReconciled: boolean
  wasUpdated: boolean
  transactionCount: number
  lastTransactionDate: string | null
  errors: string[]
}

export interface BalanceBreakdown {
  totalInvoices: number
  totalReturns: number
  totalReceipts: number
  netInvoiceAmount: number
  finalBalance: number
  invoiceCount: number
  returnCount: number
  receiptCount: number
  currencyBreakdown: Map<string, {
    invoices: number
    returns: number
    receipts: number
  }>
}

/**
 * Calculate the correct balance for a single client based on all transactions
 */
export const calculateClientBalance = async (clientId: number): Promise<BalanceReconciliationResult> => {
  const errors: string[] = []
  let calculatedBalance = 0
  let transactionCount = 0
  let lastTransactionDate: string | null = null

  try {
    // Fetch client info
    const { data: clientData, error: clientError } = await supabase
      .from('Clients')
      .select('client_id, name, balance')
      .eq('client_id', clientId)
      .single()

    if (clientError) {
      errors.push(`Failed to fetch client data: ${clientError.message}`)
      throw new Error(clientError.message)
    }

    // Fetch all invoices
    const { data: invoices, error: invoiceError } = await supabase
      .from('ClientInvoices')
      .select('id, created_at, total_price, type, currency')
      .eq('client_id', clientId)
      .order('created_at', { ascending: true })

    if (invoiceError) {
      errors.push(`Failed to fetch invoices: ${invoiceError.message}`)
      throw new Error(invoiceError.message)
    }

    // Fetch all receipts with currency info
    const { data: receipts, error: receiptError } = await supabase
      .from('ClientReceipts')
      .select(`
        id, paid_at, amount, invoice_id,
        ClientInvoices!inner(currency)
      `)
      .eq('client_id', clientId)
      .order('paid_at', { ascending: true })

    let processedReceipts:any = receipts || []
    
    if (receiptError) {
      // Fallback to separate queries
      const { data: receiptsOnly, error: receiptError2 } = await supabase
        .from('ClientReceipts')
        .select('id, paid_at, amount, invoice_id')
        .eq('client_id', clientId)
        .order('paid_at', { ascending: true })

      if (receiptError2) {
        errors.push(`Failed to fetch receipts: ${receiptError2.message}`)
        throw new Error(receiptError2.message)
      }

      // Get currency for each receipt
      processedReceipts = await Promise.all(
        (receiptsOnly || []).map(async (receipt) => {
          const { data: invoiceData } = await supabase
            .from('ClientInvoices')
            .select('currency')
            .eq('id', receipt.invoice_id)
            .single()
          
          return {
            ...receipt,
            ClientInvoices: { currency: invoiceData?.currency || 'usd' }
          }
        })
      )
    }

    // Calculate balance from transactions
    const allTransactions:any = []

    // Process invoices
    if (invoices && invoices.length > 0) {
      invoices.forEach(invoice => {
        const isReturn = invoice.type === 'return'
        const amount = Math.abs(invoice.total_price || 0)
        
        if (isReturn) {
          calculatedBalance -= amount
        } else {
          calculatedBalance += amount
        }
        
        allTransactions.push({
          date: invoice.created_at,
          type: isReturn ? 'return' : 'invoice',
          amount: isReturn ? -amount : amount
        })
      })
    }

    // Process receipts
    if (processedReceipts && processedReceipts.length > 0) {
      processedReceipts.forEach((receipt: { amount: any; paid_at: any }) => {
        const amount = Math.abs(receipt.amount || 0)
        calculatedBalance -= amount
        
        allTransactions.push({
          date: receipt.paid_at,
          type: 'receipt',
          amount: -amount
        })
      })
    }

    // Sort transactions by date to get the last one
    allTransactions.sort((a: { date: string | number | Date }, b: { date: string | number | Date }) => new Date(a.date).getTime() - new Date(b.date).getTime())
    transactionCount = allTransactions.length
    lastTransactionDate = allTransactions.length > 0 ? allTransactions[allTransactions.length - 1].date : null

    const databaseBalance = clientData.balance || 0
    const difference = Math.abs(calculatedBalance - databaseBalance)
    const isReconciled = difference <= 0.01
    let wasUpdated = false

    // Update database balance if there's a significant difference
    if (!isReconciled) {
      const { error: updateError } = await supabase
        .from('Clients')
        .update({ balance: calculatedBalance })
        .eq('client_id', clientId)

      if (updateError) {
        errors.push(`Failed to update balance: ${updateError.message}`)
      } else {
        wasUpdated = true
      }
    }

    return {
      clientId,
      clientName: clientData.name,
      calculatedBalance,
      databaseBalance,
      difference,
      isReconciled: wasUpdated || isReconciled,
      wasUpdated,
      transactionCount,
      lastTransactionDate,
      errors
    }

  } catch (error: any) {
    return {
      clientId,
      clientName: 'Unknown',
      calculatedBalance: 0,
      databaseBalance: 0,
      difference: 0,
      isReconciled: false,
      wasUpdated: false,
      transactionCount: 0,
      lastTransactionDate: null,
      errors: [error.message, ...errors]
    }
  }
}

/**
 * Calculate detailed balance breakdown for a client
 */
export const getClientBalanceBreakdown = async (clientId: number): Promise<BalanceBreakdown> => {
  // Fetch all invoices
  const { data: invoices } = await supabase
    .from('ClientInvoices')
    .select('total_price, type, currency')
    .eq('client_id', clientId)

  // Fetch all receipts with currency info
  const { data: receipts, error: receiptError } = await supabase
    .from('ClientReceipts')
    .select(`
      amount,
      ClientInvoices!inner(currency)
    `)
    .eq('client_id', clientId)

  let processedReceipts:any = receipts || []
  
  if (receiptError) {
    // Fallback
    const { data: receiptsOnly } = await supabase
      .from('ClientReceipts')
      .select('amount, invoice_id')
      .eq('client_id', clientId)

    processedReceipts = await Promise.all(
      (receiptsOnly || []).map(async (receipt) => {
        const { data: invoiceData } = await supabase
          .from('ClientInvoices')
          .select('currency')
          .eq('id', receipt.invoice_id)
          .single()
        
        return {
          ...receipt,
          ClientInvoices: { currency: invoiceData?.currency || 'usd' }
        }
      })
    )
  }

  // Calculate breakdown
  const currencyBreakdown = new Map()
  let totalInvoices = 0
  let totalReturns = 0
  let totalReceipts = 0
  let invoiceCount = 0
  let returnCount = 0
  let receiptCount = 0;

  // Process invoices
  (invoices || []).forEach((invoice: { currency: string; total_price: any; type: string }) => {
    const currency = invoice.currency || 'usd'
    const amount = Math.abs(invoice.total_price || 0)
    
    if (!currencyBreakdown.has(currency)) {
      currencyBreakdown.set(currency, { invoices: 0, returns: 0, receipts: 0 })
    }
    
    const currencyData = currencyBreakdown.get(currency)
    
    if (invoice.type === 'return') {
      totalReturns += amount
      currencyData.returns += amount
      returnCount++
    } else {
      totalInvoices += amount
      currencyData.invoices += amount
      invoiceCount++
    }
  })

  // Process receipts
  processedReceipts.forEach((receipt: { ClientInvoices: { currency: string }; amount: any }) => {
    const currency = receipt.ClientInvoices?.currency || 'usd'
    const amount = Math.abs(receipt.amount || 0)
    
    if (!currencyBreakdown.has(currency)) {
      currencyBreakdown.set(currency, { invoices: 0, returns: 0, receipts: 0 })
    }
    
    const currencyData = currencyBreakdown.get(currency)
    totalReceipts += amount
    currencyData.receipts += amount
    receiptCount++
  })

  const netInvoiceAmount = totalInvoices - totalReturns
  const finalBalance = netInvoiceAmount - totalReceipts

  return {
    totalInvoices,
    totalReturns,
    totalReceipts,
    netInvoiceAmount,
    finalBalance,
    invoiceCount,
    returnCount,
    receiptCount,
    currencyBreakdown
  }
}

/**
 * Reconcile balances for all clients
 */
export const reconcileAllClientBalances = async (): Promise<{
  results: BalanceReconciliationResult[]
  summary: {
    totalClients: number
    reconciledClients: number
    updatedClients: number
    errorClients: number
    totalDifference: number
  }
}> => {
  console.log('Starting balance reconciliation for all clients...')
  
  // Fetch all clients
  const { data: clients, error: clientsError } = await supabase
    .from('Clients')
    .select('client_id, name')
    .order('name')

  if (clientsError) {
    throw new Error(`Failed to fetch clients: ${clientsError.message}`)
  }

  if (!clients || clients.length === 0) {
    return {
      results: [],
      summary: {
        totalClients: 0,
        reconciledClients: 0,
        updatedClients: 0,
        errorClients: 0,
        totalDifference: 0
      }
    }
  }

  console.log(`Found ${clients.length} clients to reconcile`)

  // Process each client
  const results: BalanceReconciliationResult[] = []
  for (const client of clients) {
    console.log(`Processing client: ${client.name} (ID: ${client.client_id})`)
    const result = await calculateClientBalance(client.client_id)
    results.push(result)
    
    if (result.wasUpdated) {
      console.log(`✅ Updated balance for ${client.name}: $${result.databaseBalance} → $${result.calculatedBalance}`)
    } else if (result.isReconciled) {
      console.log(`✓ Balance already correct for ${client.name}: $${result.calculatedBalance}`)
    } else {
      console.log(`⚠️ Could not update balance for ${client.name}:`, result.errors)
    }
  }

  // Calculate summary
  const summary = {
    totalClients: clients.length,
    reconciledClients: results.filter(r => r.isReconciled).length,
    updatedClients: results.filter(r => r.wasUpdated).length,
    errorClients: results.filter(r => r.errors.length > 0).length,
    totalDifference: results.reduce((sum, r) => sum + r.difference, 0)
  }

  console.log('Balance reconciliation complete:')
  console.log(`- Total clients: ${summary.totalClients}`)
  console.log(`- Reconciled: ${summary.reconciledClients}`)
  console.log(`- Updated: ${summary.updatedClients}`)
  console.log(`- Errors: ${summary.errorClients}`)
  console.log(`- Total difference resolved: $${summary.totalDifference.toFixed(2)}`)

  return { results, summary }
}

/**
 * Get clients with balance discrepancies
 */
export const getClientsWithBalanceIssues = async (): Promise<BalanceReconciliationResult[]> => {
  const { data: clients } = await supabase
    .from('Clients')
    .select('client_id')

  if (!clients) return []

  const results = []
  for (const client of clients) {
    const result = await calculateClientBalance(client.client_id)
    if (!result.isReconciled && result.difference > 0.01) {
      results.push(result)
    }
  }

  return results
}

/**
 * Utility function to format currency amounts
 */
export const formatCurrency = (amount: number, currency: string = 'usd'): string => {
  const symbol = currency === 'euro' ? '€' : '$'
  return `${symbol}${Math.abs(amount).toFixed(2)}`
}

/**
 * Utility function to format balance status
 */
export const getBalanceStatus = (balance: number): {
  text: string
  color: string
  status: 'outstanding' | 'credit' | 'settled'
} => {
  if (balance > 0.01) {
    return {
      text: 'Outstanding',
      color: 'red',
      status: 'outstanding'
    }
  } else if (balance < -0.01) {
    return {
      text: 'Credit',
      color: 'green',
      status: 'credit'
    }
  } else {
    return {
      text: 'Settled',
      color: 'gray',
      status: 'settled'
    }
  }
}