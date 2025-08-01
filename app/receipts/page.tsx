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
	FaDownload,
	FaExclamationTriangle
} from 'react-icons/fa'
import { generatePDF } from '@/utils/pdfGenerator'
import SearchableSelect from '@/components/SearchableSelect'

interface Receipt {
	id: number
	paid_at: string
	invoice_id: number
	amount: number
	client_id?: number
	supplier_id?: string
	files: string[]
	currency?: string
}

interface Invoice {
	id: number
	total_price: number
	remaining_amount: number
	client_id?: number
	supplier_id?: string
	currency: 'usd' | 'euro'
	shipping_fee?: number
	type?: string
}

interface Entity {
	id: number | string
	name: string
	balance: number
	email: string
	client_id?: number
}

interface ReceiptValidation {
	isValid: boolean
	errors: string[]
	warnings: string[]
	invoice: Invoice | null
}

const ReceiptsPage: React.FC = () => {
	const [activeTab, setActiveTab] = useState<'client' | 'supplier'>('client')
	const [receipts, setReceipts] = useState<Receipt[]>([])
	const [entities, setEntities] = useState<Entity[]>([])
	const [invoices, setInvoices] = useState<Invoice[]>([])
	const [filteredInvoices, setFilteredInvoices] = useState<any>([])
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
		files: [],
		currency: 'usd'
	})
	const [selectedFile, setSelectedFile] = useState<File | null>(null)
	const [uploadingFile, setUploadingFile] = useState(false)
	const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null)
	const [isEditing, setIsEditing] = useState(false)
	const [selectedEntityId, setSelectedEntityId] = useState<any>(null)
	const [validationErrors, setValidationErrors] = useState<string[]>([])
	const [validationWarnings, setValidationWarnings] = useState<string[]>([])

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

	// FIXED: Enhanced validation function with proper total price validation
	const validateReceiptCreation = async (receiptData: Partial<Receipt>): Promise<ReceiptValidation> => {
		const table = activeTab === 'client' ? 'ClientInvoices' : 'SupplierInvoices'
		const errors: string[] = []
		const warnings: string[] = []
		
		try {
			if (!receiptData.invoice_id) {
				errors.push('Please select an invoice')
				return { isValid: false, errors, warnings, invoice: null }
			}

			// FIXED: Fetch invoice details including shipping fee for proper validation
			const { data: invoice, error: invoiceError }:any = await supabase
				.from(table)
				.select('total_price, remaining_amount, currency, type, shipping_fee')
				.eq('id', receiptData.invoice_id)
				.single()

			if (invoiceError) {
				errors.push(`Error fetching invoice: ${invoiceError.message}`)
				return { isValid: false, errors, warnings, invoice: null }
			}


			// Ensure all amounts are properly handled as numbers
			const invoiceTotalPrice = Number(invoice.total_price) || 0
			const invoiceRemainingAmount = Number(invoice.remaining_amount) || 0
			const receiptAmount = Number(receiptData.amount) || 0
			const shippingFee = Number(invoice.shipping_fee) || 0


			// Validate amount
			if (receiptAmount <= 0) {
				errors.push('Receipt amount must be greater than zero')
			}

			// FIXED: Enhanced remaining amount validation
			if (receiptAmount > invoiceRemainingAmount) {
				errors.push(
					`Receipt amount ($${receiptAmount.toFixed(2)}) cannot exceed remaining invoice amount ($${invoiceRemainingAmount.toFixed(2)})`
				)
			}

			// Validate return invoice receipts
			if (invoice.type === 'return') {
				errors.push('Cannot create receipts for return invoices')
			}

			// Currency validation - receipt should match invoice currency
			const invoiceCurrency = invoice.currency || 'usd'
			const receiptCurrency = receiptData.currency || invoiceCurrency
			
			if (receiptCurrency !== invoiceCurrency) {
				errors.push(`Receipt currency (${receiptCurrency.toUpperCase()}) must match invoice currency (${invoiceCurrency.toUpperCase()})`)
			}

			// FIXED: Enhanced overpayment warning with shipping fee consideration
			if (receiptAmount > invoiceRemainingAmount * 0.9) {
				warnings.push('This payment will nearly or fully settle the invoice')
			}

			// Additional validation: Check if remaining amount makes sense in relation to total price
			if (invoiceRemainingAmount > invoiceTotalPrice + 0.01) { // Allow small rounding differences
				warnings.push(`Warning: Invoice remaining amount ($${invoiceRemainingAmount.toFixed(2)}) is greater than total price ($${invoiceTotalPrice.toFixed(2)}). This may indicate a data integrity issue.`)
			}

			return {
				isValid: errors.length === 0,
				errors,
				warnings,
				invoice
			}
		} catch (error: any) {
			errors.push(`Validation error: ${error.message}`)
			return { isValid: false, errors, warnings, invoice: null }
		}
	}

	// Add this new function to update filtered invoices when an entity is selected
	const updateFilteredInvoices = (entityId: number | string | null) => {
		if (!entityId) {
			setFilteredInvoices(invoices)
			return
		}

		const idField = activeTab === 'client' ? 'client_id' : 'supplier_id'
		const filtered = invoices.filter(invoice => invoice[idField as keyof Invoice] === entityId)
		setFilteredInvoices(filtered)
	}

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

	// FIXED: Enhanced invoice fetching with shipping fee
	const fetchInvoices = async () => {
		const table = activeTab === 'client' ? 'ClientInvoices' : 'SupplierInvoices'
		const selectFields = activeTab === 'client' 
		  ? 'id, total_price, remaining_amount, client_id, currency, type, shipping_fee'
		  : 'id, total_price, remaining_amount, supplier_id, currency, type, shipping_fee'
		
		const { data, error } = await supabase
		  .from(table)
		  .select(selectFields)
		  .gt('remaining_amount', 0)
		  .neq('type', 'return') // Exclude return invoices
		if (error) {
		  toast.error(`Error fetching invoices: ${error.message}`)
		} else {
		  setInvoices(data || [])
		  setFilteredInvoices(data || [])
		}
	}

	const getCurrencySymbol = (currency: 'usd' | 'euro' | undefined): string => {
		return currency === 'euro' ? '€' : '$'
	}

	const getInvoiceCurrency = (invoiceId: number): 'usd' | 'euro' => {
		const invoice = invoices.find(inv => inv.id === invoiceId)
		return invoice?.currency || 'usd'
	}

	// FIXED: Enhanced receipt creation with proper amount handling and precision
