'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Navbar() {
	const pathname = usePathname()
	const isHomePage = pathname === '/'

	if (isHomePage) {
		return null
	}

	return (
		<nav className='bg-blue p-4'>
			<div className='container mx-auto flex justify-between items-center'>
				<Link href='/' className='text-white font-bold text-xl'>
					<img src='/logo/logo-white.png' width={100}></img>
				</Link>
				<div className='space-x-4'>
					<Link href='/clients' className='text-white hover:text-black'>
						Clients
					</Link>
					<Link href='/inventory' className='text-white hover:text-black'>
						Inventory
					</Link>
					<Link href='/suppliers' className='text-white hover:text-black'>
						Suppliers
					</Link>
					<Link href='/invoices' className='text-white hover:text-black'>
						Invoices
					</Link>
					<Link href='/receipts' className='text-white hover:text-black'>
						Receipts
					</Link>
					<Link href='/orders' className='text-white hover:text-black'>
						Orders
					</Link>
					<Link href='/analytics' className='text-white hover:text-black'>
						Analytics
					</Link>
				</div>
			</div>
		</nav>
	)
}
