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
	}
})
