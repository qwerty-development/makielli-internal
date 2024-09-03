// utils/pdfTemplates/QuotationPDF.tsx
import React from 'react'
import { Page, Text, View, Document, Image } from '@react-pdf/renderer'
import { sharedStyles, colors } from './SharedStyles'

const QuotationPDF: React.FC<{ quotation: any }> = ({ quotation }) => (
	<Document>
		<Page size='A4' style={sharedStyles.page}>
			<View style={sharedStyles.header}>
				<Image src='/logo/logo.png' style={sharedStyles.logo} />
				<Text style={sharedStyles.title}>Quotation</Text>
			</View>
			<View style={sharedStyles.section}>
				<Text style={sharedStyles.sectionTitle}>Quotation Details</Text>
				<View style={sharedStyles.row}>
					<Text style={sharedStyles.label}>Quotation ID:</Text>
					<Text style={sharedStyles.value}>{quotation.id}</Text>
				</View>
				<View style={sharedStyles.row}>
					<Text style={sharedStyles.label}>Date:</Text>
					<Text style={sharedStyles.value}>
						{new Date(quotation.created_at).toLocaleDateString()}
					</Text>
				</View>
				<View style={sharedStyles.row}>
					<Text style={sharedStyles.label}>Total Price:</Text>
					<Text style={sharedStyles.value}>
						${quotation.total_price.toFixed(2)}
					</Text>
				</View>
				<View style={sharedStyles.row}>
					<Text style={sharedStyles.label}>Status:</Text>
					<Text style={sharedStyles.value}>{quotation.status}</Text>
				</View>
			</View>
			<View style={sharedStyles.section}>
				<Text style={sharedStyles.sectionTitle}>Products</Text>
				<View style={sharedStyles.productTable}>
					<View style={sharedStyles.productTableRow}>
						<View style={sharedStyles.productImageContainer}>
							<Text style={sharedStyles.productTableHeader}>Image</Text>
						</View>
						<View style={sharedStyles.productNameCol}>
							<Text style={sharedStyles.productTableHeader}>Product</Text>
						</View>
						<View style={sharedStyles.productDetailsCol}>
							<Text style={sharedStyles.productTableHeader}>Details</Text>
						</View>
						<View style={sharedStyles.productQuantityCol}>
							<Text style={sharedStyles.productTableHeader}>Quantity</Text>
						</View>
						<View style={sharedStyles.productUnitPriceCol}>
							<Text style={sharedStyles.productTableHeader}>Unit Price</Text>
						</View>
						<View style={sharedStyles.productTotalPriceCol}>
							<Text style={sharedStyles.productTableHeader}>Total</Text>
						</View>
					</View>
					{quotation.products.map((product: any, index: number) => (
						<View key={index} style={sharedStyles.productTableRow}>
							<View style={sharedStyles.productImageContainer}>
								<Image
									style={sharedStyles.productImage}
									src={product.image || '/placeholder-image.png'}
								/>
							</View>
							<View style={sharedStyles.productNameCol}>
								<Text style={sharedStyles.productTableCell}>
									{product.name}
								</Text>
							</View>
							<View style={sharedStyles.productDetailsCol}>
								<Text style={sharedStyles.productTableCell}>
									{product.size} - {product.color}
								</Text>
							</View>
							<View style={sharedStyles.productQuantityCol}>
								<Text style={sharedStyles.productTableCell}>
									{product.quantity}
								</Text>
							</View>
							<View style={sharedStyles.productUnitPriceCol}>
								<Text style={sharedStyles.productTableCell}>
									${product.unitPrice.toFixed(2)}
								</Text>
							</View>
							<View style={sharedStyles.productTotalPriceCol}>
								<Text style={sharedStyles.productTableCell}>
									${(product.quantity * product.unitPrice).toFixed(2)}
								</Text>
							</View>
						</View>
					))}
				</View>
			</View>
			<View style={sharedStyles.section}>
				<Text style={sharedStyles.sectionTitle}>Note</Text>
				<Text style={sharedStyles.value}>{quotation.note}</Text>
			</View>
			<Text style={sharedStyles.footer}>
				Thank you for considering our services!
			</Text>
		</Page>
	</Document>
)

export default QuotationPDF
