import React from 'react'
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer'
import { sharedStyles, colors } from './SharedStyles'

const styles = StyleSheet.create({
	...sharedStyles,
	table: {
		width: 'auto',
		borderStyle: 'solid',
		borderWidth: 1,
		borderRightWidth: 0,
		borderBottomWidth: 0
	},
	tableRow: {
		margin: 'auto',
		flexDirection: 'row'
	},
	tableCol: {
		width: '25%',
		borderStyle: 'solid',
		borderWidth: 1,
		borderLeftWidth: 0,
		borderTopWidth: 0
	},
	tableCell: {
		margin: 'auto',
		marginTop: 5,
		fontSize: 10
	}
})

const SupplierFinancialReportPDF: React.FC<{
	supplierName: string
	financialData: any[]
}> = ({ supplierName, financialData }) => (
	<Document>
		<Page size='A4' style={styles.page}>
			<View style={styles.header}>
				<Text style={styles.title}>Financial Report for {supplierName}</Text>
			</View>
			<View style={styles.section}>
				<View style={styles.table}>
					<View style={styles.tableRow}>
						<View style={styles.tableCol}>
							<Text style={styles.tableCell}>Date</Text>
						</View>
						<View style={styles.tableCol}>
							<Text style={styles.tableCell}>Type</Text>
						</View>
						<View style={styles.tableCol}>
							<Text style={styles.tableCell}>ID</Text>
						</View>
						<View style={styles.tableCol}>
							<Text style={styles.tableCell}>Amount</Text>
						</View>
					</View>
					{financialData.map((item, index) => (
						<View style={styles.tableRow} key={index}>
							<View style={styles.tableCol}>
								<Text style={styles.tableCell}>
									{new Date(item.date).toLocaleDateString()}
								</Text>
							</View>
							<View style={styles.tableCol}>
								<Text style={styles.tableCell}>{item.type}</Text>
							</View>
							<View style={styles.tableCol}>
								<Text style={styles.tableCell}>{item.id}</Text>
							</View>
							<View style={styles.tableCol}>
								<Text style={styles.tableCell}>${item.amount.toFixed(2)}</Text>
							</View>
						</View>
					))}
				</View>
			</View>
			<Text style={styles.footer}>End of Financial Report</Text>
		</Page>
	</Document>
)

export default SupplierFinancialReportPDF
