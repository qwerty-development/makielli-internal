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
		fontSize: 24,
		fontWeight: 'bold',
		marginBottom: 20,
		color: '#1E40AF'
	},
	returnTitle: {
		fontSize: 24,
		fontWeight: 'bold',
		marginBottom: 20,
		color: '#DC2626'
	},
	returnBadge: {
		backgroundColor: '#FEE2E2',
		padding: 4,
		borderRadius: 4,
		marginBottom: 10
	},
	returnBadgeText: {
		color: '#DC2626',
		fontSize: 12,
		fontWeight: 'bold',
		textAlign: 'center'
	},
	returnNote: {
		fontSize: 8,
		color: '#DC2626',
		fontStyle: 'italic',
		marginTop: 5
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

const InvoicePDF: React.FC<{
	invoice: any
	entity: any
	company: any
	isClientInvoice: boolean
	logoBase64?: string
}> = ({ invoice, entity, company, isClientInvoice, logoBase64 }) => {
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
	const isReturn = invoice.type === 'return'
	const hasDiscounts = invoice.products.some(
		(product: any) => invoice.discounts?.[product.product_id]
	)

	const currencySymbol = invoice.currency === 'euro' ? '€' : '$'

	const amountInWords = convertAmountToWords(
		invoice.total_price,
		invoice.currency || 'usd'
	)

	const subtotal = invoice.products.reduce((total: number, product: any) => {
		const price = isClientInvoice ? product.unitPrice : product.unitCost
		const lineTotal = price * product.totalQuantity
		return total + (isReturn ? -lineTotal : lineTotal)
	}, 0)

	const totalDiscount = invoice.products.reduce(
		(total: number, product: any) => {
			const discount = invoice.discounts?.[product.product_id] || 0
			const lineDiscount = discount * product.totalQuantity
			return total + (isReturn ? -lineDiscount : lineDiscount)
		},
		0
	)

	const totalBeforeVAT = subtotal - totalDiscount
	const vatAmount = invoice.include_vat ? totalBeforeVAT * 0.11 : 0

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
						{addressLines?.map((line: string, index: number) => (
							<Text key={index}>{line}</Text>
						))}
						<Text>
							{company.identification_type} {company.identification_number}
						</Text>
					</View>
				</View>

				<Text style={isReturn ? styles.returnTitle : styles.title}>
					{isReturn ? 'RETURN INVOICE' : 'INVOICE'}
				</Text>

				{isReturn && (
					<View style={styles.returnBadge}>
						<Text style={styles.returnBadgeText}>Return Invoice</Text>
					</View>
				)}

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
						{invoice.delivery_date && (
							<Text style={styles.value}>
								Delivery Date: {format(new Date(invoice.delivery_date), 'PP')}
							</Text>
						)}
						{invoice.payment_term && (
							<Text style={styles.value}>
								Payment Term: {invoice.payment_term}
							</Text>
						)}
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
						{sizeOptions?.map(size => (
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

					{invoice?.products?.map((product: any, index: number) => {
						const basePrice = isClientInvoice
							? product.unitPrice
							: product.unitCost
						const discount = invoice.discounts?.[product.product_id] || 0
						const priceAfterDiscount = basePrice - discount
						const lineTotal = priceAfterDiscount * product.totalQuantity
						const displayLineTotal = isReturn ? -lineTotal : lineTotal

						return (
							<View key={index} style={styles.tableRow}>
								<View style={[styles.tableCol, styles.imageContainer]}>
									<Image
										src={product.image || '/placeholder-image.png'}
										style={styles.productImage}
									/>
								</View>
								<View style={[styles.tableCol, { width: '12%' }]}>
									<Text style={styles.tableCell}>{product.name || 'N/A'}</Text>
								</View>
								<View style={[styles.tableCol, { width: '12%' }]}>
									{product?.notes?.map((note: string, noteIndex: number) => (
										<Text key={noteIndex} style={styles.notes}>
											{note}
										</Text>
									))}
								</View>
								<View style={[styles.tableCol, { width: '8%' }]}>
									<Text style={styles.tableCell}>{product.color || 'N/A'}</Text>
								</View>
								{sizeOptions?.map(size => (
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
										{basePrice.toFixed(2)}
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
										{Math.abs(displayLineTotal).toFixed(2)}
									</Text>
								</View>
							</View>
						)
					})}
				</View>

				{Math.abs(subtotal) != Math.abs(invoice.total_price) && (
					<View style={styles.subtotal}>
						<Text style={styles.subtotalLabel}>Subtotal:</Text>
						<Text style={styles.subtotalValue}>
							{currencySymbol}
							{Math.abs(subtotal).toFixed(2)}
							{isReturn && ' (Return)'}
						</Text>
					</View>
				)}

				{totalDiscount > 0 && (
					<View style={styles.subtotal}>
						<Text style={styles.subtotalLabel}>Total Discount:</Text>
						<Text style={styles.subtotalValue}>
							{currencySymbol}
							{Math.abs(totalDiscount).toFixed(2)}
							{isReturn && ' (Return)'}
						</Text>
					</View>
				)}
				{invoice.include_vat && (
					<>
						{totalBeforeVAT !== subtotal && (
							<View style={styles.subtotal}>
								<Text style={styles.subtotalLabel}>Total Before VAT:</Text>
								<Text style={styles.subtotalValue}>
									{currencySymbol}
									{Math.abs(totalBeforeVAT).toFixed(2)}
									{isReturn && ' (Return)'}
								</Text>
							</View>
						)}
						<View style={styles.subtotal}>
							<Text style={styles.subtotalLabel}>VAT (11%):</Text>
							<Text style={styles.subtotalValue}>
								{currencySymbol}
								{Math.abs(vatAmount).toFixed(2)}
								{isReturn && ' (Return)'}
							</Text>
						</View>
					</>
				)}

				<View style={styles.subtotal}>
					<Text style={styles.subtotalLabel}>Total:</Text>
					<Text style={styles.subtotalValue}>
						{currencySymbol}
						{Math.abs(invoice.total_price).toFixed(2)}
						{isReturn && ' (Return)'}
					</Text>
				</View>

				<Text style={styles.amountInWords}>
					Amount in words: {amountInWords}
					{isReturn && ' (Credit)'}
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
				</View>

				{isReturn && (
					<Text
						style={[styles.returnNote, { marginTop: 20, textAlign: 'center' }]}>
						This is a return invoice. All amounts shown are credits to be
						applied to your account.
					</Text>
				)}

				<Text style={styles.footer}>Thank you for your business!</Text>
			</Page>
		</Document>
	)
}

export default InvoicePDF
