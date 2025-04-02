'use client'

import React, { useState, useEffect } from 'react'
import {
  clientFunctions,
  Client,
  Company
} from '../../../../utils/functions/clients'
import { supabase } from '../../../../utils/supabase'
import { format } from 'date-fns'
import { FaSort, FaFile, FaDownload, FaInfoCircle } from 'react-icons/fa'
import { generatePDF } from '@/utils/pdfGenerator'
import { toast } from 'react-hot-toast'

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

interface Quotation {
  id: number
  created_at: string
  total_price: number
  note: string
  client_id: number
  products: InvoiceProduct[]
  status: 'pending' | 'accepted' | 'rejected'
  include_vat: boolean
  vat_amount: number
  order_number: string
  discounts: { [productId: string]: number }
  currency: 'usd' | 'euro'
  payment_term: string
  delivery_date: string
}

export default function ClientDetailsPage({
  params
}: {
  params: { clientId: string }
}) {
  const [client, setClient] = useState<Client | null>(null)
  const [companies, setCompanies] = useState<Company[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [isEditing, setIsEditing] = useState(false)
  const [editedClient, setEditedClient] = useState<Client | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [quotations, setQuotations] = useState<Quotation[]>([]) // New state for quotations
  const [activeTab, setActiveTab] = useState('details')
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null)
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null) // New state for selected quotation
  const [sortField, setSortField] = useState<keyof Invoice | keyof Receipt | keyof Quotation>(
    'id'
  )
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    if (params.clientId) {
      fetchClientDetails()
      fetchInvoices()
      fetchReceipts()
      fetchQuotations() // Added fetch for quotations
      fetchCompanies()
    }
  }, [params.clientId])

  const fetchClientDetails = async () => {
    try {
      setIsLoading(true)
      const clientData = await clientFunctions.getClientById(
        Number(params.clientId)
      )
      setClient(clientData)
      setEditedClient(clientData)

    } catch (error:any) {
      console.error('Error fetching client details:', error)
      toast.error('Failed to fetch client details. Please try again later.'+ error.message)
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

  const fetchInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from('ClientInvoices')
        .select('*')
        .eq('client_id', params.clientId)
        .order(sortField as string, { ascending: sortOrder === 'asc' })

      if (error) throw error
      setInvoices(data || [])
    } catch (error:any) {
      console.error('Error fetching invoices:', error)
      toast.error('Failed to fetch invoices. Please try again later.'+ error.message)
    }
  }

  const fetchReceipts = async () => {
    try {
      const { data, error } = await supabase
        .from('ClientReceipts')
        .select('*')
        .eq('client_id', params.clientId)
        .order(sortField as string, { ascending: sortOrder === 'asc' })

      if (error) throw error
      setReceipts(data || [])
    } catch (error:any) {
      console.error('Error fetching receipts:', error)
      toast.error('Failed to fetch receipts. Please try again later.'+ error.message)
    }
  }

  // New function to fetch quotations
  const fetchQuotations = async () => {
    try {
      const { data, error } = await supabase
        .from('Quotations')
        .select('*')
        .eq('client_id', params.clientId)
        .order(sortField as string, { ascending: sortOrder === 'asc' })

      if (error) throw error
      setQuotations(data || [])
    } catch (error:any) {
      console.error('Error fetching quotations:', error)
      toast.error('Failed to fetch orders. Please try again later.'+ error.message)
    }
  }

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditedClient(client)
  }

  const handleSaveEdit = async () => {
    if (!editedClient) return

    try {
      await clientFunctions.updateClient(editedClient.client_id, editedClient)
      setClient(editedClient)
      setIsEditing(false)

      toast.success('Client updated successfully')
    } catch (error:any) {
      console.error('Error updating client:', error)

      toast.error('Failed to update client'+ error?.message )
    }
  }

  const handleDelete = async () => {
    if (!client) return

    if (window.confirm('Are you sure you want to delete this client?')) {
      try {
        await clientFunctions.deleteClient(client.client_id)
        toast.success('Client deleted successfully')
        window.location.href = '/clients'
      } catch (error:any) {
        console.error('Error deleting client:', error)

        toast.error('Failed to delete client'+error.message)
      }
    }
  }

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    if (!editedClient) return

    const { name, value } = e.target
    setEditedClient({
      ...editedClient,
      [name]: name === 'company_id' ? Number(value) : value
    })
  }

  const handleSort = (field: keyof Invoice | keyof Receipt | keyof Quotation) => {
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
    } else if (activeTab === 'quotations') {
      fetchQuotations()
    }
  }

  const handleInvoiceClick = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
  }

  const handleReceiptClick = (receipt: Receipt) => {
    setSelectedReceipt(receipt)
  }

  // Handler for quotation clicks
  const handleQuotationClick = (quotation: Quotation) => {
    setSelectedQuotation(quotation)
  }

  const getCompanyName = (companyId: number) => {
    const company = companies.find(c => c.id === companyId)
    return company ? company.name : 'Unknown Company'
  }

  if (isLoading) {
    return <div className='text-center py-10'>Loading...</div>
  }

  return (
    <div className='p-8 bg-white text-black'>
      <h1 className='text-3xl font-bold mb-6'>Client Details</h1>
      <button
        onClick={() =>
          generatePDF('clientFinancialReport', {
            clientId: client?.client_id,
            clientName: client?.name
          })
        }
        className='bg-blue hover:bg-black text-white font-bold py-2 px-4 rounded mr-2 mb-5'>
        Download Financial Report
      </button>
      {client && (
        <div>
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
              onClick={() => setActiveTab('quotations')}
              className={`mr-2 px-4 py-2 rounded ${
                activeTab === 'quotations'
                  ? 'bg-blue text-white'
                  : 'bg-gray text-white'
              }`}>
              Orders
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
            <div className='bg-gray text-white shadow rounded-lg p-6'>
              {isEditing ? (
                <form
                  onSubmit={e => {
                    e.preventDefault()
                    handleSaveEdit()
                  }}>
                  <div className='mb-4'>
                    <label
                      className='block text-white text-sm font-bold mb-2'
                      htmlFor='name'>
                      Name
                    </label>
                    <input
                      type='text'
                      id='name'
                      name='name'
                      value={editedClient?.name || ''}
                      onChange={handleInputChange}
                      className='shadow appearance-none border rounded w-full py-2 px-3 text-black leading-tight focus:outline-none focus:shadow-outline'
                    />
                  </div>
                  <div className='mb-4'>
                    <label
                      className='block text-white text-sm font-bold mb-2'
                      htmlFor='email'>
                      Email
                    </label>
                    <input
                      type='email'
                      id='email'
                      name='email'
                      value={editedClient?.email || ''}
                      onChange={handleInputChange}
                      className='shadow appearance-none border rounded w-full py-2 px-3 text-black leading-tight focus:outline-none focus:shadow-outline'
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
                      name='phone'
                      value={editedClient?.phone || ''}
                      onChange={handleInputChange}
                      className='shadow appearance-none border rounded w-full py-2 px-3 text-black leading-tight focus:outline-none focus:shadow-outline'
                    />
                  </div>
                  <div className='mb-4'>
                    <label
                      className='block text-white text-sm font-bold mb-2'
                      htmlFor='address'>
                      Address
                    </label>
                    <input
                      type='text'
                      id='address'
                      name='address'
                      value={editedClient?.address || ''}
                      onChange={handleInputChange}
                      className='shadow appearance-none border rounded w-full py-2 px-3 text-black leading-tight focus:outline-none focus:shadow-outline'
                    />
                  </div>
                  <div className='mb-4'>
                    <label
                      className='block text-white text-sm font-bold mb-2'
                      htmlFor='tax_number'>
                      Tax Number
                    </label>
                    <input
                      type='text'
                      id='tax_number'
                      name='tax_number'
                      value={editedClient?.tax_number || ''}
                      onChange={handleInputChange}
                      className='shadow appearance-none border rounded w-full py-2 px-3 text-black leading-tight focus:outline-none focus:shadow-outline'
                    />
                  </div>
                  <div className='mb-4'>
                    <label
                      className='block text-white text-sm font-bold mb-2'
                      htmlFor='company_id'>
                      Company
                    </label>
                    <select
                      id='company_id'
                      name='company_id'
                      value={editedClient?.company_id || ''}
                      onChange={handleInputChange}
                      className='shadow appearance-none border rounded w-full py-2 px-3 text-black leading-tight focus:outline-none focus:shadow-outline'>
                      <option value=''>Select a company</option>
                      {companies.map(company => (
                        <option key={company.id} value={company.id}>
                          {company.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className='flex items-center justify-between'>
                    <button
                      type='submit'
                      className='bg-blue hover:bg-black text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline'>
                      Save Changes
                    </button>
                    <button
                      type='button'
                      onClick={handleCancelEdit}
                      className='bg-gray hover:bg-black text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline'>
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className='mb-4'>
                    <h2 className='text-xl font-semibold'>Name</h2>
                    <p>{client.name}</p>
                  </div>
                  <div className='mb-4'>
                    <h2 className='text-xl font-semibold'>Email</h2>
                    <p>{client.email}</p>
                  </div>
                  <div className='mb-4'>
                    <h2 className='text-xl font-semibold'>Phone</h2>
                    <p>{client.phone}</p>
                  </div>
                  <div className='mb-4'>
                    <h2 className='text-xl font-semibold'>Address</h2>
                    <p>{client.address}</p>
                  </div>
                  <div className='mb-4'>
                    <h2 className='text-xl font-semibold'>Tax Number</h2>
                    <p>{client.tax_number}</p>
                  </div>
                  <div className='mb-4'>
                    <h2 className='text-xl font-semibold'>Balance</h2>
                    <p>${client.balance.toFixed(2)}</p>
                  </div>
                  <div className='mb-4'>
                    <h2 className='text-xl font-semibold'>Company</h2>
                    <p>{getCompanyName(client.company_id)}</p>
                  </div>
                  <div className='flex items-center justify-between mt-6'>
                    <button
                      onClick={handleEdit}
                      className='bg-blue hover:bg-black text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline'>
                      Edit Client
                    </button>
                    <button
                      onClick={handleDelete}
                      className='bg-black hover:bg-blue text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline'>
                      Delete Client
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'invoices' && (
            <div className='bg-gray text-white shadow rounded-lg p-6'>
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
                      {sortField === 'created_at' && (
                        <FaSort className='inline' />
                      )}
                    </th>
                    <th
                      className='px-6 py-3 border-b-2 border-white text-left text-xs leading-4 font-medium uppercase tracking-wider cursor-pointer'
                      onClick={() => handleSort('total_price')}>
                      Total{' '}
                      {sortField === 'total_price' && (
                        <FaSort className='inline' />
                      )}
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
                          <FaInfoCircle
                            className='text-blue'
                            title='Has notes'
                          />
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

          {/* New quotations tab */}
          {activeTab === 'quotations' && (
            <div className='bg-gray text-white shadow rounded-lg p-6'>
              <h2 className='text-2xl font-semibold mb-4'>Orders</h2>
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
                      {sortField === 'created_at' && (
                        <FaSort className='inline' />
                      )}
                    </th>
                    <th
                      className='px-6 py-3 border-b-2 border-white text-left text-xs leading-4 font-medium uppercase tracking-wider cursor-pointer'
                      onClick={() => handleSort('total_price')}>
                      Total{' '}
                      {sortField === 'total_price' && (
                        <FaSort className='inline' />
                      )}
                    </th>
                    <th
                      className='px-6 py-3 border-b-2 border-white text-left text-xs leading-4 font-medium uppercase tracking-wider cursor-pointer'
                      onClick={() => handleSort('status')}>
                      Status{' '}
                      {sortField === 'status' && (
                        <FaSort className='inline' />
                      )}
                    </th>
                    <th className='px-6 py-3 border-b-2 border-white text-left text-xs leading-4 font-medium uppercase tracking-wider'>
                      Order Number
                    </th>
                    <th className='px-6 py-3 border-b-2 border-white text-left text-xs leading-4 font-medium uppercase tracking-wider'>
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {quotations.map(quotation => (
                    <tr
                      key={quotation.id}
                      onClick={() => handleQuotationClick(quotation)}
                      className='cursor-pointer hover:bg-blue'>
                      <td className='px-6 py-4 whitespace-no-wrap border-b border-white'>
                        {quotation.id}
                      </td>
                      <td className='px-6 py-4 whitespace-no-wrap border-b border-white'>
                        {format(new Date(quotation.created_at), 'PPP')}
                      </td>
                      <td className='px-6 py-4 whitespace-no-wrap border-b border-white'>
                        ${quotation.total_price.toFixed(2)}
                      </td>
                      <td className='px-6 py-4 whitespace-no-wrap border-b border-white'>
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            quotation.status === 'pending'
                              ? 'bg-yellow-200 text-yellow-800'
                              : quotation.status === 'accepted'
                              ? 'bg-green-200 text-green-800'
                              : 'bg-red-200 text-red-800'
                          }`}>
                          {quotation.status}
                        </span>
                      </td>
                      <td className='px-6 py-4 whitespace-no-wrap border-b border-white'>
                        {quotation.order_number}
                      </td>
                      <td className='px-6 py-4 whitespace-no-wrap border-b border-white'>
                        {quotation.note ? (
                          <FaInfoCircle
                            className='text-blue'
                            title={quotation.note}
                          />
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
            <div className='bg-gray text-white shadow rounded-lg p-6'>
              <h2 className='text-2xl font-semibold mb-4'>Receipts</h2>
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
                      onClick={() => handleSort('paid_at')}>
                      Date{' '}
                      {sortField === 'paid_at' && <FaSort className='inline' />}
                    </th>
                    <th
                      className='px-6 py-3 border-b-2 border-white text-left text-xs leading-4 font-medium uppercase tracking-wider cursor-pointer'
                      onClick={() => handleSort('amount')}>
                      Amount{' '}
                      {sortField === 'amount' && <FaSort className='inline' />}
                    </th>
                    <th
                      className='px-6 py-3 border-b-2 border-white text-left text-xs leading-4 font-medium uppercase tracking-wider cursor-pointer'
                      onClick={() => handleSort('invoice_id')}>
                      Invoice ID{' '}
                      {sortField === 'invoice_id' && (
                        <FaSort className='inline' />
                      )}
                    </th>
                    <th className='px-6 py-3 border-b-2 border-white text-left text-xs leading-4 font-medium uppercase tracking-wider'>
                      Files
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {receipts.map(receipt => (
                    <tr
                      key={receipt.id}
                      onClick={() => handleReceiptClick(receipt)}
                      className='cursor-pointer hover:bg-blue'>
                      <td className='px-6 py-4 whitespace-no-wrap border-b border-white'>
                        {receipt.id}
                      </td>
                      <td className='px-6 py-4 whitespace-no-wrap border-b border-white'>
                        {format(new Date(receipt.paid_at), 'PPP')}
                      </td>
                      <td className='px-6 py-4 whitespace-no-wrap border-b border-white'>
                        ${receipt.amount.toFixed(2)}
                      </td>
                      <td className='px-6 py-4 whitespace-no-wrap border-b border-white'>
                        {receipt.invoice_id}
                      </td>
                      <td className='px-6 py-4 whitespace-no-wrap border-b border-white'>
                        {receipt.files.length > 0 ? (
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
                      Date:{' '}
                      {format(new Date(selectedInvoice.created_at), 'PPP')}
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

          {/* New quotation details modal */}
          {selectedQuotation && (
            <div
              className='fixed inset-0 bg-gray bg-opacity-50 overflow-y-auto h-full w-full'
              onClick={() => setSelectedQuotation(null)}>
              <div
                className='relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white'
                onClick={e => e.stopPropagation()}>
                <div className='mt-3 text-center'>
                  <h3 className='text-lg leading-6 font-medium text-gray-900'>
                    Order Details
                  </h3>
                  <div className='mt-2 px-7 py-3'>
                    <p className='text-sm text-gray-500'>
                      ID: {selectedQuotation.id}
                    </p>
                    <p className='text-sm text-gray-500'>
                      Date:{' '}
                      {format(new Date(selectedQuotation.created_at), 'PPP')}
                    </p>
                    <p className='text-sm text-gray-500'>
                      Total Price: ${selectedQuotation.total_price.toFixed(2)}
                    </p>
                    <p className='text-sm text-gray-500'>
                      Status:{' '}
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          selectedQuotation.status === 'pending'
                            ? 'bg-yellow-200 text-yellow-800'
                            : selectedQuotation.status === 'accepted'
                            ? 'bg-green-200 text-green-800'
                            : 'bg-red-200 text-red-800'
                        }`}>
                        {selectedQuotation.status}
                      </span>
                    </p>
                    <p className='text-sm text-gray-500'>
                      Order Number: {selectedQuotation.order_number}
                    </p>
                    {selectedQuotation.note && (
                      <p className='text-sm text-gray-500'>
                        Note: {selectedQuotation.note}
                      </p>
                    )}
                    <h4 className='text-sm font-medium text-gray-900 mt-4'>
                      Products:
                    </h4>
                    <ul className='list-disc list-inside'>
                      {selectedQuotation.products.map((product, index) => (
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
                    {selectedQuotation.payment_term && (
                      <p className='text-sm text-gray-500 mt-4'>
                        Payment Terms: {selectedQuotation.payment_term}
                      </p>
                    )}
                    {selectedQuotation.delivery_date && (
                      <p className='text-sm text-gray-500'>
                        Delivery Date: {format(new Date(selectedQuotation.delivery_date), 'PPP')}
                      </p>
                    )}
                    <button
                      className='mt-4 px-4 py-2 bg-blue text-white text-sm font-medium rounded-md shadow-sm hover:bg-blue-700 focus:outline-none'
                      onClick={() => {
                        generatePDF('quotation', selectedQuotation);
                      }}>
                      Download PDF
                    </button>
                  </div>
                  <div className='items-center px-4 py-3'>
                    <button
                      id='ok-btn'
                      className='px-4 py-2 bg-blue text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-black focus:outline-none focus:ring-2 focus:ring-blue-300'
                      onClick={() => setSelectedQuotation(null)}>
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
      )}
    </div>
  )
}