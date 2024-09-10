// utils/pdfTemplates/QuotationPDF.tsx
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
	productGroup: {
		marginBottom: 10
	},
	variantRow: {
		flexDirection: 'row',
		marginBottom: 2
	},
	variantCell: {
		fontSize: 10,
		flexGrow: 1
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
		width: 40,
		height: 40,
		objectFit: 'contain'
	}
})

const QuotationPDF: React.FC<{ quotation: any; client: any; company: any }> = ({
	quotation,
	client,
	company
}) => {
	// Group products by their name
	const groupedProducts = quotation.products.reduce(
		(acc: any, product: any) => {
			if (!acc[product.name]) {
				acc[product.name] = []
			}
			acc[product.name].push(product)
			return acc
		},
		{}
	)

	return (
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
						<View style={[styles.tableColHeader, { width: '10%' }]}>
							<Text style={styles.tableCellHeader}>IMAGE</Text>
						</View>
						<View style={[styles.tableColHeader, { width: '30%' }]}>
							<Text style={styles.tableCellHeader}>STYLE</Text>
						</View>
						<View style={[styles.tableColHeader, { width: '15%' }]}>
							<Text style={styles.tableCellHeader}>COLOR</Text>
						</View>
						<View style={[styles.tableColHeader, { width: '25%' }]}>
							<Text style={styles.tableCellHeader}>NOTES</Text>
						</View>
						<View style={[styles.tableColHeader, { width: '5%' }]}>
							<Text style={styles.tableCellHeader}>S</Text>
						</View>
						<View style={[styles.tableColHeader, { width: '5%' }]}>
							<Text style={styles.tableCellHeader}>M</Text>
						</View>
						<View style={[styles.tableColHeader, { width: '5%' }]}>
							<Text style={styles.tableCellHeader}>L</Text>
						</View>
						<View style={[styles.tableColHeader, { width: '5%' }]}>
							<Text style={styles.tableCellHeader}>XL</Text>
						</View>
						<View style={[styles.tableColHeader, { width: '10%' }]}>
							<Text style={styles.tableCellHeader}>PRICE</Text>
						</View>
						<View style={[styles.tableColHeader, { width: '15%' }]}>
							<Text style={styles.tableCellHeader}>TOTAL</Text>
						</View>
					</View>

					{Object.entries(groupedProducts).map(
						([productName, variants]: [any, any]) => (
							<View key={productName} style={styles.productGroup}>
								{variants.map((variant: any, index: any) => (
									<View key={index} style={styles.variantRow}>
										<View style={[styles.variantCell, { width: '10%' }]}>
											<Image
												src={variant.image || '/placeholder-image.png'}
												style={styles.productImage}
											/>
										</View>
										<Text style={[styles.variantCell, { width: '30%' }]}>
											{variant.name || 'N/A'}
										</Text>
										<Text style={[styles.variantCell, { width: '15%' }]}>
											{variant.color || 'N/A'}
										</Text>
										<Text style={[styles.variantCell, { width: '25%' }]}>
											{variant.note || '-'}
										</Text>
										<Text style={[styles.variantCell, { width: '5%' }]}>
											{variant.size === 'S' ? variant.quantity : '-'}
										</Text>
										<Text style={[styles.variantCell, { width: '5%' }]}>
											{variant.size === 'M' ? variant.quantity : '-'}
										</Text>
										<Text style={[styles.variantCell, { width: '5%' }]}>
											{variant.size === 'L' ? variant.quantity : '-'}
										</Text>
										<Text style={[styles.variantCell, { width: '5%' }]}>
											{variant.size === 'XL' ? variant.quantity : '-'}
										</Text>
										<Text style={[styles.variantCell, { width: '10%' }]}>
											${(variant.unitPrice || 0).toFixed(2)}
										</Text>
										<Text style={[styles.variantCell, { width: '15%' }]}>
											$
											{(
												(variant.quantity || 0) * (variant.unitPrice || 0)
											).toFixed(2)}
										</Text>
									</View>
								))}
							</View>
						)
					)}
				</View>

				<View style={styles.subtotal}>
					<Text style={styles.subtotalLabel}>Total:</Text>
					<Text style={styles.subtotalValue}>
						${quotation.total_price.toFixed(2)}
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
