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
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='text-center'>
          <div className='inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mb-4'></div>
          <p className='text-neutral-600 font-medium'>Loading clients...</p>
        </div>
      </div>
    )
  }



  return (
    <div className='min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 p-6 sm:p-8'>
      <div className='max-w-7xl mx-auto'>
        <div className='mb-8 animate-fade-in'>
          <h1 className='text-4xl font-bold text-neutral-800 mb-2'>
            Client Management
          </h1>
          <p className='text-neutral-600'>Organize and manage your client groups</p>
        </div>

        <div className='flex flex-wrap gap-3 mb-8'>
          <button
            onClick={() => setShowClientForm(!showClientForm)}
            className='btn-primary'>
            {showClientForm ? 'Cancel' : '+ Create Client'}
          </button>
          <button
            onClick={() => setShowGroupForm(!showGroupForm)}
            className='btn-outline'>
            {showGroupForm ? 'Cancel' : '+ Create Group'}
          </button>
          <Link href='/clients/all' className='btn-ghost ml-auto'>
            View All Clients →
          </Link>
        </div>

      {showClientForm && (
        <div className='mb-8 card animate-slide-down'>
          <form onSubmit={handleCreateClient} className='p-6'>
            <h2 className='text-2xl font-bold text-neutral-800 mb-6'>
              Create New Client
            </h2>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mb-6'>
              <div>
                <label className='block text-sm font-medium text-neutral-700 mb-2'>
                  Client Name *
                </label>
                <input
                  type='text'
                  placeholder='Enter client name'
                  value={newClient.name}
                  onChange={e => setNewClient({ ...newClient, name: e.target.value })}
                  className='input'
                  required
                />
              </div>
              <div>
                <label className='block text-sm font-medium text-neutral-700 mb-2'>
                  Email *
                </label>
                <input
                  type='email'
                  placeholder='client@example.com'
                  value={newClient.email}
                  onChange={e =>
                    setNewClient({ ...newClient, email: e.target.value })
                  }
                  className='input'
                  required
                />
              </div>
              <div>
                <label className='block text-sm font-medium text-neutral-700 mb-2'>
                  Phone *
                </label>
                <input
                  type='tel'
                  placeholder='+1 (555) 000-0000'
                  value={newClient.phone}
                  onChange={e =>
                    setNewClient({ ...newClient, phone: e.target.value })
                  }
                  className='input'
                  required
                />
              </div>
              <div>
                <label className='block text-sm font-medium text-neutral-700 mb-2'>
                  Tax Number *
                </label>
                <input
                  type='text'
                  placeholder='Enter tax number'
                  value={newClient.tax_number}
                  onChange={e =>
                    setNewClient({ ...newClient, tax_number: e.target.value })
                  }
                  className='input'
                  required
                />
              </div>
              <div className='md:col-span-2'>
                <label className='block text-sm font-medium text-neutral-700 mb-2'>
                  Address *
                </label>
                <input
                  type='text'
                  placeholder='Enter full address'
                  value={newClient.address}
                  onChange={e =>
                    setNewClient({ ...newClient, address: e.target.value })
                  }
                  className='input'
                  required
                />
              </div>
              <div>
                <label className='block text-sm font-medium text-neutral-700 mb-2'>
                  Client Group *
                </label>
                <select
                  value={newClient.group_id || ''}
                  onChange={e =>
                    setNewClient({ ...newClient, group_id: Number(e.target.value) })
                  }
                  className='input'
                  required>
                  <option value=''>Select a group</option>
                  {groups.map(group => (
                    <option key={group.group_id} value={group.group_id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className='block text-sm font-medium text-neutral-700 mb-2'>
                  Company *
                </label>
                <select
                  value={newClient.company_id || ''}
                  onChange={e =>
                    setNewClient({ ...newClient, company_id: Number(e.target.value) })
                  }
                  className='input'
                  required>
                  <option value=''>Select a company</option>
                  {companies.map(company => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className='flex gap-3'>
              <button type='submit' className='btn-primary'>
                Create Client
              </button>
              <button
                type='button'
                onClick={() => setShowClientForm(false)}
                className='btn-ghost'>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {showGroupForm && (
        <div className='mb-8 card animate-slide-down'>
          <form onSubmit={handleCreateGroup} className='p-6'>
            <h2 className='text-2xl font-bold text-neutral-800 mb-6'>
              Create New Group
            </h2>
            <div className='mb-6'>
              <label className='block text-sm font-medium text-neutral-700 mb-2'>
                Group Name *
              </label>
              <input
                type='text'
                placeholder='Enter group name'
                value={newGroup.name}
                onChange={e => setNewGroup({ ...newGroup, name: e.target.value })}
                className='input'
                required
              />
            </div>
            <div className='flex gap-3'>
              <button type='submit' className='btn-primary'>
                Create Group
              </button>
              <button
                type='button'
                onClick={() => setShowGroupForm(false)}
                className='btn-ghost'>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className='mb-8'>
        <div className='relative'>
          <input
            type='text'
            placeholder='Search groups by name...'
            value={groupSearch}
            onChange={e => setGroupSearch(e.target.value)}
            className='input pl-10'
          />
          <svg
            className='absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-neutral-400'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'
            />
          </svg>
        </div>
      </div>

      {filteredGroups.length === 0 ? (
        <div className='empty-state'>
          <div className='inline-flex items-center justify-center w-20 h-20 rounded-full bg-neutral-100 text-neutral-400 mb-4'>
            <svg className='w-10 h-10' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' />
            </svg>
          </div>
          <h3 className='text-xl font-semibold text-neutral-800 mb-2'>No groups found</h3>
          <p className='text-neutral-600 mb-6'>
            {groupSearch ? 'Try a different search term' : 'Create your first client group to get started'}
          </p>
        </div>
      ) : (
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'>
          {filteredGroups.map(group => (
            <Link key={group.group_id} href={`/clients/group/${group.group_id}`}>
              <div className='card-hover p-6 group cursor-pointer'>
                <div className='flex items-center justify-between mb-3'>
                  <div className='w-12 h-12 rounded-lg bg-primary-100 flex items-center justify-center group-hover:bg-primary-500 transition-colors duration-300'>
                    <svg className='w-6 h-6 text-primary-600 group-hover:text-white transition-colors duration-300' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' />
                    </svg>
                  </div>
                  <svg className='w-5 h-5 text-neutral-400 group-hover:text-primary-500 group-hover:translate-x-1 transition-all duration-300' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5l7 7-7 7' />
                  </svg>
                </div>
                <h2 className='text-xl font-bold text-neutral-800 group-hover:text-primary-600 transition-colors duration-300'>
                  {group.name}
                </h2>
                <p className='text-sm text-neutral-600 mt-2'>View group details</p>
              </div>
            </Link>
          ))}
        </div>
      )}
      </div>
    </div>
  )
}


