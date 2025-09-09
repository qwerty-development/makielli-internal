/** @type {import('next').NextConfig} */
const nextConfig = {
	images: {
		remotePatterns: [
			{
				protocol: 'https',
				hostname: 'mzahpiboezkzqatgfnmo.supabase.co',
				port: '',
				pathname: '/storage/v1/object/public/**',
			},
		],
	},
	webpack: config => {
		config.resolve.alias = {
			...config.resolve.alias,
			'react-pdf$': 'react-pdf/dist/esm/entry.webpack'
		}

		// Exclude client-side modules from being bundled on the server
		config.externals = [...(config.externals || []), 'canvas', 'jsdom']

		return config
	},
	// Enable top-level await
	experimental: {
		esmExternals: 'loose'
	}
}

export default nextConfig
