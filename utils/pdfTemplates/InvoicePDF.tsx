import React from 'react'
import { Page, Text, View, Document, Image } from '@react-pdf/renderer'
import { sharedStyles, colors } from './SharedStyles'

const InvoicePDF: React.FC<{ invoice: any }> = ({ invoice }) => (
	<Document>
		<Page size='A4' style={sharedStyles.page}>
			<View style={sharedStyles.header}>
				<Image src='/logo/logo.png' style={sharedStyles.logo} />
				<Text style={sharedStyles.title}>Invoice</Text>
			</View>
			<View style={sharedStyles.section}>
				<Text style={sharedStyles.sectionTitle}>Invoice Details</Text>
				<View style={sharedStyles.row}>
					<Text style={sharedStyles.label}>Invoice ID:</Text>
					<Text style={sharedStyles.value}>{invoice.id}</Text>
				</View>
				<View style={sharedStyles.row}>
					<Text style={sharedStyles.label}>Date:</Text>
					<Text style={sharedStyles.value}>
						{new Date(invoice.created_at).toLocaleDateString()}
					</Text>
				</View>
				<View style={sharedStyles.row}>
					<Text style={sharedStyles.label}>Total Price:</Text>
					<Text style={sharedStyles.value}>
						${invoice.total_price.toFixed(2)}
					</Text>
				</View>
				<View style={sharedStyles.row}>
					<Text style={sharedStyles.label}>Remaining Amount:</Text>
					<Text style={sharedStyles.value}>
						${invoice.remaining_amount.toFixed(2)}
					</Text>
				</View>
			</View>
			<View style={sharedStyles.section}>
				<Text style={sharedStyles.sectionTitle}>Products</Text>
				{invoice.products.map(
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
				<Text style={sharedStyles.value}>{invoice.note}</Text>
			</View>
			<Text style={sharedStyles.footer}>Thank you for your business!</Text>
		</Page>
	</Document>
)

export default InvoicePDF
