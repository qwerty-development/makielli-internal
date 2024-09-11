// utils/pdfTemplates/ReceiptPDF.tsx
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

// Use built-in fonts
Font.register({
	family: 'Helvetica',
	fonts: [{ src: 'Helvetica' }, { src: 'Helvetica-Bold', fontWeight: 'bold' }]
})

const styles = StyleSheet.create({
	page: {
		fontFamily: 'Helvetica',
		fontSize: 11,
		paddingTop: 30,
		paddingBottom: 60,
		paddingHorizontal: 35,
		backgroundColor: '#F8FAFC'
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 20,
		paddingBottom: 20,
		borderBottom: 2,
		borderColor: '#3B82F6'
	},
	headerLeft: {
		flexDirection: 'column'
	},
	logo: {
		width: 120,
		height: 50,
		marginBottom: 10
	},
	title: {
		fontSize: 28,
		fontWeight: 'bold',
		color: '#1E3A8A'
	},
	headerRight: {
		flexDirection: 'column',
		alignItems: 'flex-end'
	},
	receiptDetails: {
		fontSize: 10,
		color: '#4B5563'
	},
	section: {
		margin: '20 0'
	},
	sectionTitle: {
		fontSize: 14,
		fontWeight: 'bold',
		color: '#1E3A8A',
		marginBottom: 10,
		backgroundColor: '#DBEAFE',
		padding: 5
	},
	row: {
		flexDirection: 'row',
		borderBottomWidth: 1,
		borderBottomColor: '#E5E7EB',
		paddingVertical: 5
	},
	column: {
		flexDirection: 'column',
		flexGrow: 1,
		fontSize: 10
	},
	label: {
		fontWeight: 'bold',
		color: '#4B5563'
	},
	value: {
		color: '#1F2937'
	},
	table: {
		width: 'auto',
		marginTop: 10,
		borderStyle: 'solid',
		borderWidth: 1,
		borderColor: '#E5E7EB'
	},
	tableRow: {
		flexDirection: 'row',
		borderBottomWidth: 1,
		borderBottomColor: '#E5E7EB'
	},
	tableRowEven: {
		backgroundColor: '#F9FAFB'
	},
	tableColHeader: {
		width: '25%',
		borderStyle: 'solid',
		borderRightWidth: 1,
		borderColor: '#E5E7EB',
		backgroundColor: '#EFF6FF',
		padding: 5
	},
	tableCol: {
		width: '25%',
		borderStyle: 'solid',
		borderRightWidth: 1,
		borderColor: '#E5E7EB',
		padding: 5
	},
	tableCellHeader: {
		fontWeight: 'bold',
		color: '#1E3A8A'
	},
	tableCell: {
		color: '#4B5563'
	},
	footer: {
		position: 'absolute',
		bottom: 30,
		left: 35,
		right: 35,
		textAlign: 'center',
		color: '#6B7280',
		fontSize: 10,
		borderTop: 1,
		borderColor: '#E5E7EB',
		paddingTop: 10
	},
	totalAmount: {
		fontSize: 16,
		fontWeight: 'bold',
		color: '#1E3A8A',
		marginTop: 15,
		textAlign: 'right',
		backgroundColor: '#DBEAFE',
		padding: 10
	}
})

