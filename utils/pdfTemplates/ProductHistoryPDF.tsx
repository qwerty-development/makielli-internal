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

// Register Times New Roman font family
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
		fontSize: 10,
		paddingTop: 35,
		paddingBottom: 60,
		paddingHorizontal: 35,
		backgroundColor: '#FFFFFF',
		color: '#2D3748'
	},
	
	// Header
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'flex-start',
		marginBottom: 25,
		paddingBottom: 20,
		borderBottomWidth: 2,
		borderBottomColor: '#4F46E5'
	},
	headerLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1
	},
	productImage: {
		width: 70,
		height: 70,
		borderRadius: 4,
		objectFit: 'cover',
		marginRight: 15,
		borderWidth: 1,
		borderColor: '#E2E8F0'
	},
	productImagePlaceholder: {
		width: 70,
		height: 70,
		borderRadius: 4,
		marginRight: 15,
		backgroundColor: '#F3F4F6',
		justifyContent: 'center',
		alignItems: 'center',
		borderWidth: 1,
		borderColor: '#E2E8F0'
	},
	productImagePlaceholderText: {
		fontSize: 8,
		color: '#9CA3AF'
	},
	headerInfo: {
		flexDirection: 'column',
		flex: 1
	},
	title: {
		fontSize: 22,
		fontWeight: 'bold',
		color: '#1F2937',
		marginBottom: 4,
		letterSpacing: -0.5
	},
	subtitle: {
		fontSize: 11,
		color: '#4F46E5',
		fontWeight: 'bold',
		marginBottom: 8
	},
	headerMeta: {
		fontSize: 9,
		color: '#6B7280',
		marginTop: 2
	},
	headerRight: {
		alignItems: 'flex-end'
	},
	logo: {
		width: 80,
		height: 'auto',
		marginBottom: 8,
		objectFit: 'contain'
	},
	reportDate: {
		fontSize: 9,
		color: '#6B7280',
		textAlign: 'right'
	},
	
	// Section
	section: {
		marginBottom: 20
	},
	sectionTitle: {
		fontSize: 12,
		fontWeight: 'bold',
		color: '#1F2937',
		marginBottom: 12,
		paddingBottom: 6,
		borderBottomWidth: 1,
		borderBottomColor: '#E5E7EB',
		letterSpacing: -0.2
	},
	
	// Summary Cards Grid
	summaryGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		marginBottom: 20,
		gap: 10
	},
	summaryCard: {
		width: '23%',
		backgroundColor: '#F9FAFB',
		borderRadius: 4,
		padding: 12,
		borderLeftWidth: 3,
		marginBottom: 8
	},
	summaryCardGreen: {
		borderLeftColor: '#10B981'
	},
	summaryCardBlue: {
		borderLeftColor: '#3B82F6'
	},
	summaryCardPurple: {
		borderLeftColor: '#8B5CF6'
	},
	summaryCardOrange: {
		borderLeftColor: '#F59E0B'
	},
	summaryCardRed: {
		borderLeftColor: '#EF4444'
	},
	summaryCardIndigo: {
		borderLeftColor: '#4F46E5'
	},
	summaryCardYellow: {
		borderLeftColor: '#EAB308'
	},
	summaryValue: {
		fontSize: 18,
		fontWeight: 'bold',
		color: '#1F2937',
		marginBottom: 2
	},
	summaryLabel: {
		fontSize: 8,
		color: '#6B7280',
		textTransform: 'uppercase',
		letterSpacing: 0.5
	},
	
	// Shipping Summary Row
	shippingSummary: {
		flexDirection: 'row',
		backgroundColor: '#F0FDF4',
		borderRadius: 4,
		padding: 12,
		marginBottom: 20,
		borderWidth: 1,
		borderColor: '#BBF7D0'
	},
	shippingItem: {
		flex: 1,
		alignItems: 'center'
	},
	shippingValue: {
		fontSize: 16,
		fontWeight: 'bold',
		marginBottom: 2
	},
	shippingValueGreen: {
		color: '#059669'
	},
	shippingValueOrange: {
		color: '#D97706'
	},
	shippingLabel: {
		fontSize: 8,
		color: '#047857',
		textTransform: 'uppercase'
	},
	shippingDivider: {
		width: 1,
		backgroundColor: '#BBF7D0',
		marginHorizontal: 10
	},
	
	// Table Styles
	tableContainer: {
		borderWidth: 1,
		borderColor: '#E5E7EB',
		borderRadius: 4,
		overflow: 'hidden',
		marginBottom: 15
	},
	tableHeader: {
		flexDirection: 'row',
		backgroundColor: '#1F2937',
		paddingVertical: 10,
		paddingHorizontal: 8
	},
	tableRow: {
		flexDirection: 'row',
		borderBottomWidth: 1,
		borderBottomColor: '#E5E7EB',
		paddingVertical: 8,
		paddingHorizontal: 8,
		minHeight: 32,
		alignItems: 'center'
	},
	tableRowEven: {
		backgroundColor: '#F9FAFB'
	},
	tableRowOdd: {
		backgroundColor: '#FFFFFF'
	},
	tableCellHeader: {
		fontSize: 8,
		fontWeight: 'bold',
		color: '#FFFFFF',
		textTransform: 'uppercase',
		letterSpacing: 0.3
	},
	tableCell: {
		fontSize: 9,
		color: '#374151'
	},
	tableCellBold: {
		fontWeight: 'bold'
	},
	
	// Variant Table Columns
	colVariant: { width: '25%' },
	colStock: { width: '12%', textAlign: 'center' },
	colSold: { width: '12%', textAlign: 'center' },
	colShipped: { width: '12%', textAlign: 'center' },
	colUnshipped: { width: '12%', textAlign: 'center' },
	colPercent: { width: '14%', textAlign: 'center' },
	colStatus: { width: '13%', textAlign: 'center' },
	
	// Customer Table Columns
	colCustomer: { width: '30%' },
	colPurchased: { width: '14%', textAlign: 'center' },
	colOrders: { width: '12%', textAlign: 'center' },
	colCustShipped: { width: '14%', textAlign: 'center' },
	colCustPending: { width: '14%', textAlign: 'center' },
	colLastPurchase: { width: '16%', textAlign: 'center' },
	
	// History Table Columns
	colDate: { width: '15%' },
	colType: { width: '18%' },
	colVariantSmall: { width: '22%' },
	colQty: { width: '12%', textAlign: 'center' },
	colRef: { width: '18%' },
	colNotes: { width: '15%' },
	
	// Progress Bar
	progressContainer: {
		flexDirection: 'row',
		alignItems: 'center'
	},
	progressBar: {
		height: 6,
		backgroundColor: '#E5E7EB',
		borderRadius: 3,
		width: 40,
		marginRight: 6
	},
	progressFill: {
		height: 6,
		borderRadius: 3
	},
	progressFillGreen: {
		backgroundColor: '#10B981'
	},
	progressFillYellow: {
		backgroundColor: '#F59E0B'
	},
	progressFillOrange: {
		backgroundColor: '#F97316'
	},
	progressText: {
		fontSize: 8,
		color: '#6B7280'
	},
	
	// Status Badges
	statusBadge: {
		paddingVertical: 2,
		paddingHorizontal: 4,
		borderRadius: 2,
		fontSize: 6,
		fontWeight: 'bold',
		textAlign: 'center'
	},
	statusShipped: {
		backgroundColor: '#D1FAE5',
		color: '#065F46'
	},
	statusPartial: {
		backgroundColor: '#FEF3C7',
		color: '#92400E'
	},
	statusPending: {
		backgroundColor: '#FEE2E2',
		color: '#991B1B'
	},
	
	// Type Badges
	typeBadge: {
		fontSize: 7,
		fontWeight: 'bold'
	},
	typeInvoice: {
		color: '#1E40AF'
	},
	typeQuotation: {
		color: '#7C3AED'
	},
	typeAdjustment: {
		color: '#D97706'
	},
	typePurchase: {
		color: '#059669'
	},
	typeDefault: {
		color: '#6B7280'
	},
	
	// Quantity styles
	quantityPositive: {
		color: '#059669',
		fontWeight: 'bold'
	},
	quantityNegative: {
		color: '#DC2626',
		fontWeight: 'bold'
	},
	
	// Insights Section
	insightsContainer: {
		backgroundColor: '#EEF2FF',
		borderRadius: 4,
		padding: 15,
		marginBottom: 20,
		borderLeftWidth: 4,
		borderLeftColor: '#4F46E5'
	},
	insightsTitle: {
		fontSize: 11,
		fontWeight: 'bold',
		color: '#3730A3',
		marginBottom: 10
	},
	insightItem: {
		flexDirection: 'row',
		marginBottom: 6
	},
	insightBullet: {
		fontSize: 10,
		color: '#4F46E5',
		marginRight: 6
	},
	insightText: {
		fontSize: 9,
		color: '#374151',
		flex: 1
	},
	
	// Footer
	footer: {
		position: 'absolute',
		bottom: 25,
		left: 35,
		right: 35,
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		borderTopWidth: 1,
		borderTopColor: '#E5E7EB',
		paddingTop: 12
	},
	footerText: {
		fontSize: 8,
		color: '#9CA3AF'
	},
	footerPage: {
		fontSize: 8,
		color: '#6B7280',
		fontWeight: 'bold'
	},
	
	// Empty State
	emptyState: {
		backgroundColor: '#F9FAFB',
		padding: 30,
		borderRadius: 4,
		alignItems: 'center',
		borderWidth: 1,
		borderColor: '#E5E7EB',
		borderStyle: 'dashed'
	},
	emptyText: {
		fontSize: 10,
		color: '#6B7280',
		fontStyle: 'italic'
	},
	
	// Customer Card (for top customers)
	customerRank: {
		width: 20,
		height: 20,
		borderRadius: 10,
		backgroundColor: '#4F46E5',
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: 8
	},
	customerRankText: {
		fontSize: 9,
		fontWeight: 'bold',
		color: '#FFFFFF'
	},
	customerName: {
		fontSize: 10,
		fontWeight: 'bold',
		color: '#1F2937'
	}
})