const handleCreateOrUpdateReceipt = async () => {
  const table = activeTab === 'client' ? 'ClientReceipts' : 'SupplierReceipts'
  
  try {
    
    // Reset validation state
    setValidationErrors([])
    setValidationWarnings([])

    // Validate receipt data
    const validation = await validateReceiptCreation(newReceipt)
    
    if (!validation.isValid) {
      setValidationErrors(validation.errors)
      setValidationWarnings(validation.warnings)
      toast.error('Please fix validation errors before creating the receipt')
      return
    }

    // Set warnings if any
    if (validation.warnings.length > 0) {
      setValidationWarnings(validation.warnings)
    }

    // FIXED: Ensure proper amount precision and currency handling
    const receiptWithCurrency = {
      ...newReceipt,
      currency: validation.invoice?.currency || 'usd',
      amount: Math.round((Number(newReceipt.amount) || 0) * 100) / 100 // Round to 2 decimal places
    }


    if (isEditing && receiptWithCurrency.id) {
      // EDIT CASE
      const { data: originalReceiptData, error: fetchError } = await supabase
        .from(table)
        .select('*')
        .eq('id', receiptWithCurrency.id)
        .single()

      if (fetchError) {
        throw new Error(`Error fetching original receipt: ${fetchError.message}`)
      }

      // Use database transaction for consistency
      const { error: updateError } = await supabase.rpc('update_receipt_with_balance_adjustment', {
        p_receipt_id: receiptWithCurrency.id,
        p_new_amount: receiptWithCurrency.amount,
        p_new_invoice_id: receiptWithCurrency.invoice_id,
        p_new_paid_at: receiptWithCurrency.paid_at,
        p_new_files: receiptWithCurrency.files || [],
        p_is_client: activeTab === 'client'
      })

      if (updateError) {
        // Fallback to manual update if RPC doesn't exist
        await updateReceiptManually(originalReceiptData, receiptWithCurrency)
      }
      
      toast.success('Receipt updated successfully')
    } else {
      // CREATE CASE
      const { data: createdReceipt, error: createError } = await supabase
        .from(table)
        .insert(receiptWithCurrency)
        .select()
        .single()

      if (createError) {
        throw new Error(`Error creating receipt: ${createError.message}`)
      }

      // Update invoice and entity balance with enhanced validation
      await updateInvoiceAndEntityBalanceWithValidation(receiptWithCurrency)
      toast.success('Receipt created successfully')
    }

    setShowModal(false)
    setSelectedEntityId(null)
    resetReceiptForm()
    fetchReceipts()
    
  } catch (error: any) {
    console.error('Receipt operation error:', error)
    toast.error(error.message || `Error ${isEditing ? 'updating' : 'creating'} receipt`)
    
    // Show detailed error for debugging
    if (error.details) {
      console.error('Error details:', error.details)
    }
  }
}

