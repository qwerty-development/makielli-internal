import React from 'react'
import {
	Page,
	Text,
	View,
	Document,
	Image,
	StyleSheet,
	Font
} from '@react-pdf/renderer'
import { format } from 'date-fns'

// Register Times New Roman font family
Font.register({
	family: 'Times New Roman',
	fonts: [
		{ src: '/fonts/times-new-roman.ttf' },
		{ src: '/fonts/times-new-roman-bold.ttf', fontWeight: 700 },
		{ src: '/fonts/times-new-roman-italic.ttf', fontStyle: 'italic' },
		{
			src: '/fonts/times-new-roman-bold-italic.ttf',
			fontWeight: 700,
			fontStyle: 'italic'
		}
	]
})

const styles = StyleSheet.create({
	page: {
		fontFamily: 'Times New Roman',
		fontSize: 11,
		paddingTop: 40,
		paddingBottom: 60,
		paddingHorizontal: 40,
		backgroundColor: '#FFFFFF',
		color: '#2D3748'
	},
	
	// Elegant Header
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'flex-start',
		marginBottom: 40,
		paddingBottom: 25,
		borderBottomWidth: 1,
		borderBottomColor: '#E2E8F0'
	},
	headerLeft: {
		flexDirection: 'column'
	},
	logo: {
		width: 100,
		height: 'auto',
		marginBottom: 12,
		objectFit: 'contain'
	},
	title: {
		fontSize: 24,
		fontWeight: 'bold',
		color: '#1A202C',
		letterSpacing: -0.5
	},
	subtitle: {
		fontSize: 11,
		color: '#718096',
		marginTop: 4,
		fontWeight: 'normal'
	},
	headerRight: {
		flexDirection: 'column',
		alignItems: 'flex-end'
	},
	headerDetails: {
		fontSize: 9,
		color: '#718096',
		textAlign: 'right',
		marginBottom: 2
	},
	
	// Refined Section Styles
	section: {
		marginBottom: 32
	},
	sectionTitle: {
		fontSize: 13,
		fontWeight: 'bold',
		color: '#2D3748',
		marginBottom: 16,
		letterSpacing: -0.2
	},
	
	// Elegant Client Info
	clientInfoContainer: {
		backgroundColor: '#F7FAFC',
		padding: 20,
		borderRadius: 2,
		borderLeftWidth: 3,
		borderLeftColor: '#4A5568'
	},
	infoGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap'
	},
	infoColumn: {
		width: '50%',
		paddingRight: 20,
		marginBottom: 12
	},
	infoColumnFull: {
		width: '100%',
		marginBottom: 12
	},
	infoLabel: {
		fontSize: 8,
		fontWeight: 'bold',
		color: '#718096',
		marginBottom: 3,
		textTransform: 'uppercase',
		letterSpacing: 0.5
	},
	infoValue: {
		fontSize: 11,
		color: '#2D3748',
		fontWeight: 'normal'
	},
	
	// Sophisticated Balance Display
	balanceContainer: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		backgroundColor: '#F7FAFC',
		paddingVertical: 16,
		paddingHorizontal: 20,
		marginTop: 16,
		borderRadius: 2,
		borderLeftWidth: 3
	},
	balanceOutstanding: {
		borderLeftColor: '#E53E3E'
	},
	balanceCredit: {
		borderLeftColor: '#38A169'
	},
	balanceSettled: {
		borderLeftColor: '#718096'
	},
	balanceLeft: {
		flexDirection: 'column'
	},
	balanceLabel: {
		fontSize: 9,
		color: '#718096',
		fontWeight: 'bold',
		textTransform: 'uppercase',
		letterSpacing: 0.5,
		marginBottom: 4
	},
	balanceAmount: {
		fontSize: 18,
		fontWeight: 'bold',
		color: '#2D3748'
	},
	balanceRight: {
		alignItems: 'flex-end'
	},
	balanceStatus: {
		fontSize: 9,
		color: '#718096',
		fontStyle: 'italic'
	},
	reconcileNote: {
		fontSize: 8,
		color: '#38A169',
		marginTop: 2
	},
	
	// Minimal Summary Cards
	summaryContainer: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: 20
	},
	summaryCard: {
		width: '32%',
		backgroundColor: '#FFFFFF',
		borderWidth: 1,
		borderColor: '#E2E8F0',
		borderRadius: 2,
		padding: 14,
		alignItems: 'center'
	},
	summaryAmount: {
		fontSize: 14,
		fontWeight: 'bold',
		color: '#2D3748',
		marginBottom: 4
	},
	summaryLabel: {
		fontSize: 8,
		color: '#718096',
		textAlign: 'center',
		fontWeight: 'bold',
		textTransform: 'uppercase',
		letterSpacing: 0.3
	},
	summaryCount: {
		fontSize: 7,
		color: '#A0AEC0',
		marginTop: 2
	},
	
	// Elegant Period Info
	periodContainer: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		backgroundColor: '#F7FAFC',
		paddingVertical: 12,
		paddingHorizontal: 16,
		marginBottom: 20,
		borderRadius: 2
	},
	periodText: {
		fontSize: 9,
		color: '#718096'
	},
	periodBold: {
		color: '#2D3748',
		fontWeight: 'bold'
	},
	
	// Sophisticated Table
	tableContainer: {
		borderWidth: 1,
		borderColor: '#E2E8F0',
		borderRadius: 2,
		overflow: 'hidden'
	},
	tableHeader: {
		flexDirection: 'row',
		backgroundColor: '#2D3748',
		paddingVertical: 14
	},
	tableRow: {
		flexDirection: 'row',
		borderBottomWidth: 1,
		borderBottomColor: '#E2E8F0',
		minHeight: 40,
		alignItems: 'center'
	},
	tableRowEven: {
		backgroundColor: '#F7FAFC'
	},
	tableRowReturn: {
		backgroundColor: '#FED7D7',
		borderLeftWidth: 2,
		borderLeftColor: '#E53E3E'
	},
	
	// Refined Table Columns
	colDate: {
		width: '14%',
		paddingHorizontal: 12,
		justifyContent: 'center'
	},
	colDescription: {
		width: '36%',
		paddingHorizontal: 12,
		justifyContent: 'center'
	},
	colInvoice: {
		width: '16%',
		paddingHorizontal: 12,
		justifyContent: 'center'
	},
	colReceipt: {
		width: '16%',
		paddingHorizontal: 12,
		justifyContent: 'center'
	},
	colBalance: {
		width: '18%',
		paddingHorizontal: 12,
		justifyContent: 'center'
	},
	
	// Elegant Table Cells
	tableCellHeader: {
		fontSize: 8,
		fontWeight: 'bold',
		color: '#FFFFFF',
		textAlign: 'center',
		textTransform: 'uppercase',
		letterSpacing: 0.5
	},
	tableCell: {
		fontSize: 9,
		color: '#2D3748',
		textAlign: 'center',
		lineHeight: 1.3
	},
	tableCellLeft: {
		fontSize: 9,
		color: '#2D3748',
		textAlign: 'left',
		lineHeight: 1.3
	},
	tableCellRight: {
		fontSize: 9,
		color: '#2D3748',
		textAlign: 'right',
		lineHeight: 1.3
	},
	tableCellBold: {
		fontWeight: 'bold'
	},
	
	// Sophisticated Amount Colors
	amountInvoice: {
		color: '#C53030',
		fontWeight: 'bold'
	},
	amountReceipt: {
		color: '#2F855A',
		fontWeight: 'bold'
	},
	amountBalance: {
		color: '#2D3748',
		fontWeight: 'bold'
	},
	amountNeutral: {
		color: '#A0AEC0'
	},
	
	// Refined Currency Section
	currencySection: {
		backgroundColor: '#F7FAFC',
		padding: 16,
		borderRadius: 2,
		marginTop: 20,
		borderLeftWidth: 3,
		borderLeftColor: '#4A5568'
	},
	currencyTitle: {
		fontSize: 10,
		fontWeight: 'bold',
		color: '#2D3748',
		marginBottom: 10,
		textTransform: 'uppercase',
		letterSpacing: 0.3
	},
	currencyRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: 6
	},
	currencyLabel: {
		fontSize: 9,
		color: '#4A5568',
		fontWeight: 'bold'
	},
	currencyAmount: {
		fontSize: 9,
		color: '#2D3748'
	},
	
	// Empty State
	emptyState: {
		backgroundColor: '#F7FAFC',
		padding: 40,
		borderRadius: 2,
		alignItems: 'center',
		borderWidth: 1,
		borderColor: '#E2E8F0',
		borderStyle: 'dashed'
	},
	emptyText: {
		fontSize: 11,
		color: '#718096',
		fontStyle: 'italic'
	},
	
	// Minimalist Footer
	footer: {
		position: 'absolute',
		bottom: 30,
		left: 40,
		right: 40,
		textAlign: 'center',
		color: '#A0AEC0',
		fontSize: 8,
		borderTopWidth: 1,
		borderTopColor: '#E2E8F0',
		paddingTop: 16
	},
	footerHighlight: {
		color: '#2D3748',
		fontWeight: 'bold'
	}
})

