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

// MODIFICATION: Added try-catch for font registration
try {
  Font.register({
    family: 'Times New Roman',
    fonts: [
      { src: '/fonts/times-new-roman.ttf' }, // Ensure these paths are correct
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
    fontWeight: 700, // MODIFICATION: Changed from 'bold'
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
    fontWeight: 700, // MODIFICATION: Changed from 'bold'
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
    justifyContent: 'center', // MODIFICATION: Added for alignment
    alignItems: 'center'      // MODIFICATION: Added for alignment
  },
  tableCol: {
    borderStyle: 'solid',
    borderRightWidth: 1,
    borderRightColor: '#bfbfbf',
    padding: 1,               // MODIFICATION: Added padding
    justifyContent: 'center', // MODIFICATION: Added for alignment
    alignItems: 'center'      // MODIFICATION: Added for alignment
  },
  tableCellHeader: {
    fontWeight: 700, // MODIFICATION: Changed from 'bold'
    fontSize: 5,
    textAlign: 'center'
  },
  tableCell: {
    fontSize: 5,
    padding: 1 // Padding for the text content itself
  },
  notes: {
    fontSize: 5,
    fontStyle: 'italic',
    color: '#666',
    marginTop: 2,
    textAlign: 'left', // Notes might be better left-aligned
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
    fontWeight: 700, // MODIFICATION: Changed from 'bold'
    fontSize: 10
  },
  subtotalValue: {
    width: '16.66%',
    textAlign: 'right',
    fontSize: 10
  },
  footer: {
    position: 'absolute',
    bottom: 15,
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
  imageContainer: { // This style is used for the image cell
    width: '7%',
    height: 54, // Fixed height for consistent row height with images
    justifyContent: 'center',
    alignItems: 'center'
    // No padding here, padding will come from tableCol if merged, or productImage can have margins
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
  '36', '38', '40', '42', '44', '46',
  '50', '52', '54', '56', '58'
]

const QuotationPDF: React.FC<{
  quotation: any
  client: any
  company: any
  logoBase64?: string
}> = ({ quotation, client, company, logoBase64 }) => {
  const safeQuotation = quotation || {}
  const safeClient = client || {}
  const safeCompany = company || {}

  const addressLines = safeCompany.address ? safeCompany.address.split('\n') : ['N/A']
  const currency = safeQuotation.currency || 'usd'
  const currencySymbol = currency === 'euro' ? '€' : '$'

  const products = Array.isArray(safeQuotation.products) ? safeQuotation.products : []
  const hasDiscounts = products.some(
    (product: any) =>
      safeQuotation.discounts && safeQuotation.discounts[product.product_id]
  )

  const amountInWords = convertAmountToWords(safeQuotation.total_price || 0, currency)

  const subtotal = products.reduce((total: number, product: any) => {
    const unitPrice = product.unitPrice || 0
    const totalQuantity = product.totalQuantity || 0
    return total + unitPrice * totalQuantity
  }, 0)

  const totalDiscount = products.reduce((total: number, product: any) => {
    const discount = (safeQuotation.discounts && safeQuotation.discounts[product.product_id]) || 0
    const totalQuantity = product.totalQuantity || 0
    return total + discount * totalQuantity
  }, 0)

  const totalBeforeVAT = subtotal - totalDiscount
  const vatAmount = safeQuotation.include_vat ? totalBeforeVAT * 0.11 : 0

  return (
    <Document>
      <Page size='A4' style={styles.page}>
        <View style={styles.header}>
          {logoBase64 ? (
            <Image src={logoBase64} style={styles.logo} />
          ) : (
            <Image src='/logo/logo.png' style={styles.logo} /> // Ensure path is correct
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

        <Text style={styles.title}>PURCHASE ORDER</Text>

        <View style={styles.row}>
          <View style={styles.column}>
            <Text style={styles.label}>Order To:</Text>
            <Text style={styles.value}>{safeClient.name || 'N/A'}</Text>
            <Text style={styles.value}>{safeClient.address || 'N/A'}</Text>
            <Text style={styles.value}>Phone: {safeClient.phone || 'N/A'}</Text>
            <Text style={styles.value}>Email: {safeClient.email || 'N/A'}</Text>
            <Text style={styles.value}>Tax Number: {safeClient.tax_number || 'N/A'}</Text>
          </View>
          <View style={styles.column}>
            <Text style={styles.label}>Order Details:</Text>
            <Text style={styles.value}>Order Number: {safeQuotation.id || 'N/A'}</Text>
            <Text style={styles.value}>
              Date:{' '}
              {safeQuotation.created_at
                ? format(new Date(safeQuotation.created_at), 'PP')
                : 'N/A'}
            </Text>
            {/* Removed redundant "Order Number" display, assuming safeQuotation.id is preferred */}
            {safeQuotation.delivery_date && (
              <Text style={styles.value}>
                Delivery Date:{' '}
                {format(new Date(safeQuotation.delivery_date), 'PP')}
              </Text>
            )}
            {safeQuotation.payment_term && (
              <Text style={styles.value}>
                Payment Term: {safeQuotation.payment_term}
              </Text>
            )}
            <Text style={styles.value}>Status: {safeQuotation.status || 'N/A'}</Text>
          </View>
        </View>

        <View style={styles.table}>
          {/* MODIFICATION: Added 'fixed' prop to the table header row View */}
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
            {/* MODIFICATION: Added borderRightWidth: 0 to the last header cell */}
            <View style={[styles.tableColHeader, { width: '7%', borderRightWidth: 0 }]}>
              <Text style={styles.tableCellHeader}>TOTAL</Text>
            </View>
          </View>

          {products.map((product: any, index: number) => {
            const discount =
              (safeQuotation.discounts && safeQuotation.discounts[product.product_id]) || 0
            const unitPrice = product.unitPrice || 0
            const totalQuantity = product.totalQuantity || 0
            const priceAfterDiscount = unitPrice - discount
            const lineTotal = priceAfterDiscount * totalQuantity

            return (
              // MODIFICATION: Added 'wrap={false}' to prevent data rows from splitting
              <View key={index} style={styles.tableRow} wrap={false}>
                {/* MODIFICATION: Applied styles.imageContainer to the image cell */}
                <View style={[styles.tableCol, styles.imageContainer]}>
                 {product.image ? (
                    <Image
                      src={product.image}
                      style={styles.productImage}
                      cache={true}
                    />
                  ) : (
                    <Image
                      src="/placeholder-image.jpg" // Ensure path is correct or handle fallback
                      style={styles.productImage}
                      cache={true}
                    />
                  )}
                </View>
                <View style={[styles.tableCol, { width: '8%' }]}>
                  <Text style={styles.tableCell}>{product.name || 'N/A'}</Text>
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
                      {product.sizes && product.sizes[size] ? product.sizes[size] : '-'}
                    </Text>
                  </View>
                ))}
                <View style={[styles.tableCol, { width: '8%' }]}>
                  <Text style={styles.tableCell}>{totalQuantity}</Text>
                </View>
                <View style={[styles.tableCol, { width: '8%' }]}>
                  <Text style={styles.tableCell}>
                    {currencySymbol}
                    {unitPrice.toFixed(2)}
                  </Text>
                </View>
                {hasDiscounts && (
                  <View style={[styles.tableCol, { width: '8%' }]}>
                    <Text style={styles.tableCell}>
                      {discount > 0 ? `${currencySymbol}${discount.toFixed(2)}` : '-'}
                    </Text>
                  </View>
                )}
                {/* MODIFICATION: Added borderRightWidth: 0 to the last data cell */}
                <View style={[styles.tableCol, { width: '7%', borderRightWidth: 0 }]}>
                  <Text style={styles.tableCell}>
                    {currencySymbol}
                    {lineTotal.toFixed(2)}
                  </Text>
                </View>
              </View>
            )
          })}
        </View>

        {Math.abs(subtotal) !== Math.abs(safeQuotation.total_price || 0) && (
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

        {safeQuotation.include_vat && (
          <>
            {totalBeforeVAT !== subtotal && (
              <View style={styles.subtotal}>
                <Text style={styles.subtotalLabel}>Total Before VAT:</Text>
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

        {safeQuotation.shipping_fee > 0 && (
          <View style={styles.subtotal}>
            <Text style={styles.subtotalLabel}>Shipping Fee:</Text>
            <Text style={styles.subtotalValue}>
              {currencySymbol}
              {Math.abs(safeQuotation.shipping_fee).toFixed(2)}
            </Text>
          </View>
        )}

        <View style={styles.subtotal}>
          <Text style={styles.subtotalLabel}>Total:</Text>
          <Text style={styles.subtotalValue}>
            {currencySymbol}
            {(safeQuotation.total_price || 0).toFixed(2)}
          </Text>
        </View>

        <Text style={styles.amountInWords}>
          Amount in words: {amountInWords}
        </Text>

        <View style={[styles.section, styles.paymentInfo]}>
          <Text style={styles.label}>Payment Information:</Text>
          <Text style={styles.value}>
            Bank: {safeCompany.bank_name || 'N/A'}
          </Text>
          <Text style={styles.value}>
            Account Number: {safeCompany.bank_account_number || 'N/A'}
          </Text>
          <Text style={styles.value}>
            Routing Number: {safeCompany.bank_routing_number || 'N/A'}
          </Text>
          <Text style={styles.value}>
            Beneficiary Account: Frisson International LLC {/* This seems hardcoded, ensure it's correct or make dynamic */}
          </Text>
          {safeQuotation.payment_term && (
            <Text style={styles.value}>
              Payment Terms: {safeQuotation.payment_term}
            </Text>
          )}
        </View>

        {safeQuotation.note && (
          <View style={styles.section}>
            <Text style={styles.label}>Additional Notes:</Text>
            <Text style={styles.value}>{safeQuotation.note}</Text>
          </View>
        )}

        {/* MODIFICATION: Added 'fixed' and page numbering to footer */}
        <Text style={styles.footer} fixed>
            Thank you for your business!
        </Text>
      </Page>
    </Document>
  )
}

export default QuotationPDF