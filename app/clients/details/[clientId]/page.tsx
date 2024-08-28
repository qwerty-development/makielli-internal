'use client'

import React, { useState, useEffect } from 'react';
import { clientFunctions, Client } from '../../../../utils/functions/clients';

export default function ClientDetailsPage({ params }: { params: { clientId: string } }) {
  const [client, setClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedClient, setEditedClient] = useState<Client | null>(null);

  useEffect(() => {
    if (params.clientId) {
      fetchClientDetails();
    }
  }, [params.clientId]);

  const fetchClientDetails = async () => {
    try {
      setIsLoading(true);
      const clientData = await clientFunctions.getClientById(Number(params.clientId));
      setClient(clientData);
      setEditedClient(clientData);
      setError(null);
    } catch (error) {
      console.error('Error fetching client details:', error);
      setError('Failed to fetch client details. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedClient(client);
  };

  const handleSaveEdit = async () => {
    if (!editedClient) return;

    try {
      await clientFunctions.updateClient(editedClient.client_id, editedClient);
      setClient(editedClient);
      setIsEditing(false);
      setError(null);
    } catch (error) {
      console.error('Error updating client:', error);
      setError('Failed to update client. Please try again.');
    }
  };

  const handleDelete = async () => {
    if (!client) return;

    if (window.confirm('Are you sure you want to delete this client?')) {
      try {
        await clientFunctions.deleteClient(client.client_id);
        // Redirect to clients list or show a success message
        window.location.href = '/clients';
      } catch (error) {
        console.error('Error deleting client:', error);
        setError('Failed to delete client. Please try again.');
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editedClient) return;

    const { name, value } = e.target;
    setEditedClient({ ...editedClient, [name]: value });
  };

  if (isLoading) {
    return <div className="text-center py-10">Loading...</div>;
  }

  if (error) {
    return <div className="text-center py-10 text-red-500">Error: {error}</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Client Details</h1>
      {client && (
        <div className="bg-gray shadow-md rounded-lg p-6">
          {isEditing ? (
            <form onSubmit={(e) => { e.preventDefault(); handleSaveEdit(); }}>
              <div className="mb-4">
                <label className="block text-white text-sm font-bold mb-2" htmlFor="name">
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={editedClient?.name || ''}
                  onChange={handleInputChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-white leading-tight focus:outline-none focus:shadow-outline"
                />
              </div>
              <div className="mb-4">
                <label className="block text-white text-sm font-bold mb-2" htmlFor="email">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={editedClient?.email || ''}
                  onChange={handleInputChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-white leading-tight focus:outline-none focus:shadow-outline"
                />
              </div>
              <div className="mb-4">
                <label className="block text-white text-sm font-bold mb-2" htmlFor="phone">
                  Phone
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={editedClient?.phone || ''}
                  onChange={handleInputChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-white leading-tight focus:outline-none focus:shadow-outline"
                />
              </div>
              <div className="mb-4">
                <label className="block text-white text-sm font-bold mb-2" htmlFor="address">
                  Address
                </label>
                <input
                  type="text"
                  id="address"
                  name="address"
                  value={editedClient?.address || ''}
                  onChange={handleInputChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-white leading-tight focus:outline-none focus:shadow-outline"
                />
              </div>
              <div className="flex items-center justify-between">
                <button
                  type="submit"
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <>
              <div className="mb-4">
                <h2 className="text-3xl text-black ">Name</h2>
                <p className='text-white text-xl font-semibold mt-2'>{client.name}</p>
              </div>
              <div className="mb-4">
              <h2 className="text-3xl text-black ">Email</h2>
                <p className='text-white text-xl font-semibold mt-2'>{client.email}</p>
              </div>
              <div className="mb-4">
              <h2 className="text-3xl text-black ">Phone</h2>
                <p className='text-white text-xl font-semibold mt-2'>{client.phone}</p>
              </div>
              <div className="mb-4">
              <h2 className="text-3xl text-black ">Address</h2>
                <p className='text-white text-xl font-semibold mt-2'>{client.address}</p>
              </div>
              <div className="mb-4">
                <h2 className="text-3xl text-black ">Balance</h2>
                <p className='text-white text-xl font-semibold mt-2'>${client.balance.toFixed(2)}</p>
              </div>
              <div className="flex items-center text-white justify-between mt-6">
                <button
                  onClick={handleEdit}
                  className="bg-blue hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                >
                  Edit Client
                </button>
                <button
                  onClick={handleDelete}
                  className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                >
                  Delete Client
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}