'use client'

import React, { useState, useEffect } from 'react';
import { supplierFunctions, Supplier } from '../../../utils/functions/suppliers';
import { useRouter } from 'next/navigation';

export default function SupplierDetailsPage({ params }: { params: { id: string } }) {
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchSupplier();
  }, []);

  const fetchSupplier = async () => {
    try {
      setIsLoading(true);
      const supplierData = await supplierFunctions.getSupplierById(params.id);
      setSupplier(supplierData);
      setError(null);
    } catch (error) {
      console.error('Error fetching supplier:', error);
      setError('Failed to fetch supplier details. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplier) return;
    try {
      await supplierFunctions.updateSupplier(supplier.id, supplier);
      setIsEditing(false);
      fetchSupplier();
    } catch (error) {
      console.error('Error updating supplier:', error);
      setError('Failed to update supplier. Please try again.');
    }
  };

  const handleDeleteSupplier = async () => {
    if (window.confirm('Are you sure you want to delete this supplier?')) {
      try {
        await supplierFunctions.deleteSupplier(params.id);
        router.push('/suppliers');
      } catch (error) {
        console.error('Error deleting supplier:', error);
        setError('Failed to delete supplier. Please try again.');
      }
    }
  };

  if (isLoading) {
    return <div className="text-center py-10">Loading...</div>;
  }

  if (error) {
    return <div className="text-center py-10 text-red-500">Error: {error}</div>;
  }

  if (!supplier) {
    return <div className="text-center py-10">Supplier not found</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Supplier Details</h1>
      {isEditing ? (
        <form onSubmit={handleUpdateSupplier} className="bg-gray rounded-lg shadow-md p-6">
          <div className="mb-4">
            <label className="block text-white text-sm font-bold mb-2" htmlFor="name">
              Name
            </label>
            <input
              type="text"
              id="name"
              value={supplier.name}
              onChange={(e) => setSupplier({...supplier, name: e.target.value})}
              className="w-full  p-2 border rounded"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-white text-sm font-bold mb-2" htmlFor="location">
              Location
            </label>
            <input
              type="text"
              id="location"
              value={supplier.location}
              onChange={(e) => setSupplier({...supplier, location: e.target.value})}
              className="w-full p-2 border  rounded"
            />
          </div>
          <div className="mb-4">
            <label className="block text-white text-sm font-bold mb-2" htmlFor="phone">
              Phone
            </label>
            <input
              type="tel"
              id="phone"
              value={supplier.phone}
              onChange={(e) => setSupplier({...supplier, phone: e.target.value})}
              className="w-full p-2 border rounded"
            />
          </div>
          <div className="mb-4">
            <label className="block text-white text-sm font-bold mb-2" htmlFor="balance">
              Balance
            </label>
            <input
              type="number"
              id="balance"
              value={supplier.balance}
              onChange={(e) => setSupplier({...supplier, balance: parseInt(e.target.value)})}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="bg-red-500 hover:bg-red-800 text-white font-bold py-2 px-4 rounded mr-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-blue hover:bg-black text-white font-bold py-2 px-4 rounded"
            >
              Save Changes
            </button>
          </div>
        </form>
      ) : (
        <div className="bg-gray rounded-lg shadow-md p-6">
          <h2 className="text-2xl text-white font-semibold mb-4">{supplier.name}</h2>
          <p className="text-white mb-2">Location: {supplier.location}</p>
          <p className="text-white mb-2">Phone: {supplier.phone}</p>
          <p className="text-white mb-4">Balance: ${supplier.balance.toFixed(2)}</p>
          <div className="flex justify-end">
            <button
              onClick={() => setIsEditing(true)}
              className="bg-blue hover:bg-black text-white font-bold py-2 px-4 rounded mr-2"
            >
              Edit
            </button>
            <button
              onClick={handleDeleteSupplier}
              className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}