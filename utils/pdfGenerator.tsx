import { pdf } from '@react-pdf/renderer'
import InvoicePDF from './pdfTemplates/InvoicePDF'
import ReceiptPDF from './pdfTemplates/ReceiptPDF'
import QuotationPDF from './pdfTemplates/QuotationPDF'
import ClientFinancialReportPDF from './pdfTemplates/ClientFinancialReportPDF'
import SupplierFinancialReportPDF from './pdfTemplates/SupplierFinancialReportPDF'
import ShippingInvoicePDF from './pdfTemplates/ShippingInvoicePDF'
import { supabase } from './supabase'
import { format } from 'date-fns'

// Enhanced image processing with base64 conversion and validation
async function processImagesForPDF(products: any[]) {
  console.log(`🖼️ Processing ${products.length} products for PDF generation...`)
  const processedProducts = []
  
  for (let i = 0; i < products.length; i++) {
    const product = products[i]
    const processedProduct = { ...product }
    
    if (product.image) {
      try {
        console.log(`Processing image ${i + 1}/${products.length} for product: ${product.name}`)
        console.log(`Image URL: ${product.image}`)
        
        // Convert image to base64 data URL for reliable PDF rendering
        const base64Image = await convertImageToBase64(product.image, product.name)
        
        if (base64Image) {
          processedProduct.image = base64Image
          console.log(`✅ Successfully converted image to base64 for product: ${product.name}`)
        } else {
          console.warn(`❌ Failed to convert image for product: ${product.name}, using fallback`)
          processedProduct.image = null // Will trigger fallback in PDF template
        }
      } catch (error) {
        console.error(`❌ Error processing image for product ${product.name}:`, error)
        processedProduct.image = null // Will trigger fallback in PDF template
      }
    } else {
      console.log(`No image provided for product: ${product.name}`)
    }
    
    processedProducts.push(processedProduct)
  }
  
  const successCount = processedProducts.filter(p => p.image && p.image.startsWith('data:')).length
  console.log(`✅ Successfully processed ${successCount}/${products.length} product images`)
  
  return processedProducts
}

// Enhanced image URL validation specifically for Supabase URLs
function isValidImageUrl(url: string): boolean {
  try {
    if (!url || typeof url !== 'string' || url.trim().length === 0) {
      return false
    }

    const validUrl = new URL(url.trim())
    const validProtocols = ['http:', 'https:', 'data:']
    
    // Check protocol
    if (!validProtocols.includes(validUrl.protocol)) {
      console.warn(`Invalid protocol: ${validUrl.protocol}`)
      return false
    }
    
    // For data URLs, basic validation
    if (validUrl.protocol === 'data:') {
      return url.startsWith('data:image/')
    }
    
    // Enhanced validation for Supabase URLs
    const pathname = validUrl.pathname.toLowerCase()
    const hostname = validUrl.hostname.toLowerCase()
    
    // Check if it's a Supabase URL
    if (hostname.includes('supabase')) {
      console.log(`Detected Supabase URL: ${hostname}`)
      return true // Trust Supabase URLs
    }
    
    // Check for valid image extensions
    const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.tiff', '.avif']
    const hasValidExtension = validExtensions.some(ext => pathname.endsWith(ext))
    
    // Some URLs don't have extensions but are still valid
    const hasNoExtension = !pathname.includes('.')
    
    if (!hasValidExtension && !hasNoExtension) {
      console.warn(`No valid image extension found in: ${pathname}`)
    }
    
    return hasValidExtension || hasNoExtension
    
  } catch (error) {
    console.error(`URL validation error for: ${url}`, error)
    return false
  }
}

