'use client'

import React, { useState, useEffect } from 'react';
import { clientFunctions, Client } from '../../../utils/functions/clients';
import Link from 'next/link';

export default function AllClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchAllClients();
  }, []);

  useEffect(() => {
    const filtered = clients.filter(client => 
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredClients(filtered);
  }, [searchTerm, clients]);

  const fetchAllClients = async () => {
    try {
      setIsLoading(true);
      const clientsData = await clientFunctions.getAllClients();
      setClients(clientsData);
      setFilteredClients(clientsData);
      setError(null);
    } catch (error) {
      console.error('Error fetching clients:', error);
      setError('Failed to fetch clients. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="text-center py-10 text-white">Loading...</div>;
  }

  if (error) {
    return <div className="text-center py-10 text-red-500">Error: {error}</div>;
  }

  return (
    <div className="p-8  ">
      <h1 className="text-3xl text-black font-bold mb-6">All Clients</h1>
      <input
        type="text"
        placeholder="Search clients"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full mb-4 p-2 rounded bg-white text-black placeholder-gray border border-gray focus:outline-none focus:ring-2 focus:ring-gray"
      />
      <div className="bg-gray rounded-lg overflow-hidden">
        <ul className="divide-y divide-white">
          {filteredClients.map((client) => (
            <li key={client.client_id}>
              <Link href={`/clients/details/${client.client_id}`}>
                <div className="block hover:bg-gray-600 p-4 transition duration-300">
                  <div className="flex items-center space-x-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-lg font-medium text-white truncate">{client.name}</p>
                      <p className="text-sm text-white truncate">Email: {client.email} | Phone: {client.phone}</p>
                    </div>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