// FIXED: Enhanced manual receipt update with proper precision handling
const updateReceiptManually = async (
  originalReceipt: Receipt,
  updatedReceipt: Partial<Receipt>
) => {
  const table = activeTab === 'client' ? 'ClientReceipts' : 'SupplierReceipts'
  const invoiceTable = activeTab === 'client' ? 'ClientInvoices' : 'SupplierInvoices'
  const entityTable = activeTab === 'client' ? 'Clients' : 'Suppliers'
  const idField = activeTab === 'client' ? 'client_id' : 'supplier_id'
  const entityPkField = activeTab === 'client' ? 'client_id' : 'id'

  try {


    // Step 1: Update the receipt record
    const { error: updateReceiptError } = await supabase
      .from(table)
      .update({
        amount: updatedReceipt.amount,
        invoice_id: updatedReceipt.invoice_id,
        paid_at: updatedReceipt.paid_at,
        files: updatedReceipt.files || [],
        currency: updatedReceipt.currency,
        [idField]: updatedReceipt[idField as keyof Receipt]
      })
      .eq('id', originalReceipt.id)

    if (updateReceiptError) {
      throw new Error(`Error updating receipt: ${updateReceiptError.message}`)
    }

    // Step 2: Handle invoice changes with enhanced amount validation
    if (originalReceipt.invoice_id !== updatedReceipt.invoice_id) {
      // Invoice changed - need to handle both old and new invoices
      
      // Restore original invoice
      const { data: originalInvoice, error: originalInvoiceError } = await supabase
        .from(invoiceTable)
        .select('remaining_amount, total_price, shipping_fee')
        .eq('id', originalReceipt.invoice_id)
        .single()

      if (originalInvoiceError) {
        throw new Error(`Error fetching original invoice: ${originalInvoiceError.message}`)
      }

      const originalAmount = Number(originalReceipt.amount) || 0
      const restoredAmount = (Number(originalInvoice.remaining_amount) || 0) + originalAmount
      const maxAmount = Math.abs(Number(originalInvoice.total_price) || 0)
      
      const { error: restoreError } = await supabase
        .from(invoiceTable)
        .update({ remaining_amount: Math.min(restoredAmount, maxAmount) })
        .eq('id', originalReceipt.invoice_id)

      if (restoreError) {
        throw new Error(`Error restoring original invoice: ${restoreError.message}`)
      }

      // Update new invoice
      const { data: newInvoice, error: newInvoiceError } = await supabase
        .from(invoiceTable)
        .select('remaining_amount, total_price, type, shipping_fee')
        .eq('id', updatedReceipt.invoice_id)
        .single()

      if (newInvoiceError) {
        throw new Error(`Error fetching new invoice: ${newInvoiceError.message}`)
      }

      // Validate that we can apply this payment
      if (newInvoice.type === 'return') {
        throw new Error('Cannot create receipts for return invoices')
      }

      const updatedAmount = Number(updatedReceipt.amount) || 0
      const newInvoiceRemaining = Number(newInvoice.remaining_amount) || 0

      if (updatedAmount > newInvoiceRemaining) {
        throw new Error(`Payment amount ($${updatedAmount.toFixed(2)}) exceeds remaining invoice amount ($${newInvoiceRemaining.toFixed(2)})`)
      }

      const newRemainingAmount = Math.max(0, newInvoiceRemaining - updatedAmount)
      
      const { error: applyError } = await supabase
        .from(invoiceTable)
        .update({ remaining_amount: newRemainingAmount })
        .eq('id', updatedReceipt.invoice_id)

      if (applyError) {
        throw new Error(`Error applying payment to new invoice: ${applyError.message}`)
      }
    } else {
      // Same invoice, different amount
      const originalAmount = Number(originalReceipt.amount) || 0
      const updatedAmount = Number(updatedReceipt.amount) || 0
      const amountDifference = updatedAmount - originalAmount
      
      if (Math.abs(amountDifference) > 0.01) {
        const { data: invoice, error: invoiceError } = await supabase
          .from(invoiceTable)
          .select('remaining_amount, total_price, type, shipping_fee')
          .eq('id', updatedReceipt.invoice_id)
          .single()

        if (invoiceError) {
          throw new Error(`Error fetching invoice: ${invoiceError.message}`)
        }

        if (invoice.type === 'return') {
          throw new Error('Cannot modify receipts for return invoices')
        }

        const currentRemaining = Number(invoice.remaining_amount) || 0
        const newRemainingAmount = currentRemaining - amountDifference
        const maxAmount = Math.abs(Number(invoice.total_price) || 0)
        
        if (newRemainingAmount < 0) {
          throw new Error(`Payment adjustment would result in overpayment`)
        }

        const { error: updateError } = await supabase
          .from(invoiceTable)
          .update({ remaining_amount: Math.min(newRemainingAmount, maxAmount) })
          .eq('id', updatedReceipt.invoice_id)

        if (updateError) {
          throw new Error(`Error updating invoice amount: ${updateError.message}`)
        }
      }
    }

    // Step 3: Handle entity balance changes with proper precision
    const originalEntityId:any = originalReceipt[idField as keyof Receipt]
    const newEntityId:any = updatedReceipt[idField as keyof Receipt]
    
    if (originalEntityId !== newEntityId) {
      // Entity changed
      if (originalEntityId) {
        await adjustEntityBalance(originalEntityId, Number(originalReceipt.amount) || 0, entityTable, entityPkField)
      }
      
      if (newEntityId) {
        await adjustEntityBalance(newEntityId, -(Number(updatedReceipt.amount) || 0), entityTable, entityPkField)
      }
    } else {
      // Same entity, different amount
      const originalAmount = Number(originalReceipt.amount) || 0
      const updatedAmount = Number(updatedReceipt.amount) || 0
      const amountDifference = updatedAmount - originalAmount
      if (Math.abs(amountDifference) > 0.01 && newEntityId) {
        await adjustEntityBalance(newEntityId, -amountDifference, entityTable, entityPkField)
      }
    }

  } catch (error) {
    console.error('Error in manual receipt update:', error)
    throw error
  }
}