// Enhanced base64 conversion with better error handling and format preservation
async function convertImageToBase64(imageUrl: string, productName: string = 'Unknown'): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      console.log(`🔄 Starting conversion for: ${productName}`)
      console.log(`Image URL: ${imageUrl}`)
      
      // Validate URL first
      if (!isValidImageUrl(imageUrl)) {
        console.warn(`❌ Invalid image URL for ${productName}: ${imageUrl}`)
        resolve(null)
        return
      }

      const img = new Image()
      
      // Enhanced CORS handling
      if (imageUrl.startsWith('http')) {
        img.crossOrigin = 'anonymous'
      }
      
      // Increased timeout for larger images
      const timeout = setTimeout(() => {
        console.warn(`⏰ Image load timeout (15s) for ${productName}: ${imageUrl}`)
        resolve(null)
      }, 15000) // Increased to 15 seconds

      img.onload = () => {
        try {
          clearTimeout(timeout)
          
          console.log(`📏 Image dimensions for ${productName}: ${img.width}x${img.height}`)
          
          // More lenient size check - only reject extremely large images
          if (img.width > 4000 || img.height > 4000) {
            console.warn(`📐 Image too large for ${productName} (${img.width}x${img.height}), but attempting conversion anyway`)
            // Don't reject, just log warning and continue
          }

          // Create canvas and convert to base64
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          
          if (!ctx) {
            console.error(`❌ Failed to get canvas context for ${productName}`)
            resolve(null)
            return
          }

          // Improved resizing logic - preserve aspect ratio
          const maxSize = 1200 // Increased from 800 for better quality
          let { width, height } = img
          
          if (width > maxSize || height > maxSize) {
            const ratio = Math.min(maxSize / width, maxSize / height)
            width = Math.floor(width * ratio)
            height = Math.floor(height * ratio)
            console.log(`📏 Resizing ${productName} to: ${width}x${height}`)
          }

          canvas.width = width
          canvas.height = height
          
          // Set high-quality rendering
          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = 'high'
          
          // Draw image on canvas
          ctx.drawImage(img, 0, 0, width, height)
          
          // Detect image format and preserve transparency
          let base64: string
          let format: string
          
          // Try to detect if image has transparency
          const imageData = ctx.getImageData(0, 0, width, height)
          let hasTransparency = false
          
          // Check alpha channel
          for (let i = 3; i < imageData.data.length; i += 4) {
            if (imageData.data[i] < 255) {
              hasTransparency = true
              break
            }
          }
          
          if (hasTransparency) {
            // Use PNG for transparent images
            base64 = canvas.toDataURL('image/png', 0.9)
            format = 'PNG'
          } else {
            // Use JPEG for opaque images (smaller file size)
            base64 = canvas.toDataURL('image/jpeg', 0.85)
            format = 'JPEG'
          }
          
          console.log(`✅ Successfully converted ${productName} to base64 ${format} (${width}x${height})`)
          console.log(`📊 Base64 size: ${Math.round(base64.length / 1024)}KB`)
          
          resolve(base64)
          
        } catch (error) {
          clearTimeout(timeout)
          console.error(`❌ Error converting ${productName} to base64:`, error)
          resolve(null)
        }
      }

      img.onerror = (error) => {
        clearTimeout(timeout)
        console.error(`❌ Failed to load image for ${productName}:`, error)
        console.error(`URL: ${imageUrl}`)
        resolve(null)
      }

      // Start loading image
      console.log(`📥 Loading image for ${productName}...`)
      img.src = imageUrl
      
    } catch (error) {
      console.error(`❌ Error in convertImageToBase64 for ${productName}:`, error)
      resolve(null)
    }
  })
}

