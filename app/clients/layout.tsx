'use client'

import React from 'react';
import { AppBar, Toolbar, Typography, Container } from '@mui/material';
import Link from 'next/link';

export default function ClientsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Link href="/clients" passHref style={{ color: 'white', textDecoration: 'none' }}>
            <Typography variant="h6">Client Management</Typography>
          </Link>
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg" style={{ marginTop: '2rem' }}>
        {children}
      </Container>
    </>
  );
}