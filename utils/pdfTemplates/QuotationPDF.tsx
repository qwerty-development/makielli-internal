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
import { ToWords } from 'to-words'

const toWords = new ToWords({
	localeCode: 'en-US',
	converterOptions: {
		currency: true,
		ignoreDecimal: false,
		ignoreZeroCurrency: false
	}
})

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
		fontSize: 18,
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
		width: '100%',
		height: 'auto',
		maxHeight: 50,
		objectFit: 'contain',
		marginVertical: 2
	},
	imageContainer: {
		width: '8%',
		height: 54,
		justifyContent: 'center',
		alignItems: 'center'
	},
	amountInWords: {
		fontSize: 8,
		fontStyle: 'italic',
		color: '#4B5563',
		marginTop: 5,
		textAlign: 'right'
	},
	paymentInfo: {
		fontSize: 8,
		marginTop: 10
	}
})

const convertAmountToWords = (
	amount: number,
	currency: 'usd' | 'euro'
): string => {
	const absAmount = Math.abs(amount)
	const mainUnit = currency === 'usd' ? 'dollar' : 'euro'
	const subUnit = currency === 'usd' ? 'cent' : 'cent'

	return toWords.convert(absAmount, {
		currency: true,
		currencyOptions: {
			name: mainUnit,
			plural: mainUnit + 's',
			symbol: currency === 'usd' ? '$' : '€',
			fractionalUnit: {
				name: subUnit,
				plural: subUnit + 's',
				symbol: 'c'
			}
		}
	})
}