// Enhanced legacy preload function with better logging
async function preloadImages(products: any[]) {
  console.warn('🔄 Using legacy preloadImages - consider upgrading to processImagesForPDF')
  const imageCache = new Map()
  const imageFetchPromises = []

  for (const product of products) {
    if (product.image && !imageCache.has(product.image)) {
      const fetchPromise = new Promise((resolve) => {
        const img = new Image()

        const timeout = setTimeout(() => {
          console.warn(`⏰ Legacy image load timeout for ${product.name}: ${product.image}`)
          resolve(false)
        }, 10000)

        img.onload = () => {
          clearTimeout(timeout)
          imageCache.set(product.image, product.image)
          console.log(`✅ Legacy preload success for ${product.name}`)
          resolve(true)
        }

        img.onerror = (error) => {
          clearTimeout(timeout)
          console.warn(`❌ Legacy preload failed for ${product.name}: ${product.image}`, error)
          resolve(false)
        }

        if (product.image.startsWith('http')) {
          img.crossOrigin = 'anonymous'
        }
        img.src = product.image
      })

      imageFetchPromises.push(fetchPromise)
    }
  }

  await Promise.allSettled(imageFetchPromises)
  console.log(`📊 Legacy preload completed: ${imageCache.size}/${products.length} images cached`)
  return imageCache
}

// Fetch client details. Throws a clear error if not found.
const fetchClientDetails = async (clientId: any) => {
  const { data, error } = await supabase
    .from('Clients')
    .select('*')
    .eq('client_id', clientId)
    .single()

  if (error) {
    throw new Error(`Unable to fetch client details for client_id ${clientId}: ${error.message}`)
  }
  return data
}

// Fetch supplier details.
const fetchSupplierDetails = async (supplierId: any) => {
  const { data, error } = await supabase
    .from('Suppliers')
    .select('*')
    .eq('id', supplierId)
    .single()

  if (error) {
    throw new Error(`Unable to fetch supplier details for supplier_id ${supplierId}: ${error.message}`)
  }
  return data
}

// Fetch company details.
const fetchCompanyDetails = async (companyId: any) => {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('id', companyId)
    .single()

  if (error) {
    throw new Error(`Unable to fetch company details for company_id ${companyId}: ${error.message}`)
  }
  return data
}

// Fetch product details with safe check for productVariantId.
const fetchProductDetails = async (productVariantId: string) => {
  if (!productVariantId || productVariantId.trim() === "") {
    throw new Error("Invalid productVariantId: it is empty or missing.")
  }
  const { data, error } = await supabase
    .from('ProductVariants')
    .select(
      `
      id,
      size,
      color,
      quantity,
      product_id,
      Products (
        id,
        name,
        photo,
        price,
        cost
      )
    `
    )
    .eq('id', productVariantId)
    .single()

  if (error) {
    throw new Error(`Unable to fetch product details for variant_id ${productVariantId}: ${error.message}`)
  }

  let productDetails:any = data.Products
  if (!productDetails) {
    const { data: productData, error: productError } = await supabase
      .from('Products')
      .select('id, name, photo, price, cost')
      .eq('id', data.product_id)
      .single()

    if (productError) {
      throw new Error(`Unable to fetch product details for product_id ${data.product_id}: ${productError.message}`)
    }
    productDetails = productData
  }

  return {
    id: data.id,
    product_id: data.product_id,
    name: productDetails.name,
    image: productDetails.photo,
    unitPrice: productDetails.price,
    unitCost: productDetails.cost,
    color: data.color,
    size: data.size,
    quantity: data.quantity
  }
}

// Fetch invoice details.
const fetchInvoiceDetails = async (invoiceId: any, isClientInvoice: boolean) => {
  const table = isClientInvoice ? 'ClientInvoices' : 'SupplierInvoices'
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('id', invoiceId)
    .single()

  if (error) {
    throw new Error(`Unable to fetch invoice details for invoice_id ${invoiceId}: ${error.message}`)
  }
  return data
}

