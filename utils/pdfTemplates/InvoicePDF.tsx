// utils/pdfTemplates/InvoicePDF.tsx
import React from 'react'
import {
	Page,
	Text,
	View,
	Document,
	Image,
	StyleSheet
} from '@react-pdf/renderer'
import { format } from 'date-fns'

const styles = StyleSheet.create({
	page: {
		flexDirection: 'column',
		backgroundColor: '#FFFFFF',
		padding: 30
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: 20
	},
	logo: {
		width: 120,
		height: 50
	},
	companyInfo: {
		fontSize: 10,
		textAlign: 'right'
	},
	title: {
		fontSize: 24,
		fontWeight: 'bold',
		marginBottom: 20,
		color: '#1E40AF'
	},
	section: {
		marginBottom: 10
	},
	row: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: 5
	},
	column: {
		flexDirection: 'column',
		flexGrow: 1,
		fontSize: 10
	},
	label: {
		fontWeight: 'bold',
		marginRight: 5
	},
	value: {
		marginBottom: 3
	},
	table: {
		width: 'auto',
		marginTop: 10,
		borderStyle: 'solid',
		borderWidth: 1,
		borderColor: '#bfbfbf'
	},
	tableRow: {
		flexDirection: 'row'
	},
	tableColHeader: {
		borderStyle: 'solid',
		borderBottomWidth: 1,
		borderRightWidth: 1,
		borderColor: '#bfbfbf',
		backgroundColor: '#f0f0f0',
		padding: 5
	},
	tableCol: {
		borderStyle: 'solid',
		borderRightWidth: 1,
		borderBottomWidth: 1,
		borderColor: '#bfbfbf',
		padding: 5
	},
	tableCellHeader: {
		fontWeight: 'bold',
		fontSize: 10
	},
	tableCell: {
		fontSize: 10
	},
	productImage: {
		width: 40,
		height: 40,
		objectFit: 'contain'
	},
	subtotal: {
		flexDirection: 'row',
		justifyContent: 'flex-end',
		marginTop: 10
	},
	subtotalLabel: {
		width: '16.66%',
		textAlign: 'right',
		paddingRight: 5,
		fontWeight: 'bold',
		fontSize: 10
	},
	subtotalValue: {
		width: '16.66%',
		textAlign: 'right',
		fontSize: 10
	},
	footer: {
		position: 'absolute',
		bottom: 30,
		left: 30,
		right: 30,
		textAlign: 'center',
		color: 'grey',
		fontSize: 10
	}
})

const InvoicePDF: React.FC<{ invoice: any; client: any; company: any }> = ({
	invoice,
	client,
	company
}) => (
	<Document>
		<Page size='A4' style={styles.page}>
			<View style={styles.header}>
				<Image src='/logo/logo.png' style={styles.logo} />
				<View style={styles.companyInfo}>
					<Text>{company.name}</Text>
					<Text>{company.address}</Text>
					<Text>
						Identification: {company.identification_type}{' '}
						{company.identification_number}
					</Text>
				</View>
			</View>

			<Text style={styles.title}>INVOICE</Text>

			<View style={styles.row}>
				<View style={styles.column}>
					<Text style={styles.label}>Bill To:</Text>
					<Text style={styles.value}>{client.name}</Text>
					<Text style={styles.value}>{client.address}</Text>
					<Text style={styles.value}>Phone: {client.phone}</Text>
					<Text style={styles.value}>Email: {client.email}</Text>
					<Text style={styles.value}>Tax Number: {client.tax_number}</Text>
				</View>
				<View style={styles.column}>
					<Text style={styles.label}>Invoice Details:</Text>
					<Text style={styles.value}>Invoice Number: {invoice.id}</Text>
					<Text style={styles.value}>
						Date: {format(new Date(invoice.created_at), 'PP')}
					</Text>
					<Text style={styles.value}>Order Number: {invoice.order_number}</Text>
					<Text style={styles.value}>
						Due Date: {format(new Date(invoice.created_at), 'PP')}
					</Text>
				</View>
			</View>

			<View style={styles.table}>
				<View style={styles.tableRow}>
					<View style={[styles.tableColHeader, { width: '15%' }]}>
						<Text style={styles.tableCellHeader}>Image</Text>
					</View>
					<View style={[styles.tableColHeader, { width: '25%' }]}>
						<Text style={styles.tableCellHeader}>Item</Text>
					</View>
					<View style={[styles.tableColHeader, { width: '25%' }]}>
						<Text style={styles.tableCellHeader}>Description</Text>
					</View>
					<View style={[styles.tableColHeader, { width: '10%' }]}>
						<Text style={styles.tableCellHeader}>Quantity</Text>
					</View>
					<View style={[styles.tableColHeader, { width: '12.5%' }]}>
						<Text style={styles.tableCellHeader}>Unit Price</Text>
					</View>
					<View style={[styles.tableColHeader, { width: '12.5%' }]}>
						<Text style={styles.tableCellHeader}>Amount</Text>
					</View>
				</View>

				{invoice.products.map((product: any, index: number) => (
					<View key={index} style={styles.tableRow}>
						<View style={[styles.tableCol, { width: '15%' }]}>
							<Image
								src={product.image || '/placeholder-image.png'}
								style={styles.productImage}
							/>
						</View>
						<View style={[styles.tableCol, { width: '25%' }]}>
							<Text style={styles.tableCell}>{product.name}</Text>
						</View>
						<View style={[styles.tableCol, { width: '25%' }]}>
							<Text style={styles.tableCell}>
								{product.size} - {product.color}
							</Text>
						</View>
						<View style={[styles.tableCol, { width: '10%' }]}>
							<Text style={styles.tableCell}>{product.quantity}</Text>
						</View>
						<View style={[styles.tableCol, { width: '12.5%' }]}>
							<Text style={styles.tableCell}>
								${product.unitPrice.toFixed(2)}
							</Text>
						</View>
						<View style={[styles.tableCol, { width: '12.5%' }]}>
							<Text style={styles.tableCell}>
								${(product.quantity * product.unitPrice).toFixed(2)}
							</Text>
						</View>
					</View>
				))}
			</View>

			<View style={styles.subtotal}>
				<Text style={styles.subtotalLabel}>Total:</Text>
				<Text style={styles.subtotalValue}>
					${invoice.total_price.toFixed(2)}
				</Text>
			</View>

			<View style={styles.section}>
				<Text style={styles.label}>Note:</Text>
				<Text style={styles.value}>{invoice.note}</Text>
			</View>

			<View style={styles.section}>
				<Text style={styles.label}>Payment Information:</Text>
				<Text style={styles.value}>Bank: {company.bank_name}</Text>
				<Text style={styles.value}>
					Account Number: {company.bank_account_number}
				</Text>
				<Text style={styles.value}>
					Routing Number: {company.bank_routing_number}
				</Text>
			</View>

			<Text style={styles.footer}>Thank you for your business!</Text>
		</Page>
	</Document>
)

export default InvoicePDF