// FIXED: Enhanced entity balance adjustment with proper precision
const adjustEntityBalance = async (
  entityId: number | string,
  adjustment: number,
  entityTable: string,
  entityPkField: string
) => {
  if (Math.abs(adjustment) < 0.01) return // Skip tiny adjustments

  const { data: entity, error: entityError } = await supabase
    .from(entityTable)
    .select('balance')
    .eq(entityPkField, entityId)
    .single()

  if (entityError) {
    throw new Error(`Error fetching entity: ${entityError.message}`)
  }

  const currentBalance = Number(entity.balance) || 0
  const newBalance = Math.round((currentBalance + adjustment) * 100) / 100 // Round to 2 decimal places



  const { error: updateError } = await supabase
    .from(entityTable)
    .update({ balance: newBalance })
    .eq(entityPkField, entityId)

  if (updateError) {
    throw new Error(`Error updating entity balance: ${updateError.message}`)
  }
}

// FIXED: Enhanced function with proper amount validation and precision handling
const updateInvoiceAndEntityBalanceWithValidation = async (receipt: Partial<Receipt>) => {
  const invoiceTable = activeTab === 'client' ? 'ClientInvoices' : 'SupplierInvoices'
  const entityTable = activeTab === 'client' ? 'Clients' : 'Suppliers'
  const idField = activeTab === 'client' ? 'client_id' : 'supplier_id'
  const entityPkField = activeTab === 'client' ? 'client_id' : 'id'

  try {
    // Validate invoice exists and get current state
    const { data: invoice, error: invoiceError } = await supabase
      .from(invoiceTable)
      .select('remaining_amount, total_price, type, shipping_fee')
      .eq('id', receipt.invoice_id)
      .single()

    if (invoiceError) {
      throw new Error(`Invoice not found: ${invoiceError.message}`)
    }


    // Ensure all amounts are properly handled as numbers
    const receiptAmount = Number(receipt.amount) || 0
    const invoiceRemaining = Number(invoice.remaining_amount) || 0
    const invoiceTotal = Number(invoice.total_price) || 0
    const shippingFee = Number(invoice.shipping_fee) || 0



    // Validate receipt amount
    if (receiptAmount <= 0) {
      throw new Error('Receipt amount must be greater than zero')
    }

    if (invoice.type === 'return') {
      throw new Error('Cannot create receipts for return invoices')
    }

    if (receiptAmount > invoiceRemaining) {
      throw new Error(`Receipt amount ($${receiptAmount.toFixed(2)}) exceeds remaining invoice amount ($${invoiceRemaining.toFixed(2)})`)
    }

    // Update invoice remaining amount with proper precision
    const newRemainingAmount = Math.max(0, Math.round((invoiceRemaining - receiptAmount) * 100) / 100)
    


    const { error: updateInvoiceError } = await supabase
      .from(invoiceTable)
      .update({ remaining_amount: newRemainingAmount })
      .eq('id', receipt.invoice_id)

    if (updateInvoiceError) {
      throw new Error(`Error updating invoice: ${updateInvoiceError.message}`)
    }

    // Update entity balance with proper precision
    const entityId:any = receipt[idField as keyof Receipt]
    if (entityId) {
      await adjustEntityBalance(entityId, -receiptAmount, entityTable, entityPkField)
    }



  } catch (error) {
    console.error('Error updating invoice and entity balance:', error)
    throw error
  }
}

