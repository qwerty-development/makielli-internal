// utils/pdfTemplates/ShippingInvoicePDF.tsx
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

// Register fonts
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
        fontSize: 20,
        fontWeight: 700,
        marginBottom: 5,
        color: '#1E40AF',
        textAlign: 'center'
    },
    subtitle: {
        fontSize: 12,
        color: '#666',
        textAlign: 'center',
        marginBottom: 20
    },
    shippingBadge: {
        backgroundColor: '#EBF8FF',
        padding: 6,
        borderRadius: 4,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#3182CE',
        borderStyle: 'solid'
    },
    shippingBadgeText: {
        color: '#2B6CB5',
        fontSize: 11,
        textAlign: 'center',
        fontWeight: 700
    },
    section: {
        marginBottom: 15
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: 700,
        marginBottom: 8,
        color: '#1F2937',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        paddingBottom: 3
    },
    row: {
        flexDirection: 'row',
        marginBottom: 4
    },
    label: {
        fontSize: 10,
        fontWeight: 700,
        width: 120,
        color: '#4B5563'
    },
    value: {
        fontSize: 10,
        flex: 1,
        color: '#1F2937'
    },
    table: {
        width: 'auto',
        borderStyle: 'solid',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        marginTop: 10,
        marginBottom: 10
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        borderBottomStyle: 'solid',
        minHeight: 30,
        alignItems: 'center'
    },
    tableColHeader: {
        borderStyle: 'solid',
        borderRightWidth: 1,
        borderRightColor: '#E5E7EB',
        backgroundColor: '#F9FAFB',
        padding: 5,
        justifyContent: 'center'
    },
    tableCol: {
        borderStyle: 'solid',
        borderRightWidth: 1,
        borderRightColor: '#E5E7EB',
        padding: 5,
        justifyContent: 'center'
    },
    tableCellHeader: {
        fontWeight: 700,
        fontSize: 9,
        color: '#374151'
    },
    tableCell: {
        fontSize: 9,
        color: '#1F2937'
    },
    productImage: {
        width: 40,
        height: 40,
        objectFit: 'contain',
        marginVertical: 2
    },
    imagePlaceholder: {
        width: 40,
        height: 40,
        backgroundColor: '#F3F4F6',
        borderRadius: 4,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderStyle: 'solid'
    },
    imagePlaceholderText: {
        fontSize: 7,
        color: '#9CA3AF',
        textAlign: 'center'
    },
    trackingSection: {
        backgroundColor: '#FEF3C7',
        padding: 10,
        borderRadius: 4,
        marginTop: 20,
        marginBottom: 10
    },
    trackingTitle: {
        fontSize: 11,
        fontWeight: 700,
        color: '#92400E',
        marginBottom: 5
    },
    trackingInfo: {
        fontSize: 10,
        color: '#78350F'
    },
    notes: {
        fontSize: 9,
        fontStyle: 'italic',
        color: '#6B7280',
        marginTop: 15,
        padding: 10,
        backgroundColor: '#F9FAFB',
        borderRadius: 4
    },
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 30,
        right: 30,
        textAlign: 'center',
        color: '#9CA3AF',
        fontSize: 9,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        paddingTop: 10
    },
    statusBadge: {
        padding: 4,
        borderRadius: 3,
        alignSelf: 'flex-start'
    },
    statusShipped: {
        backgroundColor: '#DBEAFE',
        color: '#1E40AF'
    },
    statusDelivered: {
        backgroundColor: '#D1FAE5',
        color: '#065F46'
    },
    statusPending: {
        backgroundColor: '#F3F4F6',
        color: '#4B5563'
    },
    summary: {
        marginTop: 20,
        padding: 10,
        backgroundColor: '#F0F9FF',
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#BAE6FD',
        borderStyle: 'solid'
    },
    summaryText: {
        fontSize: 10,
        color: '#0C4A6E',
        marginBottom: 3
    }
})

const ProductImageRenderer: React.FC<{ 
    image: string | null
}> = ({ image }) => {
    const hasValidImage = image && 
                         typeof image === 'string' && 
                         image.trim().length > 0 &&
                         !image.includes('placeholder')

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
            console.warn(`Failed to render product image: ${image}`)
        }
    }

    return (
        <View style={styles.imagePlaceholder}>
            <Text style={styles.imagePlaceholderText}>NO IMAGE</Text>
        </View>
    )
}

