'use client'

import React, { useState, useEffect } from 'react';
import { Card, CardContent, Typography, List, ListItemButton, ListItemText, TextField } from '@mui/material';
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
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div style={{ padding: '2rem' }}>
      <Typography variant="h4" gutterBottom>
        All Clients
      </Typography>
      <TextField
        fullWidth
        variant="outlined"
        label="Search clients"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={{ marginBottom: '1rem' }}
      />
      <Card>
        <CardContent>
          <List>
            {filteredClients.map((client) => (
              <Link href={`/clients/details/${client.client_id}`} key={client.client_id}>
                <ListItemButton>
                  <ListItemText 
                    primary={client.name} 
                    secondary={`Email: ${client.email} | Phone: ${client.phone}`}
                  />
                </ListItemButton>
              </Link>
            ))}
          </List>
        </CardContent>
      </Card>
    </div>
  );
}