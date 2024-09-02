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
					<SignedIn>
						<Navbar />
						{children}
					</SignedIn>
					<SignedOut>
						<RedirectToSignIn />
					</SignedOut>
				</body>
			</html>
		</ClerkProvider>
	)
}
