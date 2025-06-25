'use cl'
import Navbar from '@/components/Navbar'
import { SignedIn, SignedOut, SignInButton } from '@clerk/nextjs'
import { Sign } from 'crypto'
import Image from 'next/image'
import Link from 'next/link'

export default function Home() {
	return (
		<main className='flex min-h-screen bg-gray flex-col items-center justify-center p-24 '>
			<SignedOut>
				<SignInButton />
			</SignedOut>
			<SignedIn>
				<div>
					<Image src='/logo/logo.png' alt='Logo' width={500} height={500} />
				</div>
				<h1 className='text-4xl text-white font-bold mb-8'>
					Welcome to Your Management System
				</h1>
				<div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
					<Link href='/clients'>
						<div className=' hover:bg-blue border border-white text-white font-bold py-8 px-6 rounded-lg text-center transition duration-300 ease-in-out transform hover:-translate-y-1 hover:scale-105'>
							<h2 className='text-2xl mb-2'>Clients</h2>
							<p>Manage your client database</p>
						</div>
					</Link>
					<Link href='/inventory'>
						<div className=' hover:bg-blue text-white border border-white font-bold py-8 px-6 rounded-lg text-center transition duration-300 ease-in-out transform hover:-translate-y-1 hover:scale-105'>
							<h2 className='text-2xl mb-2'>Inventory</h2>
							<p>Control your product inventory</p>
						</div>
					</Link>
					<Link href='/suppliers'>
						<div className=' hover:bg-blue text-white border border-white font-bold py-8 px-6 rounded-lg text-center transition duration-300 ease-in-out transform hover:-translate-y-1 hover:scale-105'>
							<h2 className='text-2xl mb-2'>Suppliers</h2>
							<p>Manage your supplier relationships</p>
						</div>
					</Link>
					<Link href='/invoices'>
						<div className=' hover:bg-blue text-white border border-white font-bold py-8 px-6 rounded-lg text-center transition duration-300 ease-in-out transform hover:-translate-y-1 hover:scale-105'>
							<h2 className='text-2xl mb-2'>Invoices</h2>
							<p>Manage your Invoices</p>
						</div>
					</Link>
					<Link href='/orders'>
						<div className=' hover:bg-blue text-white border border-white font-bold py-8 px-6 rounded-lg text-center transition duration-300 ease-in-out transform hover:-translate-y-1 hover:scale-105'>
							<h2 className='text-2xl mb-2'>Orders</h2>
							<p>Manage your Orders</p>
						</div>
					</Link>
					<Link href='/receipts'>
						<div className=' hover:bg-blue text-white border border-white font-bold py-8 px-6 rounded-lg text-center transition duration-300 ease-in-out transform hover:-translate-y-1 hover:scale-105'>
							<h2 className='text-2xl mb-2'>Receipts</h2>
							<p>Manage your Receipts</p>
						</div>
					</Link>
				</div>
			</SignedIn>
		</main>
	)
}
