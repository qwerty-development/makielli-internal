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
	
	// Client Info Box
	clientInfoBox: {
		backgroundColor: '#F9FAFB',
		borderRadius: 4,
		padding: 15,
		marginBottom: 20,
		borderLeftWidth: 4,
		borderLeftColor: '#4F46E5'
	},
	clientInfoTitle: {
		fontSize: 10,
		fontWeight: 'bold',
		color: '#4F46E5',
		marginBottom: 8,
		textTransform: 'uppercase',
		letterSpacing: 0.5
	},
	clientInfoRow: {
		flexDirection: 'row',
		marginBottom: 4
	},
	clientInfoLabel: {
		fontSize: 9,
		color: '#6B7280',
		width: 80
	},
	clientInfoValue: {
		fontSize: 9,
		color: '#1F2937',
		fontWeight: 'bold',
		flex: 1
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
		gap: 8
	},
	summaryCard: {
		width: '24%',
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
	summaryCardIndigo: {
		borderLeftColor: '#4F46E5'
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
	
	// Product Table Columns
	colProduct: { width: '30%' },
	colPurchased: { width: '12%', textAlign: 'center' },
	colShipped: { width: '12%', textAlign: 'center' },
	colPending: { width: '12%', textAlign: 'center' },
	colOrders: { width: '10%', textAlign: 'center' },
	colLastPurchase: { width: '14%', textAlign: 'center' },
	colStatus: { width: '10%', textAlign: 'center' },
	
	// Variant Table Columns
	colVariant: { width: '35%' },
	colVarQty: { width: '15%', textAlign: 'center' },
	colVarShipped: { width: '15%', textAlign: 'center' },
	colVarPending: { width: '15%', textAlign: 'center' },
	colVarStatus: { width: '20%', textAlign: 'center' },
	
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
	
	// Product Card for detailed view
	productCard: {
		backgroundColor: '#F9FAFB',
		borderRadius: 4,
		padding: 12,
		marginBottom: 12,
		borderWidth: 1,
		borderColor: '#E5E7EB'
	},
	productCardHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 10,
		paddingBottom: 8,
		borderBottomWidth: 1,
		borderBottomColor: '#E5E7EB'
	},
	productCardTitle: {
		fontSize: 11,
		fontWeight: 'bold',
		color: '#1F2937',
		flex: 1
	},
	productCardStats: {
		flexDirection: 'row',
		gap: 15
	},
	productCardStat: {
		alignItems: 'center'
	},
	productCardStatValue: {
		fontSize: 12,
		fontWeight: 'bold',
		color: '#4F46E5'
	},
	productCardStatLabel: {
		fontSize: 7,
		color: '#6B7280',
		textTransform: 'uppercase'
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
	}
})

// Types
interface Client {
	client_id: number
	name: string
	email: string
	phone: string
	address: string
	balance: number
}

interface ClientPurchaseHistoryRecord {
	product_id: string
	product_name: string
	product_photo: string
	total_purchased: number
	total_shipped: number
	total_unshipped: number
	purchase_count: number
	last_purchase_date: string
	variants: {
		size: string
		color: string
		quantity: number
		shipped: number
		unshipped: number
	}[]
}

