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

type PaymentInfoOption = 'frisson_llc' | 'frisson_llc_euro' | 'frisson_llc_ach' | 'frisson_sarl_chf' | 'frisson_sarl_usd' | 'frisson_sarl_euro' | 'frisson_sarl_ach' 

const PAYMENT_INFO_CONFIG = {
  frisson_llc: {
    label: 'Frisson International LLC - USD',
    details: {
      bank: 'Interaudi Bank',
      bankAddress:
        '19 East 54th Street\nNew York, NY 10022\nUnited States of America',
      aba: '026006237',
      swift: 'AUSAUS33',
      accountName: 'Frisson International LLC',
      accountNumber: '684631',
      routingNumber: '026006237'
    }
  },
  frisson_llc_euro: {
    label: 'Frisson International LLC - Euro Transfer',
    details: {
      intermediaryBank: 'Deutsche Bank (Frankfurt)',
      intermediarySwift: 'DEUTDEFF',
      beneficiaryBank: 'Interaudi Bank',
      beneficiaryBankAddress: '19 East 54th Street\nNew York, NY 10022\nUnited States of America',
      beneficiarySwift: 'AUSAUS33',
      beneficiaryIban: 'DE66500700100958400410',
      beneficiaryIbanDetails: '(Interaudi Bank at Deutsche Bank)',
      accountName: 'Frisson International LLC',
      accountNumber: '684631-401-099'
    }
  },
  frisson_llc_ach: {
    label: 'Frisson International LLC - ACH',
    details: {
      routingNumber: '026006237',
      accountNumber: '684631'
    }
  },
  frisson_sarl_chf: {
    label: 'Frisson Sarl - CHF',
    details: {
      intermediaryBank: 'Deutsche Bank (Frankfurt)',
      intermediarySwift: 'DEUTDEFF',
      iban: 'CH24 0483 5092 7957 0300 0',
      ibanDetails: '(Deutsche Bank at Credit Suisse)',
      beneficiaryBank: 'Interaudi Bank (New York)',
      beneficiaryAccount: '958400400CHF',
      beneficiaryAccountDetails: '(Interaudi Bank at Deutsche Bank)',
      beneficiary: 'Frisson Sarl',
      accountNumber: '749361-401-003',
      routingNumber: '026006237',
      baseAccountNumber: '749361'
    }
  },
  frisson_sarl_usd: {
    label: 'Frisson Sarl - USD',
    details: {
      bank: 'Interaudi Bank',
      bankAddress:
        '19 East 54th Street\nNew York, NY 10022\nUnited States of America',
      aba: '026006237',
      swift: 'AUSAUS33',
      accountName: 'Frisson Sarl',
      accountNumber: '749361-401-01',
      routingNumber: '026006237',
      baseAccountNumber: '749361'
    }
  },
  frisson_sarl_euro: {
    label: 'Frisson Sarl - Euro Transfer',
    details: {
      intermediaryBank: 'Deutsche Bank (Frankfurt)',
      intermediarySwift: 'DEUTDEFF',
      beneficiaryBank: 'Interaudi Bank',
      beneficiaryBankAddress: '19 East 54th Street\nNew York, NY 10022\nUnited States of America',
      beneficiarySwift: 'AUSAUS33',
      beneficiaryIban: 'DE66500700100958400410',
      beneficiaryIbanDetails: '(Interaudi Bank at Deutsche Bank)',
      accountName: 'Frisson Sarl',
      accountNumber: '749361-401-099'
    }
  },
  frisson_sarl_ach: {
    label: 'Frisson Sarl - ACH',
    details: {
      routingNumber: '026006237',
      accountNumber: '749361'
    }
  }
}

const toWords = new ToWords({
    localeCode: 'en-US',
    converterOptions: {
        currency: true,
        ignoreDecimal: false,
        ignoreZeroCurrency: false
    }
})