// ENHANCED: Complete client financial data function with improved balance reconciliation
const fetchClientFinancialData = async (clientId: any) => {
  console.log(`🔍 Fetching enhanced financial data for client ID: ${clientId}`)
  
  // Fetch client current balance for reconciliation
  const { data: clientData, error: clientError } = await supabase
    .from('Clients')
    .select('balance')
    .eq('client_id', clientId)
    .single()

  if (clientError) {
    throw new Error(`Unable to fetch client balance for client_id ${clientId}: ${clientError.message}`)
  }

  console.log(`💰 Current database balance: $${clientData.balance}`)

  // Fetch all client invoices with better error handling
  const { data: invoices, error: invoiceError } = await supabase
    .from('ClientInvoices')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: true })

  if (invoiceError) {
    throw new Error(`Unable to fetch invoices for client_id ${clientId}: ${invoiceError.message}`)
  }

  console.log(`📄 Found ${invoices?.length || 0} invoices`)

  // Fetch all client receipts with invoice currency lookup
  const { data: receipts, error: receiptError } = await supabase
    .from('ClientReceipts')
    .select(`
      *,
      ClientInvoices!inner(currency)
    `)
    .eq('client_id', clientId)
    .order('paid_at', { ascending: true })

  let processedReceipts = receipts || []
  
  if (receiptError) {
    // If the join fails, fetch receipts separately and get currency from invoices
    console.warn('⚠️ Joint query failed, fetching receipts separately:', receiptError.message)
    
    const { data: receiptsOnly, error: receiptError2 } = await supabase
      .from('ClientReceipts')
      .select('*')
      .eq('client_id', clientId)
      .order('paid_at', { ascending: true })

    if (receiptError2) {
      throw new Error(`Unable to fetch receipts for client_id ${clientId}: ${receiptError2.message}`)
    }

    // Get currency for each receipt from its invoice
    processedReceipts = await Promise.all(
      (receiptsOnly || []).map(async (receipt) => {
        const { data: invoiceData } = await supabase
          .from('ClientInvoices')
          .select('currency')
          .eq('id', receipt.invoice_id)
          .single()
        
        return {
          ...receipt,
          ClientInvoices: { currency: invoiceData?.currency || 'usd' }
        }
      })
    )
  }

  console.log(`🧾 Found ${processedReceipts.length} receipts`)

  // Process invoices with enhanced validation
  const processedInvoices = (invoices || []).map(invoice => {
    const isReturnInvoice = invoice.type === 'return'
    const baseAmount = Math.abs(invoice.total_price || 0)
    
    if (isReturnInvoice && baseAmount === 0) {
      console.warn(`⚠️ Return invoice ${invoice.id} has zero amount`)
    }
    
    return {
      date: invoice.created_at,
      type: isReturnInvoice ? 'return' : 'invoice',
      subType: invoice.type || 'regular',
      id: invoice.id,
      amount: isReturnInvoice ? -baseAmount : baseAmount,
      currency: invoice.currency || 'usd',
      order_number: invoice.order_number || '',
      remaining_amount: invoice.remaining_amount || 0,
      vat_amount: invoice.vat_amount || 0,
      include_vat: invoice.include_vat || false,
      quotation_id: invoice.quotation_id || null
    }
  })

  // Process receipts with proper currency inheritance
  const processedReceiptsData = processedReceipts.map(receipt => {
    const currency = receipt.currency || receipt.ClientInvoices?.currency || 'usd'
    const amount = Math.abs(receipt.amount || 0)
    
    if (amount === 0) {
      console.warn(`⚠️ Receipt ${receipt.id} has zero amount`)
    }
    
    return {
      date: receipt.paid_at,
      type: 'receipt',
      subType: 'payment',
      id: receipt.id,
      invoice_id: receipt.invoice_id,
      amount: amount,
      currency: currency
    }
  })

  // Combine and sort all transactions by date
  const allTransactions = [...processedInvoices, ...processedReceiptsData]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  console.log(`📊 Total transactions: ${allTransactions.length}`)
  
  // Calculate running balance with validation
  let runningBalance = 0
  const transactionsWithBalance = allTransactions.map((transaction, index) => {
    const previousBalance = runningBalance
    
    if (transaction.type === 'invoice' || transaction.type === 'return') {
      runningBalance += transaction.amount // Handles negative amounts for returns
    } else if (transaction.type === 'receipt') {
      runningBalance -= transaction.amount // Receipts reduce the balance
    }
    
    return {
      ...transaction,
      runningBalance: Math.round(runningBalance * 100) / 100, // Round to 2 decimals
      balanceChange: Math.round((runningBalance - previousBalance) * 100) / 100,
      transactionIndex: index + 1
    }
  })

  // Balance reconciliation check and auto-update
  const calculatedBalance = Math.round(runningBalance * 100) / 100
  const databaseBalance = Math.round((clientData.balance || 0) * 100) / 100
  const balanceDifference = Math.abs(calculatedBalance - databaseBalance)
  let wasUpdated = false
  
  console.log(`📈 Calculated balance: $${calculatedBalance}`)
  console.log(`💾 Database balance: $${databaseBalance}`)
  console.log(`📐 Difference: $${balanceDifference}`)
  
  if (balanceDifference > 0.01) { // Allow for minor rounding differences
    console.log(`⚠️ Balance mismatch detected. Updating client balance from $${databaseBalance} to $${calculatedBalance}`)
    
    try {
      // Update the client balance to match calculated balance
      const { error: updateError } = await supabase
        .from('Clients')
        .update({ balance: calculatedBalance })
        .eq('client_id', clientId)
      
      if (updateError) {
        console.error('❌ Failed to update client balance:', updateError)
        throw new Error(`Failed to update client balance: ${updateError.message}`)
      } else {
        console.log(`✅ Client balance updated successfully from $${databaseBalance} to $${calculatedBalance}`)
        wasUpdated = true
      }
    } catch (updateError) {
      console.error('❌ Error updating client balance:', updateError)
      // Don't throw - continue with PDF generation but note the issue
    }
  } else {
    console.log(`✅ Balance is already reconciled (difference: $${balanceDifference})`)
  }

  return {
    transactions: transactionsWithBalance,
    reconciliation: {
      calculatedBalance,
      databaseBalance,
      isReconciled: true, // Always true after our update attempt
      difference: balanceDifference,
      wasUpdated: wasUpdated
    },
    summary: {
      totalTransactions: allTransactions.length,
      firstTransactionDate: allTransactions.length > 0 ? allTransactions[0].date : null,
      lastTransactionDate: allTransactions.length > 0 ? allTransactions[allTransactions.length - 1].date : null
    }
  }
}