interface FinancialTransaction {
	date: string
	type: 'invoice' | 'return' | 'receipt'
	subType: string
	id: number
	invoice_id?: number
	amount: number
	currency?: string
	order_number?: string
	remaining_amount?: number
	runningBalance?: number
	balanceChange?: number
	transactionIndex?: number
	quotation_id?: number | null
}

interface ClientFinancialReportProps {
	clientName: string
	clientDetails: any
	companyDetails: any
	financialData: {
		transactions: FinancialTransaction[]
		reconciliation: {
			calculatedBalance: number
			databaseBalance: number
			isReconciled: boolean
			difference: number
			wasUpdated?: boolean
		}
		summary: {
			totalTransactions: number
			firstTransactionDate: string | null
			lastTransactionDate: string | null
		}
	}
}

const ClientFinancialReportPDF: React.FC<ClientFinancialReportProps> = ({
	clientName,
	clientDetails,
	companyDetails,
	financialData
}) => {
	const { transactions, reconciliation, summary } = financialData

	// Calculate financial summary
	const calculateFinancialSummary = () => {
		const currencyTotals = new Map()
		let totalInvoices = 0
		let totalReturns = 0
		let totalReceipts = 0
		let invoiceCount = 0
		let returnCount = 0
		let receiptCount = 0

		transactions.forEach((transaction) => {
			const currency = transaction.currency || 'usd'

			if (!currencyTotals.has(currency)) {
				currencyTotals.set(currency, { invoices: 0, returns: 0, receipts: 0, balance: 0 })
			}

			const currencyData = currencyTotals.get(currency)

			switch (transaction.type) {
				case 'invoice':
					const invoiceAmount = Math.abs(transaction.amount)
					totalInvoices += invoiceAmount
					currencyData.invoices += invoiceAmount
					currencyData.balance += invoiceAmount
					invoiceCount++
					break
				case 'return':
					const returnAmount = Math.abs(transaction.amount)
					totalReturns += returnAmount
					currencyData.returns += returnAmount
					currencyData.balance -= returnAmount
					returnCount++
					break
				case 'receipt':
					const receiptAmount = Math.abs(transaction.amount)
					totalReceipts += receiptAmount
					currencyData.receipts += receiptAmount
					currencyData.balance -= receiptAmount
					receiptCount++
					break
			}
		})

		const netInvoiceAmount = totalInvoices - totalReturns
		const currentBalance = reconciliation.calculatedBalance

		// Determine primary currency (the one with most transactions or highest balance)
		let primaryCurrency = 'usd'
		let maxTransactionCount = 0
		currencyTotals.forEach((data, currency) => {
			const transactionCount = data.invoices + data.returns + data.receipts
			if (transactionCount > maxTransactionCount) {
				maxTransactionCount = transactionCount
				primaryCurrency = currency
			}
		})

		return {
			totalInvoices,
			totalReturns,
			totalReceipts,
			netInvoiceAmount,
			currentBalance,
			invoiceCount,
			returnCount,
			receiptCount,
			totalTransactions: transactions.length,
			currencyBreakdown: Array.from(currencyTotals.entries()),
			primaryCurrency,
			hasMixedCurrencies: currencyTotals.size > 1
		}
	}

	const summaryData = calculateFinancialSummary()

	// Helper functions
	const getTransactionDescription = (transaction: FinancialTransaction) => {
		switch (transaction.type) {
			case 'invoice':
				const orderInfo = transaction.order_number ? ` (${transaction.order_number})` : ''
				const quotationInfo = transaction.quotation_id ? ` [Order #${transaction.quotation_id}]` : ''
				return `Invoice #${transaction.id}${orderInfo}${quotationInfo}`
			case 'return':
				const returnOrderInfo = transaction.order_number ? ` (${transaction.order_number})` : ''
				return `Return #${transaction.id}${returnOrderInfo}`
			case 'receipt':
				return `Payment for Invoice #${transaction.invoice_id || 'N/A'}`
			default:
				return `Transaction #${transaction.id}`
		}
	}

	const getCurrencySymbol = (currency: string) => {
		return currency === 'euro' ? '€' : '$'
	}

	const getBalanceStyle = (balance: number) => {
		if (balance > 0) return styles.balanceOutstanding
		if (balance < 0) return styles.balanceCredit
		return styles.balanceSettled
	}

	const getBalanceStatus = (balance: number) => {
		if (balance > 0) return 'Outstanding Balance'
		if (balance < 0) return 'Credit Balance'
		return 'Account Settled'
	}

	return (
		<Document>
			<Page size='A4' style={styles.page}>
				{/* Sophisticated Header */}
				<View style={styles.header}>
					<View style={styles.headerLeft}>
						<Image src='/logo/logo.png' style={styles.logo} />
						<Text style={styles.title}>Financial Statement</Text>
						<Text style={styles.subtitle}>Client Account Overview</Text>
					</View>
					<View style={styles.headerRight}>
						<Text style={styles.headerDetails}>
							{format(new Date(), 'MMMM d, yyyy')}
						</Text>
						<Text style={styles.headerDetails}>
							{format(new Date(), 'HH:mm')}
						</Text>
						<Text style={[styles.headerDetails, { marginTop: 8, color: '#2D3748', fontWeight: 'bold' }]}>
							{clientName || 'N/A'}
						</Text>
					</View>
				</View>

				{/* Elegant Client Information */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Client Information</Text>
					<View style={styles.clientInfoContainer}>
						<View style={styles.infoGrid}>
							<View style={styles.infoColumn}>
								<Text style={styles.infoLabel}>Client Name</Text>
								<Text style={[styles.infoValue, { fontWeight: 'bold' }]}>
									{clientName || 'N/A'}
								</Text>
							</View>
							<View style={styles.infoColumn}>
								<Text style={styles.infoLabel}>Client ID</Text>
								<Text style={styles.infoValue}>{clientDetails?.client_id || 'N/A'}</Text>
							</View>
							<View style={styles.infoColumn}>
								<Text style={styles.infoLabel}>Email Address</Text>
								<Text style={styles.infoValue}>{clientDetails?.email || 'N/A'}</Text>
							</View>
							<View style={styles.infoColumn}>
								<Text style={styles.infoLabel}>Phone Number</Text>
								<Text style={styles.infoValue}>{clientDetails?.phone || 'N/A'}</Text>
							</View>
							<View style={styles.infoColumnFull}>
								<Text style={styles.infoLabel}>Address</Text>
								<Text style={styles.infoValue}>{clientDetails?.address || 'N/A'}</Text>
							</View>
							{clientDetails?.tax_number && (
								<View style={styles.infoColumn}>
									<Text style={styles.infoLabel}>Tax Number</Text>
									<Text style={styles.infoValue}>{clientDetails.tax_number}</Text>
								</View>
							)}
						</View>
						
						{/* Refined Balance Display */}
						{summaryData.hasMixedCurrencies ? (
							// Multi-currency balance display
							<>
								{summaryData.currencyBreakdown.map(([currency, data]) => (
									<View key={currency} style={[styles.balanceContainer, getBalanceStyle(data.balance)]}>
										<View style={styles.balanceLeft}>
											<Text style={styles.balanceLabel}>Balance ({currency.toUpperCase()})</Text>
											<Text style={styles.balanceAmount}>
												{getCurrencySymbol(currency)}{Math.abs(data.balance).toFixed(2)}
											</Text>
										</View>
										<View style={styles.balanceRight}>
											<Text style={styles.balanceStatus}>
												{getBalanceStatus(data.balance)}
											</Text>
										</View>
									</View>
								))}
								{reconciliation.wasUpdated && (
									<Text style={[styles.reconcileNote, { marginTop: 8 }]}>
										✓ Reconciled
									</Text>
								)}
							</>
						) : (
							// Single currency balance display
							<View style={[styles.balanceContainer, getBalanceStyle(summaryData.currentBalance)]}>
								<View style={styles.balanceLeft}>
									<Text style={styles.balanceLabel}>Current Balance</Text>
									<Text style={styles.balanceAmount}>
										{getCurrencySymbol(summaryData.primaryCurrency)}{Math.abs(summaryData.currentBalance).toFixed(2)}
									</Text>
								</View>
								<View style={styles.balanceRight}>
									<Text style={styles.balanceStatus}>
										{getBalanceStatus(summaryData.currentBalance)}
									</Text>
									{reconciliation.wasUpdated && (
										<Text style={styles.reconcileNote}>
											✓ Reconciled
										</Text>
									)}
								</View>
							</View>
						)}
					</View>
				</View>

				{/* Minimal Financial Summary */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Financial Overview</Text>

					{summaryData.hasMixedCurrencies ? (
						// Multi-currency summary - show "Mixed" label
						<View style={styles.summaryContainer}>
							<View style={styles.summaryCard}>
								<Text style={styles.summaryAmount}>
									Mixed
								</Text>
								<Text style={styles.summaryLabel}>Total Invoiced</Text>
								<Text style={styles.summaryCount}>
									{summaryData.invoiceCount} transaction{summaryData.invoiceCount !== 1 ? 's' : ''}
								</Text>
							</View>

							<View style={styles.summaryCard}>
								<Text style={styles.summaryAmount}>
									Mixed
								</Text>
								<Text style={styles.summaryLabel}>Total Received</Text>
								<Text style={styles.summaryCount}>
									{summaryData.receiptCount} payment{summaryData.receiptCount !== 1 ? 's' : ''}
								</Text>
							</View>

							<View style={styles.summaryCard}>
								<Text style={styles.summaryAmount}>
									Mixed
								</Text>
								<Text style={styles.summaryLabel}>Net Balance</Text>
								<Text style={styles.summaryCount}>
									See breakdown below
								</Text>
							</View>
						</View>
					) : (
						// Single currency summary
						<View style={styles.summaryContainer}>
							<View style={styles.summaryCard}>
								<Text style={styles.summaryAmount}>
									{getCurrencySymbol(summaryData.primaryCurrency)}{summaryData.totalInvoices.toFixed(2)}
								</Text>
								<Text style={styles.summaryLabel}>Total Invoiced</Text>
								<Text style={styles.summaryCount}>
									{summaryData.invoiceCount} transaction{summaryData.invoiceCount !== 1 ? 's' : ''}
								</Text>
							</View>

							<View style={styles.summaryCard}>
								<Text style={styles.summaryAmount}>
									{getCurrencySymbol(summaryData.primaryCurrency)}{summaryData.totalReceipts.toFixed(2)}
								</Text>
								<Text style={styles.summaryLabel}>Total Received</Text>
								<Text style={styles.summaryCount}>
									{summaryData.receiptCount} payment{summaryData.receiptCount !== 1 ? 's' : ''}
								</Text>
							</View>

							<View style={styles.summaryCard}>
								<Text style={styles.summaryAmount}>
									{getCurrencySymbol(summaryData.primaryCurrency)}{Math.abs(summaryData.currentBalance).toFixed(2)}
								</Text>
								<Text style={styles.summaryLabel}>Net Balance</Text>
								<Text style={styles.summaryCount}>
									{summaryData.currentBalance === 0 ? 'Settled' : summaryData.currentBalance > 0 ? 'Outstanding' : 'Credit'}
								</Text>
							</View>
						</View>
					)}

					{/* Multi-Currency Information */}
					{summaryData.currencyBreakdown.length > 1 && (
						<View style={styles.currencySection}>
							<Text style={styles.currencyTitle}>Currency Breakdown</Text>
							{summaryData.currencyBreakdown.map(([currency, data]) => {
								const symbol = getCurrencySymbol(currency)
								return (
									<View key={currency} style={styles.currencyRow}>
										<Text style={styles.currencyLabel}>{currency.toUpperCase()}</Text>
										<Text style={styles.currencyAmount}>
											Invoiced {symbol}{data.invoices.toFixed(2)} • Received {symbol}{data.receipts.toFixed(2)} • Balance {symbol}{Math.abs(data.balance).toFixed(2)}
										</Text>
									</View>
								)
							})}
						</View>
					)}
				</View>

				{/* Elegant Transaction History */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Transaction History</Text>
					
					{/* Period Information */}
					<View style={styles.periodContainer}>
						<Text style={styles.periodText}>
							<Text style={styles.periodBold}>Period:</Text> {' '}
							{summary.firstTransactionDate ? format(new Date(summary.firstTransactionDate), 'MMM d, yyyy') : 'N/A'} 
							{' – '} 
							{summary.lastTransactionDate ? format(new Date(summary.lastTransactionDate), 'MMM d, yyyy') : 'N/A'}
						</Text>
						<Text style={styles.periodText}>
							<Text style={styles.periodBold}>{summary.totalTransactions}</Text> total transactions
						</Text>
					</View>
					
					{transactions.length > 0 ? (
						<View style={styles.tableContainer}>
							{/* Clean Table Header */}
							<View style={styles.tableHeader}>
								<View style={styles.colDate}>
									<Text style={styles.tableCellHeader}>Date</Text>
								</View>
								<View style={styles.colDescription}>
									<Text style={styles.tableCellHeader}>Description</Text>
								</View>
								<View style={styles.colInvoice}>
									<Text style={styles.tableCellHeader}>Invoice</Text>
								</View>
								<View style={styles.colReceipt}>
									<Text style={styles.tableCellHeader}>Receipt</Text>
								</View>
								<View style={styles.colBalance}>
									<Text style={styles.tableCellHeader}>Balance</Text>
								</View>
							</View>
							
							{/* Clean Table Rows */}
							{transactions.map((transaction, index) => {
								const isReturn = transaction.type === 'return'
								const isReceipt = transaction.type === 'receipt'
								const isInvoice = transaction.type === 'invoice'
								
								const rowStyle = [
									styles.tableRow,
									index % 2 === 0 ? styles.tableRowEven : {},
									isReturn ? styles.tableRowReturn : {}
								]
								
								const currencySymbol = getCurrencySymbol(transaction.currency || 'usd')
								const runningBalance = transaction.runningBalance || 0

								return (
									<View style={rowStyle} key={`${transaction.type}-${transaction.id}-${index}`}>
										<View style={styles.colDate}>
											<Text style={styles.tableCell}>
												{format(new Date(transaction.date), 'MMM d')}
											</Text>
											<Text style={[styles.tableCell, { fontSize: 7, color: '#A0AEC0' }]}>
												{format(new Date(transaction.date), 'yyyy')}
											</Text>
										</View>
										
										<View style={styles.colDescription}>
											<Text style={styles.tableCellLeft}>
												{getTransactionDescription(transaction)}
											</Text>
											{transaction.currency && transaction.currency !== 'usd' && (
												<Text style={[styles.tableCellLeft, { fontSize: 7, color: '#A0AEC0' }]}>
													{transaction.currency.toUpperCase()}
												</Text>
											)}
										</View>
										
										{/* Invoice Column */}
										<View style={styles.colInvoice}>
											{(isInvoice || isReturn) ? (
												<Text style={[
													styles.tableCellRight,
													styles.amountInvoice
												]}>
													{isReturn ? '–' : ''}{currencySymbol}{Math.abs(transaction.amount).toFixed(2)}
												</Text>
											) : (
												<Text style={[styles.tableCellRight, styles.amountNeutral]}>—</Text>
											)}
										</View>
										
										{/* Receipt Column */}
										<View style={styles.colReceipt}>
											{isReceipt ? (
												<Text style={[
													styles.tableCellRight,
													styles.amountReceipt
												]}>
													{currencySymbol}{Math.abs(transaction.amount).toFixed(2)}
												</Text>
											) : (
												<Text style={[styles.tableCellRight, styles.amountNeutral]}>—</Text>
											)}
										</View>
										
										{/* Balance Column */}
										<View style={styles.colBalance}>
											<Text style={[
												styles.tableCellRight,
												styles.amountBalance
											]}>
												{summaryData.hasMixedCurrencies ? (
													'Mixed'
												) : (
													`${getCurrencySymbol(summaryData.primaryCurrency)}${Math.abs(runningBalance).toFixed(2)}`
												)}
											</Text>
											<Text style={[styles.tableCellRight, { fontSize: 7, color: '#A0AEC0' }]}>
												{runningBalance > 0 ? 'Outstanding' : runningBalance < 0 ? 'Credit' : 'Settled'}
											</Text>
										</View>
									</View>
								)
							})}
						</View>
					) : (
						<View style={styles.emptyState}>
							<Text style={styles.emptyText}>
								No transactions recorded for this client
							</Text>
						</View>
					)}
				</View>

				{/* Refined Footer */}
				<Text style={styles.footer}>
					Generated {format(new Date(), 'MMMM d, yyyy')} at {format(new Date(), 'HH:mm')}
					{reconciliation.wasUpdated && (
						<Text style={styles.footerHighlight}> • Balance Reconciled</Text>
					)}
					{' • Confidential Document'}
				</Text>
			</Page>
		</Document>
	)
}

export default ClientFinancialReportPDF