import {
	ClerkProvider,
	RedirectToSignIn,
	SignInButton,
	SignedIn,
	SignedOut,
	UserButton
} from '@clerk/nextjs'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import Navbar from '@/components/Navbar'
export default function RootLayout({
	children
}: {
	children: React.ReactNode
}) {
	return (
		<ClerkProvider>
			<html lang='en'>
				<body>
					<Toaster position='top-center' />
					<div className='min-h-screen pt-20 lg:pt-24 bg-background'>
						<SignedIn>
							<Navbar />
							{children}
						</SignedIn>
						<SignedOut>
							<RedirectToSignIn />
						</SignedOut>
					</div>
				</body>
			</html>
		</ClerkProvider>
	)
}
