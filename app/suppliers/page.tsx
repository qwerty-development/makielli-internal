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
	const [error, setError] = useState<string | null>(null)
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
			setError(null)
		} catch (error) {
			console.error('Error fetching suppliers:', error)
			setError('Failed to fetch suppliers. Please try again later.')
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
		return <div className='text-center py-10'>Loading...</div>
	}

	if (error) {
		return <div className='text-center py-10 text-red-500'>Error: {error}</div>
	}

	return (
		<div className='p-8'>
			<h1 className='text-3xl font-bold text-center mb-8'>
				Supplier Management
			</h1>

			<div className='mb-4 flex'>
				<input
					type='text'
					placeholder='Search suppliers...'
					value={searchQuery}
					onChange={e => setSearchQuery(e.target.value)}
					className='w-full p-2 border rounded'
				/>
				<button
					onClick={() => setShowModal(true)}
					className='ml-2 bg-blue hover:bg-black text-white font-bold h-full px-5 py-3 rounded-full'>
					<FaPlus />
				</button>
			</div>

			<div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6'>
				{filteredSuppliers.map(supplier => (
					<Link href={`/suppliers/${supplier.id}`} key={supplier.id}>
						<div className='bg-gray rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow duration-200'>
							<h2 className='text-xl text-white font-semibold mb-2'>
								{supplier.name}
							</h2>
							<p className='text-white mb-2'>Location: {supplier.location}</p>
							<p className='text-white mb-2'>Phone: {supplier.phone}</p>
							<p className='text-white mb-4'>
								Balance: ${supplier.balance.toFixed(2)}
							</p>
						</div>
					</Link>
				))}
			</div>

			{showModal && (
				<div
					className='fixed z-10 inset-0 overflow-y-auto'
					aria-labelledby='modal-title'
					role='dialog'
					aria-modal='true'>
					<div className='flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0'>
						<div
							className='fixed inset-0 bg-gray bg-opacity-75 transition-opacity'
							aria-hidden='true'></div>
						<span
							className='hidden sm:inline-block sm:align-middle sm:h-screen'
							aria-hidden='true'>
							&#8203;
						</span>
						<div className='inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full'>
							<div className='bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4'>
								<div className='sm:flex sm:items-start'>
									<div className='mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full'>
										<h3
											className='text-lg leading-6 font-medium text-gray'
											id='modal-title'>
											Create New Supplier
										</h3>
										<div className='mt-2'>
											<form onSubmit={handleCreateSupplier}>
												<input
													type='text'
													placeholder='Name'
													value={newSupplier.name}
													onChange={e =>
														setNewSupplier({
															...newSupplier,
															name: e.target.value
														})
													}
													className='w-full p-2 mb-2 border rounded'
													required
												/>
												<input
													type='text'
													placeholder='Location'
													value={newSupplier.location}
													onChange={e =>
														setNewSupplier({
															...newSupplier,
															location: e.target.value
														})
													}
													className='w-full p-2 mb-2 border rounded'
													required
												/>
												<input
													type='email'
													placeholder='Email'
													value={newSupplier.email}
													onChange={e =>
														setNewSupplier({
															...newSupplier,
															email: e.target.value
														})
													}
													className='w-full p-2 mb-2 border rounded'
													required
												/>
												<input
													type='tel'
													placeholder='Phone'
													value={newSupplier.phone}
													onChange={e =>
														setNewSupplier({
															...newSupplier,
															phone: e.target.value
														})
													}
													className='w-full p-2 mb-2 border rounded'
													required
												/>
												<input
													type='number'
													placeholder='Initial Balance'
													value={newSupplier.balance}
													onChange={e =>
														setNewSupplier({
															...newSupplier,
															balance: parseFloat(e.target.value)
														})
													}
													className='w-full p-2 mb-2 border rounded'
													required
												/>
												<select
													value={newSupplier.company_id}
													onChange={e =>
														setNewSupplier({
															...newSupplier,
															company_id: Number(e.target.value)
														})
													}
													className='w-full p-2 mb-2 border rounded'
													required>
													<option value=''>Select a company</option>
													{companies.map(company => (
														<option key={company.id} value={company.id}>
															{company.name}
														</option>
													))}
												</select>
												<div className='mt-4 flex justify-end'>
													<button
														type='button'
														className='mr-2 inline-flex justify-center rounded-md border border-gray shadow-sm px-4 py-2 bg-white text-base font-medium text-gray hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm'
														onClick={() => setShowModal(false)}>
														Cancel
													</button>
													<button
														type='submit'
														className='inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm'>
														Create
													</button>
												</div>
											</form>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}