// FIXED: Enhanced receipt deletion with proper amount restoration
const handleDeleteReceipt = async (id: number) => {
  if (!window.confirm('Are you sure you want to delete this receipt?')) {
    return
  }

  const table = activeTab === 'client' ? 'ClientReceipts' : 'SupplierReceipts'
  
  try {


    // Get receipt data first
    const { data: receiptData, error: fetchError } = await supabase
      .from(table)
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError) {
      throw new Error(`Error fetching receipt: ${fetchError.message}`)
    }


    // Validate we can delete this receipt
    const invoiceTable = activeTab === 'client' ? 'ClientInvoices' : 'SupplierInvoices'
    const { data: invoice, error: invoiceError } = await supabase
      .from(invoiceTable)
      .select('total_price, type, remaining_amount, shipping_fee')
      .eq('id', receiptData.invoice_id)
      .single()

    if (invoiceError) {
      throw new Error(`Error fetching related invoice: ${invoiceError.message}`)
    }

    // Delete associated files first
    for (const fileUrl of receiptData.files || []) {
      try {
        await handleFileDelete(fileUrl)
      } catch (fileError) {
        console.warn('Failed to delete file:', fileUrl, fileError)
        // Continue with receipt deletion even if file deletion fails
      }
    }

    // Delete the receipt
    const { error: deleteError } = await supabase
      .from(table)
      .delete()
      .eq('id', id)

    if (deleteError) {
      throw new Error(`Error deleting receipt: ${deleteError.message}`)
    }

    // FIXED: Restore invoice and entity balances with proper precision
    const receiptAmount = Number(receiptData.amount) || 0
    const currentRemaining = Number(invoice.remaining_amount) || 0
    const invoiceTotal = Number(invoice.total_price) || 0
    
    // Restore the remaining amount but don't exceed the total price
    const restoredRemaining = Math.min(
      Math.round((currentRemaining + receiptAmount) * 100) / 100,
      Math.abs(invoiceTotal)
    )


    const { error: restoreInvoiceError } = await supabase
      .from(invoiceTable)
      .update({ remaining_amount: restoredRemaining })
      .eq('id', receiptData.invoice_id)

    if (restoreInvoiceError) {
      throw new Error(`Error restoring invoice balance: ${restoreInvoiceError.message}`)
    }

    // Restore entity balance
    const entityTable = activeTab === 'client' ? 'Clients' : 'Suppliers'
    const entityPkField = activeTab === 'client' ? 'client_id' : 'id'
    const entityId = receiptData[activeTab === 'client' ? 'client_id' : 'supplier_id']

    if (entityId) {
      await adjustEntityBalance(entityId, receiptAmount, entityTable, entityPkField)
    }

    toast.success('Receipt deleted successfully')
    fetchReceipts()
    
  } catch (error: any) {
    console.error('Delete receipt error:', error)
    toast.error(error.message || 'Error deleting receipt')
  }
}

	const handleSendEmail = async (receipt: Receipt) => {
		const recipientEmail =
			activeTab === 'client'
				? entities.find(entity => entity.client_id === receipt.client_id)?.email
				: entities.find(entity => entity.id === receipt.supplier_id)?.email

		if (!recipientEmail) {
			toast.error('Recipient email not found')
			return
		}

		try {
			const response = await fetch('/api/send-receipt-email', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ receipt, recipientEmail, activeTab })
			})

			if (response.ok) {
				toast.success('Receipt email sent successfully')
			} else {
				const error = await response.json()
				throw new Error(error.message)
			}
		} catch (error) {
			console.error('Error sending receipt email:', error)
			toast.error('Failed to send receipt email. Please try again.')
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

	const resetReceiptForm = () => {
		setNewReceipt({
			paid_at: new Date().toISOString(),
			amount: 0,
			files: [],
			currency: 'usd'
		})
		setSelectedEntityId(null)
		setIsEditing(false)
		setValidationErrors([])
		setValidationWarnings([])
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
						<th className='py-3 px-6 text-left'>
							{activeTab === 'client' ? 'Client' : 'Supplier'}
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
						<th className='py-3 px-6 text-center'>Currency</th>
						<th className='py-3 px-6 text-center'>Files</th>
						<th className='py-3 px-6 text-center'>Actions</th>
					</tr>
				</thead>
				<tbody className='text-neutral-600 text-sm font-light'>
					{receipts.map(receipt => {
						const currency:any = receipt.currency || getInvoiceCurrency(receipt.invoice_id)
						const currencySymbol = getCurrencySymbol(currency)
						
						return (
							<tr
								key={receipt.id}
								className='border-b border-gray hover:bg-indigo-200'
								onClick={() => setSelectedReceipt(receipt)}>
								<td className='py-3 px-6 text-left whitespace-nowrap'>
									{receipt.id}
								</td>
								<td className='py-3 px-6 text-left whitespace-nowrap'>
									{activeTab === 'client'
										? entities.find(
												entity => entity.client_id === receipt.client_id
										  )?.name
										: entities.find(entity => entity.id === receipt.supplier_id)
												?.name || '-'}
								</td>
								<td className='py-3 px-6 text-left'>
									{new Date(receipt.paid_at).toLocaleDateString()}
								</td>
								<td className='py-3 px-6 text-left'>{receipt.invoice_id}</td>
								<td className='py-3 px-6 text-left'>
									{currencySymbol}{Number(receipt.amount).toFixed(2)}
								</td>
								<td className='py-3 px-6 text-center'>
									{(currency || 'usd').toUpperCase()}
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
								<td className='py-3  text-center'>
									<div className='flex item-center justify-center'>
										<button
											className='mr-2 bg-blue text-white p-1 rounded-lg text-nowrap transform  hover:scale-110'
											onClick={e => {
												e.stopPropagation()
												handleSendEmail(receipt)
											}}>
											Send Email
										</button>
										<button
											className='w-4 mr-2 transform hover:text-blue hover:scale-110'
											onClick={(e) => {
												e.stopPropagation()
												handleEditReceipt(receipt)
											}}>
											<FaEdit />
										</button>
										<button
											className='w-4 mr-2 transform hover:text-blue hover:scale-110'
											onClick={(e) => {
												e.stopPropagation()
												handleDeleteReceipt(receipt.id)
											}}>
											<FaTrash />
										</button>
									</div>
								</td>
							</tr>
						)
					})}
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
						className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray bg-white text-sm font-medium text-gray hover:bg-indigo-200 ${
							currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''
						}`}>
						<span className='sr-only'>First</span>⟪
					</button>
					<button
						onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
						disabled={currentPage === 1}
						className={`relative inline-flex items-center px-2 py-2 border border-gray bg-white text-sm font-medium text-gray hover:bg-indigo-200 ${
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
						className={`relative inline-flex items-center px-2 py-2 border border-gray bg-white text-sm font-medium text-gray hover:bg-indigo-200 ${
							currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''
						}`}>
						<span className='sr-only'>Next</span>⟩
					</button>
					<button
						onClick={() => setCurrentPage(totalPages)}
						disabled={currentPage === totalPages}
						className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray bg-white text-sm font-medium text-gray hover:bg-indigo-200 ${
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
			
			{/* Fixed Filter Component */}
			<SearchableSelect
				options={entities}
				value={filterEntity}
				onChange={handleFilterEntityChange}
				placeholder={`Filter by ${activeTab === 'client' ? 'Client' : 'Supplier'}`}
				label={`Filter ${activeTab === 'client' ? 'Client' : 'Supplier'}`}
				idField={activeTab === 'client' ? 'client_id' : 'id'}
				className="min-w-[200px]"
			/>
		</div>
	)

	// FIXED: Enhanced receipt modal with better amount validation and precision
	const renderReceiptModal = () => {
		const selectedInvoice = newReceipt.invoice_id 
			? invoices.find(invoice => invoice.id === newReceipt.invoice_id) 
			: null;
		const currency = selectedInvoice?.currency || 'usd';
		const currencySymbol = getCurrencySymbol(currency);
		
		const entityField = activeTab === 'client' ? 'client_id' : 'supplier_id';
		const entityLabel = activeTab === 'client' ? 'Client' : 'Supplier';

		return (
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
							<h3 className='text-lg leading-6 font-medium text-neutral-900 mb-4'>
								{isEditing ? 'Edit Receipt' : 'Create New Receipt'}
							</h3>

							{/* Enhanced validation display */}
							{(validationErrors.length > 0 || validationWarnings.length > 0) && (
								<div className="mb-4 space-y-2">
									{validationErrors.length > 0 && (
										<div className="bg-red-50 border border-red-200 rounded-md p-4">
											<div className="flex">
												<FaExclamationTriangle className="text-red-400 mt-1 mr-2" />
												<div>
													<h3 className="text-sm font-medium text-red-800">Please fix the following errors:</h3>
													<ul className="list-disc list-inside text-sm text-red-700 mt-1 space-y-1">
														{validationErrors.map((error, index) => (
															<li key={index}>{error}</li>
														))}
													</ul>
												</div>
											</div>
										</div>
									)}
									
									{validationWarnings.length > 0 && (
										<div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
											<div className="flex">
												<FaExclamationTriangle className="text-yellow-400 mt-1 mr-2" />
												<div>
													<h3 className="text-sm font-medium text-yellow-800">Warnings:</h3>
													<ul className="list-disc list-inside text-sm text-yellow-700 mt-1 space-y-1">
														{validationWarnings.map((warning, index) => (
															<li key={index}>{warning}</li>
														))}
													</ul>
												</div>
											</div>
										</div>
									)}
								</div>
							)}

							<form>
								<div className='mb-4'>
									<label
										className='block text-neutral-700 text-sm font-bold mb-2'
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
										className='shadow appearance-none border rounded w-full py-2 px-3 text-neutral-700 leading-tight focus:outline-none focus:shadow-outline'
									/>
								</div>
								
								{/* Step 1: Select entity (client or supplier) */}
								<div className='mb-4'>
									<label
										className='block text-neutral-700 text-sm font-bold mb-2'
										htmlFor='entity'>
										{entityLabel}
									</label>
									<SearchableSelect
										options={entities}
										value={selectedEntityId}
										onChange={(value) => {
											setSelectedEntityId(value);
											updateFilteredInvoices(value);
											// Clear the invoice selection when entity changes
											setNewReceipt({
												...newReceipt,
												invoice_id: undefined,
												[entityField]: value
											});
											// Clear validation errors when entity changes
											setValidationErrors([]);
											setValidationWarnings([]);
										}}
										placeholder={`Select ${entityLabel}`}
										label={entityLabel}
										idField={activeTab === 'client' ? 'client_id' : 'id'}
										className='w-full'
									/>
								</div>
								
								{/* Step 2: Select invoice (filtered by entity) with enhanced display */}
								<div className='mb-4'>
									<label
										className='block text-neutral-700 text-sm font-bold mb-2'
										htmlFor='invoice'>
										Invoice
									</label>
									{selectedEntityId ? (
										// Show filtered invoices with nice formatting
										<div className='max-h-40 overflow-y-auto border border-neutral-300 rounded'>
											{filteredInvoices.length > 0 ? (
												filteredInvoices.map((invoice:any) => {
													const invCurrencySymbol = getCurrencySymbol(invoice.currency);
													const invoiceTotal = Number(invoice.total_price) || 0;
													const invoiceRemaining = Number(invoice.remaining_amount) || 0;
													const shippingFee = Number(invoice.shipping_fee) || 0;
													
													return (
														<div 
															key={invoice.id}
															className={`p-2 cursor-pointer hover:bg-indigo-100 ${newReceipt.invoice_id === invoice.id ? 'bg-indigo-200' : ''}`}
															onClick={() => {
																setNewReceipt({
																	...newReceipt,
																	invoice_id: invoice.id,
																	currency: invoice.currency
																})
																// Clear validation errors when invoice changes
																setValidationErrors([]);
																setValidationWarnings([]);
															}}
														>
															<div className='font-medium'>Invoice #{invoice.id}</div>
															<div className='text-sm text-neutral-600'>
																Total: {invCurrencySymbol}{invoiceTotal.toFixed(2)} 
																{shippingFee > 0 && ` (incl. ${invCurrencySymbol}${shippingFee.toFixed(2)} shipping)`}
															</div>
															<div className='text-sm text-neutral-600'>
																Remaining: {invCurrencySymbol}{invoiceRemaining.toFixed(2)} ({invoice?.currency?.toUpperCase()})
															</div>
														</div>
													);
												})
											) : (
												<div className='p-3 text-neutral-500 italic'>
													No invoices found for this {entityLabel.toLowerCase()}
												</div>
											)}
										</div>
									) : (
										<div className='p-3 border border-neutral-300 rounded text-neutral-500 italic'>
											Please select a {entityLabel.toLowerCase()} first
										</div>
									)}
								</div>
								
								{/* FIXED: Enhanced amount input with better validation */}
								<div className='mb-4'>
									<label
										className='block text-neutral-700 text-sm font-bold mb-2'
										htmlFor='amount'>
										Amount {selectedInvoice ? `(${currency?.toUpperCase()})` : ''}
									</label>
									<div className='relative'>
										<span className='absolute left-3 top-2 text-neutral-700'>
											{currencySymbol}
										</span>
										<input
											type='number'
											id='amount'
											step="0.01"
											min="0"
											className='shadow appearance-none border rounded w-full py-2 pl-8 pr-3 text-neutral-700 leading-tight focus:outline-none focus:shadow-outline'
											value={newReceipt.amount || ''}
											onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
												const value = e.target.value;
												// Allow empty string for clearing the field
												if (value === '') {
													setNewReceipt({
														...newReceipt,
														amount: 0
													});
												} else {
													const numValue = parseFloat(value);
													if (!isNaN(numValue) && numValue >= 0) {
														setNewReceipt({
															...newReceipt,
															amount: numValue
														});
													}
												}
											}}
											placeholder='0.00'
										/>
									</div>
									{selectedInvoice && (
										<div className="mt-1 text-sm text-neutral-600">
											<div>Invoice total: {currencySymbol}{Number(selectedInvoice.total_price).toFixed(2)}</div>
											<div>Invoice remaining: {currencySymbol}{Number(selectedInvoice.remaining_amount).toFixed(2)}</div>
											{Number(selectedInvoice.shipping_fee) > 0 && (
												<div className="text-xs text-neutral-500">
													(Includes {currencySymbol}{Number(selectedInvoice.shipping_fee).toFixed(2)} shipping fee)
												</div>
											)}
										</div>
									)}
								</div>
								
								{/* Files section */}
								<div className='mb-4'>
									<label className='block text-neutral-700 text-sm font-bold mb-2'>
										Files
									</label>
									<input
										type='file'
										onChange={handleFileChange}
										className='shadow appearance-none border rounded w-full py-2 px-3 text-neutral-700 leading-tight focus:outline-none focus:shadow-outline'
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
								className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm ${
									validationErrors.length > 0 || !newReceipt.invoice_id
										? 'bg-neutral-400 cursor-not-allowed'
										: 'bg-blue hover:bg-blue focus:ring-blue'
								}`}
								onClick={handleCreateOrUpdateReceipt}
								disabled={validationErrors.length > 0 || !newReceipt.invoice_id}>
								{isEditing ? 'Update Receipt' : 'Create Receipt'}
							</button>
							<button
								type='button'
								className='mt-3 w-full inline-flex justify-center rounded-md border border-gray shadow-sm px-4 py-2 bg-white text-base font-medium text-gray hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm'
								onClick={() => {
									setShowModal(false)
									resetReceiptForm()
								}}>
								Cancel
							</button>
						</div>
					</div>
				</div>
			</div>
		)
	}

	const renderReceiptDetails = () => {
		if (!selectedReceipt) return null

		const currency:any = selectedReceipt.currency || getInvoiceCurrency(selectedReceipt.invoice_id)
		const currencySymbol = getCurrencySymbol(currency)

		return (
			<div className='fixed inset-0 bg-gray bg-opacity-50 overflow-y-auto h-full w-full'>
				<div className='relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white'>
					<div className='mt-3 text-center'>
						<h3 className='text-lg leading-6 font-medium text-neutral-900'>
							Receipt Details
						</h3>
						<div className='mt-2 px-7 py-3'>
							<p className='text-sm text-neutral-500'>ID: {selectedReceipt.id}</p>
							<p className='text-sm text-neutral-500'>
								Date: {new Date(selectedReceipt.paid_at).toLocaleDateString()}
							</p>
							<p className='text-sm text-neutral-500'>
								Amount: {currencySymbol}{Number(selectedReceipt.amount).toFixed(2)} ({currency?.toUpperCase()})
							</p>
							<p className='text-sm text-neutral-500'>
								Invoice ID: {selectedReceipt.invoice_id}
							</p>
							<h4 className='text-sm font-medium text-neutral-900 mt-4'>Files:</h4>
							<ul className='list-disc list-inside'>
								{selectedReceipt.files.map((file, index) => (
									<li key={index} className='text-sm text-neutral-500'>
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
								className='px-4 py-2 bg-blue text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 mb-2'
								onClick={() => {
									// Pass currency information to PDF generator
									generatePDF('receipt', {
										...selectedReceipt,
										currency: currency
									})
								}}>
								Download PDF
							</button>
							<button
								className='px-4 py-2 bg-gray text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-300'
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

	const handleEditReceipt = (receipt: any) => {
		setNewReceipt({
			...receipt,
			currency: receipt.currency || getInvoiceCurrency(receipt.invoice_id),
			amount: Number(receipt.amount) || 0 // Ensure amount is a number
		})
		setSelectedEntityId(receipt[activeTab === 'client' ? 'client_id' : 'supplier_id'])
		updateFilteredInvoices(receipt[activeTab === 'client' ? 'client_id' : 'supplier_id'])
		setIsEditing(true)
		setValidationErrors([])
		setValidationWarnings([])
		setShowModal(true)
	}

	return (
		<div className='mx-auto px-4 py-8 text-black'>
			<div className='flex flex-row justify-between items-center align-middle mb-5'>
				<h1 className='text-3xl font-bold text-gray'>Receipt Management</h1>
				<button
					className=' bg-blue hover:bg-indigo-200 text-white font-bold py-2 px-4 rounded-full shadow-lg transition duration-300 ease-in-out transform hover:-translate-y-1 hover:scale-110'
					onClick={() => {
						resetReceiptForm()
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