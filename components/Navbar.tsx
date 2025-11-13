'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { FaBars, FaTimes } from 'react-icons/fa'

export default function Navbar() {
	const pathname = usePathname()
	const isHomePage = pathname === '/'
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

	if (isHomePage) {
		return null
	}

	const navLinks = [
		{ href: '/clients', label: 'Clients' },
		{ href: '/inventory', label: 'Inventory' },
		{ href: '/suppliers', label: 'Suppliers' },
		{ href: '/invoices', label: 'Invoices' },
		{ href: '/receipts', label: 'Receipts' },
		{ href: '/orders', label: 'Orders' },
		{ href: '/analytics', label: 'Analytics' },
	]

	const isActive = (href: string) => {
		if (href === '/clients') {
			return pathname.startsWith('/clients')
		}
		if (href === '/inventory') {
			return pathname.startsWith('/inventory') || pathname.startsWith('/products')
		}
		if (href === '/suppliers') {
			return pathname.startsWith('/suppliers')
		}
		if (href === '/invoices') {
			return pathname.startsWith('/invoices')
		}
		if (href === '/receipts') {
			return pathname.startsWith('/receipts')
		}
		if (href === '/orders') {
			return pathname.startsWith('/orders')
		}
		if (href === '/analytics') {
			return pathname.startsWith('/analytics')
		}
		return false
	}

	return (
		<nav className='bg-gradient-primary shadow-medium sticky top-0 z-40'>
			<div className='container mx-auto px-4'>
				<div className='flex justify-between items-center h-16'>
					{/* Logo */}
					<Link
						href='/'
						className='flex items-center space-x-2 hover:opacity-90 transition-opacity'
					>
						<img
							src='/logo/logo-white.png'
							alt='Logo'
							width={100}
							height={40}
							className='h-10 w-auto'
						/>
					</Link>

					{/* Desktop Navigation */}
					<div className='hidden md:flex items-center space-x-1'>
						{navLinks.map((link) => (
							<Link
								key={link.href}
								href={link.href}
								className={`
									px-4 py-2 rounded-lg font-medium text-sm
									transition-all duration-200
									${
										isActive(link.href)
											? 'bg-white bg-opacity-20 text-white shadow-soft'
											: 'text-white text-opacity-90 hover:bg-white hover:bg-opacity-10 hover:text-white'
									}
								`}
							>
								{link.label}
							</Link>
						))}
					</div>

					{/* Mobile Menu Button */}
					<button
						onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
						className='md:hidden text-white p-2 rounded-lg hover:bg-white hover:bg-opacity-10 transition-colors'
						aria-label='Toggle menu'
					>
						{isMobileMenuOpen ? (
							<FaTimes className='w-6 h-6' />
						) : (
							<FaBars className='w-6 h-6' />
						)}
					</button>
				</div>

				{/* Mobile Navigation */}
				{isMobileMenuOpen && (
					<div className='md:hidden pb-4 animate-slide-down'>
						<div className='flex flex-col space-y-2'>
							{navLinks.map((link) => (
								<Link
									key={link.href}
									href={link.href}
									onClick={() => setIsMobileMenuOpen(false)}
									className={`
										px-4 py-3 rounded-lg font-medium text-sm
										transition-all duration-200
										${
											isActive(link.href)
												? 'bg-white bg-opacity-20 text-white shadow-soft'
												: 'text-white text-opacity-90 hover:bg-white hover:bg-opacity-10 hover:text-white'
										}
									`}
								>
									{link.label}
								</Link>
							))}
						</div>
					</div>
				)}
			</div>
		</nav>
	)
}
