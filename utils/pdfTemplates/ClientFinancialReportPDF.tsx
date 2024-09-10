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
import { colors } from './SharedStyles'

const styles = StyleSheet.create({
	page: {
		flexDirection: 'column',
		backgroundColor: colors.white,
		padding: 30
	},
	section: {
		margin: 10,
		padding: 10
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 20,
		borderBottom: `2px solid ${colors.blue}`,
		paddingBottom: 10
	},
	logo: {
		width: 100,
		height: 'auto'
	},
	title: {
		fontSize: 24,
		fontWeight: 'bold',
		color: colors.blue
	},
	subtitle: {
		fontSize: 18,
		fontWeight: 'bold',
		color: colors.gray,
		marginBottom: 10
	},
	text: {
		fontSize: 12,
		marginBottom: 5
	},
	table: {
		width: 'auto',
		borderStyle: 'solid',
		borderWidth: 1,
		borderRightWidth: 0,
		borderBottomWidth: 0
	},
	tableRow: {
		margin: 'auto',
		flexDirection: 'row'
	},
	tableColHeader: {
		width: '20%',
		borderStyle: 'solid',
		borderWidth: 1,
		borderLeftWidth: 0,
		borderTopWidth: 0,
		backgroundColor: colors.gray
	},
	tableCol: {
		width: '20%',
		borderStyle: 'solid',
		borderWidth: 1,
		borderLeftWidth: 0,
		borderTopWidth: 0
	},
	tableCellHeader: {
		margin: 'auto',
		marginTop: 5,
		marginBottom: 5,
		fontSize: 12,
		fontWeight: 'bold',
		color: colors.white
	},
	tableCell: {
		margin: 'auto',
		marginTop: 5,
		marginBottom: 5,
		fontSize: 10
	},
	footer: {
		marginTop: 30,
		bottom: 30,
		left: 30,
		right: 30,
		textAlign: 'center',
		color: colors.gray,
		borderTop: `1px solid ${colors.gray}`,
		paddingTop: 10
	},
	summarySection: {
		marginTop: 20,
		borderTop: `2px solid ${colors.blue}`,
		paddingTop: 10
	},
	contentWrapper: {
		flexGrow: 1
	}
})

const ClientFinancialReportPDF = ({
	clientName,
	clientDetails,
	companyDetails,
	financialData
}: any) => (
	<Document>
		<Page size='A4' style={styles.page}>
			<View style={styles.header}>
				<Image src='/logo/logo.png' style={styles.logo} />
				<Text style={styles.title}>Financial Report</Text>
			</View>

			<View style={styles.contentWrapper}>
				<View style={styles.section}>
					<Text style={styles.subtitle}>Client Information</Text>
					<Text style={styles.text}>Name: {clientName}</Text>
					<Text style={styles.text}>Email: {clientDetails.email}</Text>
					<Text style={styles.text}>Phone: {clientDetails.phone}</Text>
					<Text style={styles.text}>Address: {clientDetails.address}</Text>
					<Text style={styles.text}>
						Tax Number: {clientDetails.tax_number}
					</Text>
					<Text style={styles.text}>
						Current Balance: ${clientDetails.balance.toFixed(2)}
					</Text>
				</View>

				<View style={styles.section}>
					<Text style={styles.subtitle}>Company Information</Text>
					<Text style={styles.text}>Company Name: {companyDetails.name}</Text>
					<Text style={styles.text}>
						Identification: {companyDetails.identification_type} -{' '}
						{companyDetails.identification_number}
					</Text>
					<Text style={styles.text}>Bank: {companyDetails.bank_name}</Text>
					<Text style={styles.text}>
						Account Number: {companyDetails.bank_account_number}
					</Text>
					<Text style={styles.text}>
						Routing Number: {companyDetails.bank_routing_number}
					</Text>
					<Text style={styles.text}>
						Company Address: {companyDetails.address}
					</Text>
					<Text style={styles.text}>
						Bank Address: {companyDetails.bank_address}
					</Text>
				</View>

				<View style={styles.section}>
					<Text style={styles.subtitle}>Financial Transactions</Text>

					<View style={styles.table}>
						<View style={styles.tableRow}>
							<View style={styles.tableColHeader}>
								<Text style={styles.tableCellHeader}>Date</Text>
							</View>
							<View style={styles.tableColHeader}>
								<Text style={styles.tableCellHeader}>Type</Text>
							</View>
							<View style={styles.tableColHeader}>
								<Text style={styles.tableCellHeader}>ID</Text>
							</View>
							<View style={styles.tableColHeader}>
								<Text style={styles.tableCellHeader}>Related To</Text>
							</View>
							<View style={styles.tableColHeader}>
								<Text style={styles.tableCellHeader}>Amount</Text>
							</View>
						</View>
						{financialData.map(
							(
								item: {
									date: string | number | Date
									type:
										| string
										| number
										| bigint
										| boolean
										| React.ReactElement<
												any,
												string | React.JSXElementConstructor<any>
										  >
										| Iterable<React.ReactNode>
										| Promise<React.AwaitedReactNode>
										| null
										| undefined
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
								<View style={styles.tableRow} key={index}>
									<View style={styles.tableCol}>
										<Text style={styles.tableCell}>
											{format(new Date(item.date), 'MM/dd/yyyy')}
										</Text>
									</View>
									<View style={styles.tableCol}>
										<Text style={styles.tableCell}>{item.type}</Text>
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
										<Text style={styles.tableCell}>
											${item.amount.toFixed(2)}
										</Text>
									</View>
								</View>
							)
						)}
					</View>
				</View>

				<View style={styles.summarySection}>
					<Text style={styles.subtitle}>Financial Summary</Text>
					<Text style={styles.text}>
						Total Invoices: $
						{financialData
							.filter((item: { type: string }) => item.type === 'invoice')
							.reduce((sum: any, item: { amount: any }) => sum + item.amount, 0)
							.toFixed(2)}
					</Text>
					<Text style={styles.text}>
						Total Receipts: $
						{financialData
							.filter((item: { type: string }) => item.type === 'receipt')
							.reduce((sum: any, item: { amount: any }) => sum + item.amount, 0)
							.toFixed(2)}
					</Text>
					<Text style={styles.text}>
						Net Balance: $
						{(
							financialData
								.filter((item: { type: string }) => item.type === 'invoice')
								.reduce(
									(sum: any, item: { amount: any }) => sum + item.amount,
									0
								) -
							financialData
								.filter((item: { type: string }) => item.type === 'receipt')
								.reduce(
									(sum: any, item: { amount: any }) => sum + item.amount,
									0
								)
						).toFixed(2)}
					</Text>
				</View>
			</View>
		</Page>
	</Document>
)

export default ClientFinancialReportPDF