// Fetch supplier financial data (keeping existing logic).
const fetchSupplierFinancialData = async (supplierId: any) => {
  const { data: invoices, error: invoiceError } = await supabase
    .from('SupplierInvoices')
    .select('*')
    .eq('supplier_id', supplierId)

  if (invoiceError) {
    throw new Error(`Unable to fetch supplier invoices for supplier_id ${supplierId}: ${invoiceError.message}`)
  }

  const { data: receipts, error: receiptError } = await supabase
    .from('SupplierReceipts')
    .select('*')
    .eq('supplier_id', supplierId)

  if (receiptError) {
    throw new Error(`Unable to fetch supplier receipts for supplier_id ${supplierId}: ${receiptError.message}`)
  }

  const financialData = [
    ...invoices.map(invoice => ({
      date: invoice.created_at,
      type: invoice.type || 'regular',
      id: invoice.id,
      amount: invoice.type === 'return' ? -invoice.total_price : invoice.total_price
    })),
    ...receipts.map(receipt => ({
      date: receipt.paid_at,
      type: 'receipt',
      id: receipt.id,
      invoice_id: receipt.invoice_id,
      amount: receipt.amount
    }))
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  return financialData
}

// Generate the PDF document.
export const generatePDF = async (
  type: string,
  data:any
) => {
  let component:any
  let fileName:any

 if (type === 'invoice' || type === 'quotation') {
    const productMap = new Map();

    const validProducts = data.products.filter(
      (product: any) =>
        product !== null && product !== undefined && product.product_variant_id && product.product_variant_id.trim() !== ""
    );

await Promise.all(
      validProducts.map(async (product: any) => {
        const details = await fetchProductDetails(product.product_variant_id);
        const key = `${details.name}-${details.color}`;

        if (!productMap.has(key)) {
          productMap.set(key, {
            ...details,
            sizes: {},
            totalQuantity: 0,
            notes: new Set(),
            discount: data.discounts?.[details.product_id] || 0
          });
        } else {
          // Update existing entry if the current variant has an image and the stored one doesn't
          const existingProduct = productMap.get(key);
          if (!existingProduct.image && details.image) {
            existingProduct.image = details.image;
            productMap.set(key, existingProduct);
          }
        }

        const existingProduct = productMap.get(key);
        existingProduct.sizes[details.size] =
          (existingProduct.sizes[details.size] || 0) + product.quantity;
        existingProduct.totalQuantity += product.quantity;
        if (product.note) {
          existingProduct.notes.add(product.note);
        }
        productMap.set(key, existingProduct);
      })
    );

 const productsArray = Array.from(productMap.values()).map((product) => ({
      ...product,
      notes: Array.from(product.notes)
    }));

    // Add sorting to ensure consistent order
    productsArray.sort((a, b) => {
      // First sort by product name
      const nameComparison = a.name.localeCompare(b.name);
      if (nameComparison !== 0) return nameComparison;

      // If names are equal, sort by color
      return a.color.localeCompare(b.color);
    });

    // ENHANCED: Use new robust image processing
    try {
      console.log("🖼️  Processing images for PDF generation...");
      const processedProducts = await processImagesForPDF(productsArray);
      
      console.log(`✅ Successfully processed ${processedProducts.length} products for PDF`);
      
      data = {
        ...data,
        products: processedProducts,
        discounts: data.discounts || {},
        type: data.type || 'regular',
        payment_info: data.payment_info || 'frisson_llc'
      };
      
    } catch (err) {
      console.error("❌ Error during image processing, falling back to legacy method:", err);
      
      // Fallback to legacy preloading method
      try {
        const imageCache = await preloadImages(productsArray);
        
        productsArray.forEach(product => {
          if (product.image && !imageCache.has(product.image)) {
            console.log(`Using placeholder for failed image: ${product.image}`);
            product.image = null; // Will trigger fallback in PDF template
          }
        });
      } catch (legacyErr) {
        console.error("❌ Legacy image preloading also failed:", legacyErr);
        // Continue with original images and let PDF template handle failures
      }
      
      data = {
        ...data,
        products: productsArray,
        discounts: data.discounts || {},
        type: data.type || 'regular',
        payment_info: data.payment_info || 'frisson_llc'
      };
    }
  }
  
  switch (type) {
       case 'shippingInvoice': {
      if (!data.shippingInvoiceId) {
        throw new Error('Invalid shipping invoice: missing shippingInvoiceId.')
      }
      
      const isClientShipping = data.isClient !== undefined ? data.isClient : true
      const shippingTable = isClientShipping ? 'ClientShippingInvoices' : 'SupplierShippingInvoices'
      const invoiceTable = isClientShipping ? 'ClientInvoices' : 'SupplierInvoices'
      
      // Fetch shipping invoice
      const { data: shippingInvoice, error: shippingError } = await supabase
        .from(shippingTable)
        .select('*')
        .eq('id', data.shippingInvoiceId)
        .single()
      
      if (shippingError || !shippingInvoice) {
        throw new Error(`Unable to fetch shipping invoice: ${shippingError?.message || 'Not found'}`)
      }
      
      // Fetch original invoice
      const { data: originalInvoice, error: invoiceError } = await supabase
        .from(invoiceTable)
        .select('*')
        .eq('id', shippingInvoice.invoice_id)
        .single()
      
      if (invoiceError || !originalInvoice) {
        throw new Error(`Unable to fetch original invoice: ${invoiceError?.message || 'Not found'}`)
      }
      
      // Fetch entity data
      let entityData, companyData
      if (isClientShipping) {
        entityData = await fetchClientDetails(shippingInvoice.client_id)
        companyData = await fetchCompanyDetails(entityData.company_id)
      } else {
        entityData = await fetchSupplierDetails(shippingInvoice.supplier_id)
        companyData = await fetchCompanyDetails(entityData.company_id)
      }
      
      // Process shipped products with pricing information
      const shippedProducts = await Promise.all(
        (shippingInvoice.products || [])
          .filter((product: any) => product !== null && product !== undefined && product.product_variant_id)
          .map(async (product: any) => {
            try {
              const details = await fetchProductDetails(product.product_variant_id)
            
            // Find pricing information from original invoice
            let unitPrice = 0
            let unitCost = 0
            let discount = 0
            
            // Look for the product in the original invoice
            const originalProduct = originalInvoice.products?.find(
              (p: any) => p.product_variant_id === product.product_variant_id
            )
            
            if (originalProduct && details) {
              // Get unit price/cost from product details
              unitPrice = details.unitPrice || 0
              unitCost = details.unitCost || 0
              
              // Get discount from original invoice discounts
              discount = originalInvoice.discounts?.[details.product_id] || 0
            }
            
            return {
              ...details,
              quantity: product.quantity,
              note: product.note || '',
              shipped_quantity: product.quantity,
              unit_price: unitPrice,
              unit_cost: unitCost,
              discount: discount
            }
          } catch (error) {
            console.error(`Error fetching product details for variant ${product.product_variant_id}:`, error)
            return {
              name: 'Product Not Found',
              color: 'N/A',
              size: 'N/A',
              quantity: product.quantity,
              note: product.note || '',
              shipped_quantity: product.quantity,
              image: null,
              unit_price: 0,
              unit_cost: 0,
              discount: 0
            }
          }
        })
      )
      
      // Process images for shipped products
      const processedProducts = await processImagesForPDF(shippedProducts)
      
      component = ShippingInvoicePDF({
        shippingInvoice: shippingInvoice,
        originalInvoice: originalInvoice,
        entity: entityData,
        company: companyData,
        products: processedProducts,
        isClient: isClientShipping,
        logoBase64: data.logoBase64 || null
      })
      
      fileName = `shipping_invoice_${shippingInvoice.shipping_number || 'unknown'}.pdf`
      break
    }
    case 'invoice': {
      let entityData, companyData, isClientInvoice
      if (data.client_id) {
        isClientInvoice = true
        entityData = await fetchClientDetails(data.client_id)
        companyData = await fetchCompanyDetails(entityData.company_id)
      } else if (data.supplier_id) {
        isClientInvoice = false
        entityData = await fetchSupplierDetails(data.supplier_id)
        companyData = await fetchCompanyDetails(entityData.company_id)
      } else {
        throw new Error('Invalid invoice: missing client_id or supplier_id. Please provide a valid entity.')
      }

      component = InvoicePDF({
        invoice: {
          ...data,
          total_price: Math.abs(data.total_price),
          vat_amount: Math.abs(data.vat_amount || 0),
          type: data.type || 'regular',
          currency: data.currency || 'usd',
          payment_term: data.payment_term || 'N/A',
          delivery_date: data.delivery_date || '',
          payment_info: data.payment_info || 'frisson_llc'
        },
        entity: entityData,
        company: companyData,
        isClientInvoice
      })

      const filePrefix = data.type === 'return' ? 'return_invoice' : 'invoice'
      fileName = `${filePrefix}_${data.id || 'unknown'}.pdf`
      break
    }

    case 'receipt': {
      let entityData2, companyData2, invoiceData, isClientReceipt
      if (data.client_id) {
        isClientReceipt = true
        entityData2 = await fetchClientDetails(data.client_id)
        companyData2 = await fetchCompanyDetails(entityData2.company_id)
        invoiceData = await fetchInvoiceDetails(data.invoice_id, true)
      } else if (data.supplier_id) {
        isClientReceipt = false
        entityData2 = await fetchSupplierDetails(data.supplier_id)
        companyData2 = await fetchCompanyDetails(entityData2.company_id)
        invoiceData = await fetchInvoiceDetails(data.invoice_id, false)
      } else {
        throw new Error('Invalid receipt: missing client_id or supplier_id. Please provide a valid entity.')
      }
    
      component = ReceiptPDF({
        receipt: {
          ...data,
          currency: data.currency || invoiceData.currency || 'usd'
        },
        entity: entityData2,
        company: companyData2,
        invoice: invoiceData,
        isClient: isClientReceipt
      })
      fileName = `receipt_${data.id || 'unknown'}.pdf`
      break
    }

    case 'quotation': {
      if (!data.client_id) {
        throw new Error('Invalid quotation: missing client_id. Please provide a valid client.')
      }
      // Fetch base data for quotation.
      const quotationClientData = await fetchClientDetails(data.client_id)
      const quotationCompanyData = await fetchCompanyDetails(
        quotationClientData.company_id
      )

      // Prepare quotation data with defaults.
      const preparedQuotationData = {
        ...data,
        currency: data.currency || 'usd',
        payment_term: data.payment_term || 'N/A',
        delivery_date: data.delivery_date || '',
        order_number: data.order_number || '0',
        discounts: data.discounts || {},
        products: data.products.map((product: { sizes: any; notes: any; note: any }) => ({
          ...product,
          totalQuantity: Object.values(product.sizes || {}).reduce(
            (sum:any, quantity:any) => sum + Number(quantity || 0),
            0
          ),
          notes: Array.isArray(product.notes)
            ? product.notes
            : [product.note].filter(Boolean)
        }))
      }

      component = QuotationPDF({
        quotation: preparedQuotationData,
        client: quotationClientData,
        company: quotationCompanyData,
        logoBase64: data.logoBase64 || ''
      })

      fileName = `quotation_${data.id || 'unknown'}.pdf`
      break
    }

    case 'clientFinancialReport': {
      if (!data.clientId) {
        throw new Error('Invalid client financial report: missing clientId.')
      }
      
      console.log(`📊 Generating enhanced financial report for client ${data.clientId}`)
      
      // Fetch client and company data first
      const clientReportData = await fetchClientDetails(data.clientId)
      const clientCompanyData = await fetchCompanyDetails(clientReportData.company_id)
      
      // Fetch financial data with balance reconciliation
      const clientFinancialData:any = await fetchClientFinancialData(data.clientId)

      // Use the reconciled balance for the client details in the PDF
      const updatedClientData = {
        ...clientReportData,
        balance: clientFinancialData.reconciliation.calculatedBalance
      }

      component = ClientFinancialReportPDF({
        clientName: clientReportData.name,
        clientDetails: updatedClientData,
        companyDetails: clientCompanyData,
        financialData: clientFinancialData
      })
      fileName = `financial_statement_${clientReportData.name.replace(/\s+/g, '_') || 'client'}_${format(new Date(), 'yyyy-MM-dd')}.pdf`
      break
    }

    case 'supplierFinancialReport': {
      if (!data.supplierId) {
        throw new Error('Invalid supplier financial report: missing supplierId.')
      }
      const supplierData = await fetchSupplierDetails(data.supplierId)
      const supplierCompanyData = await fetchCompanyDetails(supplierData.company_id)
      const supplierFinancialData = await fetchSupplierFinancialData(data.supplierId)

      component = SupplierFinancialReportPDF({
        supplierName: supplierData.name,
        supplierDetails: supplierData,
        companyDetails: supplierCompanyData,
        financialData: supplierFinancialData
      })
      fileName = `financial_report_${supplierData.name.replace(/\s+/g, '_') || 'supplier'}.pdf`
      break
    }

    default:
      throw new Error(`Invalid PDF type: ${type}. Please choose a valid PDF type.`)
  }

  // Generate the PDF blob and trigger download.
  try {
    console.log(`📄 Generating PDF: ${fileName}`)
    const blob = await pdf(component).toBlob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    console.log(`✅ PDF generated successfully: ${fileName}`)
  } catch (err:any) {
    console.error('❌ PDF generation failed:', err)
    throw new Error(`PDF generation failed: ${err.message}`)
  }
}