const ReceiptPDF: React.FC<{
	receipt: any
	entity: any
	company: any
	invoice: any
	isClient: boolean
}> = ({ receipt, entity, company, invoice, isClient }) => (
	<Document>
		<Page size='A4' style={styles.page}>
			<View style={styles.header}>
				<View style={styles.headerLeft}>
					<Image src='/logo/logo.png' style={styles.logo} />
					<Text style={styles.title}>Receipt</Text>
				</View>
				<View style={styles.headerRight}>
					<Text style={styles.receiptDetails}>Receipt No: {receipt.id}</Text>
					<Text style={styles.receiptDetails}>
						Date: {format(new Date(receipt.paid_at), 'PPP')}
					</Text>
					<Text style={styles.receiptDetails}>
						Invoice No: {receipt.invoice_id}
					</Text>
				</View>
			</View>

			<View style={styles.section}>
				<Text style={styles.sectionTitle}>
					{isClient ? 'Client' : 'Supplier'} Information
				</Text>
				<View style={styles.row}>
					<View style={styles.column}>
						<Text style={styles.label}>Name:</Text>
						<Text style={styles.value}>{entity.name}</Text>
					</View>
					<View style={styles.column}>
						<Text style={styles.label}>Address:</Text>
						<Text style={styles.value}>
							{isClient ? entity.address : entity.location}
						</Text>
					</View>
					<View style={styles.column}>
						<Text style={styles.label}>Contact:</Text>
						<Text style={styles.value}>{entity.phone}</Text>
						<Text style={styles.value}>{entity.email}</Text>
					</View>
					{isClient && (
						<View style={styles.column}>
							<Text style={styles.label}>Tax Number:</Text>
							<Text style={styles.value}>{entity.tax_number}</Text>
						</View>
					)}
				</View>
			</View>

			<View style={styles.section}>
				<Text style={styles.sectionTitle}>Company Information</Text>
				<View style={styles.row}>
					<View style={styles.column}>
						<Text style={styles.label}>Name:</Text>
						<Text style={styles.value}>{company.name}</Text>
					</View>
					<View style={styles.column}>
						<Text style={styles.label}>Address:</Text>
						<Text style={styles.value}>{company.address}</Text>
					</View>
					<View style={styles.column}>
						<Text style={styles.label}>Identification:</Text>
						<Text style={styles.value}>{company.identification_type}</Text>
						<Text style={styles.value}>{company.identification_number}</Text>
					</View>
				</View>
			</View>

			<View style={styles.section}>
				<Text style={styles.sectionTitle}>Invoice Details</Text>
				<View style={styles.row}>
					<View style={styles.column}>
						<Text style={styles.label}>Invoice Date:</Text>
						<Text style={styles.value}>
							{format(new Date(invoice.created_at), 'PPP')}
						</Text>
					</View>
					<View style={styles.column}>
						<Text style={styles.label}>Total Amount:</Text>
						<Text style={styles.value}>${invoice.total_price.toFixed(2)}</Text>
					</View>
					<View style={styles.column}>
						<Text style={styles.label}>Remaining Amount:</Text>
						<Text style={styles.value}>
							${invoice.remaining_amount.toFixed(2)}
						</Text>
					</View>
				</View>
			</View>

			{receipt.products && receipt.products.length > 0 && (
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Products</Text>
					<View style={styles.table}>
						<View style={styles.tableRow}>
							<View style={styles.tableColHeader}>
								<Text style={styles.tableCellHeader}>Product</Text>
							</View>
							<View style={styles.tableColHeader}>
								<Text style={styles.tableCellHeader}>Details</Text>
							</View>
							<View style={styles.tableColHeader}>
								<Text style={styles.tableCellHeader}>Quantity</Text>
							</View>
							<View style={styles.tableColHeader}>
								<Text style={styles.tableCellHeader}>Price</Text>
							</View>
						</View>
						{receipt.products.map((product: any, index: number) => (
							<View
								key={index}
								style={[
									styles.tableRow,
									index % 2 === 0 ? styles.tableRowEven : {}
								]}>
								<View style={styles.tableCol}>
									<Text style={styles.tableCell}>{product.name}</Text>
								</View>
								<View style={styles.tableCol}>
									<Text style={styles.tableCell}>
										{product.size} - {product.color}
									</Text>
								</View>
								<View style={styles.tableCol}>
									<Text style={styles.tableCell}>{product.quantity}</Text>
								</View>
								<View style={styles.tableCol}>
									<Text style={styles.tableCell}>
										${(product.quantity * product.unitPrice).toFixed(2)}
									</Text>
								</View>
							</View>
						))}
					</View>
				</View>
			)}

			<Text style={styles.totalAmount}>
				Total Paid: ${receipt.amount.toFixed(2)}
			</Text>

			<View style={styles.section}>
				<Text style={styles.sectionTitle}>Payment Information</Text>
				<View style={styles.row}>
					<View style={styles.column}>
						<Text style={styles.label}>Bank:</Text>
						<Text style={styles.value}>{company.bank_name}</Text>
					</View>
					<View style={styles.column}>
						<Text style={styles.label}>Account Number:</Text>
						<Text style={styles.value}>{company.bank_account_number}</Text>
					</View>
					<View style={styles.column}>
						<Text style={styles.label}>Routing Number:</Text>
						<Text style={styles.value}>{company.bank_routing_number}</Text>
					</View>
				</View>
			</View>

			<Text style={styles.footer}>
				Thank you for your business! This receipt was generated on{' '}
				{format(new Date(), 'PPP')} at {format(new Date(), 'pp')}.
			</Text>
		</Page>
	</Document>
)

export default ReceiptPDF
