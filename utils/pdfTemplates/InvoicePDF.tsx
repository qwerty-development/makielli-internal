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
import { Font } from '@react-pdf/renderer'

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
		height: 'auto',
		objectFit: 'contain'
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
		borderStyle: 'solid',
		borderWidth: 1,
		borderColor: '#bfbfbf',
		marginTop: 10
	},
	tableRow: {
		flexDirection: 'row',
		borderBottomWidth: 1,
		borderBottomColor: '#bfbfbf',
		borderBottomStyle: 'solid',
		alignItems: 'center',
		minHeight: 24,
		textAlign: 'center'
	},
	tableColHeader: {
		borderStyle: 'solid',
		borderBottomWidth: 1,
		borderRightWidth: 1,
		borderColor: '#bfbfbf',
		backgroundColor: '#f0f0f0',
		padding: 1
	},
	tableCol: {
		borderStyle: 'solid',
		borderRightWidth: 1,
		borderRightColor: '#bfbfbf'
	},
	tableCellHeader: {
		fontWeight: 'bold',
		fontSize: 5,
		textAlign: 'center'
	},
	tableCell: {
		fontSize: 5,
		padding: 1
	},
	notes: {
		fontSize: 5,
		fontStyle: 'italic',
		color: '#666',
		marginTop: 2
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
	},
	productImage: {
		width: 50,
		height: 50,
		objectFit: 'contain'
	}
})

const InvoicePDF: React.FC<{
	invoice: any
	entity: any
	company: any
	isClientInvoice: boolean
	logoBase64?: string
}> = ({ invoice, entity, company, isClientInvoice, logoBase64 }) => {
	const sizeOptions = ['S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', '6XL']
	const addressLines = company.address.split('\n')

	return (
		<Document>
			<Page size='A4' style={styles.page}>
				<View style={styles.header}>
					{logoBase64 ? (
						<Image src={logoBase64} style={styles.logo} />
					) : (
						<Image src='/logo/logo.png' style={styles.logo} />
					)}
					<View style={styles.companyInfo}>
						<Text>{company.name}</Text>
						{addressLines.map((line: string, index: number) => (
							<Text key={index}>{line}</Text>
						))}
						<Text>
							{company.identification_type} {company.identification_number}
						</Text>
					</View>
				</View>

				<Text style={styles.title}>INVOICE</Text>

				<View style={styles.row}>
					<View style={styles.column}>
						<Text style={styles.label}>
							{isClientInvoice ? 'Bill To:' : 'Supplier:'}
						</Text>
						<Text style={styles.value}>{entity.name}</Text>
						<Text style={styles.value}>
							{isClientInvoice ? entity.address : entity.location}
						</Text>
						<Text style={styles.value}>Phone: {entity.phone}</Text>
						<Text style={styles.value}>Email: {entity.email}</Text>
						{isClientInvoice && (
							<Text style={styles.value}>Tax Number: {entity.tax_number}</Text>
						)}
					</View>
					<View style={styles.column}>
						<Text style={styles.label}>Invoice Details:</Text>
						<Text style={styles.value}>Invoice Number: {invoice.id}</Text>
						<Text style={styles.value}>
							Date: {format(new Date(invoice.created_at), 'PP')}
						</Text>
						<Text style={styles.value}>
							Order Number: {invoice.order_number}
						</Text>
						<Text style={styles.value}>
							Due Date: {format(new Date(invoice.created_at), 'PP')}
						</Text>
					</View>
				</View>

				<View style={styles.table}>
					<View style={styles.tableRow}>
						<View style={[styles.tableColHeader, { width: '8%' }]}>
							<Text style={styles.tableCellHeader}>IMAGE</Text>
						</View>
						<View style={[styles.tableColHeader, { width: '18%' }]}>
							<Text style={styles.tableCellHeader}>STYLE</Text>
						</View>
						<View style={[styles.tableColHeader, { width: '8%' }]}>
							<Text style={styles.tableCellHeader}>COLOR</Text>
						</View>
						<View style={[styles.tableColHeader, { width: '11%' }]}>
							<Text style={styles.tableCellHeader}>NOTES</Text>
						</View>
						{sizeOptions.map(size => (
							<View key={size} style={[styles.tableColHeader, { width: '5%' }]}>
								<Text style={styles.tableCellHeader}>{size}</Text>
							</View>
						))}
						<View style={[styles.tableColHeader, { width: '7%' }]}>
							<Text style={styles.tableCellHeader}>
								{isClientInvoice ? 'PRICE' : 'COST'}
							</Text>
						</View>
						<View style={[styles.tableColHeader, { width: '10%' }]}>
							<Text style={styles.tableCellHeader}>TOTAL</Text>
						</View>
					</View>

					{invoice.products.map((product: any, index: number) => (
						<View key={index} style={styles.tableRow}>
							<View style={[styles.tableCol, { width: '8%' }]}>
								<Image
									src={product.image || '/placeholder-image.png'}
									style={styles.productImage}
								/>
							</View>
							<View style={[styles.tableCol, { width: '18%' }]}>
								<Text style={styles.tableCell}>{product.name || 'N/A'}</Text>
							</View>
							<View style={[styles.tableCol, { width: '8%' }]}>
								<Text style={styles.tableCell}>{product.color || 'N/A'}</Text>
							</View>
							<View style={[styles.tableCol, { width: '11%' }]}>
								{product.notes.map((note: string, noteIndex: number) => (
									<Text key={noteIndex} style={styles.notes}>
										{note}
									</Text>
								))}
							</View>
							{sizeOptions.map(size => (
								<View key={size} style={[styles.tableCol, { width: '5%' }]}>
									<Text style={styles.tableCell}>
										{product.sizes[size] || '-'}
									</Text>
								</View>
							))}
							<View style={[styles.tableCol, { width: '7%' }]}>
								<Text style={styles.tableCell}>
									$
									{(isClientInvoice
										? product.unitPrice
										: product.unitCost || 0
									).toFixed(2)}
								</Text>
							</View>
							<View style={[styles.tableCol, { width: '10%' }]}>
								<Text style={styles.tableCell}>
									$
									{(
										product.totalQuantity *
										(isClientInvoice
											? product.unitPrice
											: product.unitCost || 0)
									).toFixed(2)}
								</Text>
							</View>
						</View>
					))}
				</View>

				<View style={styles.subtotal}>
					<Text style={styles.subtotalLabel}>Total:</Text>
					<Text style={styles.subtotalValue}>
						$
						{invoice.products
							.reduce(
								(sum: number, product: any) =>
									sum +
									product.totalQuantity *
										(isClientInvoice
											? product.unitPrice
											: product.unitCost || 0),
								0
							)
							.toFixed(2)}
					</Text>
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
}

export default InvoicePDF
