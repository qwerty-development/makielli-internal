// utils/pdfTemplates/SharedStyles.ts
import { StyleSheet } from '@react-pdf/renderer'

export const colors = {
	black: '#000000',
	white: '#F1F1F1',
	gray: '#4C5B5C',
	blue: '#1E1E89'
}

export const sharedStyles = StyleSheet.create({
	page: {
		fontSize: 12,
		padding: 30,
		backgroundColor: colors.white
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 20,
		borderBottom: `2px solid ${colors.blue}`,
		paddingBottom: 10
	},
	logo: {
		width: 100,
		height: 'auto'
	},
	title: {
		fontSize: 24,
		fontWeight: 'bold',
		color: colors.blue
	},
	section: {
		margin: 10,
		padding: 10
	},
	sectionTitle: {
		fontSize: 16,
		fontWeight: 'bold',
		color: colors.blue,
		marginBottom: 10
	},
	row: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: 5
	},
	label: {
		fontWeight: 'bold',
		color: colors.gray
	},
	value: {
		color: colors.black
	},
	footer: {
		position: 'absolute',
		bottom: 30,
		left: 30,
		right: 30,
		textAlign: 'center',
		color: colors.gray,
		borderTop: `1px solid ${colors.gray}`,
		paddingTop: 10
	},
	productTable: {
		width: 'auto',
		borderStyle: 'solid',
		borderWidth: 1,
		borderRightWidth: 0,
		borderBottomWidth: 0
	},
	productTableRow: {
		margin: 'auto',
		flexDirection: 'row'
	},
	productTableHeader: {
		backgroundColor: colors.gray,
		color: colors.white,
		padding: 5,
		fontSize: 10,
		fontWeight: 'bold'
	},
	productTableCell: {
		margin: 'auto',
		padding: 5,
		fontSize: 10
	},
	productImage: {
		width: 30,
		height: 30,
		objectFit: 'cover'
	},
	productImageCol: {
		width: '15%',
		borderStyle: 'solid',
		borderWidth: 1,
		borderLeftWidth: 0,
		borderTopWidth: 0
	},
	productNameCol: {
		width: '25%',
		borderStyle: 'solid',
		borderWidth: 1,
		borderLeftWidth: 0,
		borderTopWidth: 0
	},
	productDetailsCol: {
		width: '25%',
		borderStyle: 'solid',
		borderWidth: 1,
		borderLeftWidth: 0,
		borderTopWidth: 0
	},
	productQuantityCol: {
		width: '15%',
		borderStyle: 'solid',
		borderWidth: 1,
		borderLeftWidth: 0,
		borderTopWidth: 0
	},
	productPriceCol: {
		width: '20%',
		borderStyle: 'solid',
		borderWidth: 1,
		borderLeftWidth: 0,
		borderTopWidth: 0
	},
	productImageContainer: {
		width: '15%',
		height: 40,
		borderStyle: 'solid',
		borderWidth: 1,
		borderLeftWidth: 0,
		borderTopWidth: 0,
		display: 'flex',
		justifyContent: 'center',
		alignItems: 'center'
	},

	productUnitPriceCol: {
		width: '15%',
		borderStyle: 'solid',
		borderWidth: 1,
		borderLeftWidth: 0,
		borderTopWidth: 0
	},
	productTotalPriceCol: {
		width: '15%',
		borderStyle: 'solid',
		borderWidth: 1,
		borderLeftWidth: 0,
		borderTopWidth: 0
	}
})