interface ClientHistoryPDFProps {
	client: Client
	purchaseHistory: ClientPurchaseHistoryRecord[]
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

// Generate insights based on data
const generateInsights = (
	client: Client,
	purchaseHistory: ClientPurchaseHistoryRecord[]
): string[] => {
	const insights: string[] = []
	
	// Calculate totals
	const totalPurchased = purchaseHistory.reduce((sum, p) => sum + p.total_purchased, 0)
	const totalShipped = purchaseHistory.reduce((sum, p) => sum + p.total_shipped, 0)
	const totalUnshipped = purchaseHistory.reduce((sum, p) => sum + p.total_unshipped, 0)
	const totalOrders = purchaseHistory.reduce((sum, p) => sum + p.purchase_count, 0)
	
	// Shipping efficiency
	const shippingRate = totalPurchased > 0 
		? Math.round((totalShipped / totalPurchased) * 100)
		: 100
	
	if (shippingRate === 100) {
		insights.push('All purchased items have been shipped - excellent fulfillment!')
	} else if (shippingRate >= 80) {
		insights.push(`${shippingRate}% shipping rate with ${totalUnshipped} items pending shipment.`)
	} else if (totalUnshipped > 0) {
		insights.push(`${totalUnshipped} items are pending shipment (${100 - shippingRate}% of total purchases).`)
	}
	
	// Top product analysis
	if (purchaseHistory.length > 0) {
		const topProduct = purchaseHistory[0] // Already sorted by total_purchased
		insights.push(`Most purchased product: "${topProduct.product_name}" with ${topProduct.total_purchased} units.`)
	}
	
	// Product diversity
	insights.push(`Client has purchased ${purchaseHistory.length} different product(s) across ${totalOrders} order(s).`)
	
	// Average order size
	if (totalOrders > 0) {
		const avgOrderSize = Math.round(totalPurchased / totalOrders)
		insights.push(`Average purchase: ${avgOrderSize} units per order.`)
	}
	
	// Outstanding balance
	if (client.balance > 0) {
		insights.push(`Outstanding balance: $${client.balance.toLocaleString()}`)
	} else if (client.balance < 0) {
		insights.push(`Credit balance: $${Math.abs(client.balance).toLocaleString()}`)
	}
	
	// Products with pending shipments
	const productsWithPending = purchaseHistory.filter(p => p.total_unshipped > 0)
	if (productsWithPending.length > 0) {
		insights.push(`${productsWithPending.length} product(s) have items awaiting shipment.`)
	}
	
	return insights.slice(0, 5) // Limit to top 5 insights
}

// Main Component
const ClientHistoryPDF = ({
	client,
	purchaseHistory,
	logoBase64
}: ClientHistoryPDFProps) => {
	const insights = generateInsights(client, purchaseHistory)
	
	// Calculate summary totals
	const totalPurchased = purchaseHistory.reduce((sum, p) => sum + p.total_purchased, 0)
	const totalShipped = purchaseHistory.reduce((sum, p) => sum + p.total_shipped, 0)
	const totalUnshipped = purchaseHistory.reduce((sum, p) => sum + p.total_unshipped, 0)
	const totalOrders = purchaseHistory.reduce((sum, p) => sum + p.purchase_count, 0)
	const shippingRate = totalPurchased > 0 
		? Math.round((totalShipped / totalPurchased) * 100)
		: 100
	
	// Limit to top 20 products for first page overview
	const topProducts = purchaseHistory.slice(0, 20)
	
	return (
		<Document>
			{/* Page 1: Overview */}
			<Page size="A4" style={styles.page}>
				{/* Header */}
				<View style={styles.header}>
					<View style={styles.headerLeft}>
						<Text style={styles.title}>{client.name}</Text>
						<Text style={styles.subtitle}>Purchase History Report</Text>
						<Text style={styles.headerMeta}>
							{purchaseHistory.length} Products • {totalOrders} Total Orders
						</Text>
					</View>
					<View style={styles.headerRight}>
						{logoBase64 && (
							<Image src={logoBase64} style={styles.logo} />
						)}
						<Text style={styles.reportDate}>Generated: {format(new Date(), 'MMMM d, yyyy')}</Text>
						<Text style={styles.reportDate}>{format(new Date(), 'h:mm a')}</Text>
					</View>
				</View>
				
				{/* Client Info */}
				<View style={styles.clientInfoBox}>
					<Text style={styles.clientInfoTitle}>Client Information</Text>
					<View style={styles.clientInfoRow}>
						<Text style={styles.clientInfoLabel}>Email:</Text>
						<Text style={styles.clientInfoValue}>{client.email || 'N/A'}</Text>
					</View>
					<View style={styles.clientInfoRow}>
						<Text style={styles.clientInfoLabel}>Phone:</Text>
						<Text style={styles.clientInfoValue}>{client.phone || 'N/A'}</Text>
					</View>
					<View style={styles.clientInfoRow}>
						<Text style={styles.clientInfoLabel}>Address:</Text>
						<Text style={styles.clientInfoValue}>{client.address || 'N/A'}</Text>
					</View>
					<View style={styles.clientInfoRow}>
						<Text style={styles.clientInfoLabel}>Balance:</Text>
						<Text style={[styles.clientInfoValue, client.balance > 0 ? { color: '#DC2626' } : client.balance < 0 ? { color: '#059669' } : {}]}>
							${client.balance.toLocaleString()}
						</Text>
					</View>
				</View>
				
				{/* Summary Cards */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Purchase Summary</Text>
					<View style={styles.summaryGrid}>
						<View style={[styles.summaryCard, styles.summaryCardGreen]}>
							<Text style={styles.summaryValue}>{totalPurchased}</Text>
							<Text style={styles.summaryLabel}>Total Units</Text>
						</View>
						<View style={[styles.summaryCard, styles.summaryCardBlue]}>
							<Text style={styles.summaryValue}>{purchaseHistory.length}</Text>
							<Text style={styles.summaryLabel}>Products</Text>
						</View>
						<View style={[styles.summaryCard, styles.summaryCardPurple]}>
							<Text style={styles.summaryValue}>{totalOrders}</Text>
							<Text style={styles.summaryLabel}>Orders</Text>
						</View>
						<View style={[styles.summaryCard, styles.summaryCardIndigo]}>
							<Text style={styles.summaryValue}>{shippingRate}%</Text>
							<Text style={styles.summaryLabel}>Shipped</Text>
						</View>
					</View>
					
					{/* Shipping Summary */}
					<View style={styles.shippingSummary}>
						<View style={styles.shippingItem}>
							<Text style={[styles.shippingValue, styles.shippingValueGreen]}>{totalShipped}</Text>
							<Text style={styles.shippingLabel}>Items Shipped</Text>
						</View>
						<View style={styles.shippingDivider} />
						<View style={styles.shippingItem}>
							<Text style={[styles.shippingValue, styles.shippingValueOrange]}>{totalUnshipped}</Text>
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
				
				{/* Products Table */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Products Purchased {purchaseHistory.length > 20 ? `(Top 20 of ${purchaseHistory.length})` : ''}</Text>
					{topProducts.length > 0 ? (
						<View style={styles.tableContainer}>
							<View style={styles.tableHeader}>
								<Text style={[styles.tableCellHeader, styles.colProduct]}>Product</Text>
								<Text style={[styles.tableCellHeader, styles.colPurchased]}>Units</Text>
								<Text style={[styles.tableCellHeader, styles.colShipped]}>Shipped</Text>
								<Text style={[styles.tableCellHeader, styles.colPending]}>Pending</Text>
								<Text style={[styles.tableCellHeader, styles.colOrders]}>Orders</Text>
								<Text style={[styles.tableCellHeader, styles.colLastPurchase]}>Last Order</Text>
								<Text style={[styles.tableCellHeader, styles.colStatus]}>Status</Text>
							</View>
							{topProducts.map((product, index) => {
								const percentShipped = product.total_purchased > 0 
									? Math.round((product.total_shipped / product.total_purchased) * 100)
									: 100
								return (
									<View 
										key={product.product_id} 
										style={[
											styles.tableRow,
											index % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd
										]}
									>
										<Text style={[styles.tableCell, styles.tableCellBold, styles.colProduct]}>
											{product.product_name.substring(0, 25)}{product.product_name.length > 25 ? '...' : ''}
										</Text>
										<Text style={[styles.tableCell, styles.colPurchased, styles.quantityPositive]}>
											{product.total_purchased}
										</Text>
										<Text style={[styles.tableCell, styles.colShipped, { color: '#4F46E5' }]}>
											{product.total_shipped}
										</Text>
										<Text style={[
											styles.tableCell, 
											styles.colPending,
											product.total_unshipped > 0 ? { color: '#D97706' } : { color: '#9CA3AF' }
										]}>
											{product.total_unshipped}
										</Text>
										<Text style={[styles.tableCell, styles.colOrders]}>
											{product.purchase_count}
										</Text>
										<Text style={[styles.tableCell, styles.colLastPurchase]}>
											{format(new Date(product.last_purchase_date), 'MMM d, yyyy')}
										</Text>
										<View style={styles.colStatus}>
											<Text style={[styles.statusBadge, getStatusBadgeStyle(product.total_unshipped, product.total_shipped)]}>
												{getStatusText(product.total_unshipped, product.total_shipped)}
											</Text>
										</View>
									</View>
								)
							})}
						</View>
					) : (
						<View style={styles.emptyState}>
							<Text style={styles.emptyText}>No purchase history found</Text>
						</View>
					)}
				</View>
				
				{/* Footer */}
				<View style={styles.footer} fixed>
					<Text style={styles.footerText}>Client Purchase History Report - {client.name}</Text>
					<Text style={styles.footerPage}>Page 1</Text>
				</View>
			</Page>
			
			{/* Page 2: Detailed Product Breakdown */}
			{purchaseHistory.length > 0 && (
				<Page size="A4" style={styles.page}>
					<View style={styles.section}>
						<Text style={styles.sectionTitle}>Product Variant Details (Top 10 Products)</Text>
						
						{purchaseHistory.slice(0, 10).map((product, productIndex) => (
							<View key={product.product_id} style={styles.productCard}>
								<View style={styles.productCardHeader}>
									<Text style={styles.productCardTitle}>
										{productIndex + 1}. {product.product_name}
									</Text>
									<View style={styles.productCardStats}>
										<View style={styles.productCardStat}>
											<Text style={styles.productCardStatValue}>{product.total_purchased}</Text>
											<Text style={styles.productCardStatLabel}>Units</Text>
										</View>
										<View style={styles.productCardStat}>
											<Text style={[styles.productCardStatValue, { color: '#059669' }]}>{product.total_shipped}</Text>
											<Text style={styles.productCardStatLabel}>Shipped</Text>
										</View>
										{product.total_unshipped > 0 && (
											<View style={styles.productCardStat}>
												<Text style={[styles.productCardStatValue, { color: '#D97706' }]}>{product.total_unshipped}</Text>
												<Text style={styles.productCardStatLabel}>Pending</Text>
											</View>
										)}
									</View>
								</View>
								
								{/* Variants Table */}
								<View style={[styles.tableContainer, { marginBottom: 0 }]}>
									<View style={[styles.tableHeader, { paddingVertical: 6 }]}>
										<Text style={[styles.tableCellHeader, styles.colVariant]}>Variant</Text>
										<Text style={[styles.tableCellHeader, styles.colVarQty]}>Qty</Text>
										<Text style={[styles.tableCellHeader, styles.colVarShipped]}>Shipped</Text>
										<Text style={[styles.tableCellHeader, styles.colVarPending]}>Pending</Text>
										<Text style={[styles.tableCellHeader, styles.colVarStatus]}>Status</Text>
									</View>
									{product.variants.slice(0, 5).map((variant, varIndex) => (
										<View 
											key={`${product.product_id}-${varIndex}`}
											style={[
												styles.tableRow,
												{ paddingVertical: 5, minHeight: 24 },
												varIndex % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd
											]}
										>
											<Text style={[styles.tableCell, styles.colVariant]}>
												{variant.size} / {variant.color}
											</Text>
											<Text style={[styles.tableCell, styles.tableCellBold, styles.colVarQty]}>
												{variant.quantity}
											</Text>
											<Text style={[styles.tableCell, styles.colVarShipped, { color: '#059669' }]}>
												{variant.shipped}
											</Text>
											<Text style={[
												styles.tableCell, 
												styles.colVarPending,
												variant.unshipped > 0 ? { color: '#D97706' } : { color: '#9CA3AF' }
											]}>
												{variant.unshipped}
											</Text>
											<View style={styles.colVarStatus}>
												<Text style={[styles.statusBadge, getStatusBadgeStyle(variant.unshipped, variant.shipped)]}>
													{getStatusText(variant.unshipped, variant.shipped)}
												</Text>
											</View>
										</View>
									))}
									{product.variants.length > 5 && (
										<View style={[styles.tableRow, { paddingVertical: 4, minHeight: 20 }]}>
											<Text style={[styles.tableCell, { fontSize: 8, color: '#6B7280', fontStyle: 'italic' }]}>
												+ {product.variants.length - 5} more variant(s)
											</Text>
										</View>
									)}
								</View>
							</View>
						))}
						
						{purchaseHistory.length > 10 && (
							<Text style={{ fontSize: 9, color: '#6B7280', marginTop: 10, fontStyle: 'italic' }}>
								Note: Showing top 10 products by quantity. Total products: {purchaseHistory.length}
							</Text>
						)}
					</View>
					
					{/* Footer */}
					<View style={styles.footer} fixed>
						<Text style={styles.footerText}>Client Purchase History Report - {client.name}</Text>
						<Text style={styles.footerPage}>Page 2</Text>
					</View>
				</Page>
			)}
		</Document>
	)
}

export default ClientHistoryPDF
