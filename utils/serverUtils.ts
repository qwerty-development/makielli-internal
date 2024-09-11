// utils/serverUtils.ts
import fs from 'fs'
import path from 'path'

let logoBase64: string | null = null

export function getLogoBase64() {
	if (logoBase64) return logoBase64

	const logoPath = path.join(process.cwd(), 'public', 'logo', 'logo.png')
	const logoBuffer = fs.readFileSync(logoPath)
	logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`

	return logoBase64
}