const ShippingInvoicePDF: React.FC<{
    shippingInvoice: any
    originalInvoice: any
    entity: any
    company: any
    products: any[]
    isClient: boolean
    logoBase64?: string
}> = ({ shippingInvoice, originalInvoice, entity, company, products, isClient, logoBase64 }) => {
    const addressLines = company.address ? company.address.split('\n') : ['N/A']
    
    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'delivered':
                return styles.statusDelivered
            case 'shipped':
                return styles.statusShipped
            default:
                return styles.statusPending
        }
    }

    const getStatusText = (status: string) => {
        return status.charAt(0).toUpperCase() + status.slice(1)
    }

    // Get currency information
    const currency = originalInvoice.currency || 'usd'
    const currencySymbol = currency === 'euro' ? '€' : '$'
    
    // Calculate totals
    const totalQuantity = products.reduce((sum, product) => sum + (product.quantity || 0), 0)
    const totalStyles = products.length
    
    // Calculate pricing totals
    const subtotal = products.reduce((sum, product) => {
        const unitPrice = isClient ? (product.unit_price || 0) : (product.unit_cost || 0)
        return sum + (unitPrice * (product.quantity || 0))
    }, 0)
    
    const totalDiscount = products.reduce((sum, product) => {
        const discount = product.discount || 0
        return sum + (discount * (product.quantity || 0))
    }, 0)
    
    const totalAfterDiscount = subtotal - totalDiscount
    const shippingCost = shippingInvoice.shipping_cost || 0
    const totalBeforeVAT = totalAfterDiscount + shippingCost
    const vatAmount = originalInvoice.include_vat ? totalBeforeVAT * 0.11 : 0
    const finalTotal = totalBeforeVAT + vatAmount

    return (
        <Document>
            <Page size='A4' style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    {logoBase64 ? (
                        <Image src={logoBase64} style={styles.logo} />
                    ) : (
                        <Image src='/logo/logo.png' style={styles.logo} />
                    )}
                    <View style={styles.companyInfo}>
                        <Text>{company.name || 'N/A'}</Text>
                        {addressLines.map((line: string, index: number) => (
                            <Text key={index}>{line}</Text>
                        ))}
                        <Text>
                            {(company.identification_type || 'ID') +
                                ' ' +
                                (company.identification_number || 'N/A')}
                        </Text>
                    </View>
                </View>

                {/* Title */}
                <Text style={styles.title}>SHIPPING INVOICE</Text>
                <Text style={styles.subtitle}>
                    Shipping Number: {shippingInvoice.shipping_number}
                </Text>

                {/* Shipping Badge */}
                <View style={styles.shippingBadge}>
                    <Text style={styles.shippingBadgeText}>
                        PARTIAL SHIPMENT - Invoice #{originalInvoice.id} - Order #{originalInvoice.order_number}
                    </Text>
                </View>

                {/* Status Badge */}
                <View style={[styles.statusBadge, getStatusStyle(shippingInvoice.status)]}>
                    <Text style={{ fontSize: 10, fontWeight: 700 }}>
                        Status: {getStatusText(shippingInvoice.status)}
                    </Text>
                </View>

                {/* Entity & Shipping Information */}
                <View style={[styles.section, { flexDirection: 'row', justifyContent: 'space-between' }]}>
                    <View style={{ width: '48%' }}>
                        <Text style={styles.sectionTitle}>
                            {isClient ? 'Ship To' : 'Supplier'}
                        </Text>
                        <Text style={styles.value}>{entity.name || 'N/A'}</Text>
                        <Text style={styles.value}>
                            {shippingInvoice.shipping_address || entity.address || entity.location || 'N/A'}
                        </Text>
                        <Text style={styles.value}>Phone: {entity.phone || 'N/A'}</Text>
                        <Text style={styles.value}>Email: {entity.email || 'N/A'}</Text>
                    </View>

                    <View style={{ width: '48%' }}>
                        <Text style={styles.sectionTitle}>Shipping Details</Text>
                        <View style={styles.row}>
                            <Text style={styles.label}>Shipped Date:</Text>
                            <Text style={styles.value}>
                                {shippingInvoice.shipped_at
                                    ? format(new Date(shippingInvoice.shipped_at), 'PP')
                                    : 'N/A'}
                            </Text>
                        </View>
                        {shippingInvoice.delivered_at && (
                            <View style={styles.row}>
                                <Text style={styles.label}>Delivered Date:</Text>
                                <Text style={styles.value}>
                                    {format(new Date(shippingInvoice.delivered_at), 'PP')}
                                </Text>
                            </View>
                        )}
                        <View style={styles.row}>
                            <Text style={styles.label}>Carrier:</Text>
                            <Text style={styles.value}>
                                {shippingInvoice.carrier?.toUpperCase() || 'N/A'}
                            </Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.label}>Method:</Text>
                            <Text style={styles.value}>
                                {shippingInvoice.shipping_method?.charAt(0).toUpperCase() + 
                                 shippingInvoice.shipping_method?.slice(1) || 'N/A'}
                            </Text>
                        </View>
                        {shippingInvoice.shipping_cost > 0 && (
                            <View style={styles.row}>
                                <Text style={styles.label}>Shipping Cost:</Text>
                                <Text style={styles.value}>
                                    ${shippingInvoice.shipping_cost.toFixed(2)}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Tracking Information */}
                {shippingInvoice.tracking_number && (
                    <View style={styles.trackingSection}>
                        <Text style={styles.trackingTitle}>Tracking Information</Text>
                        <Text style={styles.trackingInfo}>
                            Tracking Number: {shippingInvoice.tracking_number}
                        </Text>
                    </View>
                )}

                {/* Products Table */}
                <Text style={styles.sectionTitle}>Shipped Products</Text>
                <View style={styles.table}>
                    <View style={[styles.tableRow, { backgroundColor: '#F9FAFB' }]}>
                        <View style={[styles.tableColHeader, { width: '8%' }]}>
                            <Text style={styles.tableCellHeader}>IMAGE</Text>
                        </View>
                        <View style={[styles.tableColHeader, { width: '20%' }]}>
                            <Text style={styles.tableCellHeader}>PRODUCT</Text>
                        </View>
                        <View style={[styles.tableColHeader, { width: '10%' }]}>
                            <Text style={styles.tableCellHeader}>SIZE</Text>
                        </View>
                        <View style={[styles.tableColHeader, { width: '10%' }]}>
                            <Text style={styles.tableCellHeader}>COLOR</Text>
                        </View>
                        <View style={[styles.tableColHeader, { width: '8%' }]}>
                            <Text style={styles.tableCellHeader}>QTY</Text>
                        </View>
                        <View style={[styles.tableColHeader, { width: '12%' }]}>
                            <Text style={styles.tableCellHeader}>UNIT PRICE</Text>
                        </View>
                        <View style={[styles.tableColHeader, { width: '12%' }]}>
                            <Text style={styles.tableCellHeader}>DISCOUNT</Text>
                        </View>
                        <View style={[styles.tableColHeader, { width: '12%' }]}>
                            <Text style={styles.tableCellHeader}>TOTAL</Text>
                        </View>
                        <View style={[styles.tableColHeader, { width: '8%', borderRightWidth: 0 }]}>
                            <Text style={styles.tableCellHeader}>NOTES</Text>
                        </View>
                    </View>

                    {products.map((product: any, index: number) => {
                        const unitPrice = isClient ? (product.unit_price || 0) : (product.unit_cost || 0)
                        const discount = product.discount || 0
                        const quantity = product.quantity || 0
                        const lineTotal = (unitPrice - discount) * quantity
                        
                        return (
                            <View key={index} style={styles.tableRow} wrap={false}>
                                <View style={[styles.tableCol, { width: '8%', alignItems: 'center' }]}>
                                    <ProductImageRenderer image={product.image} />
                                </View>
                                <View style={[styles.tableCol, { width: '20%' }]}>
                                    <Text style={styles.tableCell}>{product.name || 'N/A'}</Text>
                                </View>
                                <View style={[styles.tableCol, { width: '10%' }]}>
                                    <Text style={styles.tableCell}>{product.size || 'N/A'}</Text>
                                </View>
                                <View style={[styles.tableCol, { width: '10%' }]}>
                                    <Text style={styles.tableCell}>{product.color || 'N/A'}</Text>
                                </View>
                                <View style={[styles.tableCol, { width: '8%' }]}>
                                    <Text style={[styles.tableCell, { textAlign: 'center' }]}>
                                        {quantity}
                                    </Text>
                                </View>
                                <View style={[styles.tableCol, { width: '12%' }]}>
                                    <Text style={[styles.tableCell, { textAlign: 'right' }]}>
                                        {currencySymbol}{unitPrice.toFixed(2)}
                                    </Text>
                                </View>
                                <View style={[styles.tableCol, { width: '12%' }]}>
                                    <Text style={[styles.tableCell, { textAlign: 'right' }]}>
                                        {discount > 0 ? `${currencySymbol}${discount.toFixed(2)}` : '-'}
                                    </Text>
                                </View>
                                <View style={[styles.tableCol, { width: '12%' }]}>
                                    <Text style={[styles.tableCell, { textAlign: 'right', fontWeight: 700 }]}>
                                        {currencySymbol}{lineTotal.toFixed(2)}
                                    </Text>
                                </View>
                                <View style={[styles.tableCol, { width: '8%', borderRightWidth: 0 }]}>
                                    <Text style={[styles.tableCell, { fontSize: 7, fontStyle: 'italic' }]}>
                                        {(product.note && product.note.length > 10) 
                                            ? product.note.substring(0, 10) + '...' 
                                            : (product.note || '-')}
                                    </Text>
                                </View>
                            </View>
                        )
                    })}
                </View>

                {/* Pricing Summary */}
                <View style={[styles.summary, { marginTop: 15 }]}>
                    <Text style={styles.summaryText}>
                        <Text style={{ fontWeight: 700 }}>Subtotal:</Text> {currencySymbol}{subtotal.toFixed(2)}
                    </Text>
                    {totalDiscount > 0 && (
                        <Text style={styles.summaryText}>
                            <Text style={{ fontWeight: 700 }}>Total Discount:</Text> -{currencySymbol}{totalDiscount.toFixed(2)}
                        </Text>
                    )}
                    {totalDiscount > 0 && (
                        <Text style={styles.summaryText}>
                            <Text style={{ fontWeight: 700 }}>After Discount:</Text> {currencySymbol}{totalAfterDiscount.toFixed(2)}
                        </Text>
                    )}
                    {shippingCost > 0 && (
                        <Text style={styles.summaryText}>
                            <Text style={{ fontWeight: 700 }}>Shipping Cost:</Text> {currencySymbol}{shippingCost.toFixed(2)}
                        </Text>
                    )}
                    {originalInvoice.include_vat && (
                        <Text style={styles.summaryText}>
                            <Text style={{ fontWeight: 700 }}>VAT (11%):</Text> {currencySymbol}{vatAmount.toFixed(2)}
                        </Text>
                    )}
                    <Text style={[styles.summaryText, { fontSize: 12, fontWeight: 700, borderTopWidth: 1, borderTopColor: '#0C4A6E', paddingTop: 5, marginTop: 5 }]}>
                        <Text>Total Amount:</Text> {currencySymbol}{finalTotal.toFixed(2)}
                    </Text>
                </View>

                {/* Quantity Summary */}
                <View style={styles.summary}>
                    <Text style={styles.summaryText}>
                        <Text style={{ fontWeight: 700 }}>Total Styles Shipped:</Text> {totalStyles}
                    </Text>
                    <Text style={styles.summaryText}>
                        <Text style={{ fontWeight: 700 }}>Total Quantity Shipped:</Text> {totalQuantity} pieces
                    </Text>
                    <Text style={styles.summaryText}>
                        <Text style={{ fontWeight: 700 }}>Original Invoice:</Text> #{originalInvoice.id} - Order #{originalInvoice.order_number}
                    </Text>
                    <Text style={styles.summaryText}>
                        <Text style={{ fontWeight: 700 }}>Invoice Date:</Text> {format(new Date(originalInvoice.created_at), 'PP')}
                    </Text>
                </View>

                {/* Notes */}
                {shippingInvoice.notes && (
                    <View style={styles.notes}>
                        <Text style={{ fontWeight: 700, marginBottom: 3 }}>Notes:</Text>
                        <Text>{shippingInvoice.notes}</Text>
                    </View>
                )}

                {/* Footer */}
                <Text style={styles.footer} fixed>
                    This is a shipping document for partial fulfillment of Invoice #{originalInvoice.id}
                </Text>
            </Page>
        </Document>
    )
}

export default ShippingInvoicePDF