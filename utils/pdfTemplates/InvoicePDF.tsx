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

const InvoicePDF: React.FC<{
	invoice: any
	entity: any
	company: any
	isClientInvoice: boolean
	logoBase64?: string
}> = ({ invoice, entity, company, isClientInvoice, logoBase64 }) => {
	// Group products by their name
	const groupedProducts: any = invoice.products.reduce(
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
					{logoBase64 ? (
						<Image src={logoBase64} style={styles.logo} />
					) : (
						<Image src='/logo/logo.png' style={styles.logo} />
					)}
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
							<Text style={styles.tableCellHeader}>
								{isClientInvoice ? 'PRICE' : 'COST'}
							</Text>
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
											$
											{(isClientInvoice
												? variant.unitPrice
												: variant.unitCost || 0
											).toFixed(2)}
										</Text>
										<Text style={[styles.variantCell, { width: '15%' }]}>
											$
											{(
												(variant.quantity || 0) *
												(isClientInvoice
													? variant.unitPrice
													: variant.unitCost || 0)
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
						${invoice.total_price.toFixed(2)}
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
