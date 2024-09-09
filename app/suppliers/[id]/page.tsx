'use client'

import React, { useState, useEffect } from 'react'
import { supplierFunctions, Supplier } from '../../../utils/functions/suppliers'
import { supabase } from '../../../utils/supabase'
import { redirect, useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { FaSort, FaFile, FaDownload, FaInfoCircle } from 'react-icons/fa'
import { checkRoleAdmin } from '@/utils/checkRoleAdmin'
import { generatePDF } from '@/utils/pdfGenerator'

interface InvoiceProduct {
	product_variant_id: string
	quantity: number
	note: string
}

interface Invoice {
	id: number
	created_at: string
	total_price: number
	remaining_amount: number
	products: InvoiceProduct[]
	files: string[]
}

interface Receipt {
	id: number
	paid_at: string
	amount: number
	invoice_id: number
	files: string[]
}

export default function SupplierDetailsPage({
	params
}: {
	params: { id: string }
}) {
	if (!checkRoleAdmin('admin')) {
		redirect('/')
	}

	const [supplier, setSupplier] = useState<Supplier | null>(null)
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [isEditing, setIsEditing] = useState(false)
	const [invoices, setInvoices] = useState<Invoice[]>([])
	const [receipts, setReceipts] = useState<Receipt[]>([])
	const [activeTab, setActiveTab] = useState('details')
	const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
	const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null)
	const [sortField, setSortField] = useState<keyof Invoice | keyof Receipt>(
		'id'
	)
	const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
	const router = useRouter()

	useEffect(() => {
		fetchSupplier()
		fetchInvoices()
		fetchReceipts()
	}, [params.id])

	const fetchSupplier = async () => {
		try {
			setIsLoading(true)
			const supplierData = await supplierFunctions.getSupplierById(params.id)
			setSupplier(supplierData)
			setError(null)
		} catch (error) {
			console.error('Error fetching supplier:', error)
			setError('Failed to fetch supplier details. Please try again later.')
		} finally {
			setIsLoading(false)
		}
	}

	const fetchInvoices = async () => {
		try {
			const { data, error } = await supabase
				.from('SupplierInvoices')
				.select('*')
				.eq('supplier_id', params.id)
				.order(sortField as string, { ascending: sortOrder === 'asc' })

			if (error) throw error
			setInvoices(data || [])
		} catch (error) {
			console.error('Error fetching invoices:', error)
			setError('Failed to fetch invoices')
		}
	}

	const fetchReceipts = async () => {
		try {
			const { data, error } = await supabase
				.from('SupplierReceipts')
				.select('*')
				.eq('supplier_id', params.id)
				.order(sortField as string, { ascending: sortOrder === 'asc' })

			if (error) throw error
			setReceipts(data || [])
		} catch (error) {
			console.error('Error fetching receipts:', error)
			setError('Failed to fetch receipts')
		}
	}

	const handleUpdateSupplier = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!supplier) return
		try {
			await supplierFunctions.updateSupplier(supplier.id, supplier)
			setIsEditing(false)
			fetchSupplier()
			alert('Supplier updated successfully')
		} catch (error) {
			console.error('Error updating supplier:', error)
			setError('Failed to update supplier. Please try again.')
			alert('Failed to update supplier')
		}
	}

	const handleDeleteSupplier = async () => {
		if (window.confirm('Are you sure you want to delete this supplier?')) {
			try {
				await supplierFunctions.deleteSupplier(params.id)
				router.push('/suppliers')
			} catch (error) {
				console.error('Error deleting supplier:', error)
				setError('Failed to delete supplier. Please try again.')
			}
		}
	}

	const handleSort = (field: keyof Invoice | keyof Receipt) => {
		if (field === sortField) {
			setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
		} else {
			setSortField(field)
			setSortOrder('asc')
		}
		if (activeTab === 'invoices') {
			fetchInvoices()
		} else if (activeTab === 'receipts') {
			fetchReceipts()
		}
	}

	const handleInvoiceClick = (invoice: Invoice) => {
		setSelectedInvoice(invoice)
	}

	const handleReceiptClick = (receipt: Receipt) => {
		setSelectedReceipt(receipt)
	}

	if (isLoading) {
		return <div className='text-center py-10 text-black'>Loading...</div>
	}

	if (error) {
		return <div className='text-center py-10 text-black'>Error: {error}</div>
	}

	if (!supplier) {
		return (
			<div className='text-center py-10 text-black'>Supplier not found</div>
		)
	}

	return (
		<div className='p-8 bg-white text-black'>
			<h1 className='text-3xl font-bold mb-6'>Supplier Details</h1>
			<button
				onClick={() =>
					generatePDF('supplierFinancialReport', {
						supplierId: supplier.id,
						supplierName: supplier.name
					})
				}
				className='bg-blue hover:bg-black text-white font-bold py-2 px-4 rounded mr-2 mb-5'>
				Download Financial Report
			</button>
			<div className='mb-4'>
				<button
					onClick={() => setActiveTab('details')}
					className={`mr-2 px-4 py-2 rounded ${
						activeTab === 'details'
							? 'bg-blue text-white'
							: 'bg-gray text-white'
					}`}>
					Details
				</button>
				<button
					onClick={() => setActiveTab('invoices')}
					className={`mr-2 px-4 py-2 rounded ${
						activeTab === 'invoices'
							? 'bg-blue text-white'
							: 'bg-gray text-white'
					}`}>
					Invoices
				</button>
				<button
					onClick={() => setActiveTab('receipts')}
					className={`px-4 py-2 rounded ${
						activeTab === 'receipts'
							? 'bg-blue text-white'
							: 'bg-gray text-white'
					}`}>
					Receipts
				</button>
			</div>

			{activeTab === 'details' && (
				<div className='bg-gray text-white rounded-lg shadow-md p-6'>
					{isEditing ? (
						<form onSubmit={handleUpdateSupplier}>
							<div className='mb-4'>
								<label
									className='block text-white text-sm font-bold mb-2'
									htmlFor='name'>
									Name
								</label>
								<input
									type='text'
									id='name'
									value={supplier.name}
									onChange={e =>
										setSupplier({ ...supplier, name: e.target.value })
									}
									className='w-full p-2 border rounded text-black'
									required
								/>
							</div>
							<div className='mb-4'>
								<label
									className='block text-white text-sm font-bold mb-2'
									htmlFor='location'>
									Location
								</label>
								<input
									type='text'
									id='location'
									value={supplier.location}
									onChange={e =>
										setSupplier({ ...supplier, location: e.target.value })
									}
									className='w-full p-2 border rounded text-black'
								/>
							</div>
							<div className='mb-4'>
								<label
									className='block text-white text-sm font-bold mb-2'
									htmlFor='phone'>
									Phone
								</label>
								<input
									type='tel'
									id='phone'
									value={supplier.phone}
									onChange={e =>
										setSupplier({ ...supplier, phone: e.target.value })
									}
									className='w-full p-2 border rounded text-black'
								/>
							</div>
							<div className='mb-4'>
								<label
									className='block text-white text-sm font-bold mb-2'
									htmlFor='balance'>
									Balance
								</label>
								<input
									type='number'
									id='balance'
									value={supplier.balance}
									onChange={e =>
										setSupplier({
											...supplier,
											balance: parseInt(e.target.value)
										})
									}
									className='w-full p-2 border rounded text-black'
									required
								/>
							</div>
							<div className='flex justify-end'>
								<button
									type='button'
									onClick={() => setIsEditing(false)}
									className='bg-black hover:bg-blue text-white font-bold py-2 px-4 rounded mr-2'>
									Cancel
								</button>
								<button
									type='submit'
									className='bg-blue hover:bg-black text-white font-bold py-2 px-4 rounded'>
									Save Changes
								</button>
							</div>
						</form>
					) : (
						<>
							<h2 className='text-2xl font-semibold mb-4'>{supplier.name}</h2>
							<p className='mb-2'>Location: {supplier.location}</p>
							<p className='mb-2'>Phone: {supplier.phone}</p>
							<p className='mb-4'>Balance: ${supplier.balance.toFixed(2)}</p>
							<div className='flex justify-end'>
								<button
									onClick={() => setIsEditing(true)}
									className='bg-blue hover:bg-black text-white font-bold py-2 px-4 rounded mr-2'>
									Edit
								</button>
								<button
									onClick={handleDeleteSupplier}
									className='bg-black hover:bg-blue text-white font-bold py-2 px-4 rounded'>
									Delete
								</button>
							</div>
						</>
					)}
				</div>
			)}

			{activeTab === 'invoices' && (
				<div className='bg-gray text-white rounded-lg shadow-md p-6'>
					<h2 className='text-2xl font-semibold mb-4'>Invoices</h2>
					<table className='min-w-full'>
						<thead>
							<tr>
								<th
									className='px-6 py-3 border-b-2 border-white text-left text-xs leading-4 font-medium uppercase tracking-wider cursor-pointer'
									onClick={() => handleSort('id')}>
									ID {sortField === 'id' && <FaSort className='inline' />}
								</th>
								<th
									className='px-6 py-3 border-b-2 border-white text-left text-xs leading-4 font-medium uppercase tracking-wider cursor-pointer'
									onClick={() => handleSort('created_at')}>
									Date{' '}
									{sortField === 'created_at' && <FaSort className='inline' />}
								</th>
								<th
									className='px-6 py-3 border-b-2 border-white text-left text-xs leading-4 font-medium uppercase tracking-wider cursor-pointer'
									onClick={() => handleSort('total_price')}>
									Total{' '}
									{sortField === 'total_price' && <FaSort className='inline' />}
								</th>
								<th
									className='px-6 py-3 border-b-2 border-white text-left text-xs leading-4 font-medium uppercase tracking-wider cursor-pointer'
									onClick={() => handleSort('remaining_amount')}>
									Remaining{' '}
									{sortField === 'remaining_amount' && (
										<FaSort className='inline' />
									)}
								</th>
								<th className='px-6 py-3 border-b-2 border-white text-left text-xs leading-4 font-medium uppercase tracking-wider'>
									Notes
								</th>
								<th className='px-6 py-3 border-b-2 border-white text-left text-xs leading-4 font-medium uppercase tracking-wider'>
									Files
								</th>
							</tr>
						</thead>
						<tbody>
							{invoices.map(invoice => (
								<tr
									key={invoice.id}
									onClick={() => handleInvoiceClick(invoice)}
									className='cursor-pointer hover:bg-blue'>
									<td className='px-6 py-4 whitespace-no-wrap border-b border-white'>
										{invoice.id}
									</td>
									<td className='px-6 py-4 whitespace-no-wrap border-b border-white'>
										{format(new Date(invoice.created_at), 'PPP')}
									</td>
									<td className='px-6 py-4 whitespace-no-wrap border-b border-white'>
										${invoice.total_price.toFixed(2)}
									</td>
									<td className='px-6 py-4 whitespace-no-wrap border-b border-white'>
										${invoice.remaining_amount.toFixed(2)}
									</td>
									<td className='px-6 py-4 whitespace-no-wrap border-b border-white'>
										{invoice.products.some(product => product.note) ? (
											<FaInfoCircle className='text-blue' title='Has notes' />
										) : (
											'-'
										)}
									</td>
									<td className='px-6 py-4 whitespace-no-wrap border-b border-white'>
										{invoice.files.length > 0 ? (
											<FaFile className='inline text-blue' />
										) : (
											'-'
										)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}

			{activeTab === 'receipts' && (
				<div className='bg-gray text-white rounded-lg shadow-md p-6'>
					<h2 className='text-2xl font-semibold mb-4'>Receipts</h2>
					<table className='min-w-full'>
						{/* ... (existing receipts table) */}
					</table>
				</div>
			)}

			{selectedInvoice && (
				<div
					className='fixed inset-0 bg-gray bg-opacity-50 overflow-y-auto h-full w-full'
					onClick={() => setSelectedInvoice(null)}>
					<div
						className='relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white'
						onClick={e => e.stopPropagation()}>
						<div className='mt-3 text-center'>
							<h3 className='text-lg leading-6 font-medium text-gray-900'>
								Invoice Details
							</h3>
							<div className='mt-2 px-7 py-3'>
								<p className='text-sm text-gray-500'>
									ID: {selectedInvoice.id}
								</p>
								<p className='text-sm text-gray-500'>
									Date: {format(new Date(selectedInvoice.created_at), 'PPP')}
								</p>
								<p className='text-sm text-gray-500'>
									Total Price: ${selectedInvoice.total_price.toFixed(2)}
								</p>
								<p className='text-sm text-gray-500'>
									Remaining Amount: $
									{selectedInvoice.remaining_amount.toFixed(2)}
								</p>
								<h4 className='text-sm font-medium text-gray-900 mt-4'>
									Products:
								</h4>
								<ul className='list-disc list-inside'>
									{selectedInvoice.products.map((product, index) => (
										<li key={index} className='text-sm text-gray-500'>
											<div>
												ID: {product.product_variant_id}, Quantity:{' '}
												{product.quantity}
											</div>
											{product.note && (
												<div className='ml-4 text-xs italic'>
													Note: {product.note}
												</div>
											)}
										</li>
									))}
								</ul>
								<h4 className='text-sm font-medium text-gray-900 mt-4'>
									Files:
								</h4>
								<ul className='list-disc list-inside'>
									{selectedInvoice.files.map((file, index) => (
										<li key={index} className='text-sm text-gray-500'>
											<a
												href={file}
												target='_blank'
												rel='noopener noreferrer'
												className='text-blue hover:underline'>
												{file.split('/').pop()}{' '}
												<FaDownload className='inline' />
											</a>
										</li>
									))}
								</ul>
							</div>
							<div className='items-center px-4 py-3'>
								<button
									id='ok-btn'
									className='px-4 py-2 bg-blue text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-black focus:outline-none focus:ring-2 focus:ring-blue-300'
									onClick={() => setSelectedInvoice(null)}>
									Close
								</button>
							</div>
						</div>
					</div>
				</div>
			)}

			{selectedReceipt && (
				<div
					className='fixed inset-0 bg-gray bg-opacity-50 overflow-y-auto h-full w-full'
					onClick={() => setSelectedReceipt(null)}>
					<div
						className='relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white'
						onClick={e => e.stopPropagation()}>
						<div className='mt-3 text-center'>
							<h3 className='text-lg leading-6 font-medium text-gray-900'>
								Receipt Details
							</h3>
							<div className='mt-2 px-7 py-3'>
								<p className='text-sm text-gray-500'>
									ID: {selectedReceipt.id}
								</p>
								<p className='text-sm text-gray-500'>
									Date: {format(new Date(selectedReceipt.paid_at), 'PPP')}
								</p>
								<p className='text-sm text-gray-500'>
									Amount: ${selectedReceipt.amount.toFixed(2)}
								</p>
								<p className='text-sm text-gray-500'>
									Invoice ID: {selectedReceipt.invoice_id}
								</p>
								<h4 className='text-sm font-medium text-gray-900 mt-4'>
									Files:
								</h4>
								<ul className='list-disc list-inside'>
									{selectedReceipt.files.map((file, index) => (
										<li key={index} className='text-sm text-gray-500'>
											<a
												href={file}
												target='_blank'
												rel='noopener noreferrer'
												className='text-blue hover:underline'>
												{file.split('/').pop()}{' '}
												<FaDownload className='inline' />
											</a>
										</li>
									))}
								</ul>
							</div>
							<div className='items-center px-4 py-3'>
								<button
									id='ok-btn'
									className='px-4 py-2 bg-blue text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-black focus:outline-none focus:ring-2 focus:ring-blue-300'
									onClick={() => setSelectedReceipt(null)}>
									Close
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}
