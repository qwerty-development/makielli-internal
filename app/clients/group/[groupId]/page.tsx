'use client'

import React, { useState, useEffect } from 'react';
import { Card, CardContent, Typography, List, ListItemButton, ListItemText } from '@mui/material';
import { clientFunctions, Client, ClientGroup } from '../../../../utils/functions/clients'
import Link from 'next/link';

export default function GroupDetailsPage({ params }: { params: { groupId: string } }) {
  const [group, setGroup] = useState<ClientGroup | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      setError(null);
    } catch (error) {
      console.error('Error fetching group and clients:', error);
      setError('Failed to fetch group and clients. Please try again later.');
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
        {group?.name} Clients
      </Typography>
      <Card>
        <CardContent>
          <List>
            {clients.map((client) => (
              <Link href={`/clients/details/${client.client_id}`} key={client.client_id}>
                <ListItemButton>
                  <ListItemText primary={client.name} secondary={client.email} />
                </ListItemButton>
              </Link>
            ))}
          </List>
        </CardContent>
      </Card>
    </div>
  );
}