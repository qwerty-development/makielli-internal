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
				{quotation.products.map(
					(
						product: {
							product_variant_id:
								| string
								| number
								| bigint
								| boolean
								| React.ReactElement<
										any,
										string | React.JSXElementConstructor<any>
								  >
								| Iterable<React.ReactNode>
								| React.ReactPortal
								| Promise<React.AwaitedReactNode>
								| null
								| undefined
							quantity:
								| string
								| number
								| bigint
								| boolean
								| React.ReactElement<
										any,
										string | React.JSXElementConstructor<any>
								  >
								| Iterable<React.ReactNode>
								| React.ReactPortal
								| Promise<React.AwaitedReactNode>
								| null
								| undefined
						},
						index: React.Key | null | undefined
					) => (
						<View key={index} style={sharedStyles.row}>
							<Text style={sharedStyles.value}>
								ID: {product.product_variant_id}
							</Text>
							<Text style={sharedStyles.value}>
								Quantity: {product.quantity}
							</Text>
						</View>
					)
				)}
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
