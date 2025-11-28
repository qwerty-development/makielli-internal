
'use client'

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { clientHistoryFunctions, ClientPurchaseHistoryRecord } from '@/utils/functions/clientHistory';
import { clientFunctions, Client } from '@/utils/functions/clients';
import { FaBox, FaSpinner, FaArrowLeft, FaSearch, FaSortAmountDown, FaSortAmountUp, FaCalendarAlt, FaTags, FaTruck, FaClock, FaCheck } from 'react-icons/fa';
import { format } from 'date-fns';

export default function ClientHistoryPage({ params }: { params: { clientId: string } }) {
  const router = useRouter();
  const clientId = parseInt(params.clientId, 10);

  const [client, setClient] = useState<Client | null>(null);
  const [purchaseHistory, setPurchaseHistory] = useState<ClientPurchaseHistoryRecord[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<ClientPurchaseHistoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'total_purchased' | 'last_purchase_date'>('total_purchased');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    if (isNaN(clientId)) {
      toast.error('Invalid Client ID');
      router.push('/clients');
      return;
    }
    fetchData();
  }, [clientId]);

  useEffect(() => {
    let filtered = purchaseHistory.filter(item => 
      item.product_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    filtered.sort((a, b) => {
      if (sortBy === 'total_purchased') {
        return sortOrder === 'asc' ? a.total_purchased - b.total_purchased : b.total_purchased - a.total_purchased;
      } else {
        const dateA = new Date(a.last_purchase_date).getTime();
        const dateB = new Date(b.last_purchase_date).getTime();
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      }
    });

    setFilteredHistory(filtered);
  }, [purchaseHistory, searchTerm, sortBy, sortOrder]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [clientData, historyData] = await Promise.all([
        clientFunctions.getClientById(clientId),
        clientHistoryFunctions.getClientPurchaseHistory(clientId),
      ]);

      if (!clientData) {
        toast.error('Client not found');
        router.push('/clients');
        return;
      }

      setClient(clientData);
      setPurchaseHistory(historyData);
    } catch (error) {
      console.error('Error fetching client history:', error);
      toast.error('Failed to load client history');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-center">
          <FaSpinner className="animate-spin text-4xl text-indigo-600 mb-4 mx-auto" />
          <p className="text-neutral-600 text-lg">Loading Client History...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-100 p-4 sm:p-6 lg:p-8 text-black">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-neutral-800">Purchase History for {client?.name}</h1>
              <p className="text-neutral-500 mt-1">Showing all products purchased by this client.</p>
            </div>
            <button
              onClick={() => router.push(`/clients/details/${clientId}`)}
              className="mt-4 sm:mt-0 flex items-center gap-2 px-4 py-2 bg-neutral-200 text-neutral-700 rounded-lg hover:bg-neutral-300 transition-colors"
            >
              <FaArrowLeft />
              Back to Client Details
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-md p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative md:col-span-2">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex items-center gap-2 text-black">
              <select 
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="total_purchased">Sort by Quantity</option>
                <option value="last_purchase_date">Sort by Last Purchase</option>
              </select>
              <button onClick={toggleSortOrder} className="p-2 border border-neutral-300 rounded-lg hover:bg-neutral-100">
                {sortOrder === 'asc' ? <FaSortAmountUp /> : <FaSortAmountDown />}
              </button>
            </div>
          </div>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredHistory.map(product => {
            const isFullyShipped = product.total_unshipped === 0;
            const isPartiallyShipped = product.total_shipped > 0 && product.total_unshipped > 0;
            const percentShipped = product.total_purchased > 0 ? Math.round((product.total_shipped / product.total_purchased) * 100) : 100;
            
            return (
              <div key={product.product_id} className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 flex flex-col overflow-hidden">
                <div className="relative h-48 bg-neutral-100 cursor-pointer" onClick={() => router.push(`/products/history/${product.product_id}`)}>
                  {product.product_photo ? (
                    <img src={product.product_photo} alt={product.product_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-neutral-200">
                      <FaBox className="text-5xl text-neutral-400" />
                    </div>
                  )}
                  {/* Shipping Status Badge */}
                  <div className="absolute top-2 right-2">
                    {isFullyShipped ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 shadow-sm">
                        <FaCheck className="text-xs" /> Shipped
                      </span>
                    ) : product.total_shipped === 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 shadow-sm">
                        <FaClock className="text-xs" /> Pending
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 shadow-sm">
                        <FaTruck className="text-xs" /> {percentShipped}%
                      </span>
                    )}
                  </div>
                </div>
                <div className="p-4 flex flex-col flex-grow">
                  <h3 className="font-bold text-lg text-neutral-800 mb-2 truncate cursor-pointer" onClick={() => router.push(`/products/history/${product.product_id}`)}>{product.product_name}</h3>
                  <div className="space-y-2 text-sm text-neutral-600 mb-4">
                    <InfoRow icon={FaBox} label="Total Purchased" value={`${product.total_purchased} units`} />
                    <InfoRow icon={FaTruck} label="Shipped" value={`${product.total_shipped} units`} />
                    {product.total_unshipped > 0 && (
                      <InfoRow icon={FaClock} label="Pending" value={`${product.total_unshipped} units`} />
                    )}
                    <InfoRow icon={FaCalendarAlt} label="Last Purchase" value={format(new Date(product.last_purchase_date), 'MMM d, yyyy')} />
                    <InfoRow icon={FaTags} label="Purchase Events" value={`${product.purchase_count} times`} />
                  </div>
                  
                  {/* Shipping Progress Bar */}
                  {product.total_purchased > 0 && (
                    <div className="mb-4">
                      <div className="flex justify-between text-xs text-neutral-500 mb-1">
                        <span>Shipping Progress</span>
                        <span>{percentShipped}%</span>
                      </div>
                      <div className="w-full bg-neutral-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${percentShipped === 100 ? 'bg-green-500' : percentShipped >= 50 ? 'bg-indigo-500' : 'bg-orange-500'}`}
                          style={{ width: `${percentShipped}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex-grow">
                    <h4 className="font-semibold text-sm text-neutral-700 mb-2">Variants Purchased ({product.variants.length}):</h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {product.variants.map((v, i) => {
                        const variantFullyShipped = v.unshipped === 0;
                        return (
                          <div key={i} className="p-2 bg-neutral-50 rounded-lg border border-neutral-200">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-neutral-800">
                                {v.size} / {v.color}
                              </span>
                              <span className="text-sm font-bold text-indigo-600">
                                {v.quantity} units
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2">
                                <span className="text-green-600">
                                  <FaTruck className="inline mr-1 text-[10px]" />{v.shipped}
                                </span>
                                {v.unshipped > 0 && (
                                  <span className="text-orange-600">
                                    <FaClock className="inline mr-1 text-[10px]" />{v.unshipped}
                                  </span>
                                )}
                              </div>
                              {variantFullyShipped && (
                                <FaCheck className="text-green-500 text-xs" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredHistory.length === 0 && !isLoading && (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center col-span-full">
            <FaBox className="text-6xl text-neutral-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-neutral-700">No Products Found</h3>
            <p className="text-neutral-500 mt-2">This client has not purchased any products matching your criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
}

const InfoRow = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: string | number }) => (
  <div className="flex items-center justify-between">
    <span className="flex items-center gap-2">
      <Icon className="text-indigo-500" />
      <span>{label}</span>
    </span>
    <span className="font-semibold text-neutral-800">{value}</span>
  </div>
);
