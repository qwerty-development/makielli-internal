'use client'
import Navbar from '@/components/Navbar'
import { SignedIn, SignedOut, SignInButton } from '@clerk/nextjs'
import Image from 'next/image'
import Link from 'next/link'
import {
	FaUsers,
	FaBoxes,
	FaTruck,
	FaFileInvoiceDollar,
	FaShoppingCart,
	FaReceipt,
	FaChartLine,
	FaArrowRight,
} from 'react-icons/fa'

interface NavCard {
	href: string
	icon: React.ReactNode
	title: string
	description: string
	color: string
	gradient: string
}

export default function Home() {
	const navCards: NavCard[] = [
		{
			href: '/clients',
			icon: <FaUsers className='w-8 h-8' />,
			title: 'Clients',
			description: 'Manage your client database and relationships',
			color: 'from-primary-500 to-primary-600',
			gradient: 'group-hover:from-primary-600 group-hover:to-primary-700',
		},
		{
			href: '/inventory',
			icon: <FaBoxes className='w-8 h-8' />,
			title: 'Inventory',
			description: 'Control and track your product inventory',
			color: 'from-secondary-500 to-secondary-600',
			gradient: 'group-hover:from-secondary-600 group-hover:to-secondary-700',
		},
		{
			href: '/suppliers',
			icon: <FaTruck className='w-8 h-8' />,
			title: 'Suppliers',
			description: 'Manage your supplier relationships',
			color: 'from-info-500 to-info-600',
			gradient: 'group-hover:from-info-600 group-hover:to-info-700',
		},
		{
			href: '/invoices',
			icon: <FaFileInvoiceDollar className='w-8 h-8' />,
			title: 'Invoices',
			description: 'Create and manage customer invoices',
			color: 'from-success-500 to-success-600',
			gradient: 'group-hover:from-success-600 group-hover:to-success-700',
		},
		{
			href: '/orders',
			icon: <FaShoppingCart className='w-8 h-8' />,
			title: 'Orders',
			description: 'Process and track customer orders',
			color: 'from-warning-500 to-warning-600',
			gradient: 'group-hover:from-warning-600 group-hover:to-warning-700',
		},
		{
			href: '/receipts',
			icon: <FaReceipt className='w-8 h-8' />,
			title: 'Receipts',
			description: 'Manage payment receipts and records',
			color: 'from-error-500 to-error-600',
			gradient: 'group-hover:from-error-600 group-hover:to-error-700',
		},
		{
			href: '/analytics',
			icon: <FaChartLine className='w-8 h-8' />,
			title: 'Analytics',
			description: 'View insights and business metrics',
			color: 'from-primary-600 to-secondary-600',
			gradient: 'group-hover:from-primary-700 group-hover:to-secondary-700',
		},
	]

	return (
		<main className='flex min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 flex-col items-center justify-center p-6 sm:p-12 lg:p-24'>
			<SignedOut>
				<div className='bg-white rounded-2xl shadow-strong p-8'>
					<SignInButton />
				</div>
			</SignedOut>
			<SignedIn>
				<div className='w-full max-w-7xl mx-auto'>
					{/* Header Section */}
					<div className='text-center mb-12 animate-fade-in'>
						<div className='mb-6 flex justify-center'>
							<Image
								src='/logo/logo.png'
								alt='Logo'
								width={200}
								height={200}
								className='w-auto h-32 sm:h-40 drop-shadow-lg'
							/>
						</div>
						<h1 className='text-4xl sm:text-5xl lg:text-6xl font-bold text-neutral-800 mb-4'>
							Welcome to Your{' '}
							<span className='gradient-text'>Management System</span>
						</h1>
						<p className='text-lg sm:text-xl text-neutral-600 max-w-2xl mx-auto'>
							Streamline your business operations with powerful tools for
							managing clients, inventory, and finances
						</p>
					</div>

					{/* Navigation Cards */}
					<div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'>
						{navCards.map((card, index) => (
							<Link
								key={card.href}
								href={card.href}
								className='group block animate-slide-up'
								style={{ animationDelay: `${index * 50}ms` }}
							>
								<div
									className={`
										relative overflow-hidden
										bg-white rounded-2xl shadow-soft
										border-2 border-neutral-200
										transition-all duration-300
										hover:shadow-strong hover:-translate-y-2
										hover:border-transparent
									`}
								>
									{/* Gradient Background on Hover */}
									<div
										className={`
											absolute inset-0 bg-gradient-to-br ${card.color}
											opacity-0 group-hover:opacity-100
											transition-opacity duration-300
										`}
									/>

									{/* Content */}
									<div className='relative p-8'>
										{/* Icon */}
										<div
											className={`
												inline-flex items-center justify-center
												w-16 h-16 rounded-xl
												bg-gradient-to-br ${card.color}
												text-white
												mb-4
												shadow-medium
												group-hover:scale-110
												transition-transform duration-300
											`}
										>
											{card.icon}
										</div>

										{/* Title */}
										<h2
											className='
												text-2xl font-bold mb-2
												text-neutral-800 group-hover:text-white
												transition-colors duration-300
											'
										>
											{card.title}
										</h2>

										{/* Description */}
										<p
											className='
												text-neutral-600 group-hover:text-white group-hover:text-opacity-90
												transition-colors duration-300
												mb-4
											'
										>
											{card.description}
										</p>

										{/* Arrow Icon */}
										<div
											className='
												flex items-center text-primary-500 group-hover:text-white
												font-medium transition-colors duration-300
											'
										>
											<span className='mr-2'>Get Started</span>
											<FaArrowRight className='w-4 h-4 group-hover:translate-x-1 transition-transform duration-300' />
										</div>
									</div>
								</div>
							</Link>
						))}
					</div>

					{/* Footer Info */}
					<div className='mt-12 text-center animate-fade-in'>
						<p className='text-neutral-600'>
							Select a section above to get started with your business
							management
						</p>
					</div>
				</div>
			</SignedIn>
		</main>
	)
}