// Types
interface ProductInfo {
	name: string
	photo: string | null
}

interface ProductHistorySummary {
	total_sold: number
	total_purchased: number
	total_adjusted: number
	unique_customers: number
	first_sale_date: string | null
	last_sale_date: string | null
	avg_sale_quantity: number
	total_shipped: number
	total_unshipped: number
}

interface VariantSalesDetail {
	variant_id: string
	size: string
	color: string
	total_sold: number
	current_stock: number
	unique_customers: number
	shipped: number
	unshipped: number
}

interface CustomerPurchaseHistory {
	client_id: number
	client_name: string
	total_purchased: number
	total_shipped: number
	total_unshipped: number
	last_purchase_date: string
	purchase_count: number
	variants_purchased: {
		size: string
		color: string
		quantity: number
		shipped: number
		unshipped: number
	}[]
}

interface ProductHistoryDetail {
	id: string
	product_id: string
	variant_id: string
	quantity_change: number
	source_type: string
	source_id: string
	source_reference: string
	notes: string
	created_at: string
	product_name: string
	product_photo: string
	product_price: number
	size: string
	color: string
	current_stock: number
	client_id: number
	invoice_order_number: string
	invoice_type: string
	currency: string
	invoice_total: number
	client_name: string
	client_email: string
	client_phone: string
	quotation_id: number
	quotation_order_number: string
}

