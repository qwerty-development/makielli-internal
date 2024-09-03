'use client'

import React, { useState, useEffect } from 'react'
import { supplierFunctions, Supplier } from '../../utils/functions/suppliers'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { checkRoleAdmin } from '@/utils/checkRoleAdmin'

export default function SuppliersPage() {
	if (!checkRoleAdmin('admin')) {
		redirect('/')
	}
	const [suppliers, setSuppliers] = useState<Supplier[]>([])
	const [filteredSuppliers, setFilteredSuppliers] = useState<Supplier[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [searchQuery, setSearchQuery] = useState('')

	useEffect(() => {
		fetchSuppliers()
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
				<Link href='/suppliers/new' className='ml-2'>
					<button className='bg-blue hover:bg-black text-white font-bold h-full px-5 py-3 rounded-full'>
						+
					</button>
				</Link>
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
		</div>
	)
}
