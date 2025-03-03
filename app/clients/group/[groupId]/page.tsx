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
    return <div className="text-center py-10">Loading...</div>;
  }



  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        {isEditing ? (
          <div className="flex items-center">
            <input
              type="text"
              value={editedGroupName}
              onChange={(e) => setEditedGroupName(e.target.value)}
              className="border rounded px-2 py-1 mr-2"
            />
            <button
              onClick={handleSaveEdit}
              className="bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-2 rounded mr-2"
            >
              Save
            </button>
            <button
              onClick={handleCancelEdit}
              className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-1 px-2 rounded"
            >
              Cancel
            </button>
          </div>
        ) : (
          <h1 className="text-3xl font-bold">{group?.name} Clients</h1>
        )}
        <div>
          {!isEditing && (
            <button
              onClick={handleEdit}
              className="bg-blue hover:bg-blue-700 text-white font-bold  px-4 rounded mr-2"
            >
              Edit Group
            </button>
          )}
          <button
            onClick={handleDelete}
            className="bg-red-600 hover:bg-red-700 text-white font-bold  px-4 rounded"
          >
            Delete Group
          </button>
        </div>
      </div>
      <div className="bg-gray  rounded-lg overflow-hidden">
        <ul className="divide-y divide-white">
          {clients.map((client) => (
            <li key={client.client_id}>
              <Link href={`/clients/details/${client.client_id}`}>
                <div className="block hover:bg-gray-50 p-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-l font-medium text-white truncate">
                        {client.name}
                      </p>
                      <p className="text-sm text-white truncate">
                        {client.email}
                      </p>
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