// Register fonts with more specific paths and ensure they're available
// Use a try-catch to handle potential font loading issues
try {
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
} catch (error) {
    console.warn('Failed to load custom fonts, using fallbacks:', error)
}

// Standardize font weight usage across all style definitions
const styles = StyleSheet.create({
    page: {
        fontFamily: 'Times New Roman',
        flexDirection: 'column',
        backgroundColor: '#FFFFFF',
        padding: 30
    },
    productNameCell: {
        fontSize: 5,
        padding: 1,
        fontWeight: 700,
        fontFamily: 'Times New Roman'
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
        fontWeight: 700,
        marginBottom: 20,
        color: '#1E40AF'
    },
    returnTitle: {
        fontSize: 18,
        fontWeight: 700,
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
        fontWeight: 700,
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
        fontWeight: 700,
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
        padding: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    tableCol: {
        borderStyle: 'solid',
        borderRightWidth: 1,
        borderRightColor: '#bfbfbf',
        padding: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    tableCellHeader: {
        fontWeight: 700,
        fontSize: 5,
        textAlign: 'center'
    },
    tableCell: {
        fontSize: 5,
        padding: 1,
        textAlign: 'center'
    },
    notes: {
        fontSize: 5,
        fontStyle: 'italic',
        color: '#666',
        marginTop: 2,
        textAlign: 'left',
        paddingHorizontal: 2
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
        fontWeight: 700,
        fontSize: 10
    },
    subtotalValue: {
        width: '16.66%',
        textAlign: 'right',
        fontSize: 10
    },
    footer: {
        position: 'absolute',
        bottom: 10,
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
        width: '7%',
        height: 54,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 1
    },
    // ENHANCED: Better placeholder styling
    imagePlaceholder: {
        width: 40,
        height: 40,
        backgroundColor: '#f0f0f0',
        borderRadius: 4,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#d0d0d0',
        borderStyle: 'solid'
    },
    imagePlaceholderText: {
        fontSize: 6,
        color: '#999',
        textAlign: 'center'
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
    },
    paymentInfoSection: {
        marginTop: 15,
        borderTop: '1px solid #bfbfbf',
        paddingTop: 10
    },
    paymentInfoTitle: {
        fontSize: 10,
        fontWeight: 700,
        marginBottom: 5
    },
    paymentInfoRow: {
        fontSize: 8,
        marginBottom: 2
    },
    paymentInfoLabel: {
        fontWeight: 700
    }
})

const sanitizeProductName = (name: any): string => {
    if (name === null || name === undefined) {
        return 'N/A'
    }
    const nameString = String(name).trim()
    return nameString || 'N/A'
}

// ENHANCED: Better image rendering with robust fallback
const ProductImageRenderer: React.FC<{ 
    image: string | null, 
    productName: string 
}> = ({ image, productName }) => {
    // Check if image is valid (not null, not empty, and not just whitespace)
    const hasValidImage = image && 
                         typeof image === 'string' && 
                         image.trim().length > 0 &&
                         image !== '/placeholder-image.jpg' &&
                         image !== 'null' &&
                         image !== 'undefined'

    if (hasValidImage) {
        try {
            return (
                <Image
                    src={image}
                    style={styles.productImage}
                    cache={true}
                />
            )
        } catch (error) {
            console.warn(`Failed to render image for ${productName}: ${image}`)
            // Fall through to placeholder
        }
    }

    // Render placeholder
    return (
        <View style={styles.imagePlaceholder}>
            <Text style={styles.imagePlaceholderText}>NO{'\n'}IMAGE</Text>
        </View>
    )
}

const PaymentInfoRenderer: React.FC<{ paymentInfo: PaymentInfoOption }> = ({
    paymentInfo
}) => {
    const config: any =
        PAYMENT_INFO_CONFIG[paymentInfo] || PAYMENT_INFO_CONFIG['frisson_llc']

    if (paymentInfo === 'frisson_sarl_chf') {
        return (
            <View style={styles.paymentInfoSection}>
                <Text style={styles.paymentInfoTitle}>Payment Information:</Text>
                <Text style={styles.paymentInfoRow}>
                    <Text style={styles.paymentInfoLabel}>Intermediary Bank: </Text>
                    {config.details.intermediaryBank || 'N/A'}
                </Text>
                <Text style={styles.paymentInfoRow}>
                    <Text style={styles.paymentInfoLabel}>Intermediary SWIFT: </Text>
                    {config.details.intermediarySwift || 'N/A'}
                </Text>
                <Text style={styles.paymentInfoRow}>
                    <Text style={styles.paymentInfoLabel}>IBAN: </Text>
                    {config.details.iban || 'N/A'} {config.details.ibanDetails || ''}
                </Text>
                <Text style={styles.paymentInfoRow}>
                    <Text style={styles.paymentInfoLabel}>Beneficiary Bank: </Text>
                    {config.details.beneficiaryBank || 'N/A'}
                </Text>
                <Text style={styles.paymentInfoRow}>
                    <Text style={styles.paymentInfoLabel}>Beneficiary Account: </Text>
                    {config.details.beneficiaryAccount || 'N/A'}{' '}
                    {config.details.beneficiaryAccountDetails || ''}
                </Text>
                <Text style={styles.paymentInfoRow}>
                    <Text style={styles.paymentInfoLabel}>Beneficiary: </Text>
                    {config.details.beneficiary || 'N/A'}
                </Text>
                <Text style={styles.paymentInfoRow}>
                    <Text style={styles.paymentInfoLabel}>Account Number: </Text>
                    {config.details.accountNumber || 'N/A'}
                </Text>
                <Text style={styles.paymentInfoRow}>
                    <Text style={styles.paymentInfoLabel}>Routing Number: </Text>
                    {config.details.routingNumber || 'N/A'}
                </Text>
            </View>
        )
    }

    if (paymentInfo === 'frisson_sarl_euro' || paymentInfo === 'frisson_llc_euro') {
        return (
            <View style={styles.paymentInfoSection}>
                <Text style={styles.paymentInfoTitle}>Payment Information (Euro Transfer):</Text>
                <Text style={styles.paymentInfoRow}>
                    <Text style={styles.paymentInfoLabel}>Intermediary Bank: </Text>
                    {config.details.intermediaryBank || 'N/A'}
                </Text>
                <Text style={styles.paymentInfoRow}>
                    <Text style={styles.paymentInfoLabel}>Intermediary SWIFT: </Text>
                    {config.details.intermediarySwift || 'N/A'}
                </Text>
                <Text style={styles.paymentInfoRow}>
                    <Text style={styles.paymentInfoLabel}>Beneficiary Bank: </Text>
                    {config.details.beneficiaryBank || 'N/A'}
                </Text>
                <Text style={styles.paymentInfoRow}>
                    <Text style={styles.paymentInfoLabel}>Beneficiary Bank Address: </Text>
                    {config.details.beneficiaryBankAddress || 'N/A'}
                </Text>
                <Text style={styles.paymentInfoRow}>
                    <Text style={styles.paymentInfoLabel}>Beneficiary SWIFT: </Text>
                    {config.details.beneficiarySwift || 'N/A'}
                </Text>
                <Text style={styles.paymentInfoRow}>
                    <Text style={styles.paymentInfoLabel}>Beneficiary IBAN: </Text>
                    {config.details.beneficiaryIban || 'N/A'} {config.details.beneficiaryIbanDetails || ''}
                </Text>
                <Text style={styles.paymentInfoRow}>
                    <Text style={styles.paymentInfoLabel}>Account Name: </Text>
                    {config.details.accountName || 'N/A'}
                </Text>
                <Text style={styles.paymentInfoRow}>
                    <Text style={styles.paymentInfoLabel}>Account Number: </Text>
                    {config.details.accountNumber || 'N/A'}
                </Text>
            </View>
        )
    }

    if (paymentInfo === 'frisson_sarl_ach' || paymentInfo === 'frisson_llc_ach') {
        return (
            <View style={styles.paymentInfoSection}>
                <Text style={styles.paymentInfoTitle}>Payment Information (ACH):</Text>
                <Text style={styles.paymentInfoRow}>
                    <Text style={styles.paymentInfoLabel}>Routing Number: </Text>
                    {config.details.routingNumber || 'N/A'}
                </Text>
                <Text style={styles.paymentInfoRow}>
                    <Text style={styles.paymentInfoLabel}>Account Number: </Text>
                    {config.details.accountNumber || 'N/A'}
                </Text>
            </View>
        )
    }

    return (
        <View style={styles.paymentInfoSection}>
            <Text style={styles.paymentInfoTitle}>Payment Information:</Text>
            <Text style={styles.paymentInfoRow}>
                <Text style={styles.paymentInfoLabel}>Bank: </Text>
                {config.details.bank || 'N/A'}
            </Text>
            <Text style={styles.paymentInfoRow}>
                <Text style={styles.paymentInfoLabel}>Bank Address: </Text>
                {config.details.bankAddress || 'N/A'}
            </Text>
            <Text style={styles.paymentInfoRow}>
                <Text style={styles.paymentInfoLabel}>ABA: </Text>
                {config.details.aba || 'N/A'}
            </Text>
            <Text style={styles.paymentInfoRow}>
                <Text style={styles.paymentInfoLabel}>SWIFT: </Text>
                {config.details.swift || 'N/A'}
            </Text>
            <Text style={styles.paymentInfoRow}>
                <Text style={styles.paymentInfoLabel}>Account Name: </Text>
                {config.details.accountName || 'N/A'}
            </Text>
            <Text style={styles.paymentInfoRow}>
                <Text style={styles.paymentInfoLabel}>Account Number: </Text>
                {config.details.accountNumber || 'N/A'}
            </Text>
            <Text style={styles.paymentInfoRow}>
                <Text style={styles.paymentInfoLabel}>Routing Number: </Text>
                {config.details.routingNumber || 'N/A'}
            </Text>
        </View>
    )
}

const convertAmountToWords = (
    amount: number,
    currency: 'usd' | 'euro'
): string => {
    const absAmount = Math.abs(amount)
    const mainUnit = currency === 'usd' ? 'dollar' : 'euro'
    const subUnit = 'cent'
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

const sizeOptions = [
    'OS', 'XXS', 'XS', 'S', 'S/M', 'M', 'M/L', 'L', 'XL', '2XL', '3XL',
    '36', '38', '40', '42', '44', '46', '50', '52', '54', '56', '58'
]

const InvoicePDF: React.FC<{
    invoice: any
    entity: any
    company: any
    isClientInvoice: boolean
    logoBase64?: string
}> = ({ invoice, entity, company, isClientInvoice, logoBase64 }) => {
    const safeInvoice = invoice || {}
    const safeEntity = entity || {}
    const safeCompany = company || {}

    const addressLines = safeCompany.address
        ? safeCompany.address.split('\n')
        : ['N/A']
    const isReturn = safeInvoice.type === 'return'
    const products = safeInvoice.products || []
    const hasDiscounts = products.some(
        (product: any) => safeInvoice.discounts?.[product.product_id]
    )

    const currency = safeInvoice.currency || 'usd'
    const currencySymbol = currency === 'euro' ? '€' : '$'
    const amountInWords = convertAmountToWords(
        safeInvoice.total_price || 0,
        currency
    )

    // Calculate subtotal: (price * quantity) for each product
    const subtotal = products.reduce((total: number, product: any) => {
        const price = isClientInvoice
            ? product.unitPrice || 0
            : product.unitCost || 0
        const quantity = product.totalQuantity || 0
        const lineTotal = price * quantity
        return total + (isReturn ? -lineTotal : lineTotal)
    }, 0)

    // Calculate total discount: (discount per unit * quantity) for each product
    const totalDiscount = products.reduce((total: number, product: any) => {
        const discount = safeInvoice.discounts?.[product.product_id] || 0
        const quantity = product.totalQuantity || 0
        const lineDiscount = discount * quantity
        return total + (isReturn ? -lineDiscount : lineDiscount)
    }, 0)

    // Calculate components for display
    const totalBeforeVAT = subtotal - totalDiscount
    const vatAmount = safeInvoice.include_vat ? (safeInvoice.vat_amount || totalBeforeVAT * 0.11) : 0
    const shippingFee = safeInvoice.shipping_fee || 0

    // Use stored total_price as the source of truth, but calculate subtotal for display
    // If total_price exists in database, back-calculate the subtotal from it
    const storedTotal = Math.abs(safeInvoice.total_price || 0)
    const calculatedTotal = Math.abs(totalBeforeVAT + vatAmount + shippingFee)

    // If there's a significant difference between calculated and stored totals,
    // use the stored total and back-calculate subtotal
    const displaySubtotal = Math.abs(storedTotal - calculatedTotal) > 0.01
        ? storedTotal - vatAmount - shippingFee + totalDiscount
        : subtotal

    const displayTotalBeforeVAT = displaySubtotal - totalDiscount

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
                        <Text>{safeCompany.name || 'N/A'}</Text>
                        {addressLines.map((line: string, index: number) => (
                            <Text key={index}>{line}</Text>
                        ))}
                        <Text>
                            {(safeCompany.identification_type || 'ID') +
                                ' ' +
                                (safeCompany.identification_number || 'N/A')}
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
                        <Text style={styles.value}>{safeEntity.name || 'N/A'}</Text>
                        <Text style={styles.value}>
                            {isClientInvoice
                                ? safeEntity.address || 'N/A'
                                : safeEntity.location || 'N/A'}
                        </Text>
                        <Text style={styles.value}>Phone: {safeEntity.phone || 'N/A'}</Text>
                        <Text style={styles.value}>Email: {safeEntity.email || 'N/A'}</Text>
                        {isClientInvoice && (
                            <Text style={styles.value}>
                                Tax Number: {safeEntity.tax_number || 'N/A'}
                            </Text>
                        )}
                    </View>
                    <View style={styles.column}>
                        <Text style={styles.label}>Invoice Details:</Text>
                        <Text style={styles.value}>
                            Invoice Number: {safeInvoice.id || 'N/A'}
                        </Text>
                        <Text style={styles.value}>
                            Date:{' '}
                            {safeInvoice.created_at
                                ? format(new Date(safeInvoice.created_at), 'PP')
                                : 'N/A'}
                        </Text>
                        <Text style={styles.value}>
                            Order Number: {safeInvoice.order_number || 'N/A'}
                        </Text>
                        {safeInvoice.delivery_date && (
                            <Text style={styles.value}>
                                Delivery Date:{' '}
                                {format(new Date(safeInvoice.delivery_date), 'PP')}
                            </Text>
                        )}
                        {safeInvoice.payment_term && (
                            <Text style={styles.value}>
                                Payment Term: {safeInvoice.payment_term}
                            </Text>
                        )}
                    </View>
                </View>

                <View style={styles.table}>
                    <View style={styles.tableRow} fixed>
                        <View style={[styles.tableColHeader, { width: '7%' }]}>
                            <Text style={styles.tableCellHeader}>IMAGE</Text>
                        </View>
                        <View style={[styles.tableColHeader, { width: '8%' }]}>
                            <Text style={styles.tableCellHeader}>STYLE</Text>
                        </View>
                        <View style={[styles.tableColHeader, { width: '9%' }]}>
                            <Text style={styles.tableCellHeader}>DESCRIPTION</Text>
                        </View>
                        <View style={[styles.tableColHeader, { width: '7%' }]}>
                            <Text style={styles.tableCellHeader}>COLOR</Text>
                        </View>
                        {sizeOptions.map(size => (
                            <View key={size} style={[styles.tableColHeader, { width: '3%' }]}>
                                <Text style={styles.tableCellHeader}>{size}</Text>
                            </View>
                        ))}
                        <View style={[styles.tableColHeader, { width: '8%' }]}>
                            <Text style={styles.tableCellHeader}>TOTAL PCS</Text>
                        </View>
                        <View style={[styles.tableColHeader, { width: '8%' }]}>
                            <Text style={styles.tableCellHeader}>UNIT PRICE</Text>
                        </View>
                        {hasDiscounts && (
                            <View style={[styles.tableColHeader, { width: '8%' }]}>
                                <Text style={styles.tableCellHeader}>DISCOUNT</Text>
                            </View>
                        )}
                        <View style={[styles.tableColHeader, { width: '7%', borderRightWidth: 0 }]}>
                            <Text style={styles.tableCellHeader}>TOTAL</Text>
                        </View>
                    </View>

                    {(products || []).map((product: any, index: number) => {
                        const basePrice = isClientInvoice
                            ? product.unitPrice || 0
                            : product.unitCost || 0
                        const discount = safeInvoice.discounts?.[product.product_id] || 0
                        const quantity = product.totalQuantity || 0
                        const priceAfterDiscount = basePrice - discount
                        const lineTotal = priceAfterDiscount * quantity
                        const displayLineTotal = isReturn ? -lineTotal : lineTotal

                        return (
                            <View key={index} style={styles.tableRow} wrap={false}>
                                <View style={[styles.tableCol, styles.imageContainer]}>
                                    <ProductImageRenderer 
                                        image={product.image} 
                                        productName={product.name} 
                                    />
                                </View>
                                <View style={[styles.tableCol, { width: '8%' }]}>
                                    <Text style={styles.productNameCell}>
                                        {sanitizeProductName(product.name)}
                                    </Text>
                                </View>
                                <View style={[styles.tableCol, { width: '9%' }]}>
                                    {Array.isArray(product.notes) ? (
                                        product.notes.map((note: string, noteIndex: number) => (
                                            <Text key={noteIndex} style={styles.notes}>
                                                {note || 'N/A'}
                                            </Text>
                                        ))
                                    ) : (
                                        <Text style={styles.notes}>{product.notes || 'N/A'}</Text>
                                    )}
                                </View>
                                <View style={[styles.tableCol, { width: '7%' }]}>
                                    <Text style={styles.tableCell}>{product.color || 'N/A'}</Text>
                                </View>
                                {sizeOptions.map(size => (
                                    <View key={size} style={[styles.tableCol, { width: '3%' }]}>
                                        <Text style={styles.tableCell}>
                                            {product.sizes && product.sizes[size]
                                                ? product.sizes[size]
                                                : '-'}
                                        </Text>
                                    </View>
                                ))}
                                <View style={[styles.tableCol, { width: '8%' }]}>
                                    <Text style={styles.tableCell}>{quantity}</Text>
                                </View>
                                <View style={[styles.tableCol, { width: '8%' }]}>
                                    <Text style={styles.tableCell}>
                                        {currencySymbol}
                                        {basePrice.toFixed(2)}
                                    </Text>
                                </View>
                                {hasDiscounts && (
                                    <View style={[styles.tableCol, { width: '8%' }]}>
                                        <Text style={styles.tableCell}>
                                            {discount > 0
                                                ? `${currencySymbol}${discount.toFixed(2)}`
                                                : '-'}
                                        </Text>
                                    </View>
                                )}
                                <View style={[styles.tableCol, { width: '7%', borderRightWidth: 0 }]}>
                                    <Text style={styles.tableCell}>
                                        {currencySymbol}
                                        {Math.abs(displayLineTotal).toFixed(2)}
                                    </Text>
                                </View>
                            </View>
                        )
                    })}
                </View>

                {/* Step 1: Show subtotal (base price x quantity) */}
                <View style={styles.subtotal}>
                    <Text style={styles.subtotalLabel}>Subtotal:</Text>
                    <Text style={styles.subtotalValue}>
                        {currencySymbol}
                        {Math.abs(displaySubtotal).toFixed(2)}
                        {isReturn && ' (Return)'}
                    </Text>
                </View>

                {/* Step 2: Show discount if any */}
                {totalDiscount > 0 && (
                    <View style={styles.subtotal}>
                        <Text style={styles.subtotalLabel}>Discount:</Text>
                        <Text style={styles.subtotalValue}>
                            -{currencySymbol}
                            {Math.abs(totalDiscount).toFixed(2)}
                            {isReturn && ' (Return)'}
                        </Text>
                    </View>
                )}

                {/* Step 3: Show total after discount (if discount exists) */}
                {totalDiscount > 0 && (
                    <View style={styles.subtotal}>
                        <Text style={styles.subtotalLabel}>Total After Discount:</Text>
                        <Text style={styles.subtotalValue}>
                            {currencySymbol}
                            {Math.abs(displayTotalBeforeVAT).toFixed(2)}
                            {isReturn && ' (Return)'}
                        </Text>
                    </View>
                )}

                {/* Step 4: Show shipping fee if any */}
                {shippingFee > 0 && (
                    <View style={styles.subtotal}>
                        <Text style={styles.subtotalLabel}>Shipping Fee:</Text>
                        <Text style={styles.subtotalValue}>
                            {currencySymbol}
                            {Math.abs(shippingFee).toFixed(2)}
                            {isReturn && ' (Return)'}
                        </Text>
                    </View>
                )}

                {/* Step 5: Show total after discount + shipping (before VAT) if both discount and shipping exist */}
                {totalDiscount > 0 && shippingFee > 0 && (
                    <View style={styles.subtotal}>
                        <Text style={styles.subtotalLabel}>Total After Discount + Shipping:</Text>
                        <Text style={styles.subtotalValue}>
                            {currencySymbol}
                            {Math.abs(displayTotalBeforeVAT + shippingFee).toFixed(2)}
                            {isReturn && ' (Return)'}
                        </Text>
                    </View>
                )}

                {/* Step 6: Show VAT if included */}
                {safeInvoice.include_vat && (
                    <View style={styles.subtotal}>
                        <Text style={styles.subtotalLabel}>VAT (11%):</Text>
                        <Text style={styles.subtotalValue}>
                            {currencySymbol}
                            {Math.abs(vatAmount).toFixed(2)}
                            {isReturn && ' (Return)'}
                        </Text>
                    </View>
                )}

                {/* Step 7: Final total */}
                <View style={styles.subtotal}>
                    <Text style={styles.subtotalLabel}>Total:</Text>
                    <Text style={styles.subtotalValue}>
                        {currencySymbol}
                        {Math.abs(safeInvoice.total_price || 0).toFixed(2)}
                        {isReturn && ' (Return)'}
                    </Text>
                </View>

                <Text style={styles.amountInWords}>
                    Amount in words: {amountInWords}
                    {isReturn && ' (Credit)'}
                </Text>

                <PaymentInfoRenderer
                    paymentInfo={safeInvoice.payment_info || 'frisson_llc'}
                />

                {isReturn && (
                    <Text
                        style={[styles.returnNote, { marginTop: 20, textAlign: 'center' }]}>
                        This is a return invoice. All amounts shown are credits to be
                        applied to your account.
                    </Text>
                )}

                <Text style={styles.footer} fixed>
                    Thank you for your business!
                </Text>
            </Page>
        </Document>
    )
}

export default InvoicePDF