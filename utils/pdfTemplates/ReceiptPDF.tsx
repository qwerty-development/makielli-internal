import React from 'react'
import { Page, Text, View, Document, Image } from '@react-pdf/renderer'

import { sharedStyles, colors } from './SharedStyles'

const ReceiptPDF: React.FC<{ receipt: any }> = ({ receipt }) => (
	<Document>
		<Page size='A4' style={sharedStyles.page}>
			<View style={sharedStyles.header}>
				<Image src='/logo/logo.png' style={sharedStyles.logo} />
				<Text style={sharedStyles.title}>Receipt</Text>
			</View>
			<View style={sharedStyles.section}>
				<Text style={sharedStyles.sectionTitle}>Receipt Details</Text>
				<View style={sharedStyles.row}>
					<Text style={sharedStyles.label}>Receipt ID:</Text>
					<Text style={sharedStyles.value}>{receipt.id}</Text>
				</View>
				<View style={sharedStyles.row}>
					<Text style={sharedStyles.label}>Date:</Text>
					<Text style={sharedStyles.value}>
						{new Date(receipt.paid_at).toLocaleDateString()}
					</Text>
				</View>
				<View style={sharedStyles.row}>
					<Text style={sharedStyles.label}>Amount:</Text>
					<Text style={sharedStyles.value}>${receipt.amount.toFixed(2)}</Text>
				</View>
				<View style={sharedStyles.row}>
					<Text style={sharedStyles.label}>Invoice ID:</Text>
					<Text style={sharedStyles.value}>{receipt.invoice_id}</Text>
				</View>
			</View>
			<Text style={sharedStyles.footer}>Thank you for your payment!</Text>
		</Page>
	</Document>
)

export default ReceiptPDF
