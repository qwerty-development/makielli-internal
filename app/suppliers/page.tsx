'use client'
import React, { useState, useEffect } from 'react'
import { supplierFunctions, Supplier } from '../../utils/functions/suppliers'
import Link from 'next/link'
import { toast } from 'react-hot-toast'
import { FaPlus, FaTimes } from 'react-icons/fa'

interface Company {
	id: number
	name: string
}

export default function SuppliersPage() {
	const [suppliers, setSuppliers] = useState<Supplier[]>([])
	const [filteredSuppliers, setFilteredSuppliers] = useState<Supplier[]>([])
	const [companies, setCompanies] = useState<Company[]>([])
	const [isLoading, setIsLoading] = useState(true)

	const [searchQuery, setSearchQuery] = useState('')
	const [showModal, setShowModal] = useState(false)
	const [newSupplier, setNewSupplier] = useState<Omit<Supplier, 'id'>>({
		name: '',
		location: '',
		phone: '',
		balance: 0,
		email: '',
		company_id: 0
	})

	useEffect(() => {
		fetchSuppliers()
		fetchCompanies()
	}, [])

	useEffect(() => {
		const filtered = suppliers.filter(
			supplier =>
				supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
				supplier.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
				supplier.phone.includes(searchQuery)
		)
		setFilteredSuppliers(filtered)
	}, [searchQuery, suppliers])

	const fetchSuppliers = async () => {
		try {
			setIsLoading(true)
			const suppliersData = await supplierFunctions.getAllSuppliers()
			setSuppliers(suppliersData)
			setFilteredSuppliers(suppliersData)

		} catch (error:any) {
			console.error('Error fetching suppliers:', error)
      toast.error('Failed to fetch suppliers. Please try again later.'+error.message)
		} finally {
			setIsLoading(false)
		}
	}

	const fetchCompanies = async () => {
		try {
			const companiesData = await supplierFunctions.getAllCompanies()
			setCompanies(companiesData)
		} catch (error) {
			console.error('Error fetching companies:', error)
			toast.error('Failed to fetch companies. Please try again later.')
		}
	}

	const handleCreateSupplier = async (e: React.FormEvent) => {
		e.preventDefault()
		try {
			await supplierFunctions.addSupplier(newSupplier)
			setShowModal(false)
			setNewSupplier({
				name: '',
				location: '',
				phone: '',
				balance: 0,
				email: '',
				company_id: 0
			})
			fetchSuppliers()
			toast.success('Supplier created successfully!')
		} catch (error) {
			console.error('Error creating supplier:', error)
			toast.error('Failed to create supplier. Please try again.')
		}
	}

	if (isLoading) {
		return (
			<div className='flex items-center justify-center min-h-screen'>
				<div className='text-center'>
					<div className='inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mb-4'></div>
					<p className='text-neutral-600 font-medium'>Loading suppliers...</p>
				</div>
			</div>
		)
	}



	return (
		<div className='min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 p-6 sm:p-8'>
			<div className='max-w-7xl mx-auto'>
				<div className='mb-8 animate-fade-in'>
					<h1 className='text-4xl font-bold text-neutral-800 mb-2'>
						Supplier Management
					</h1>
					<p className='text-neutral-600'>Manage your supplier relationships and inventory sources</p>
				</div>

				<div className='flex flex-col sm:flex-row gap-3 mb-8'>
					<div className='relative flex-1'>
						<input
							type='text'
							placeholder='Search suppliers by name, location, or phone...'
							value={searchQuery}
							onChange={e => setSearchQuery(e.target.value)}
							className='input pl-10 w-full'
						/>
						<svg
							className='absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-neutral-400'
							fill='none'
							stroke='currentColor'
							viewBox='0 0 24 24'>
							<path
								strokeLinecap='round'
								strokeLinejoin='round'
								strokeWidth={2}
								d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'
							/>
						</svg>
					</div>
					<button
						onClick={() => setShowModal(true)}
						className='btn-primary flex items-center gap-2'>
						<FaPlus />
						<span>Add Supplier</span>
					</button>
				</div>

				{filteredSuppliers.length === 0 ? (
					<div className='empty-state'>
						<div className='inline-flex items-center justify-center w-20 h-20 rounded-full bg-neutral-100 text-neutral-400 mb-4'>
							<svg className='w-10 h-10' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
								<path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4' />
							</svg>
						</div>
						<h3 className='text-xl font-semibold text-neutral-800 mb-2'>No suppliers found</h3>
						<p className='text-neutral-600 mb-6'>
							{searchQuery ? 'Try a different search term' : 'Add your first supplier to get started'}
						</p>
						{!searchQuery && (
							<button onClick={() => setShowModal(true)} className='btn-primary'>
								Add Supplier
							</button>
						)}
					</div>
				) : (
					<div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'>
						{filteredSuppliers.map(supplier => (
							<Link href={`/suppliers/${supplier.id}`} key={supplier.id}>
								<div className='card-hover p-6 group cursor-pointer'>
									<div className='flex items-center justify-between mb-4'>
										<div className='w-12 h-12 rounded-lg bg-secondary-100 flex items-center justify-center group-hover:bg-secondary-500 transition-colors duration-300'>
											<svg className='w-6 h-6 text-secondary-600 group-hover:text-white transition-colors duration-300' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
												<path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4' />
											</svg>
										</div>
										<svg className='w-5 h-5 text-neutral-400 group-hover:text-primary-500 group-hover:translate-x-1 transition-all duration-300' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
											<path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5l7 7-7 7' />
										</svg>
									</div>
									<h2 className='text-xl font-bold text-neutral-800 group-hover:text-primary-600 transition-colors duration-300 mb-3'>
										{supplier.name}
									</h2>
									<div className='space-y-2 text-sm text-neutral-600'>
										<div className='flex items-center'>
											<svg className='w-4 h-4 mr-2 text-neutral-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
												<path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z' />
												<path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 11a3 3 0 11-6 0 3 3 0 016 0z' />
											</svg>
											<span>{supplier.location}</span>
										</div>
										<div className='flex items-center'>
											<svg className='w-4 h-4 mr-2 text-neutral-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
												<path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z' />
											</svg>
											<span>{supplier.phone}</span>
										</div>
										<div className='flex items-center justify-between pt-2 border-t border-neutral-200'>
											<span className='font-medium text-neutral-700'>Balance:</span>
											<span className={`font-bold ${supplier.balance < 0 ? 'text-error-600' : supplier.balance > 0 ? 'text-success-600' : 'text-neutral-600'}`}>
												${supplier.balance.toFixed(2)}
											</span>
										</div>
									</div>
								</div>
							</Link>
						))}
					</div>
				)}
			</div>

				{showModal && (
				<div
					className='modal-overlay'
					onClick={(e) => {
						if (e.target === e.currentTarget) {
							setShowModal(false)
						}
					}}>
					<div className='modal-content max-w-2xl'>
						<div className='flex items-center justify-between p-6 border-b border-neutral-200'>
							<h2 className='text-2xl font-bold text-neutral-800'>Create New Supplier</h2>
							<button
								onClick={() => setShowModal(false)}
								className='p-2 rounded-lg hover:bg-neutral-100 transition-colors text-neutral-500 hover:text-neutral-700'>
								<FaTimes className='w-5 h-5' />
							</button>
						</div>
						<form onSubmit={handleCreateSupplier} className='p-6'>
							<div className='grid grid-cols-1 md:grid-cols-2 gap-4 mb-6'>
								<div>
									<label className='block text-sm font-medium text-neutral-700 mb-2'>
										Supplier Name *
									</label>
									<input
										type='text'
										placeholder='Enter supplier name'
										value={newSupplier.name}
										onChange={e =>
											setNewSupplier({
												...newSupplier,
												name: e.target.value
											})
										}
										className='input'
										required
									/>
								</div>
								<div>
									<label className='block text-sm font-medium text-neutral-700 mb-2'>
										Location *
									</label>
									<input
										type='text'
										placeholder='City, Country'
										value={newSupplier.location}
										onChange={e =>
											setNewSupplier({
												...newSupplier,
												location: e.target.value
											})
										}
										className='input'
										required
									/>
								</div>
								<div>
									<label className='block text-sm font-medium text-neutral-700 mb-2'>
										Email *
									</label>
									<input
										type='email'
										placeholder='supplier@example.com'
										value={newSupplier.email}
										onChange={e =>
											setNewSupplier({
												...newSupplier,
												email: e.target.value
											})
										}
										className='input'
										required
									/>
								</div>
								<div>
									<label className='block text-sm font-medium text-neutral-700 mb-2'>
										Phone *
									</label>
									<input
										type='tel'
										placeholder='+1 (555) 000-0000'
										value={newSupplier.phone}
										onChange={e =>
											setNewSupplier({
												...newSupplier,
												phone: e.target.value
											})
										}
										className='input'
										required
									/>
								</div>
								<div>
									<label className='block text-sm font-medium text-neutral-700 mb-2'>
										Initial Balance
									</label>
									<input
										type='number'
										step='0.01'
										placeholder='0.00'
										value={newSupplier.balance}
										onChange={e =>
											setNewSupplier({
												...newSupplier,
												balance: parseFloat(e.target.value)
											})
										}
										className='input'
										required
									/>
								</div>
								<div>
									<label className='block text-sm font-medium text-neutral-700 mb-2'>
										Company *
									</label>
									<select
										value={newSupplier.company_id}
										onChange={e =>
											setNewSupplier({
												...newSupplier,
												company_id: Number(e.target.value)
											})
										}
										className='input'
										required>
										<option value=''>Select a company</option>
										{companies.map(company => (
											<option key={company.id} value={company.id}>
												{company.name}
											</option>
										))}
									</select>
								</div>
							</div>
							<div className='flex gap-3 justify-end'>
								<button
									type='button'
									className='btn-ghost'
									onClick={() => setShowModal(false)}>
									Cancel
								</button>
								<button type='submit' className='btn-primary'>
									Create Supplier
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	)
}
