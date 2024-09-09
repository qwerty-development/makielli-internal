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
	const [error, setError] = useState<string | null>(null)
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
			setError(null)
		} catch (error) {
			console.error('Error fetching clients:', error)
			setError('Failed to fetch clients. Please try again later.')
			toast.error('Failed to fetch clients. Please try again later.')
		} finally {
			setIsLoading(false)
		}
	}

	const fetchCompanies = async () => {
		try {
			const companiesData = await clientFunctions.getAllCompanies()
			setCompanies(companiesData)
		} catch (error) {
			console.error('Error fetching companies:', error)
			toast.error('Failed to fetch companies. Please try again later.')
		}
	}

	const getCompanyName = (companyId: number) => {
		const company = companies.find(c => c.id === companyId)
		return company ? company.name : 'Unknown Company'
	}

	if (isLoading) {
		return <div className='text-center py-10 text-white'>Loading...</div>
	}

	if (error) {
		return <div className='text-center py-10 text-red-500'>Error: {error}</div>
	}

	return (
		<div className='p-8'>
			<h1 className='text-3xl text-black font-bold mb-6'>All Clients</h1>
			<div className='flex justify-between items-center mb-4'>
				<input
					type='text'
					placeholder='Search clients'
					value={searchTerm}
					onChange={e => setSearchTerm(e.target.value)}
					className='w-full mr-4 p-2 rounded bg-white text-black placeholder-gray border border-gray focus:outline-none focus:ring-2 focus:ring-gray'
				/>
				<select
					value={selectedCompany}
					onChange={e =>
						setSelectedCompany(e.target.value ? Number(e.target.value) : '')
					}
					className='p-2 border rounded bg-white text-black'>
					<option value=''>All Companies</option>
					{companies.map(company => (
						<option key={company.id} value={company.id}>
							{company.name}
						</option>
					))}
				</select>
			</div>
			<div className='bg-gray rounded-lg overflow-hidden'>
				<ul className='divide-y divide-white'>
					{filteredClients.map(client => (
						<li key={client.client_id}>
							<Link href={`/clients/details/${client.client_id}`}>
								<div className='block hover:bg-gray-600 p-4 transition duration-300'>
									<div className='flex items-center space-x-4'>
										<div className='flex-1 min-w-0'>
											<p className='text-lg font-medium text-white truncate'>
												{client.name}
											</p>
											<p className='text-sm text-white truncate'>
												Email: {client.email} | Phone: {client.phone}
											</p>
											<p className='text-sm text-white truncate'>
												Company: {getCompanyName(client.company_id)}
											</p>
										</div>
									</div>
								</div>
							</Link>
						</li>
					))}
				</ul>
			</div>
		</div>
	)
}
