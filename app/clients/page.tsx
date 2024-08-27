'use client'

import React, { useState, useEffect } from 'react';
import { Card, CardContent, Typography, Grid, Button } from '@mui/material';
import { styled } from '@mui/system';
import { clientFunctions, ClientGroup } from '../../utils/functions/clients';
import Link from 'next/link';

const StyledCard = styled(Card)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
  '&:hover': {
    transform: 'translateY(-5px)',
    boxShadow: '0 4px 20px 0 rgba(0,0,0,0.12)',
  },
}));

export default function ClientsPage() {
  const [groups, setGroups] = useState<ClientGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div style={{ padding: '2rem' }}>
      <Typography variant="h3" gutterBottom align="center" sx={{ mb: 4 }}>
        Client Management
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Link href="/clients/all" passHref>
            <Button variant="contained" color="primary" fullWidth>
              All Clients
            </Button>
          </Link>
        </Grid>
        {groups.map((group) => (
          <Grid item xs={12} sm={6} md={4} key={group.group_id}>
            <Link href={`/clients/group/${group.group_id}`} passHref>
              <StyledCard>
                <CardContent>
                  <Typography variant="h5" component="div" gutterBottom>
                    {group.name}
                  </Typography>
                </CardContent>
              </StyledCard>
            </Link>
          </Grid>
        ))}
      </Grid>
    </div>
  );
}