'use client'

import React, { useState, useEffect } from 'react'
import {
  clientFunctions,
  ClientGroup,
  Client,
  Company
} from '../../utils/functions/clients'
import Link from 'next/link'
import { toast } from 'react-hot-toast'

export default function ClientsPage() {
  const [groups, setGroups] = useState<ClientGroup[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [showClientForm, setShowClientForm] = useState(false)
  const [showGroupForm, setShowGroupForm] = useState(false)
  const [groupSearch, setGroupSearch] = useState('')

  const [newClient, setNewClient] = useState<Omit<Client, 'client_id'>>({
    name: '',
    email: '',
    phone: '',
    address: '',
    group_id: 0,
    balance: 0,
    company_id: 0,
    tax_number: ''
  })
  const [newGroup, setNewGroup] = useState<Omit<ClientGroup, 'group_id'>>({
    name: ''
  })

  useEffect(() => {
    fetchGroups()
    fetchCompanies()
  }, [])

  const fetchGroups = async () => {
    try {
      setIsLoading(true)
      const groupsData = await clientFunctions.getAllClientGroups()
      setGroups(groupsData)

    } catch (error: any) {
      console.error('Error fetching groups:', error)
      toast.error('Failed to fetch groups. Please try again later.'+error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchCompanies = async () => {
    try {
      const companiesData = await clientFunctions.getAllCompanies()
      setCompanies(companiesData)
    } catch (error: any) {
      console.error('Error fetching companies:', error)
      toast.error('Failed to fetch companies. Please try again later.')
    }
  }

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await clientFunctions.createClient(newClient)
      setShowClientForm(false)
      setNewClient({
        name: '',
        email: '',
        phone: '',
        address: '',
        group_id: 0,
        balance: 0,
        company_id: 0,
        tax_number: ''
      })
      toast.success('Client created successfully!')
    } catch (error: any) {
      console.error('Error creating client:', error)
      toast.error('Failed to create client. Please try again.')
    }
  }

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await clientFunctions.createGroup(newGroup)
      setShowGroupForm(false)
      setNewGroup({ name: '' })
      fetchGroups() // Refresh the groups list
      toast.success('Group created successfully!')
    } catch (error: any) {
      console.error('Error creating group:', error)
      toast.error('Failed to create group. Please try again.')
    }
  }

  // Filter groups based on search term (case-insensitive)
  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(groupSearch.toLowerCase())
  )

  if (isLoading) {
    return <div className='text-center py-10'>Loading...</div>
  }



  return (
    <div className='p-8'>
      <h1 className='text-3xl font-bold text-black text-center mb-8'>
        Client Management
      </h1>

      <div className='flex justify-end gap-4 mb-8'>
        <button
          onClick={() => setShowClientForm(!showClientForm)}
          className='bg-blue hover:bg-black text-white font-bold py-1 px-2 text-sm rounded transition duration-300'>
          {showClientForm ? 'Cancel' : 'Create Client'}
        </button>
        <button
          onClick={() => setShowGroupForm(!showGroupForm)}
          className='bg-blue hover:bg-black text-white font-bold py-1 px-2 text-sm rounded transition duration-300'>
          {showGroupForm ? 'Cancel' : 'Create Group'}
        </button>
      </div>

      {showClientForm && (
        <form
          onSubmit={handleCreateClient}
          className='mb-8 p-4 bg-neutral-800 border border-neutral-700 rounded-lg'>
          <h2 className='text-xl text-white font-bold mb-4'>
            Create New Client
          </h2>
          <input
            type='text'
            placeholder='Name'
            value={newClient.name}
            onChange={e => setNewClient({ ...newClient, name: e.target.value })}
            className='w-full p-2 mb-2 border rounded'
            required
          />
          <input
            type='email'
            placeholder='Email'
            value={newClient.email}
            onChange={e =>
              setNewClient({ ...newClient, email: e.target.value })
            }
            className='w-full p-2 mb-2 border rounded'
            required
          />
          <input
            type='tel'
            placeholder='Phone'
            value={newClient.phone}
            onChange={e =>
              setNewClient({ ...newClient, phone: e.target.value })
            }
            className='w-full p-2 mb-2 border rounded'
            required
          />
          <input
            type='text'
            placeholder='Address'
            value={newClient.address}
            onChange={e =>
              setNewClient({ ...newClient, address: e.target.value })
            }
            className='w-full p-2 mb-2 border rounded'
            required
          />
          <input
            type='text'
            placeholder='Tax Number'
            value={newClient.tax_number}
            onChange={e =>
              setNewClient({ ...newClient, tax_number: e.target.value })
            }
            className='w-full p-2 mb-2 border rounded'
            required
          />
          <select
            value={newClient.group_id || ''}
            onChange={e =>
              setNewClient({ ...newClient, group_id: Number(e.target.value) })
            }
            className='w-full p-2 mb-2 border rounded'
            required>
            <option value=''>Select a group</option>
            {groups.map(group => (
              <option key={group.group_id} value={group.group_id}>
                {group.name}
              </option>
            ))}
          </select>
          <select
            value={newClient.company_id || ''}
            onChange={e =>
              setNewClient({ ...newClient, company_id: Number(e.target.value) })
            }
            className='w-full p-2 mb-2 border rounded'
            required>
            <option value=''>Select a company</option>
            {companies.map(company => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
          <button
            type='submit'
            className='bg-blue hover:bg-black text-white font-bold py-2 px-4 rounded'>
            Create Client
          </button>
        </form>
      )}

      {showGroupForm && (
        <form
          onSubmit={handleCreateGroup}
          className='mb-8 p-4 bg-neutral-100 border border-neutral-300 rounded-lg'>
          <h2 className='text-xl text-black font-bold mb-4'>
            Create New Group
          </h2>
          <input
            type='text'
            placeholder='Group Name'
            value={newGroup.name}
            onChange={e => setNewGroup({ ...newGroup, name: e.target.value })}
            className='w-full p-2 mb-2 border rounded'
            required
          />
          <button
            type='submit'
            className='bg-blue hover:bg-black text-white font-bold py-2 px-4 rounded'>
            Create Group
          </button>
        </form>
      )}

      <div className='mb-8'>
        <input
          type='text'
          placeholder='Search Groups...'
          value={groupSearch}
          onChange={e => setGroupSearch(e.target.value)}
          className='w-full p-2 mb-4 border rounded'
        />
      </div>

      <Link href='/clients/all'>
        <p className='inline-block text-blue font-extrabold py-2 px-4 rounded text-center mb-4 transition duration-300 hover:underline'>
          See all clients
        </p>
      </Link>

      {filteredGroups.length === 0 ? (
        <div className='text-center text-neutral-600'>No groups found.</div>
      ) : (
        <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6'>
          {filteredGroups.map(group => (
            <Link key={group.group_id} href={`/clients/group/${group.group_id}`}>
              <div className='block bg-neutral-700 hover:bg-neutral-600 rounded-lg shadow-md p-6 transition duration-300 transform hover:-translate-y-1 hover:shadow-lg'>
                <h2 className='text-xl text-white font-semibold'>{group.name}</h2>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}