interface ProductHistoryPDFProps {
	productInfo: ProductInfo
	summary: ProductHistorySummary
	variantSales: VariantSalesDetail[]
	customerPurchases: CustomerPurchaseHistory[]
	history: ProductHistoryDetail[]
	logoBase64?: string
}

// Helper functions
const getStatusBadgeStyle = (unshipped: number, shipped: number) => {
	if (unshipped === 0) return styles.statusShipped
	if (shipped > 0) return styles.statusPartial
	return styles.statusPending
}

const getStatusText = (unshipped: number, shipped: number) => {
	if (unshipped === 0) return 'SHIPPED'
	if (shipped > 0) return 'PARTIAL'
	return 'PENDING'
}

const getProgressFillStyle = (percent: number) => {
	if (percent >= 100) return styles.progressFillGreen
	if (percent >= 50) return styles.progressFillYellow
	return styles.progressFillOrange
}

const getTypeBadgeStyle = (type: string) => {
	switch (type) {
		case 'invoice':
		case 'client_invoice':
			return styles.typeInvoice
		case 'quotation':
			return styles.typeQuotation
		case 'inventory_adjustment':
		case 'adjustment':
			return styles.typeAdjustment
		case 'purchase_order':
		case 'supplier_invoice':
			return styles.typePurchase
		default:
			return styles.typeDefault
	}
}

