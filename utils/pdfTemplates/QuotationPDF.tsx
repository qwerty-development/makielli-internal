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
		padding: 30,
		fontFamily: 'Helvetica'
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: 20
	},
	logo: {
		width: 120,
		height: 50,
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
		marginTop: 10,
		borderStyle: 'solid',
		borderWidth: 1,
		borderColor: '#bfbfbf'
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
		fontSize: 6,
		textAlign: 'center'
	},
	sizeCol: {
		width: '5%',
		borderStyle: 'solid',
		borderRightWidth: 1,
		borderBottomWidth: 1,
		borderColor: '#bfbfbf',
		padding: 1,
		fontSize: 5,
		textAlign: 'center'
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
		width: 30,
		height: 30,
		objectFit: 'contain'
	},
	notes: {
		fontSize: 5,
		fontStyle: 'italic',
		color: '#666',
		marginTop: 2
	}
})

const QuotationPDF: React.FC<{
	quotation: any
	client: any
	company: any
	logoBase64?: string
}> = ({ quotation, client, company, logoBase64 }) => {
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

				<Text style={styles.title}>QUOTATION</Text>

				<View style={styles.row}>
					<View style={styles.column}>
						<Text style={styles.label}>Quote To:</Text>
						<Text style={styles.value}>{client.name}</Text>
						<Text style={styles.value}>{client.address}</Text>
						<Text style={styles.value}>Phone: {client.phone}</Text>
						<Text style={styles.value}>Email: {client.email}</Text>
						<Text style={styles.value}>Tax Number: {client.tax_number}</Text>
					</View>
					<View style={styles.column}>
						<Text style={styles.label}>Quotation Details:</Text>
						<Text style={styles.value}>Quotation Number: {quotation.id}</Text>
						<Text style={styles.value}>
							Date: {format(new Date(quotation.created_at), 'PP')}
						</Text>
						<Text style={styles.value}>
							Valid Until: {format(new Date(quotation.created_at), 'PP')}
						</Text>
						<Text style={styles.value}>Status: {quotation.status}</Text>
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
							<Text style={styles.tableCellHeader}>PRICE</Text>
						</View>
						<View style={[styles.tableColHeader, { width: '10%' }]}>
							<Text style={styles.tableCellHeader}>TOTAL</Text>
						</View>
					</View>

					{quotation.products.map((product: any, index: number) => (
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
									${product.unitPrice.toFixed(2)}
								</Text>
							</View>
							<View style={[styles.tableCol, { width: '10%' }]}>
								<Text style={styles.tableCell}>
									${(product.totalQuantity * product.unitPrice).toFixed(2)}
								</Text>
							</View>
						</View>
					))}
				</View>

				<View style={styles.subtotal}>
					<Text style={styles.subtotalLabel}>Total:</Text>
					<Text style={styles.subtotalValue}>
						$
						{quotation.products
							.reduce(
								(sum: number, product: any) =>
									sum + product.totalQuantity * product.unitPrice,
								0
							)
							.toFixed(2)}
					</Text>
				</View>

				{quotation.note && (
					<View style={styles.section}>
						<Text style={styles.label}>Note:</Text>
						<Text style={styles.value}>{quotation.note}</Text>
					</View>
				)}

				<View style={styles.section}>
					<Text style={styles.label}>Terms and Conditions:</Text>
					<Text style={styles.value}>
						1. This quotation is valid for 30 days from the date of issue.
					</Text>
					<Text style={styles.value}>
						2. Prices are subject to change without notice.
					</Text>
					<Text style={styles.value}>
						3. Delivery time may vary depending on product availability.
					</Text>
				</View>

				<Text style={styles.footer}>
					Thank you for your interest in our products!
				</Text>
			</Page>
		</Document>
	)
}

export default QuotationPDF
