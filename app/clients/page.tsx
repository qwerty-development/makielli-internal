'use client'

import React, { useState, useEffect } from 'react';
import { clientFunctions, ClientGroup, Client } from '../../utils/functions/clients';
import Link from 'next/link';

export default function ClientsPage() {
  const [groups, setGroups] = useState<ClientGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showClientForm, setShowClientForm] = useState(false);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);
  const [groupError, setGroupError] = useState<string | null>(null);
  const [newClient, setNewClient] = useState<Omit<Client, 'client_id'>>({
    name: '',
    email: '',
    phone: '',
    address: '',
    group_id: 0,
    balance: 0
  });
  const [newGroup, setNewGroup] = useState<Omit<ClientGroup, 'group_id'>>({
    name: ''
  });

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      setIsLoading(true);
      const groupsData = await clientFunctions.getAllClientGroups();
      setGroups(groupsData);
      setError(null);
    } catch (error) {
      console.error('Error fetching groups:', error);
      setError('Failed to fetch client groups. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setClientError(null);
    try {
      await clientFunctions.createClient(newClient);
      setShowClientForm(false);
      setNewClient({ name: '', email: '', phone: '', address: '', group_id: 0, balance: 0 });
      // Optionally, refresh the clients list here
      alert('Client created successfully!');
    } catch (error) {
      console.error('Error creating client:', error);
      setClientError('Failed to create client. Please try again.');
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setGroupError(null);
    try {
      await clientFunctions.createGroup(newGroup);
      setShowGroupForm(false);
      setNewGroup({ name: '' });
      fetchGroups(); // Refresh the groups list
      alert('Group created successfully!');
    } catch (error) {
      console.error('Error creating group:', error);
      setGroupError('Failed to create group. Please try again.');
    }
  };

  if (isLoading) {
    return <div className="text-center py-10">Loading...</div>;
  }

  if (error) {
    return <div className="text-center py-10 text-red-500">Error: {error}</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-center mb-8">
        Client Management
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <button
          onClick={() => setShowClientForm(!showClientForm)}
          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition duration-300"
        >
          {showClientForm ? 'Cancel' : 'Create Client'}
        </button>
        <button
          onClick={() => setShowGroupForm(!showGroupForm)}
          className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded transition duration-300"
        >
          {showGroupForm ? 'Cancel' : 'Create Group'}
        </button>
      </div>

      {showClientForm && (
        <form onSubmit={handleCreateClient} className="mb-8 p-4 bg-gray-100 rounded-lg">
          <h2 className="text-xl font-bold mb-4">Create New Client</h2>
          <input
            type="text"
            placeholder="Name"
            value={newClient.name}
            onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
            className="w-full p-2 mb-2 border rounded"
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={newClient.email}
            onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
            className="w-full p-2 mb-2 border rounded"
            required
          />
          <input
            type="tel"
            placeholder="Phone"
            value={newClient.phone}
            onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
            className="w-full p-2 mb-2 border rounded"
            required
          />
          <input
            type="text"
            placeholder="Address"
            value={newClient.address}
            onChange={(e) => setNewClient({ ...newClient, address: e.target.value })}
            className="w-full p-2 mb-2 border rounded"
            required
          />
          <select
            value={newClient.group_id}
            onChange={(e) => setNewClient({ ...newClient, group_id: Number(e.target.value) })}
            className="w-full p-2 mb-2 border rounded"
            required
          >
            <option value="">Select a group</option>
            {groups.map((group) => (
              <option key={group.group_id} value={group.group_id}>{group.name}</option>
            ))}
          </select>
          <button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">
            Create Client
          </button>
        </form>
      )}

      {showGroupForm && (
        <form onSubmit={handleCreateGroup} className="mb-8 p-4 bg-gray-100 rounded-lg">
          <h2 className="text-xl font-bold mb-4">Create New Group</h2>
          <input
            type="text"
            placeholder="Group Name"
            value={newGroup.name}
            onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
            className="w-full p-2 mb-2 border rounded"
            required
          />
          <button type="submit" className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded">
            Create Group
          </button>
        </form>
      )}

      <Link href="/clients/all">
        <p className="block w-full bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-4 rounded text-center mb-8 transition duration-300">
          All Clients
        </p>
      </Link>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {groups.map((group) => (
          <Link key={group.group_id} href={`/clients/group/${group.group_id}`}>
            <p className="block bg-white hover:bg-gray-100 rounded-lg shadow-md p-6 transition duration-300 transform hover:-translate-y-1 hover:shadow-lg">
              <h2 className="text-xl font-semibold">{group.name}</h2>
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}