const formatSourceType = (type: string) => {
	const mapping: { [key: string]: string } = {
		'invoice': 'Invoice',
		'client_invoice': 'Invoice',
		'quotation': 'Quotation',
		'inventory_adjustment': 'Adjustment',
		'adjustment': 'Adjustment',
		'purchase_order': 'Purchase',
		'supplier_invoice': 'Purchase',
		'return': 'Return',
		'manual': 'Manual',
		'trigger': 'System'
	}
	return mapping[type] || type
}

// Generate insights based on data
const generateInsights = (
	summary: ProductHistorySummary,
	variantSales: VariantSalesDetail[],
	customerPurchases: CustomerPurchaseHistory[]
): string[] => {
	const insights: string[] = []
	
	// Shipping efficiency
	const shippingRate = summary.total_sold > 0 
		? Math.round((summary.total_shipped / summary.total_sold) * 100)
		: 0
	
	if (shippingRate === 100) {
		insights.push('All sold items have been shipped - excellent fulfillment rate!')
	} else if (shippingRate >= 80) {
		insights.push(`${shippingRate}% shipping rate with ${summary.total_unshipped} items pending shipment.`)
	} else if (summary.total_unshipped > 0) {
		insights.push(`${summary.total_unshipped} items are pending shipment (${100 - shippingRate}% of total sales).`)
	}
	
	// Top variant analysis
	if (variantSales.length > 0) {
		const topVariant = variantSales.reduce((max, v) => v.total_sold > max.total_sold ? v : max, variantSales[0])
		if (topVariant.total_sold > 0) {
			insights.push(`Best selling variant: ${topVariant.size}/${topVariant.color} with ${topVariant.total_sold} units sold.`)
		}
	}
	
	// Low stock warning
	const lowStockVariants = variantSales.filter(v => v.current_stock > 0 && v.current_stock < 5)
	if (lowStockVariants.length > 0) {
		insights.push(`${lowStockVariants.length} variant(s) have low stock (< 5 units).`)
	}
	
	// Out of stock
	const outOfStock = variantSales.filter(v => v.current_stock <= 0)
	if (outOfStock.length > 0) {
		insights.push(`${outOfStock.length} variant(s) are out of stock.`)
	}
	
	// Customer loyalty
	if (customerPurchases.length > 0) {
		const repeatCustomers = customerPurchases.filter(c => c.purchase_count > 1)
		if (repeatCustomers.length > 0) {
			insights.push(`${repeatCustomers.length} repeat customer(s) have purchased this product multiple times.`)
		}
		
		const topCustomer = customerPurchases[0]
		if (topCustomer) {
			insights.push(`Top customer "${topCustomer.client_name}" has purchased ${topCustomer.total_purchased} units across ${topCustomer.purchase_count} order(s).`)
		}
	}
	
	// Average order size
	if (summary.avg_sale_quantity > 0) {
		insights.push(`Average sale quantity: ${Math.round(summary.avg_sale_quantity * 10) / 10} units per transaction.`)
	}
	
	return insights.slice(0, 5) // Limit to top 5 insights
}

