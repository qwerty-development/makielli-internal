import React from 'react'
import {
	Page,
	Text,
	View,
	Document,
	StyleSheet,
	Image
} from '@react-pdf/renderer'
import { format } from 'date-fns'

const colors = {
	primary: '#1E40AF',
	secondary: '#60A5FA',
	accent: '#BFDBFE',
	text: '#1F2937',
	lightText: '#6B7280',
	success: '#10B981',
	danger: '#EF4444',
	warning: '#F59E0B',
	background: '#F3F4F6'
}

const styles = StyleSheet.create({
	page: {
		flexDirection: 'column',
		backgroundColor: colors.background,
		padding: 30
	},
	section: {
		margin: 10,
		padding: 15,
		backgroundColor: '#FFFFFF',
		borderRadius: 5,
		boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)'
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 20,
		backgroundColor: colors.primary,
		padding: 15,
		borderRadius: 5
	},
	logo: {
		width: 80,
		height: 'auto'
	},
	title: {
		fontSize: 24,
		fontWeight: 'bold',
		color: '#FFFFFF'
	},
	subtitle: {
		fontSize: 18,
		fontWeight: 'bold',
		color: colors.primary,
		marginBottom: 10,
		borderBottom: `2px solid ${colors.secondary}`,
		paddingBottom: 5
	},
	text: {
		fontSize: 10,
		marginBottom: 5,
		color: colors.text
	},
	smallText: {
		fontSize: 8,
		marginBottom: 3,
		color: colors.lightText
	},
	boldText: {
		fontWeight: 'bold'
	},
	table: {
		width: 'auto',
		borderStyle: 'solid',
		borderWidth: 1,
		borderColor: colors.lightText,
		marginTop: 10,
		borderRadius: 5,
		overflow: 'hidden'
	},
	tableRow: {
		flexDirection: 'row'
	},
	tableRowEven: {
		backgroundColor: colors.accent
	},
	tableRowReturn: {
		backgroundColor: '#FEE2E2' // Light red for returns
	},
	tableHeader: {
		backgroundColor: colors.primary
	},
	tableCol: {
		width: '14.28%', // Adjusted for 7 columns
		borderStyle: 'solid',
		borderWidth: 1,
		borderColor: colors.lightText
	},
	tableColWide: {
		width: '20%', // For description column
		borderStyle: 'solid',
		borderWidth: 1,
		borderColor: colors.lightText
	},
	tableColNarrow: {
		width: '12%', // For currency column
		borderStyle: 'solid',
		borderWidth: 1,
		borderColor: colors.lightText
	},
	tableCell: {
		margin: 'auto',
		marginTop: 5,
		marginBottom: 5,
		fontSize: 8,
		color: colors.text,
		textAlign: 'center'
	},
	tableCellLeft: {
		marginLeft: 5,
		marginTop: 5,
		marginBottom: 5,
		fontSize: 8,
		color: colors.text,
		textAlign: 'left'
	},
	tableCellHeader: {
		margin: 'auto',
		marginTop: 5,
		marginBottom: 5,
		fontSize: 9,
		fontWeight: 'bold',
		color: '#FFFFFF',
		textAlign: 'center'
	},
	footer: {
		position: 'absolute',
		bottom: 30,
		left: 30,
		right: 30,
		textAlign: 'center',
		color: colors.lightText,
		borderTop: `1px solid ${colors.lightText}`,
		paddingTop: 10
	},
	summarySection: {
		marginTop: 20,
		borderTop: `2px solid ${colors.primary}`,
		paddingTop: 10
	},
	balanceHighlight: {
		backgroundColor: '#F0F9FF',
		padding: 8,
		borderRadius: 4,
		borderLeft: `4px solid ${colors.primary}`
	},
	summaryRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: 5
	},
	infoRow: {
		flexDirection: 'row',
		marginBottom: 5
	},
	infoLabel: {
		width: '40%',
		fontWeight: 'bold'
	},
	infoValue: {
		width: '60%'
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

	// Enhanced financial calculations with multi-currency support
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
				currencyTotals.set(currency, { invoices: 0, returns: 0, receipts: 0 })
			}
			
			const currencyData = currencyTotals.get(currency)
			
			switch (transaction.type) {
				case 'invoice':
					const invoiceAmount = Math.abs(transaction.amount)
					totalInvoices += invoiceAmount
					currencyData.invoices += invoiceAmount
					invoiceCount++
					break
				case 'return':
					const returnAmount = Math.abs(transaction.amount)
					totalReturns += returnAmount
					currencyData.returns += returnAmount
					returnCount++
					break
				case 'receipt':
					const receiptAmount = Math.abs(transaction.amount)
					totalReceipts += receiptAmount
					currencyData.receipts += receiptAmount
					receiptCount++
					break
			}
		})

		const netInvoiceAmount = totalInvoices - totalReturns
		// Use the calculated balance from the reconciliation data
		const currentBalance = reconciliation.calculatedBalance

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
			currencyBreakdown: Array.from(currencyTotals.entries())
		}
	}

	const summaryData = calculateFinancialSummary()

	// Helper functions
	const getTransactionDisplay = (transaction: any) => {
		switch (transaction.type) {
			case 'invoice':
				return 'Invoice'
			case 'return':
				return 'Return'
			case 'receipt':
				return 'Payment'
			default:
				return transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)
		}
	}

	const getTransactionDescription = (transaction: FinancialTransaction) => {
		switch (transaction.type) {
			case 'invoice':
				const orderInfo = transaction.order_number ? ` (Order: ${transaction.order_number})` : ''
				const quotationInfo = transaction.quotation_id ? ` [Q#${transaction.quotation_id}]` : ''
				return `Invoice #${transaction.id}${orderInfo}${quotationInfo}`
			case 'return':
				const returnOrderInfo = transaction.order_number ? ` (Order: ${transaction.order_number})` : ''
				return `Return Invoice #${transaction.id}${returnOrderInfo}`
			case 'receipt':
				return `Payment for Invoice #${transaction.invoice_id || 'N/A'}`
			default:
				return `Transaction #${transaction.id}`
		}
	}

	const getAmountColor = (transaction: FinancialTransaction) => {
		switch (transaction.type) {
			case 'invoice':
				return colors.danger
			case 'return':
				return colors.warning
			case 'receipt':
				return colors.success
			default:
				return colors.text
		}
	}

	const getCurrencySymbol = (currency: string) => {
		return currency === 'euro' ? '€' : '$'
	}

	return (
		<Document>
			<Page size='A4' style={styles.page}>
				{/* Header */}
				<View style={styles.header}>
					<Image src='/logo/logo.png' style={styles.logo} />
					<Text style={styles.title}>Financial Report</Text>
				</View>

				{/* Client Information */}
				<View style={styles.section}>
					<Text style={styles.subtitle}>Client Information</Text>
					<View style={styles.infoRow}>
						<Text style={[styles.text, styles.infoLabel]}>Name:</Text>
						<Text style={[styles.text, styles.infoValue]}>{clientName || 'N/A'}</Text>
					</View>
					<View style={styles.infoRow}>
						<Text style={[styles.text, styles.infoLabel]}>Email:</Text>
						<Text style={[styles.text, styles.infoValue]}>
							{clientDetails?.email || 'N/A'}
						</Text>
					</View>
					<View style={styles.infoRow}>
						<Text style={[styles.text, styles.infoLabel]}>Phone:</Text>
						<Text style={[styles.text, styles.infoValue]}>
							{clientDetails?.phone || 'N/A'}
						</Text>
					</View>
					<View style={styles.infoRow}>
						<Text style={[styles.text, styles.infoLabel]}>Address:</Text>
						<Text style={[styles.text, styles.infoValue]}>
							{clientDetails?.address || 'N/A'}
						</Text>
					</View>
					<View style={styles.infoRow}>
						<Text style={[styles.text, styles.infoLabel]}>Tax Number:</Text>
						<Text style={[styles.text, styles.infoValue]}>
							{clientDetails?.tax_number || 'N/A'}
						</Text>
	</View>
					
					{/* Current Balance - Highlighted Section */}
					<View style={styles.balanceHighlight}>
						<View style={styles.infoRow}>
							<Text style={[styles.text, styles.infoLabel, styles.boldText]}>
								Current Balance:
							</Text>
							<Text
								style={[
									styles.text,
									styles.infoValue,
									styles.boldText,
									{
										color: summaryData.currentBalance >= 0 ? colors.danger : colors.success
									}
								]}>
								${summaryData.currentBalance.toFixed(2)}
								{summaryData.currentBalance > 0 && ' (Outstanding)'}
								{summaryData.currentBalance < 0 && ' (Credit)'}
								{summaryData.currentBalance === 0 && ' (Settled)'}
							</Text>
						</View>
						{reconciliation.wasUpdated && (
							<Text style={[styles.smallText, { color: colors.primary }]}>
								✓ Balance reconciled and updated in database
							</Text>
						)}
					</View>
				</View>

				{/* Company Information */}
				<View style={styles.section}>
					<Text style={styles.subtitle}>Company Information</Text>
					<View style={styles.infoRow}>
						<Text style={[styles.text, styles.infoLabel]}>Company Name:</Text>
						<Text style={[styles.text, styles.infoValue]}>
							{companyDetails?.name || 'N/A'}
						</Text>
					</View>
					<View style={styles.infoRow}>
						<Text style={[styles.text, styles.infoLabel]}>Identification:</Text>
						<Text style={[styles.text, styles.infoValue]}>
							{companyDetails?.identification_type || 'N/A'} -{' '}
							{companyDetails?.identification_number || 'N/A'}
						</Text>
					</View>
					<View style={styles.infoRow}>
						<Text style={[styles.text, styles.infoLabel]}>Bank:</Text>
						<Text style={[styles.text, styles.infoValue]}>
							{companyDetails?.bank_name || 'N/A'}
						</Text>
					</View>
					<View style={styles.infoRow}>
						<Text style={[styles.text, styles.infoLabel]}>Account Number:</Text>
						<Text style={[styles.text, styles.infoValue]}>
							{companyDetails?.bank_account_number || 'N/A'}
						</Text>
					</View>
					<View style={styles.infoRow}>
						<Text style={[styles.text, styles.infoLabel]}>Routing Number:</Text>
						<Text style={[styles.text, styles.infoValue]}>
							{companyDetails?.bank_routing_number || 'N/A'}
						</Text>
					</View>
					<View style={styles.infoRow}>
						<Text style={[styles.text, styles.infoLabel]}>
							Company Address:
						</Text>
						<Text style={[styles.text, styles.infoValue]}>
							{companyDetails?.address || 'N/A'}
						</Text>
					</View>
				</View>

				{/* Financial Summary */}
				<View style={[styles.section, styles.summarySection]}>
					<Text style={styles.subtitle}>Financial Summary</Text>
					<View style={styles.summaryRow}>
						<Text style={[styles.text, styles.boldText]}>
							Total Invoices ({summaryData.invoiceCount}):
						</Text>
						<Text style={[styles.text, { color: colors.danger }]}>
							${summaryData.totalInvoices.toFixed(2)}
						</Text>
					</View>
					<View style={styles.summaryRow}>
						<Text style={[styles.text, styles.boldText]}>
							Total Returns ({summaryData.returnCount}):
						</Text>
						<Text style={[styles.text, { color: colors.warning }]}>
							-${summaryData.totalReturns.toFixed(2)}
						</Text>
					</View>
					<View style={styles.summaryRow}>
						<Text style={[styles.text, styles.boldText]}>
							Net Invoice Amount:
						</Text>
						<Text style={[styles.text, { color: colors.danger }]}>
							${summaryData.netInvoiceAmount.toFixed(2)}
						</Text>
					</View>
					<View style={styles.summaryRow}>
						<Text style={[styles.text, styles.boldText]}>
							Total Payments ({summaryData.receiptCount}):
						</Text>
						<Text style={[styles.text, { color: colors.success }]}>
							${summaryData.totalReceipts.toFixed(2)}
						</Text>
					</View>
					<View style={styles.summaryRow}>
						<Text style={[styles.text, styles.boldText, { fontSize: 12 }]}>
							Outstanding Balance:
						</Text>
						<Text
							style={[
								styles.text,
								styles.boldText,
								{ 
									color: summaryData.currentBalance >= 0 ? colors.danger : colors.success,
									fontSize: 12
								}
							]}>
							${summaryData.currentBalance.toFixed(2)}
						</Text>
					</View>

					{/* Currency Breakdown */}
					{summaryData.currencyBreakdown.length > 1 && (
						<View style={{ marginTop: 10, padding: 8, backgroundColor: '#F9FAFB', borderRadius: 3 }}>
							<Text style={[styles.text, styles.boldText]}>Currency Breakdown:</Text>
							{summaryData.currencyBreakdown.map(([currency, data]) => (
								<Text key={currency} style={styles.smallText}>
									{currency.toUpperCase()}: Invoices: ${data.invoices.toFixed(2)}, Returns: ${data.returns.toFixed(2)}, Payments: ${data.receipts.toFixed(2)}
								</Text>
							))}
						</View>
					)}
				</View>

				{/* Financial Transactions */}
				<View style={styles.section}>
					<Text style={styles.subtitle}>Financial Transactions</Text>
					<Text style={styles.smallText}>
						Period: {summary.firstTransactionDate ? format(new Date(summary.firstTransactionDate), 'MMM d, yyyy') : 'N/A'} 
						{' to '} 
						{summary.lastTransactionDate ? format(new Date(summary.lastTransactionDate), 'MMM d, yyyy') : 'N/A'}
						{' • Total Transactions: '}{summary.totalTransactions}
					</Text>
					
					{transactions.length > 0 ? (
						<View style={styles.table}>
							<View style={[styles.tableRow, styles.tableHeader]}>
								<View style={styles.tableCol}>
									<Text style={styles.tableCellHeader}>Date</Text>
								</View>
								<View style={styles.tableCol}>
									<Text style={styles.tableCellHeader}>Type</Text>
								</View>
								<View style={styles.tableColWide}>
									<Text style={styles.tableCellHeader}>Description</Text>
								</View>
								<View style={styles.tableCol}>
									<Text style={styles.tableCellHeader}>Amount</Text>
								</View>
								<View style={styles.tableColNarrow}>
									<Text style={styles.tableCellHeader}>Currency</Text>
								</View>
								<View style={styles.tableCol}>
									<Text style={styles.tableCellHeader}>Balance</Text>
								</View>
							</View>
							{transactions.map((transaction, index) => {
								const isReturn = transaction.type === 'return'
								const rowStyle = [
									styles.tableRow,
									index % 2 === 0 ? styles.tableRowEven : {},
									isReturn ? styles.tableRowReturn : {}
								]
								
								const currencySymbol = getCurrencySymbol(transaction.currency || 'usd')

								return (
									<View style={rowStyle} key={`${transaction.type}-${transaction.id}-${index}`}>
										<View style={styles.tableCol}>
											<Text style={styles.tableCell}>
												{format(new Date(transaction.date), 'MM/dd/yy')}
											</Text>
										</View>
										<View style={styles.tableCol}>
											<Text
												style={[
													styles.tableCell,
													{ color: getAmountColor(transaction) }
												]}>
												{getTransactionDisplay(transaction)}
											</Text>
										</View>
										<View style={styles.tableColWide}>
											<Text style={styles.tableCellLeft}>
												{getTransactionDescription(transaction)}
											</Text>
										</View>
										<View style={styles.tableCol}>
											<Text
												style={[
													styles.tableCell,
													{ color: getAmountColor(transaction) }
												]}>
												{transaction.type === 'return' ? '-' : ''}{currencySymbol}{Math.abs(transaction.amount).toFixed(2)}
											</Text>
										</View>
										<View style={styles.tableColNarrow}>
											<Text style={styles.tableCell}>
												{(transaction.currency || 'usd').toUpperCase()}
											</Text>
										</View>
										<View style={styles.tableCol}>
											<Text
												style={[
													styles.tableCell,
													{ 
														color: (transaction.runningBalance || 0) >= 0 ? colors.danger : colors.success 
													}
												]}>
												${(transaction.runningBalance || 0).toFixed(2)}
											</Text>
										</View>
									</View>
								)
							})}
						</View>
					) : (
						<View style={{ padding: 20, textAlign: 'center', backgroundColor: '#F9FAFB', borderRadius: 5, marginTop: 10 }}>
							<Text style={[styles.text, { color: colors.lightText }]}>
								No financial transactions found for this client.
							</Text>
						</View>
					)}
				</View>

				{/* Footer */}
				<Text style={styles.footer}>
					This financial report was generated on{' '}
					{format(new Date(), 'MMMM d, yyyy')} at{' '}
					{format(new Date(), 'HH:mm:ss')}
					{reconciliation.wasUpdated && (
						<Text style={{ color: colors.primary }}>
							{'\n'}✓ Client balance has been automatically reconciled
						</Text>
					)}
				</Text>
			</Page>
		</Document>
	)
}

export default ClientFinancialReportPDF