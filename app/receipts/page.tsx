'use client'

import React, { useState, useEffect, ChangeEvent } from 'react'
import { supabase } from '../../utils/supabase'
import { toast } from 'react-hot-toast'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import {
	FaSort,
	FaEdit,
	FaTrash,
	FaFilter,
	FaPlus,
	FaFile,
	FaDownload
} from 'react-icons/fa'
import { generatePDF } from '@/utils/pdfGenerator'

interface Receipt {
	id: number
	paid_at: string
	invoice_id: number
	amount: number
	client_id?: number
	supplier_id?: string
	files: string[]
}

interface Invoice {
	id: number
	total_price: number
	remaining_amount: number
	client_id?: number
	supplier_id?: string
}

interface Entity {
	id: number | string
	name: string
	balance: number
}

const ReceiptsPage: React.FC = () => {
	const [activeTab, setActiveTab] = useState<'client' | 'supplier'>('client')
	const [receipts, setReceipts] = useState<Receipt[]>([])
	const [entities, setEntities] = useState<Entity[]>([])
	const [invoices, setInvoices] = useState<Invoice[]>([])
	const [showModal, setShowModal] = useState(false)
	const [currentPage, setCurrentPage] = useState(1)
	const [itemsPerPage] = useState(10)
	const [sortField, setSortField] = useState<keyof Receipt>('paid_at')
	const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
	const [filterStartDate, setFilterStartDate] = useState<any>(null)
	const [filterEndDate, setFilterEndDate] = useState<any>(null)
	const [filterEntity, setFilterEntity] = useState<number | string | null>(null)
	const [totalReceipts, setTotalReceipts] = useState(0)
	const [newReceipt, setNewReceipt] = useState<Partial<Receipt>>({
		paid_at: new Date().toISOString(),
		amount: 0,
		files: []
	})
	const [selectedFile, setSelectedFile] = useState<File | null>(null)
	const [uploadingFile, setUploadingFile] = useState(false)
	const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null)
	const [isEditing, setIsEditing] = useState(false)

	useEffect(() => {
		fetchReceipts()
		fetchEntities()
		fetchInvoices()
	}, [
		activeTab,
		currentPage,
		sortField,
		sortOrder,
		filterStartDate,
		filterEndDate,
		filterEntity
	])

	const fetchReceipts = async () => {
		const table = activeTab === 'client' ? 'ClientReceipts' : 'SupplierReceipts'
		let query = supabase.from(table).select('*', { count: 'exact' })

		if (filterStartDate) {
			query = query.gte('paid_at', filterStartDate.toISOString())
		}
		if (filterEndDate) {
			query = query.lte('paid_at', filterEndDate.toISOString())
		}

		if (filterEntity) {
			const idField = activeTab === 'client' ? 'client_id' : 'supplier_id'
			query = query.eq(idField, filterEntity)
		}

		query = query.order(sortField, { ascending: sortOrder === 'asc' })

		const { data, error, count } = await query.range(
			(currentPage - 1) * itemsPerPage,
			currentPage * itemsPerPage - 1
		)

		if (error) {
			toast.error(`Error fetching receipts: ${error.message}`)
		} else {
			setReceipts(data || [])
			setTotalReceipts(count || 0)
		}
	}

	const fetchEntities = async () => {
		const table = activeTab === 'client' ? 'Clients' : 'Suppliers'
		const { data, error } = await supabase.from(table).select('*')
		if (error) {
			toast.error(`Error fetching ${activeTab}s: ${error.message}`)
		} else {
			setEntities(data || [])
		}
	}

	const fetchInvoices = async () => {
		const table = activeTab === 'client' ? 'ClientInvoices' : 'SupplierInvoices'
		const { data, error } = await supabase
			.from(table)
			.select('*')
			.gt('remaining_amount', 0)
		if (error) {
			toast.error(`Error fetching invoices: ${error.message}`)
		} else {
			setInvoices(data || [])
		}
	}

	const handleCreateOrUpdateReceipt = async () => {
		const table = activeTab === 'client' ? 'ClientReceipts' : 'SupplierReceipts'
		let result

		if (isEditing && newReceipt.id) {
			// Update existing receipt
			result = await supabase
				.from(table)
				.update(newReceipt)
				.eq('id', newReceipt.id)
		} else {
			// Create new receipt
			result = await supabase.from(table).insert(newReceipt).single()
		}

		const { data, error } = result

		if (error) {
			toast.error(
				`Error ${isEditing ? 'updating' : 'creating'} receipt: ${error.message}`
			)
		} else {
			toast.success(`Receipt ${isEditing ? 'updated' : 'created'} successfully`)
			setShowModal(false)
			fetchReceipts()
			await updateInvoiceAndEntityBalance(newReceipt)
		}
	}

	const updateInvoiceAndEntityBalance = async (receipt: Partial<Receipt>) => {
		const invoiceTable =
			activeTab === 'client' ? 'ClientInvoices' : 'SupplierInvoices'
		const entityTable = activeTab === 'client' ? 'Clients' : 'Suppliers'
		const idField = activeTab === 'client' ? 'client_id' : 'supplier_id'

		// Update invoice remaining amount
		const { data: invoiceData, error: invoiceError } = await supabase
			.from(invoiceTable)
			.select('remaining_amount')
			.eq('id', receipt.invoice_id)
			.single()

		if (invoiceError) {
			toast.error(`Error fetching invoice: ${invoiceError.message}`)
			return
		}

		const newRemainingAmount =
			invoiceData.remaining_amount - (receipt.amount || 0)
		const { error: updateInvoiceError } = await supabase
			.from(invoiceTable)
			.update({ remaining_amount: newRemainingAmount })
			.eq('id', receipt.invoice_id)

		if (updateInvoiceError) {
			toast.error(`Error updating invoice: ${updateInvoiceError.message}`)
			return
		}

		// Update entity balance
		const field = activeTab === 'client' ? 'client_id' : 'id'
		const { data: entityData, error: entityError } = await supabase
			.from(entityTable)
			.select('balance')
			.eq(field, receipt[idField as keyof Receipt])
			.single()

		if (entityError) {
			toast.error(`Error fetching ${activeTab}: ${entityError.message}`)
			return
		}

		const newBalance = entityData.balance - (receipt.amount || 0)

		const { error: updateEntityError } = await supabase
			.from(entityTable)
			.update({ balance: newBalance })
			.eq(field, receipt[idField as keyof Receipt])

		if (updateEntityError) {
			toast.error(
				`Error updating ${activeTab} balance: ${updateEntityError.message}`
			)
		}
	}

	const handleDeleteReceipt = async (id: number) => {
		if (window.confirm('Are you sure you want to delete this receipt?')) {
			const table =
				activeTab === 'client' ? 'ClientReceipts' : 'SupplierReceipts'
			const { data: receiptData, error: fetchError } = await supabase
				.from(table)
				.select('*')
				.eq('id', id)
				.single()

			if (fetchError) {
				toast.error(`Error fetching receipt: ${fetchError.message}`)
				return
			}

			// Delete associated files
			for (const fileUrl of receiptData.files) {
				await handleFileDelete(fileUrl)
			}

			const { error: deleteError } = await supabase
				.from(table)
				.delete()
				.eq('id', id)

			if (deleteError) {
				toast.error(`Error deleting receipt: ${deleteError.message}`)
			} else {
				toast.success('Receipt deleted successfully')
				fetchReceipts()
				await updateInvoiceAndEntityBalance({
					...receiptData,
					amount: -receiptData.amount
				})
			}
		}
	}

	const handleSort = (field: keyof Receipt) => {
		if (field === sortField) {
			setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
		} else {
			setSortField(field)
			setSortOrder('asc')
		}
	}

	const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
		if (e.target.files && e.target.files.length > 0) {
			setSelectedFile(e.target.files[0])
		}
	}

	const handleFileUpload = async () => {
		if (!selectedFile) {
			toast.error('No file selected')
			return
		}

		setUploadingFile(true)

		try {
			const fileName = `${Date.now()}_${selectedFile.name}`
			const { data, error } = await supabase.storage
				.from('Files')
				.upload(fileName, selectedFile)

			if (error) {
				throw error
			}

			const { data: publicURLData } = supabase.storage
				.from('Files')
				.getPublicUrl(fileName)

			if (!publicURLData) {
				throw new Error('Error getting public URL: No data returned')
			}

			const updatedFiles = [
				...(newReceipt.files || []),
				publicURLData.publicUrl
			]
			setNewReceipt({ ...newReceipt, files: updatedFiles })
			toast.success('File uploaded successfully')
			setSelectedFile(null)
		} catch (error) {
			console.error('Error uploading file:', error)
			toast.error('Error uploading file. Please try again.')
		} finally {
			setUploadingFile(false)
		}
	}

	const handleFileDelete = async (fileUrl: string) => {
		try {
			const decodedUrl = decodeURIComponent(fileUrl)
			const fileName = decodedUrl.split('/').pop()

			if (!fileName) {
				throw new Error('Could not extract file name from URL')
			}

			const { error: deleteError } = await supabase.storage
				.from('Files')
				.remove([fileName])

			if (deleteError) {
				throw deleteError
			}

			const updatedFiles = newReceipt.files?.filter(file => file !== fileUrl)
			setNewReceipt({ ...newReceipt, files: updatedFiles })
			toast.success('File deleted successfully')
		} catch (error) {
			console.error('Error deleting file:', error)
			toast.error('Error deleting file. Please try again.')
		}
	}

	const renderReceiptTable = () => (
		<div className='overflow-x-auto bg-white rounded-lg shadow'>
			<table className='w-full table-auto'>
				<thead>
					<tr className='bg-gray text-white uppercase text-sm leading-normal'>
						<th
							className='py-3 px-6 text-left cursor-pointer'
							onClick={() => handleSort('id')}>
							ID {sortField === 'id' && <FaSort className='inline' />}
						</th>
						<th
							className='py-3 px-6 text-left cursor-pointer'
							onClick={() => handleSort('paid_at')}>
							Date {sortField === 'paid_at' && <FaSort className='inline' />}
						</th>
						<th
							className='py-3 px-6 text-left cursor-pointer'
							onClick={() => handleSort('invoice_id')}>
							Invoice ID{' '}
							{sortField === 'invoice_id' && <FaSort className='inline' />}
						</th>
						<th
							className='py-3 px-6 text-left cursor-pointer'
							onClick={() => handleSort('amount')}>
							Amount {sortField === 'amount' && <FaSort className='inline' />}
						</th>
						<th className='py-3 px-6 text-center'>Files</th>
						<th className='py-3 px-6 text-center'>Actions</th>
					</tr>
				</thead>
				<tbody className='text-gray-600 text-sm font-light'>
					{receipts.map(receipt => (
						<tr
							key={receipt.id}
							className='border-b border-gray hover:bg-gray'
							onClick={() => setSelectedReceipt(receipt)}>
							<td className='py-3 px-6 text-left whitespace-nowrap'>
								{receipt.id}
							</td>
							<td className='py-3 px-6 text-left'>
								{new Date(receipt.paid_at).toLocaleDateString()}
							</td>
							<td className='py-3 px-6 text-left'>{receipt.invoice_id}</td>
							<td className='py-3 px-6 text-left'>
								${receipt.amount.toFixed(2)}
							</td>
							<td className='py-3 px-6 text-center'>
								{receipt.files && receipt.files.length > 0 ? (
									<FaFile
										className='inline text-blue cursor-pointer'
										onClick={() => setSelectedReceipt(receipt)}
									/>
								) : (
									'-'
								)}
							</td>
							<td className='py-3 px-6 text-center'>
								<div className='flex item-center justify-center'>
									<button
										className='w-4 mr-2 transform hover:text-blue hover:scale-110'
										onClick={() => handleEditReceipt(receipt)}>
										<FaEdit />
									</button>
									<button
										className='w-4 mr-2 transform hover:text-blue hover:scale-110'
										onClick={() => handleDeleteReceipt(receipt.id)}>
										<FaTrash />
									</button>
								</div>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	)
	const renderPagination = () => {
		const totalPages = Math.ceil(totalReceipts / itemsPerPage)
		return (
			<div className='flex justify-center mt-4'>
				<nav
					className='relative z-0 inline-flex rounded-md shadow-sm -space-x-px'
					aria-label='Pagination'>
					<button
						onClick={() => setCurrentPage(1)}
						disabled={currentPage === 1}
						className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray bg-white text-sm font-medium text-gray hover:bg-gray ${
							currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''
						}`}>
						<span className='sr-only'>First</span>⟪
					</button>
					<button
						onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
						disabled={currentPage === 1}
						className={`relative inline-flex items-center px-2 py-2 border border-gray bg-white text-sm font-medium text-gray hover:bg-gray ${
							currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''
						}`}>
						<span className='sr-only'>Previous</span>⟨
					</button>
					<span className='relative inline-flex items-center px-4 py-2 border border-gray bg-white text-sm font-medium text-gray'>
						{currentPage} of {totalPages}
					</span>
					<button
						onClick={() =>
							setCurrentPage(Math.min(totalPages, currentPage + 1))
						}
						disabled={currentPage === totalPages}
						className={`relative inline-flex items-center px-2 py-2 border border-gray bg-white text-sm font-medium text-gray hover:bg-gray ${
							currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''
						}`}>
						<span className='sr-only'>Next</span>⟩
					</button>
					<button
						onClick={() => setCurrentPage(totalPages)}
						disabled={currentPage === totalPages}
						className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray bg-white text-sm font-medium text-gray hover:bg-gray ${
							currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''
						}`}>
						<span className='sr-only'>Last</span>⟫
					</button>
				</nav>
			</div>
		)
	}

	const renderFilters = () => (
		<div className='mb-6 flex items-center space-x-4'>
			<div className='relative'>
				<DatePicker
					selected={filterStartDate}
					onChange={(date: Date | null) => setFilterStartDate(date)}
					selectsStart
					startDate={filterStartDate}
					endDate={filterEndDate}
					placeholderText='Start Date'
					className='block w-full pl-10 pr-3 py-2 border border-gray rounded-md leading-5 bg-white placeholder-gray focus:outline-none focus:ring-1 focus:ring-blue focus:border-blue sm:text-sm'
				/>
				<div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
					<FaFilter className='h-5 w-5 text-gray' />
				</div>
			</div>
			<div className='relative'>
				<DatePicker
					selected={filterEndDate}
					onChange={(date: Date | null) => setFilterEndDate(date)}
					selectsEnd
					startDate={filterStartDate}
					endDate={filterEndDate}
					minDate={filterStartDate}
					placeholderText='End Date'
					className='block w-full pl-10 pr-3 py-2 border border-gray rounded-md leading-5 bg-white placeholder-gray focus:outline-none focus:ring-1 focus:ring-blue focus:border-blue sm:text-sm'
				/>
				<div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
					<FaFilter className='h-5 w-5 text-gray' />
				</div>
			</div>
			<select
				onChange={e =>
					handleFilterEntityChange(
						e.target.value ? Number(e.target.value) : null
					)
				}
				className='block w-full pl-3 pr-10 py-2 text-base border-gray focus:outline-none focus:ring-blue focus:border-blue sm:text-sm rounded-md'>
				<option value=''>
					All {activeTab === 'client' ? 'Clients' : 'Suppliers'}
				</option>
				{entities.map(entity => (
					<option key={entity.id} value={entity.id?.toString()}>
						{entity.name}
					</option>
				))}
			</select>
		</div>
	)

	const renderReceiptModal = () => (
		<div
			className={`fixed z-10 inset-0 overflow-y-auto ${
				showModal ? '' : 'hidden'
			}`}>
			<div className='flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0'>
				<div className='fixed inset-0 transition-opacity' aria-hidden='true'>
					<div className='absolute inset-0 bg-gray opacity-75'></div>
				</div>
				<span
					className='hidden sm:inline-block sm:align-middle sm:h-screen'
					aria-hidden='true'>
					&#8203;
				</span>
				<div className='inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full'>
					<div className='bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4'>
						<h3 className='text-lg leading-6 font-medium text-gray-900 mb-4'>
							{isEditing ? 'Edit Receipt' : 'Create New Receipt'}
						</h3>
						<form>
							<div className='mb-4'>
								<label
									className='block text-gray-700 text-sm font-bold mb-2'
									htmlFor='date'>
									Date
								</label>
								<DatePicker
									selected={
										newReceipt.paid_at ? new Date(newReceipt.paid_at) : null
									}
									onChange={(date: Date | null) =>
										setNewReceipt({
											...newReceipt,
											paid_at: date ? date.toISOString() : ''
										})
									}
									className='shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline'
								/>
							</div>
							<div className='mb-4'>
								<label
									className='block text-gray-700 text-sm font-bold mb-2'
									htmlFor='invoice'>
									Invoice
								</label>
								<select
									id='invoice'
									className='shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline'
									value={newReceipt.invoice_id}
									onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
										const selectedInvoice = invoices.find(
											invoice => invoice.id === Number(e.target.value)
										)
										if (selectedInvoice) {
											setNewReceipt({
												...newReceipt,
												invoice_id: selectedInvoice.id,
												[activeTab === 'client' ? 'client_id' : 'supplier_id']:
													selectedInvoice[
														activeTab === 'client' ? 'client_id' : 'supplier_id'
													]
											})
										}
									}}>
									<option value=''>Select Invoice</option>
									{invoices.map(invoice => (
										<option key={invoice.id} value={invoice.id}>
											Invoice #{invoice.id} - Remaining: $
											{invoice.remaining_amount.toFixed(2)}
										</option>
									))}
								</select>
							</div>
							<div className='mb-4'>
								<label
									className='block text-gray-700 text-sm font-bold mb-2'
									htmlFor='amount'>
									Amount
								</label>
								<input
									type='number'
									id='amount'
									className='shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline'
									value={newReceipt.amount || ''}
									onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
										setNewReceipt({
											...newReceipt,
											amount: Number(e.target.value)
										})
									}
								/>
							</div>
							<div className='mb-4'>
								<label className='block text-gray-700 text-sm font-bold mb-2'>
									Files
								</label>
								<input
									type='file'
									onChange={handleFileChange}
									className='shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline'
								/>
								{selectedFile && (
									<button
										type='button'
										onClick={handleFileUpload}
										disabled={uploadingFile}
										className='mt-2 bg-blue hover:bg-blue text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline'>
										{uploadingFile ? 'Uploading...' : 'Upload File'}
									</button>
								)}
								{newReceipt.files?.map((file, index) => (
									<div key={index} className='flex items-center mt-2'>
										<a
											href={file}
											target='_blank'
											rel='noopener noreferrer'
											className='text-blue hover:underline mr-2'>
											{file.split('/').pop()}
										</a>
										<button
											type='button'
											onClick={() => handleFileDelete(file)}
											className='text-blue hover:text-gray'>
											<FaTrash />
										</button>
									</div>
								))}
							</div>
						</form>
					</div>
					<div className='bg-gray px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse'>
						<button
							type='button'
							className='w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue text-base font-medium text-white hover:bg-blue focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue sm:ml-3 sm:w-auto sm:text-sm'
							onClick={handleCreateOrUpdateReceipt}>
							{isEditing ? 'Update Receipt' : 'Create Receipt'}
						</button>
						<button
							type='button'
							className='mt-3 w-full inline-flex justify-center rounded-md border border-gray shadow-sm px-4 py-2 bg-white text-base font-medium text-gray hover:bg-gray focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm'
							onClick={() => {
								setShowModal(false)
								setNewReceipt({
									paid_at: new Date().toISOString(),
									amount: 0,
									files: []
								})
								setIsEditing(false)
							}}>
							Cancel
						</button>
					</div>
				</div>
			</div>
		</div>
	)

	const renderReceiptDetails = () => {
		if (!selectedReceipt) return null

		return (
			<div className='fixed inset-0 bg-gray bg-opacity-50 overflow-y-auto h-full w-full'>
				<div className='relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white'>
					<div className='mt-3 text-center'>
						<h3 className='text-lg leading-6 font-medium text-gray-900'>
							Receipt Details
						</h3>
						<div className='mt-2 px-7 py-3'>
							<p className='text-sm text-gray-500'>ID: {selectedReceipt.id}</p>
							<p className='text-sm text-gray-500'>
								Date: {new Date(selectedReceipt.paid_at).toLocaleDateString()}
							</p>
							<p className='text-sm text-gray-500'>
								Invoice ID: {selectedReceipt.invoice_id}
							</p>
							<p className='text-sm text-gray-500'>
								Amount: ${selectedReceipt.amount.toFixed(2)}
							</p>
							<h4 className='text-sm font-medium text-gray-900 mt-4'>Files:</h4>
							<ul className='list-disc list-inside'>
								{selectedReceipt.files.map((file, index) => (
									<li key={index} className='text-sm text-gray-500'>
										<a
											href={file}
											target='_blank'
											rel='noopener noreferrer'
											className='text-blue hover:underline'>
											{file.split('/').pop()}
										</a>
									</li>
								))}
							</ul>
						</div>
						<div className='items-center px-4 py-3'>
							<button
								className='px-4 py-2 bg-blue text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300 mb-2'
								onClick={() => generatePDF('receipt', selectedReceipt)}>
								Download PDF
							</button>
							<button
								className='px-4 py-2 bg-gray text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300'
								onClick={() => setSelectedReceipt(null)}>
								Close
							</button>
						</div>
					</div>
				</div>
			</div>
		)
	}

	const handleFilterEntityChange = (id: number | string | null) => {
		setFilterEntity(id)
		setCurrentPage(1)
	}

	const handleEditReceipt = (receipt: Receipt) => {
		setNewReceipt(receipt)
		setIsEditing(true)
		setShowModal(true)
	}

	return (
		<div className='mx-auto px-4 py-8 text-black'>
			<div className='flex flex-row justify-between items-center align-middle mb-5'>
				<h1 className='text-3xl font-bold text-gray'>Receipt Management</h1>
				<button
					className=' bg-blue hover:bg-gray text-white font-bold py-2 px-4 rounded-full shadow-lg transition duration-300 ease-in-out transform hover:-translate-y-1 hover:scale-110'
					onClick={() => {
						setNewReceipt({
							paid_at: new Date().toISOString(),
							amount: 0,
							files: []
						})
						setIsEditing(false)
						setShowModal(true)
					}}>
					<FaPlus className='inline-block mr-2' /> Create New Receipt
				</button>
			</div>

			<div className='bg-white shadow-md rounded-lg'>
				<div className='flex border-b'>
					<button
						className={`flex-1 py-4 px-6 text-center ${
							activeTab === 'client'
								? 'bg-blue text-white'
								: 'bg-gray text-white'
						}`}
						onClick={() => setActiveTab('client')}>
						Client Receipts
					</button>
					<button
						className={`flex-1 py-4 px-6 text-center ${
							activeTab === 'supplier'
								? 'bg-blue text-white'
								: 'bg-gray text-white'
						}`}
						onClick={() => setActiveTab('supplier')}>
						Supplier Receipts
					</button>
				</div>
				<div className='p-6'>
					{renderFilters()}
					{renderReceiptTable()}
					{renderPagination()}
				</div>
			</div>

			{renderReceiptModal()}
			{renderReceiptDetails()}
		</div>
	)
}

export default ReceiptsPage