// Main Component
const ProductHistoryPDF = ({
	productInfo,
	summary,
	variantSales,
	customerPurchases,
	history,
	logoBase64
}: ProductHistoryPDFProps) => {
	const insights = generateInsights(summary, variantSales, customerPurchases)
	const shippingRate = summary.total_sold > 0 
		? Math.round((summary.total_shipped / summary.total_sold) * 100)
		: 100
	
	// Limit history to most recent 50 records
	const recentHistory = history.slice(0, 50)
	
	// Get top 10 customers
	const topCustomers = customerPurchases.slice(0, 10)
	
	return (
		<Document>
			{/* Page 1: Overview and Variants */}
			<Page size="A4" style={styles.page}>
				{/* Header */}
				<View style={styles.header}>
					<View style={styles.headerLeft}>
						{productInfo.photo ? (
							<Image src={productInfo.photo} style={styles.productImage} />
						) : (
							<View style={styles.productImagePlaceholder}>
								<Text style={styles.productImagePlaceholderText}>No Image</Text>
							</View>
						)}
						<View style={styles.headerInfo}>
							<Text style={styles.title}>{productInfo.name}</Text>
							<Text style={styles.subtitle}>Product History Report</Text>
							<Text style={styles.headerMeta}>
								{summary.first_sale_date && summary.last_sale_date
									? `Sales Period: ${format(new Date(summary.first_sale_date), 'MMM d, yyyy')} - ${format(new Date(summary.last_sale_date), 'MMM d, yyyy')}`
									: 'No sales recorded yet'
								}
							</Text>
						</View>
					</View>
					<View style={styles.headerRight}>
						{logoBase64 && (
							<Image src={logoBase64} style={styles.logo} />
						)}
						<Text style={styles.reportDate}>Generated: {format(new Date(), 'MMMM d, yyyy')}</Text>
						<Text style={styles.reportDate}>{format(new Date(), 'h:mm a')}</Text>
					</View>
				</View>
				
				{/* Summary Cards */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Sales Summary</Text>
					<View style={styles.summaryGrid}>
						<View style={[styles.summaryCard, styles.summaryCardGreen]}>
							<Text style={styles.summaryValue}>{summary.total_sold}</Text>
							<Text style={styles.summaryLabel}>Total Sold</Text>
						</View>
						<View style={[styles.summaryCard, styles.summaryCardBlue]}>
							<Text style={styles.summaryValue}>{summary.total_purchased}</Text>
							<Text style={styles.summaryLabel}>Total Purchased</Text>
						</View>
						<View style={[styles.summaryCard, styles.summaryCardPurple]}>
							<Text style={styles.summaryValue}>{summary.unique_customers}</Text>
							<Text style={styles.summaryLabel}>Unique Customers</Text>
						</View>
						<View style={[styles.summaryCard, styles.summaryCardYellow]}>
							<Text style={styles.summaryValue}>{summary.total_adjusted}</Text>
							<Text style={styles.summaryLabel}>Adjustments</Text>
						</View>
					</View>
					
					{/* Shipping Summary */}
					<View style={styles.shippingSummary}>
						<View style={styles.shippingItem}>
							<Text style={[styles.shippingValue, styles.shippingValueGreen]}>{summary.total_shipped}</Text>
							<Text style={styles.shippingLabel}>Shipped</Text>
						</View>
						<View style={styles.shippingDivider} />
						<View style={styles.shippingItem}>
							<Text style={[styles.shippingValue, styles.shippingValueOrange]}>{summary.total_unshipped}</Text>
							<Text style={styles.shippingLabel}>Pending Shipment</Text>
						</View>
						<View style={styles.shippingDivider} />
						<View style={styles.shippingItem}>
							<Text style={[styles.shippingValue, styles.shippingValueGreen]}>{shippingRate}%</Text>
							<Text style={styles.shippingLabel}>Fulfillment Rate</Text>
						</View>
					</View>
				</View>
				
				{/* Key Insights */}
				{insights.length > 0 && (
					<View style={styles.insightsContainer}>
						<Text style={styles.insightsTitle}>Key Insights</Text>
						{insights.map((insight, index) => (
							<View key={index} style={styles.insightItem}>
								<Text style={styles.insightBullet}>•</Text>
								<Text style={styles.insightText}>{insight}</Text>
							</View>
						))}
					</View>
				)}
				
				{/* Variant Performance Table */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Variant Performance</Text>
					{variantSales.length > 0 ? (
						<View style={styles.tableContainer}>
							<View style={styles.tableHeader}>
								<Text style={[styles.tableCellHeader, styles.colVariant]}>Variant</Text>
								<Text style={[styles.tableCellHeader, styles.colStock]}>Stock</Text>
								<Text style={[styles.tableCellHeader, styles.colSold]}>Sold</Text>
								<Text style={[styles.tableCellHeader, styles.colShipped]}>Shipped</Text>
								<Text style={[styles.tableCellHeader, styles.colUnshipped]}>Pending</Text>
								<Text style={[styles.tableCellHeader, styles.colPercent]}>Progress</Text>
								<Text style={[styles.tableCellHeader, styles.colStatus]}>Status</Text>
							</View>
							{variantSales.map((variant, index) => {
								const percentShipped = variant.total_sold > 0 
									? Math.round((variant.shipped / variant.total_sold) * 100)
									: 100
								return (
									<View 
										key={variant.variant_id || index} 
										style={[
											styles.tableRow,
											index % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd
										]}
									>
										<Text style={[styles.tableCell, styles.tableCellBold, styles.colVariant]}>
											{variant.size} / {variant.color}
										</Text>
										<Text style={[
											styles.tableCell, 
											styles.colStock,
											variant.current_stock <= 0 ? styles.quantityNegative : 
											variant.current_stock < 5 ? { color: '#D97706' } : {}
										]}>
											{variant.current_stock}
										</Text>
										<Text style={[styles.tableCell, styles.colSold, styles.quantityPositive]}>
											{variant.total_sold}
										</Text>
										<Text style={[styles.tableCell, styles.colShipped, { color: '#4F46E5' }]}>
											{variant.shipped}
										</Text>
										<Text style={[
											styles.tableCell, 
											styles.colUnshipped,
											variant.unshipped > 0 ? { color: '#D97706' } : { color: '#9CA3AF' }
										]}>
											{variant.unshipped}
										</Text>
										<View style={[styles.colPercent, styles.progressContainer]}>
											<View style={styles.progressBar}>
												<View style={[
													styles.progressFill,
													getProgressFillStyle(percentShipped),
													{ width: `${Math.min(percentShipped, 100)}%` }
												]} />
											</View>
											<Text style={styles.progressText}>{percentShipped}%</Text>
										</View>
										<View style={styles.colStatus}>
											<Text style={[styles.statusBadge, getStatusBadgeStyle(variant.unshipped, variant.shipped)]}>
												{getStatusText(variant.unshipped, variant.shipped)}
											</Text>
										</View>
									</View>
								)
							})}
						</View>
					) : (
						<View style={styles.emptyState}>
							<Text style={styles.emptyText}>No variant data available</Text>
						</View>
					)}
				</View>
				
				{/* Footer */}
				<View style={styles.footer} fixed>
					<Text style={styles.footerText}>Product History Report - {productInfo.name}</Text>
					<Text style={styles.footerPage}>Page 1</Text>
				</View>
			</Page>
			
			{/* Page 2: Customers and History */}
			<Page size="A4" style={styles.page}>
				{/* Top Customers Table */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Top Customers ({customerPurchases.length} total)</Text>
					{topCustomers.length > 0 ? (
						<View style={styles.tableContainer}>
							<View style={styles.tableHeader}>
								<Text style={[styles.tableCellHeader, styles.colCustomer]}>Customer</Text>
								<Text style={[styles.tableCellHeader, styles.colPurchased]}>Units</Text>
								<Text style={[styles.tableCellHeader, styles.colOrders]}>Orders</Text>
								<Text style={[styles.tableCellHeader, styles.colCustShipped]}>Shipped</Text>
								<Text style={[styles.tableCellHeader, styles.colCustPending]}>Pending</Text>
								<Text style={[styles.tableCellHeader, styles.colLastPurchase]}>Last Order</Text>
							</View>
							{topCustomers.map((customer, index) => (
								<View 
									key={customer.client_id} 
									style={[
										styles.tableRow,
										index % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd
									]}
								>
									<View style={[styles.colCustomer, { flexDirection: 'row', alignItems: 'center' }]}>
										<View style={styles.customerRank}>
											<Text style={styles.customerRankText}>{index + 1}</Text>
										</View>
										<Text style={styles.customerName}>{customer.client_name}</Text>
									</View>
									<Text style={[styles.tableCell, styles.tableCellBold, styles.colPurchased, styles.quantityPositive]}>
										{customer.total_purchased}
									</Text>
									<Text style={[styles.tableCell, styles.colOrders]}>
										{customer.purchase_count}
									</Text>
									<Text style={[styles.tableCell, styles.colCustShipped, { color: '#059669' }]}>
										{customer.total_shipped}
									</Text>
									<Text style={[
										styles.tableCell, 
										styles.colCustPending,
										customer.total_unshipped > 0 ? { color: '#D97706' } : { color: '#9CA3AF' }
									]}>
										{customer.total_unshipped}
									</Text>
									<Text style={[styles.tableCell, styles.colLastPurchase]}>
										{format(new Date(customer.last_purchase_date), 'MMM d, yyyy')}
									</Text>
								</View>
							))}
						</View>
					) : (
						<View style={styles.emptyState}>
							<Text style={styles.emptyText}>No customer purchase history found</Text>
						</View>
					)}
				</View>
				
				{/* Recent Transaction History */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>
						Recent Transaction History {history.length > 50 ? `(Latest 50 of ${history.length})` : `(${history.length} records)`}
					</Text>
					{recentHistory.length > 0 ? (
						<View style={styles.tableContainer}>
							<View style={styles.tableHeader}>
								<Text style={[styles.tableCellHeader, styles.colDate]}>Date</Text>
								<Text style={[styles.tableCellHeader, styles.colType]}>Type</Text>
								<Text style={[styles.tableCellHeader, styles.colVariantSmall]}>Variant</Text>
								<Text style={[styles.tableCellHeader, styles.colQty]}>Qty</Text>
								<Text style={[styles.tableCellHeader, styles.colRef]}>Reference</Text>
								<Text style={[styles.tableCellHeader, styles.colNotes]}>Notes</Text>
							</View>
							{recentHistory.map((item, index) => (
								<View 
									key={item.id} 
									style={[
										styles.tableRow,
										index % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd
									]}
								>
									<Text style={[styles.tableCell, styles.colDate]}>
										{format(new Date(item.created_at), 'MMM d, yyyy')}
									</Text>
									<View style={styles.colType}>
										<Text style={[styles.typeBadge, getTypeBadgeStyle(item.source_type)]}>
											{formatSourceType(item.source_type)}
										</Text>
									</View>
									<Text style={[styles.tableCell, styles.colVariantSmall]}>
										{item.size} / {item.color}
									</Text>
									<Text style={[
										styles.tableCell, 
										styles.colQty,
										item.quantity_change > 0 ? styles.quantityPositive : styles.quantityNegative
									]}>
										{item.quantity_change > 0 ? `+${item.quantity_change}` : item.quantity_change}
									</Text>
									<Text style={[styles.tableCell, styles.colRef]}>
										{item.source_reference || item.invoice_order_number || '-'}
									</Text>
									<Text style={[styles.tableCell, styles.colNotes]}>
										{(item.notes || '-').substring(0, 20)}{(item.notes?.length || 0) > 20 ? '...' : ''}
									</Text>
								</View>
							))}
						</View>
					) : (
						<View style={styles.emptyState}>
							<Text style={styles.emptyText}>No transaction history available</Text>
						</View>
					)}
					{history.length > 50 && (
						<Text style={{ fontSize: 8, color: '#6B7280', marginTop: 8, fontStyle: 'italic' }}>
							Note: Showing latest 50 transactions. Export to CSV for complete history.
						</Text>
					)}
				</View>
				
				{/* Footer */}
				<View style={styles.footer} fixed>
					<Text style={styles.footerText}>Product History Report - {productInfo.name}</Text>
					<Text style={styles.footerPage}>Page 2</Text>
				</View>
			</Page>
		</Document>
	)
}

export default ProductHistoryPDF
