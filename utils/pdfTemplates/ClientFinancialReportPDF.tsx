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
	tableHeader: {
		backgroundColor: colors.primary
	},
	tableCol: {
		width: '20%',
		borderStyle: 'solid',
		borderWidth: 1,
		borderColor: colors.lightText
	},
	tableCell: {
		margin: 'auto',
		marginTop: 5,
		marginBottom: 5,
		fontSize: 9,
		color: colors.text,
		textAlign: 'center'
	},
	tableCellHeader: {
		margin: 'auto',
		marginTop: 5,
		marginBottom: 5,
		fontSize: 10,
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

const ClientFinancialReportPDF = ({
	clientName,
	clientDetails,
	companyDetails,
	financialData
}: any) => {
	const totalInvoices = financialData
		.filter((item: { type: string }) => item.type === 'invoice')
		.reduce((sum: any, item: { amount: any }) => sum + item.amount, 0)
	const totalReceipts = financialData
		.filter((item: { type: string }) => item.type === 'receipt')
		.reduce((sum: any, item: { amount: any }) => sum + item.amount, 0)
	const balance = totalInvoices - totalReceipts

	return (
		<Document>
			<Page size='A4' style={styles.page}>
				<View style={styles.header}>
					<Image src='/logo/logo.png' style={styles.logo} />
					<Text style={styles.title}>Financial Report</Text>
				</View>

				<View style={styles.section}>
					<Text style={styles.subtitle}>Client Information</Text>
					<View style={styles.infoRow}>
						<Text style={[styles.text, styles.infoLabel]}>Name:</Text>
						<Text style={[styles.text, styles.infoValue]}>{clientName}</Text>
					</View>
					<View style={styles.infoRow}>
						<Text style={[styles.text, styles.infoLabel]}>Email:</Text>
						<Text style={[styles.text, styles.infoValue]}>
							{clientDetails.email}
						</Text>
					</View>
					<View style={styles.infoRow}>
						<Text style={[styles.text, styles.infoLabel]}>Phone:</Text>
						<Text style={[styles.text, styles.infoValue]}>
							{clientDetails.phone}
						</Text>
					</View>
					<View style={styles.infoRow}>
						<Text style={[styles.text, styles.infoLabel]}>Address:</Text>
						<Text style={[styles.text, styles.infoValue]}>
							{clientDetails.address}
						</Text>
					</View>
					<View style={styles.infoRow}>
						<Text style={[styles.text, styles.infoLabel]}>Tax Number:</Text>
						<Text style={[styles.text, styles.infoValue]}>
							{clientDetails.tax_number}
						</Text>
					</View>
					<View style={styles.infoRow}>
						<Text style={[styles.text, styles.infoLabel]}>
							Current Balance:
						</Text>
						<Text
							style={[
								styles.text,
								styles.infoValue,
								{
									color:
										clientDetails.balance >= 0 ? colors.success : colors.danger
								}
							]}>
							${clientDetails.balance.toFixed(2)}
						</Text>
					</View>
				</View>

				<View style={styles.section}>
					<Text style={styles.subtitle}>Company Information</Text>
					<View style={styles.infoRow}>
						<Text style={[styles.text, styles.infoLabel]}>Company Name:</Text>
						<Text style={[styles.text, styles.infoValue]}>
							{companyDetails.name}
						</Text>
					</View>
					<View style={styles.infoRow}>
						<Text style={[styles.text, styles.infoLabel]}>Identification:</Text>
						<Text style={[styles.text, styles.infoValue]}>
							{companyDetails.identification_type} -{' '}
							{companyDetails.identification_number}
						</Text>
					</View>
					<View style={styles.infoRow}>
						<Text style={[styles.text, styles.infoLabel]}>Bank:</Text>
						<Text style={[styles.text, styles.infoValue]}>
							{companyDetails.bank_name}
						</Text>
					</View>
					<View style={styles.infoRow}>
						<Text style={[styles.text, styles.infoLabel]}>Account Number:</Text>
						<Text style={[styles.text, styles.infoValue]}>
							{companyDetails.bank_account_number}
						</Text>
					</View>
					<View style={styles.infoRow}>
						<Text style={[styles.text, styles.infoLabel]}>Routing Number:</Text>
						<Text style={[styles.text, styles.infoValue]}>
							{companyDetails.bank_routing_number}
						</Text>
					</View>
					<View style={styles.infoRow}>
						<Text style={[styles.text, styles.infoLabel]}>
							Company Address:
						</Text>
						<Text style={[styles.text, styles.infoValue]}>
							{companyDetails.address}
						</Text>
					</View>
				</View>

				<View style={styles.section}>
					<Text style={styles.subtitle}>Financial Transactions</Text>
					<View style={styles.table}>
						<View style={[styles.tableRow, styles.tableHeader]}>
							<View style={styles.tableCol}>
								<Text style={styles.tableCellHeader}>Date</Text>
							</View>
							<View style={styles.tableCol}>
								<Text style={styles.tableCellHeader}>Type</Text>
							</View>
							<View style={styles.tableCol}>
								<Text style={styles.tableCellHeader}>ID</Text>
							</View>
							<View style={styles.tableCol}>
								<Text style={styles.tableCellHeader}>Related To</Text>
							</View>
							<View style={styles.tableCol}>
								<Text style={styles.tableCellHeader}>Amount</Text>
							</View>
						</View>
						{financialData.map(
							(
								item: {
									date: string | number | Date
									type: string
									id:
										| string
										| number
										| bigint
										| boolean
										| React.ReactElement<
												any,
												string | React.JSXElementConstructor<any>
										  >
										| Iterable<React.ReactNode>
										| React.ReactPortal
										| Promise<React.AwaitedReactNode>
										| null
										| undefined
									invoice_id: any
									amount: number
								},
								index: React.Key | null | undefined
							) => (
								<View
									style={[
										styles.tableRow,
										index % 2 === 0 ? styles.tableRowEven : {}
									]}
									key={index}>
									<View style={styles.tableCol}>
										<Text style={styles.tableCell}>
											{format(new Date(item.date), 'MM/dd/yyyy')}
										</Text>
									</View>
									<View style={styles.tableCol}>
										<Text
											style={[
												styles.tableCell,
												{
													color:
														item.type === 'invoice'
															? colors.danger
															: colors.success
												}
											]}>
											{item.type.charAt(0).toUpperCase() + item.type.slice(1)}
										</Text>
									</View>
									<View style={styles.tableCol}>
										<Text style={styles.tableCell}>{item.id}</Text>
									</View>
									<View style={styles.tableCol}>
										<Text style={styles.tableCell}>
											{item.type === 'receipt'
												? `Invoice #${item.invoice_id}`
												: 'N/A'}
										</Text>
									</View>
									<View style={styles.tableCol}>
										<Text
											style={[
												styles.tableCell,
												{
													color:
														item.type === 'invoice'
															? colors.danger
															: colors.success
												}
											]}>
											${item.amount.toFixed(2)}
										</Text>
									</View>
								</View>
							)
						)}
					</View>
				</View>

				<View style={[styles.section, styles.summarySection]}>
					<Text style={styles.subtitle}>Financial Summary</Text>
					<View style={styles.summaryRow}>
						<Text style={styles.text}>
							<Text style={styles.boldText}>Total Invoices:</Text>
						</Text>
						<Text style={[styles.text, { color: colors.danger }]}>
							${totalInvoices.toFixed(2)}
						</Text>
					</View>
					<View style={styles.summaryRow}>
						<Text style={styles.text}>
							<Text style={styles.boldText}>Total Receipts:</Text>
						</Text>
						<Text style={[styles.text, { color: colors.success }]}>
							${totalReceipts.toFixed(2)}
						</Text>
					</View>
					<View style={styles.summaryRow}>
						<Text style={styles.text}>
							<Text style={styles.boldText}>Current Balance:</Text>
						</Text>
						<Text
							style={[
								styles.text,
								{ color: balance >= 0 ? colors.warning : colors.danger }
							]}>
							${balance.toFixed(2)}
						</Text>
					</View>
				</View>

				<Text style={styles.footer}>
					This financial report was generated on{' '}
					{format(new Date(), 'MMMM d, yyyy')} at{' '}
					{format(new Date(), 'HH:mm:ss')}
				</Text>
			</Page>
		</Document>
	)
}

export default ClientFinancialReportPDF
