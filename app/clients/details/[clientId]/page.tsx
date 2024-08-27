'use client'

import React, { useState, useEffect } from 'react';
import { Card, CardContent, Typography, Grid } from '@mui/material';
import { clientFunctions, Client } from '../../../../utils/functions/clients';

export default function ClientDetailsPage({ params }: { params: { clientId: string } }) {
  const [client, setClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      setError(null);
    } catch (error) {
      console.error('Error fetching client details:', error);
      setError('Failed to fetch client details. Please try again later.');
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
        Client Details
      </Typography>
      {client && (
        <Card>
          <CardContent>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6">Name</Typography>
                <Typography>{client.name}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h6">Email</Typography>
                <Typography>{client.email}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h6">Phone</Typography>
                <Typography>{client.phone}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h6">Address</Typography>
                <Typography>{client.address}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="h6">Balance</Typography>
                <Typography>${client.balance.toFixed(2)}</Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}
    </div>
  );
}