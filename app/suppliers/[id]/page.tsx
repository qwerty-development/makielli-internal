'use client'

import React, { useState, useEffect } from 'react'
import { supplierFunctions, Supplier } from '../../../utils/functions/suppliers'
import { supabase } from '../../../utils/supabase'
import { redirect, useRouter } from 'next/navigation'
import { format } from 'date-fns'
import {
	FaSort,
	FaFile,
	FaDownload,
	FaInfoCircle,
	FaTruck,
	FaFileInvoiceDollar,
	FaReceipt,
	FaEdit,
	FaTrash,
	FaChartLine
} from 'react-icons/fa'
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

interface Company {
	id: number
	name: string
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
	const [companies, setCompanies] = useState<Company[]>([])
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
		fetchCompanies()
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

	const fetchCompanies = async () => {
		try {
			const companiesData = await supplierFunctions.getAllCompanies()
			setCompanies(companiesData)
		} catch (error) {
			console.error('Error fetching companies:', error)
			setError('Failed to fetch companies. Please try again later.')
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
		return (
			<div className='flex items-center justify-center min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100'>
				<div className='text-center'>
					<div className='inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mb-4'></div>
					<p className='text-neutral-600 font-medium'>Loading supplier details...</p>
				</div>
			</div>
		)
	}

	if (error) {
		return (
			<div className='flex items-center justify-center min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100'>
				<div className='text-center'>
					<div className='bg-error-50 border border-error-200 rounded-lg p-6'>
						<p className='text-error-800 font-semibold'>Error: {error}</p>
					</div>
				</div>
			</div>
		)
	}

	if (!supplier) {
		return (
			<div className='flex items-center justify-center min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100'>
				<div className='empty-state'>
					<h3 className='text-xl font-semibold text-neutral-800 mb-2'>Supplier not found</h3>
				</div>
			</div>
		)
	}

	return (
		<div className='min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 p-6 sm:p-8'>
			<div className='max-w-7xl mx-auto'>
				{/* Header */}
				<div className='mb-6 animate-fade-in'>
					<div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6'>
						<div>
							<h1 className='text-4xl font-bold text-neutral-800 mb-2 flex items-center'>
								<FaTruck className="mr-3 text-primary-500" />
								{supplier.name}
							</h1>
							<p className='text-neutral-600'>Supplier details and transaction history</p>
						</div>
						<button
							onClick={() =>
								generatePDF('supplierFinancialReport', { supplierId: supplier.id })
							}
							className='btn-primary flex items-center gap-2'>
							<FaChartLine />
							<span>Financial Report</span>
						</button>
					</div>

					{/* Tab Navigation */}
					<div className='flex gap-2 border-b border-neutral-200'>
						<button
							onClick={() => setActiveTab('details')}
							className={`px-6 py-3 font-medium transition-all duration-300 border-b-2 ${
								activeTab === 'details'
									? 'border-primary-500 text-primary-600'
									: 'border-transparent text-neutral-600 hover:text-neutral-800 hover:border-neutral-300'
							}`}>
							<FaTruck className="inline mr-2" />
							Details
						</button>
						<button
							onClick={() => setActiveTab('invoices')}
							className={`px-6 py-3 font-medium transition-all duration-300 border-b-2 ${
								activeTab === 'invoices'
									? 'border-primary-500 text-primary-600'
									: 'border-transparent text-neutral-600 hover:text-neutral-800 hover:border-neutral-300'
							}`}>
							<FaFileInvoiceDollar className="inline mr-2" />
							Invoices ({invoices.length})
						</button>
						<button
							onClick={() => setActiveTab('receipts')}
							className={`px-6 py-3 font-medium transition-all duration-300 border-b-2 ${
								activeTab === 'receipts'
									? 'border-primary-500 text-primary-600'
									: 'border-transparent text-neutral-600 hover:text-neutral-800 hover:border-neutral-300'
							}`}>
							<FaReceipt className="inline mr-2" />
							Receipts ({receipts.length})
						</button>
					</div>
				</div>

				{/* Details Tab */}
				{activeTab === 'details' && (
					<div className='card p-6 animate-fade-in'>
						{isEditing ? (
							<form onSubmit={handleUpdateSupplier} className="space-y-6">
								<div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
									<div>
										<label className='block text-sm font-medium text-neutral-700 mb-2' htmlFor='name'>
											Supplier Name
										</label>
										<input
											type='text'
											id='name'
											value={supplier.name}
											onChange={e =>
												setSupplier({ ...supplier, name: e.target.value })
											}
											className='input'
											required
										/>
									</div>
									<div>
										<label className='block text-sm font-medium text-neutral-700 mb-2' htmlFor='location'>
											Location
										</label>
										<input
											type='text'
											id='location'
											value={supplier.location}
											onChange={e =>
												setSupplier({ ...supplier, location: e.target.value })
											}
											className='input'
											required
										/>
									</div>
									<div>
										<label className='block text-sm font-medium text-neutral-700 mb-2' htmlFor='phone'>
											Phone
										</label>
										<input
											type='tel'
											id='phone'
											value={supplier.phone}
											onChange={e =>
												setSupplier({ ...supplier, phone: e.target.value })
											}
											className='input'
											required
										/>
									</div>
									<div>
										<label className='block text-sm font-medium text-neutral-700 mb-2' htmlFor='email'>
											Email
										</label>
										<input
											type='email'
											id='email'
											value={supplier.email}
											onChange={e =>
												setSupplier({ ...supplier, email: e.target.value })
											}
											className='input'
											required
										/>
									</div>
									<div>
										<label className='block text-sm font-medium text-neutral-700 mb-2' htmlFor='balance'>
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
											className='input'
											required
										/>
									</div>
									<div>
										<label className='block text-sm font-medium text-neutral-700 mb-2' htmlFor='company'>
											Company
										</label>
										<select
											id='company'
											value={supplier.company_id}
											onChange={e =>
												setSupplier({
													...supplier,
													company_id: parseInt(e.target.value)
												})
											}
											className='input text-neutral-900'
											required>
											<option value='' className='text-neutral-900 bg-white'>Select a company</option>
											{companies.map(company => (
												<option key={company.id} value={company.id} className='text-neutral-900 bg-white'>
													{company.name}
												</option>
											))}
										</select>
									</div>
								</div>
								<div className='flex justify-end gap-3'>
									<button
										type='button'
										onClick={() => setIsEditing(false)}
										className='btn-outline'>
										Cancel
									</button>
									<button
										type='submit'
										className='btn-primary'>
										Save Changes
									</button>
								</div>
							</form>
						) : (
							<>
								<div className='grid grid-cols-1 md:grid-cols-2 gap-6 mb-6'>
									<div className='bg-neutral-50 rounded-lg p-4'>
										<p className='text-sm text-neutral-600 mb-1'>Location</p>
										<p className='text-lg font-semibold text-neutral-800'>{supplier.location}</p>
									</div>
									<div className='bg-neutral-50 rounded-lg p-4'>
										<p className='text-sm text-neutral-600 mb-1'>Phone</p>
										<p className='text-lg font-semibold text-neutral-800'>{supplier.phone}</p>
									</div>
									<div className='bg-neutral-50 rounded-lg p-4'>
										<p className='text-sm text-neutral-600 mb-1'>Email</p>
										<p className='text-lg font-semibold text-neutral-800'>{supplier.email}</p>
									</div>
									<div className='bg-neutral-50 rounded-lg p-4'>
										<p className='text-sm text-neutral-600 mb-1'>Balance</p>
										<p className={`text-lg font-semibold ${supplier.balance < 0 ? 'text-error-600' : 'text-success-600'}`}>
											${supplier.balance.toFixed(2)}
										</p>
									</div>
									<div className='bg-neutral-50 rounded-lg p-4'>
										<p className='text-sm text-neutral-600 mb-1'>Company</p>
										<p className='text-lg font-semibold text-neutral-800'>
											{companies.find(company => company.id === supplier.company_id)
												?.name || 'Not assigned'}
										</p>
									</div>
								</div>
								<div className='flex justify-end gap-3'>
									<button
										onClick={() => setIsEditing(true)}
										className='btn-primary flex items-center gap-2'>
										<FaEdit />
										<span>Edit</span>
									</button>
									<button
										onClick={handleDeleteSupplier}
										className='btn-danger flex items-center gap-2'>
										<FaTrash />
										<span>Delete</span>
									</button>
								</div>
							</>
						)}
					</div>
				)}

				{/* Invoices Tab */}
				{activeTab === 'invoices' && (
					<div className='card p-6 animate-fade-in'>
						<h2 className='text-2xl font-semibold text-neutral-800 mb-4'>Purchase Invoices</h2>
						{invoices.length === 0 ? (
							<div className='empty-state'>
								<FaFileInvoiceDollar className='w-16 h-16 text-neutral-300 mb-4' />
								<h3 className='text-xl font-semibold text-neutral-800 mb-2'>No invoices found</h3>
								<p className='text-neutral-600'>No purchase invoices for this supplier yet</p>
							</div>
						) : (
							<div className='overflow-x-auto'>
								<table className='min-w-full'>
									<thead>
										<tr className='border-b-2 border-neutral-200'>
											<th
												className='px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider cursor-pointer hover:text-primary-600'
												onClick={() => handleSort('id')}>
												<div className='flex items-center gap-2'>
													ID {sortField === 'id' && <FaSort className='inline text-primary-500' />}
												</div>
											</th>
											<th
												className='px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider cursor-pointer hover:text-primary-600'
												onClick={() => handleSort('created_at')}>
												<div className='flex items-center gap-2'>
													Date {sortField === 'created_at' && <FaSort className='inline text-primary-500' />}
												</div>
											</th>
											<th
												className='px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider cursor-pointer hover:text-primary-600'
												onClick={() => handleSort('total_price')}>
												<div className='flex items-center gap-2'>
													Total {sortField === 'total_price' && <FaSort className='inline text-primary-500' />}
												</div>
											</th>
											<th
												className='px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider cursor-pointer hover:text-primary-600'
												onClick={() => handleSort('remaining_amount')}>
												<div className='flex items-center gap-2'>
													Remaining {sortField === 'remaining_amount' && <FaSort className='inline text-primary-500' />}
												</div>
											</th>
											<th className='px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider'>
												Notes
											</th>
											<th className='px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider'>
												Files
											</th>
										</tr>
									</thead>
									<tbody className='divide-y divide-neutral-200'>
										{invoices.map(invoice => (
											<tr
												key={invoice.id}
												onClick={() => handleInvoiceClick(invoice)}
												className='cursor-pointer hover:bg-primary-50 transition-colors'>
												<td className='px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900'>
													{invoice.id}
												</td>
												<td className='px-6 py-4 whitespace-nowrap text-sm text-neutral-700'>
													{format(new Date(invoice.created_at), 'PPP')}
												</td>
												<td className='px-6 py-4 whitespace-nowrap text-sm font-semibold text-neutral-900'>
													${invoice.total_price.toFixed(2)}
												</td>
												<td className='px-6 py-4 whitespace-nowrap text-sm font-semibold text-warning-600'>
													${invoice.remaining_amount.toFixed(2)}
												</td>
												<td className='px-6 py-4 whitespace-nowrap text-sm text-neutral-700'>
													{invoice.products.some(product => product.note) ? (
														<FaInfoCircle className='text-info-500' title='Has notes' />
													) : (
														<span className='text-neutral-400'>-</span>
													)}
												</td>
												<td className='px-6 py-4 whitespace-nowrap text-sm text-neutral-700'>
													{invoice.files.length > 0 ? (
														<FaFile className='inline text-primary-500' />
													) : (
														<span className='text-neutral-400'>-</span>
													)}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}
					</div>
				)}

				{/* Receipts Tab */}
				{activeTab === 'receipts' && (
					<div className='card p-6 animate-fade-in'>
						<h2 className='text-2xl font-semibold text-neutral-800 mb-4'>Payment Receipts</h2>
						{receipts.length === 0 ? (
							<div className='empty-state'>
								<FaReceipt className='w-16 h-16 text-neutral-300 mb-4' />
								<h3 className='text-xl font-semibold text-neutral-800 mb-2'>No receipts found</h3>
								<p className='text-neutral-600'>No payment receipts for this supplier yet</p>
							</div>
						) : (
							<div className='overflow-x-auto'>
								<table className='min-w-full'>
									<thead>
										<tr className='border-b-2 border-neutral-200'>
											<th
												className='px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider cursor-pointer hover:text-primary-600'
												onClick={() => handleSort('id')}>
												<div className='flex items-center gap-2'>
													ID {sortField === 'id' && <FaSort className='inline text-primary-500' />}
												</div>
											</th>
											<th
												className='px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider cursor-pointer hover:text-primary-600'
												onClick={() => handleSort('paid_at')}>
												<div className='flex items-center gap-2'>
													Date {sortField === 'paid_at' && <FaSort className='inline text-primary-500' />}
												</div>
											</th>
											<th
												className='px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider cursor-pointer hover:text-primary-600'
												onClick={() => handleSort('amount')}>
												<div className='flex items-center gap-2'>
													Amount {sortField === 'amount' && <FaSort className='inline text-primary-500' />}
												</div>
											</th>
											<th
												className='px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider cursor-pointer hover:text-primary-600'
												onClick={() => handleSort('invoice_id')}>
												<div className='flex items-center gap-2'>
													Invoice ID {sortField === 'invoice_id' && <FaSort className='inline text-primary-500' />}
												</div>
											</th>
											<th className='px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider'>
												Files
											</th>
										</tr>
									</thead>
									<tbody className='divide-y divide-neutral-200'>
										{receipts.map(receipt => (
											<tr
												key={receipt.id}
												onClick={() => handleReceiptClick(receipt)}
												className='cursor-pointer hover:bg-primary-50 transition-colors'>
												<td className='px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900'>
													{receipt.id}
												</td>
												<td className='px-6 py-4 whitespace-nowrap text-sm text-neutral-700'>
													{format(new Date(receipt.paid_at), 'PPP')}
												</td>
												<td className='px-6 py-4 whitespace-nowrap text-sm font-semibold text-success-600'>
													${receipt.amount.toFixed(2)}
												</td>
												<td className='px-6 py-4 whitespace-nowrap text-sm text-neutral-700'>
													{receipt.invoice_id}
												</td>
												<td className='px-6 py-4 whitespace-nowrap text-sm text-neutral-700'>
													{receipt.files.length > 0 ? (
														<FaFile className='inline text-primary-500' />
													) : (
														<span className='text-neutral-400'>-</span>
													)}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}
					</div>
				)}

				{/* Invoice Modal */}
				{selectedInvoice && (
					<div className='modal-overlay' onClick={() => setSelectedInvoice(null)}>
						<div className='modal-content max-w-3xl' onClick={e => e.stopPropagation()}>
							<div className='flex justify-between items-start mb-6 px-2'>
								<div>
									<h3 className='text-2xl font-bold text-neutral-900 flex items-center'>
										<FaFileInvoiceDollar className="mr-3 text-primary-500" />
										Invoice #{selectedInvoice.id}
									</h3>
									<p className='text-sm text-neutral-600 mt-1'>
										{format(new Date(selectedInvoice.created_at), 'PPP')}
									</p>
								</div>
								<button
									onClick={() => setSelectedInvoice(null)}
									className='p-2 rounded-lg hover:bg-neutral-100 transition-colors text-neutral-500 hover:text-neutral-700'>
									<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
									</svg>
								</button>
							</div>

							<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
								{/* Invoice Summary */}
								<div className="lg:col-span-1">
									<div className="bg-neutral-50 rounded-lg p-4 space-y-3">
										<div>
											<p className='text-xs text-neutral-600 mb-1'>Invoice ID</p>
											<p className='text-lg font-bold text-neutral-900'>#{selectedInvoice.id}</p>
										</div>
										<div className='border-t border-neutral-200 pt-3'>
											<p className='text-xs text-neutral-600 mb-1'>Total Price</p>
											<p className='text-2xl font-bold text-neutral-900'>${selectedInvoice.total_price.toFixed(2)}</p>
										</div>
										<div className='border-t border-neutral-200 pt-3'>
											<p className='text-xs text-neutral-600 mb-1'>Remaining Amount</p>
											<p className='text-xl font-bold text-warning-600'>${selectedInvoice.remaining_amount.toFixed(2)}</p>
										</div>
									</div>
								</div>

								{/* Products */}
								<div className="lg:col-span-2">
									<div className="bg-white border border-neutral-200 rounded-lg">
										<div className="px-4 py-3 border-b border-neutral-200 bg-neutral-50">
											<h4 className='font-semibold text-neutral-800'>Products ({selectedInvoice.products.length})</h4>
										</div>
										<div className="p-4">
											<div className='space-y-3 max-h-96 overflow-y-auto'>
												{selectedInvoice.products.map((product, index) => (
													<div key={index} className='bg-neutral-50 rounded-lg p-4'>
														<div className='flex justify-between items-start'>
															<div className='flex-1'>
																<p className='text-sm font-medium text-neutral-700'>Variant ID: {product.product_variant_id}</p>
																<p className='text-xs text-neutral-600 mt-1'>Quantity: {product.quantity}</p>
																{product.note && (
																	<p className='text-xs text-neutral-600 mt-2 italic bg-info-50 p-2 rounded border-l-2 border-info-300'>
																		{product.note}
																	</p>
																)}
															</div>
														</div>
													</div>
												))}
											</div>
										</div>
									</div>

									{/* Files */}
									{selectedInvoice.files.length > 0 && (
										<div className="bg-white border border-neutral-200 rounded-lg mt-4">
											<div className="px-4 py-3 border-b border-neutral-200 bg-neutral-50">
												<h4 className='font-semibold text-neutral-800'>Attached Files ({selectedInvoice.files.length})</h4>
											</div>
											<div className="p-4">
												<ul className='space-y-2'>
													{selectedInvoice.files.map((file, index) => (
														<li key={index}>
															<a
																href={file}
																target='_blank'
																rel='noopener noreferrer'
																className='flex items-center gap-2 text-primary-600 hover:text-primary-700 transition-colors'>
																<FaDownload className='text-sm' />
																<span className='text-sm'>{file.split('/').pop()}</span>
															</a>
														</li>
													))}
												</ul>
											</div>
										</div>
									)}
								</div>
							</div>
						</div>
					</div>
				)}

				{/* Receipt Modal */}
				{selectedReceipt && (
					<div className='modal-overlay' onClick={() => setSelectedReceipt(null)}>
						<div className='modal-content max-w-2xl' onClick={e => e.stopPropagation()}>
							<div className='flex justify-between items-start mb-6 px-2'>
								<div>
									<h3 className='text-2xl font-bold text-neutral-900 flex items-center'>
										<FaReceipt className="mr-3 text-success-500" />
										Receipt #{selectedReceipt.id}
									</h3>
									<p className='text-sm text-neutral-600 mt-1'>
										{format(new Date(selectedReceipt.paid_at), 'PPP')}
									</p>
								</div>
								<button
									onClick={() => setSelectedReceipt(null)}
									className='p-2 rounded-lg hover:bg-neutral-100 transition-colors text-neutral-500 hover:text-neutral-700'>
									<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
									</svg>
								</button>
							</div>

							<div className="bg-neutral-50 rounded-lg p-6 space-y-4 mb-6">
								<div className='grid grid-cols-2 gap-4'>
									<div>
										<p className='text-xs text-neutral-600 mb-1'>Receipt ID</p>
										<p className='text-lg font-bold text-neutral-900'>#{selectedReceipt.id}</p>
									</div>
									<div>
										<p className='text-xs text-neutral-600 mb-1'>Invoice ID</p>
										<p className='text-lg font-bold text-neutral-900'>#{selectedReceipt.invoice_id}</p>
									</div>
								</div>
								<div className='border-t border-neutral-200 pt-4'>
									<p className='text-xs text-neutral-600 mb-1'>Payment Amount</p>
									<p className='text-3xl font-bold text-success-600'>${selectedReceipt.amount.toFixed(2)}</p>
								</div>
								<div className='border-t border-neutral-200 pt-4'>
									<p className='text-xs text-neutral-600 mb-1'>Payment Date</p>
									<p className='text-lg font-semibold text-neutral-900'>
										{format(new Date(selectedReceipt.paid_at), 'PPP')}
									</p>
								</div>
							</div>

							{/* Files */}
							{selectedReceipt.files.length > 0 && (
								<div className="bg-white border border-neutral-200 rounded-lg">
									<div className="px-4 py-3 border-b border-neutral-200 bg-neutral-50">
										<h4 className='font-semibold text-neutral-800'>Attached Files ({selectedReceipt.files.length})</h4>
									</div>
									<div className="p-4">
										<ul className='space-y-2'>
											{selectedReceipt.files.map((file, index) => (
												<li key={index}>
													<a
														href={file}
														target='_blank'
														rel='noopener noreferrer'
														className='flex items-center gap-2 text-primary-600 hover:text-primary-700 transition-colors'>
														<FaDownload className='text-sm' />
														<span className='text-sm'>{file.split('/').pop()}</span>
													</a>
												</li>
											))}
										</ul>
									</div>
								</div>
							)}
						</div>
					</div>
				)}
			</div>
		</div>
	)
}