const QuotationPDF: React.FC<{
	quotation: any
	client: any
	company: any
	logoBase64?: string
}> = ({ quotation, client, company, logoBase64 }) => {
	const sizeOptions = [
		'OS',
		'XS',
		'S',
		'M',
		'L',
		'XL',
		'2XL',
		'38',
		'40',
		'42',
		'44',
		'46'
	]

	const addressLines = company.address.split('\n')
	const currencySymbol = quotation.currency === 'euro' ? '€' : '$'
	const hasDiscounts = quotation.products.some(
		(product: any) => quotation.discounts?.[product.product_id]
	)

	const amountInWords = convertAmountToWords(
		quotation.total_price,
		quotation.currency || 'usd'
	)

	const subtotal = quotation.products.reduce((total: number, product: any) => {
		return total + product.unitPrice * product.totalQuantity
	}, 0)

	const totalDiscount = quotation.products.reduce(
		(total: number, product: any) => {
			const discount = quotation.discounts?.[product.product_id] || 0
			return total + discount * product.totalQuantity
		},
		0
	)

	const totalBeforeVAT = subtotal - totalDiscount
	const vatAmount = quotation.include_vat ? totalBeforeVAT * 0.11 : 0

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

				<Text style={styles.title}>PURCHASE ORDER</Text>

				<View style={styles.row}>
					<View style={styles.column}>
						<Text style={styles.label}>Order To:</Text>
						<Text style={styles.value}>{client.name}</Text>
						<Text style={styles.value}>{client.address}</Text>
						<Text style={styles.value}>Phone: {client.phone}</Text>
						<Text style={styles.value}>Email: {client.email}</Text>
						<Text style={styles.value}>Tax Number: {client.tax_number}</Text>
					</View>
					<View style={styles.column}>
						<Text style={styles.label}>Order Details:</Text>
						<Text style={styles.value}>Order Number: {quotation.id}</Text>
						<Text style={styles.value}>
							Date: {format(new Date(quotation.created_at), 'PP')}
						</Text>
						<Text style={styles.value}>
							Order Number: {quotation.order_number}
						</Text>
						{quotation.delivery_date && (
							<Text style={styles.value}>
								Delivery Date: {format(new Date(quotation.delivery_date), 'PP')}
							</Text>
						)}
						{quotation.payment_term && (
							<Text style={styles.value}>
								Payment Term: {quotation.payment_term}
							</Text>
						)}
						<Text style={styles.value}>Status: {quotation.status}</Text>
					</View>
				</View>

				<View style={styles.table}>
					<View style={styles.tableRow}>
						<View style={[styles.tableColHeader, { width: '8%' }]}>
							<Text style={styles.tableCellHeader}>IMAGE</Text>
						</View>
						<View style={[styles.tableColHeader, { width: '12%' }]}>
							<Text style={styles.tableCellHeader}>STYLE</Text>
						</View>
						<View style={[styles.tableColHeader, { width: '12%' }]}>
							<Text style={styles.tableCellHeader}>DESCRIPTION</Text>
						</View>
						<View style={[styles.tableColHeader, { width: '8%' }]}>
							<Text style={styles.tableCellHeader}>COLOR</Text>
						</View>
						{sizeOptions.map(size => (
							<View key={size} style={[styles.tableColHeader, { width: '4%' }]}>
								<Text style={styles.tableCellHeader}>{size}</Text>
							</View>
						))}
						<View style={[styles.tableColHeader, { width: '9%' }]}>
							<Text style={styles.tableCellHeader}>TOTAL PCS</Text>
						</View>
						<View style={[styles.tableColHeader, { width: '8%' }]}>
							<Text style={styles.tableCellHeader}>UNIT PRICE</Text>
						</View>
						{hasDiscounts && (
							<View style={[styles.tableColHeader, { width: '7%' }]}>
								<Text style={styles.tableCellHeader}>DISCOUNT</Text>
							</View>
						)}
						<View style={[styles.tableColHeader, { width: '10%' }]}>
							<Text style={styles.tableCellHeader}>TOTAL</Text>
						</View>
					</View>

					{quotation.products.map((product: any, index: number) => {
						const discount = quotation.discounts?.[product.product_id] || 0
						const priceAfterDiscount = product.unitPrice - discount
						const lineTotal = priceAfterDiscount * product.totalQuantity

						return (
							<View key={index} style={styles.tableRow}>
								<View style={[styles.tableCol, styles.imageContainer]}>
									<Image
										src={product.image || '/placeholder-image.jpg'}
										style={styles.productImage}
									/>
								</View>
								<View style={[styles.tableCol, { width: '12%' }]}>
									<Text style={styles.tableCell}>{product.name || 'N/A'}</Text>
								</View>
								<View style={[styles.tableCol, { width: '12%' }]}>
									{product.notes?.map((note: string, noteIndex: number) => (
										<Text key={noteIndex} style={styles.notes}>
											{note}
										</Text>
									))}
								</View>
								<View style={[styles.tableCol, { width: '8%' }]}>
									<Text style={styles.tableCell}>{product.color || 'N/A'}</Text>
								</View>
								{sizeOptions.map(size => (
									<View key={size} style={[styles.tableCol, { width: '4%' }]}>
										<Text style={styles.tableCell}>
											{product.sizes[size] || '-'}
										</Text>
									</View>
								))}
								<View style={[styles.tableCol, { width: '9%' }]}>
									<Text style={styles.tableCell}>{product.totalQuantity}</Text>
								</View>
								<View style={[styles.tableCol, { width: '8%' }]}>
									<Text style={styles.tableCell}>
										{currencySymbol}
										{product.unitPrice.toFixed(2)}
									</Text>
								</View>
								{hasDiscounts && (
									<View style={[styles.tableCol, { width: '7%' }]}>
										<Text style={styles.tableCell}>
											{discount > 0
												? `${currencySymbol}${discount.toFixed(2)}`
												: '-'}
										</Text>
									</View>
								)}
								<View style={[styles.tableCol, { width: '10%' }]}>
									<Text style={styles.tableCell}>
										{currencySymbol}
										{lineTotal.toFixed(2)}
									</Text>
								</View>
							</View>
						)
					})}
				</View>

				{Math.abs(subtotal) !== Math.abs(quotation.total_price) && (
					<View style={styles.subtotal}>
						<Text style={styles.subtotalLabel}>Subtotal:</Text>
						<Text style={styles.subtotalValue}>
							{currencySymbol}
							{subtotal.toFixed(2)}
						</Text>
					</View>
				)}

				{totalDiscount > 0 && (
					<View style={styles.subtotal}>
						<Text style={styles.subtotalLabel}>Total Discount:</Text>
						<Text style={styles.subtotalValue}>
							{currencySymbol}
							{totalDiscount.toFixed(2)}
						</Text>
					</View>
				)}

				{quotation.include_vat && (
					<>
						{totalBeforeVAT !== subtotal && (
							<View style={styles.subtotal}>
								<Text style={styles.subtotalValue}>
									{currencySymbol}
									{totalBeforeVAT.toFixed(2)}
								</Text>
							</View>
						)}
						<View style={styles.subtotal}>
							<Text style={styles.subtotalLabel}>VAT (11%):</Text>
							<Text style={styles.subtotalValue}>
								{currencySymbol}
								{vatAmount.toFixed(2)}
							</Text>
						</View>
					</>
				)}

				<View style={styles.subtotal}>
					<Text style={styles.subtotalLabel}>Total:</Text>
					<Text style={styles.subtotalValue}>
						{currencySymbol}
						{quotation.total_price.toFixed(2)}
					</Text>
				</View>

				<Text style={styles.amountInWords}>
					Amount in words: {amountInWords}
				</Text>

				<View style={[styles.section, styles.paymentInfo]}>
					<Text style={styles.label}>Payment Information:</Text>
					<Text style={styles.value}>Bank: {company.bank_name}</Text>
					<Text style={styles.value}>
						Account Number: {company.bank_account_number}
					</Text>
					<Text style={styles.value}>
						Routing Number: {company.bank_routing_number}
					</Text>
					<Text style={styles.value}>
						Beneficiary Account: Frisson International LLC
					</Text>
					{quotation.payment_term && (
						<Text style={styles.value}>
							Payment Terms: {quotation.payment_term}
						</Text>
					)}
				</View>

				{quotation.note && (
					<View style={styles.section}>
						<Text style={styles.label}>Additional Notes:</Text>
						<Text style={styles.value}>{quotation.note}</Text>
					</View>
				)}

				<Text style={styles.footer}>Thank you for your business!</Text>
			</Page>
		</Document>
	)
}

export default QuotationPDF
