'use client'

import React, { useState, useEffect } from 'react'
import {
	clientFunctions,
	Client,
	Company
} from '../../../utils/functions/clients'
import Link from 'next/link'
import { toast } from 'react-hot-toast'

export default function AllClientsPage() {
	const [clients, setClients] = useState<Client[]>([])
	const [companies, setCompanies] = useState<Company[]>([])
	const [filteredClients, setFilteredClients] = useState<Client[]>([])
	const [isLoading, setIsLoading] = useState(true)

	const [searchTerm, setSearchTerm] = useState('')
	const [selectedCompany, setSelectedCompany] = useState<number | ''>('') // State to filter by company

	useEffect(() => {
		fetchAllClients()
		fetchCompanies()
	}, [])

	useEffect(() => {
		// Filter clients based on search term and selected company
		const filtered = clients.filter(
			client =>
				(client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
					client.email.toLowerCase().includes(searchTerm.toLowerCase())) &&
				(selectedCompany === '' || client.company_id === selectedCompany)
		)
		setFilteredClients(filtered)
	}, [searchTerm, clients, selectedCompany])

	const fetchAllClients = async () => {
		try {
			setIsLoading(true)
			const clientsData = await clientFunctions.getAllClients()
			setClients(clientsData)
			setFilteredClients(clientsData)

		} catch (error:any) {
			console.error('Error fetching clients:', error)
			toast.error('Failed to fetch clients. Please try again later.'+ error.message)
		} finally {
			setIsLoading(false)
		}
	}

	const fetchCompanies = async () => {
		try {
			const companiesData = await clientFunctions.getAllCompanies()
			setCompanies(companiesData)
		} catch (error:any) {
			console.error('Error fetching companies:', error)
			toast.error('Failed to fetch companies. Please try again later.'+ error.message)
		}
	}

	const getCompanyName = (companyId: number) => {
		const company = companies.find(c => c.id === companyId)
		return company ? company.name : 'Unknown Company'
	}

	if (isLoading) {
		return (
			<div className='flex items-center justify-center min-h-screen'>
				<div className='text-center'>
					<div className='inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mb-4'></div>
					<p className='text-neutral-600 font-medium'>Loading clients...</p>
				</div>
			</div>
		)
	}


	return (
		<div className='min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 p-6 sm:p-8'>
			<div className='max-w-7xl mx-auto'>
				<div className='mb-8 animate-fade-in'>
					<div className='flex items-center justify-between mb-4'>
						<div>
							<h1 className='text-4xl font-bold text-neutral-800 mb-2'>All Clients</h1>
							<p className='text-neutral-600'>Browse and manage all clients across groups</p>
						</div>
						<Link href='/clients' className='btn-ghost'>
							← Back to Groups
						</Link>
					</div>
				</div>

				<div className='card p-6 mb-6'>
					<div className='flex flex-col sm:flex-row gap-4'>
						<div className='flex-1 relative'>
							<input
								type='text'
								placeholder='Search by name or email...'
								value={searchTerm}
								onChange={e => setSearchTerm(e.target.value)}
								className='input pl-10'
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
						<select
							value={selectedCompany}
							onChange={e =>
								setSelectedCompany(e.target.value ? Number(e.target.value) : '')
							}
							className='input sm:w-64'>
							<option value=''>All Companies</option>
							{companies.map(company => (
								<option key={company.id} value={company.id}>
									{company.name}
								</option>
							))}
						</select>
					</div>
					<div className='mt-4 text-sm text-neutral-600'>
						Showing {filteredClients.length} of {clients.length} clients
					</div>
				</div>

				{filteredClients.length === 0 ? (
					<div className='empty-state'>
						<div className='inline-flex items-center justify-center w-20 h-20 rounded-full bg-neutral-100 text-neutral-400 mb-4'>
							<svg className='w-10 h-10' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
								<path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' />
							</svg>
						</div>
						<h3 className='text-xl font-semibold text-neutral-800 mb-2'>No clients found</h3>
						<p className='text-neutral-600'>Try adjusting your search or filter criteria</p>
					</div>
				) : (
					<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
						{filteredClients.map(client => (
							<Link key={client.client_id} href={`/clients/details/${client.client_id}`}>
								<div className='card-hover p-6 group cursor-pointer'>
									<div className='flex items-start justify-between mb-3'>
										<div className='flex-1'>
											<h3 className='text-lg font-bold text-neutral-800 group-hover:text-primary-600 transition-colors duration-300 mb-1'>
												{client.name}
											</h3>
											<span className='inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-700'>
												{getCompanyName(client.company_id)}
											</span>
										</div>
										<svg className='w-5 h-5 text-neutral-400 group-hover:text-primary-500 group-hover:translate-x-1 transition-all duration-300' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
											<path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5l7 7-7 7' />
										</svg>
									</div>
									<div className='space-y-2 text-sm text-neutral-600'>
										<div className='flex items-center'>
											<svg className='w-4 h-4 mr-2 text-neutral-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
												<path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' />
											</svg>
											<span className='truncate'>{client.email}</span>
										</div>
										<div className='flex items-center'>
											<svg className='w-4 h-4 mr-2 text-neutral-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
												<path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z' />
											</svg>
											<span>{client.phone}</span>
										</div>
									</div>
								</div>
							</Link>
						))}
					</div>
				)}
			</div>
		</div>
	)
}
