export async function sendDocumentEmail(
	documentType,
	documentData,
	recipientEmail
) {
	try {
		const response = await fetch('/api/send-document-email', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ documentType, documentData, recipientEmail })
		})

		if (!response.ok) {
			throw new Error('Failed to send email')
		}

		const result = await response.json()
		return result
	} catch (error) {
		console.error('Error sending email:', error)
		throw error
	}
}
