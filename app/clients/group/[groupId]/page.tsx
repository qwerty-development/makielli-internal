'use client'

import React, { useState, useEffect } from 'react';
import { clientFunctions, Client, ClientGroup } from '../../../../utils/functions/clients';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function GroupDetailsPage({ params }: { params: { groupId: string } }) {
  const [group, setGroup] = useState<ClientGroup | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isEditing, setIsEditing] = useState(false);
  const [editedGroupName, setEditedGroupName] = useState('');
  const router = useRouter();

  useEffect(() => {
    if (params.groupId) {
      fetchGroupAndClients();
    }
  }, [params.groupId]);

  const fetchGroupAndClients = async () => {
    try {
      setIsLoading(true);
      const groupData = await clientFunctions.getClientGroupById(Number(params.groupId));
      const clientsData = await clientFunctions.getClientsByGroup(Number(params.groupId));
      setGroup(groupData);
      setClients(clientsData);
      setEditedGroupName(groupData?.name || '');

    } catch (error:any) {
      console.error('Error fetching group and clients:', error);
     toast.error('Error fetching group '+error.message)
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedGroupName(group?.name || '');
  };

  const handleSaveEdit = async () => {
    if (!group) return;

    try {
      await clientFunctions.updateClientGroup(group.group_id, { name: editedGroupName });
      setGroup({ ...group, name: editedGroupName });
      setIsEditing(false);

    } catch (error:any) {
      console.error('Error updating group:', error);
      toast.error('Failed to update group. Please try again.'+error.message);
    }
  };

  const handleDelete = async () => {
    if (!group) return;

    if (window.confirm('Are you sure you want to delete this group? This will not delete the clients in the group.')) {
      try {
        await clientFunctions.deleteClientGroup(group.group_id);
        router.push('/clients'); // Redirect to clients page after deletion
      } catch (error:any) {
        console.error('Error deleting group:', error);
        toast.error('Failed to delete group. Please try again.'+error.message);
      }
    }
  };

  if (isLoading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='text-center'>
          <div className='inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mb-4'></div>
          <p className='text-neutral-600 font-medium'>Loading group...</p>
        </div>
      </div>
    )
  }



  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 p-6 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <Link href='/clients' className='btn-ghost mb-4'>
              ← Back to Client Groups
            </Link>
          </div>

          {isEditing ? (
            <div className="card p-6">
              <h2 className="text-xl font-bold text-neutral-800 mb-4">Edit Group Name</h2>
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className='block text-sm font-medium text-neutral-700 mb-2'>
                    Group Name *
                  </label>
                  <input
                    type="text"
                    value={editedGroupName}
                    onChange={(e) => setEditedGroupName(e.target.value)}
                    className="input"
                    placeholder="Enter group name"
                  />
                </div>
                <button
                  onClick={handleSaveEdit}
                  className="btn-success"
                >
                  Save Changes
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="btn-ghost"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold text-neutral-800 mb-2">{group?.name}</h1>
                <p className="text-neutral-600">{clients.length} clients in this group</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleEdit}
                  className="btn-outline"
                >
                  Edit Group
                </button>
                <button
                  onClick={handleDelete}
                  className="btn-danger"
                >
                  Delete Group
                </button>
              </div>
            </div>
          )}
        </div>

        {clients.length === 0 ? (
          <div className='empty-state'>
            <div className='inline-flex items-center justify-center w-20 h-20 rounded-full bg-neutral-100 text-neutral-400 mb-4'>
              <svg className='w-10 h-10' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' />
              </svg>
            </div>
            <h3 className='text-xl font-semibold text-neutral-800 mb-2'>No clients in this group</h3>
            <p className='text-neutral-600'>Add clients to this group from the main clients page</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clients.map((client) => (
              <Link key={client.client_id} href={`/clients/details/${client.client_id}`}>
                <div className="card-hover p-6 group cursor-pointer">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-neutral-800 group-hover:text-primary-600 transition-colors duration-300 mb-1">
                        {client.name}
                      </h3>
                    </div>
                    <svg className='w-5 h-5 text-neutral-400 group-hover:text-primary-500 group-hover:translate-x-1 transition-all duration-300' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5l7 7-7 7' />
                    </svg>
                  </div>
                  <div className="flex items-center text-sm text-neutral-600">
                    <svg className='w-4 h-4 mr-2 text-neutral-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' />
                    </svg>
                    <span className="truncate">{client.email}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}