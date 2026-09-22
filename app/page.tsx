'use client';

import { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
} from '@mui/material';
import EventNoteIcon from '@mui/icons-material/EventNote';
import PeopleIcon from '@mui/icons-material/People';
import InventoryIcon from '@mui/icons-material/Inventory';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import { useMe } from '@/lib/queries';
import LoggedLayout from './components/LoggedLayout/LoggedLayout';

export default function DashboardPage() {
  const { data: user } = useMe();

  return (
    <LoggedLayout>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Dashboard
      </Typography>

      {user && (
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Bem-vindo, {user.name}!
        </Typography>
      )}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 3 }}>
          <Card sx={{ cursor: 'pointer' }} onClick={() => window.location.href = '/agenda'}>
            <CardContent>
              <EventNoteIcon sx={{ fontSize: 40, color: '#D32F2F' }} />
              <Typography variant="h6" fontWeight="bold" sx={{ mt: 1 }}>Agenda</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <Card sx={{ cursor: 'pointer' }} onClick={() => window.location.href = '/employees'}>
            <CardContent>
              <PeopleIcon sx={{ fontSize: 40, color: '#FF8F00' }} />
              <Typography variant="h6" fontWeight="bold" sx={{ mt: 1 }}>Funcionarios</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <Card sx={{ cursor: 'pointer' }} onClick={() => window.location.href = '/products'}>
            <CardContent>
              <InventoryIcon sx={{ fontSize: 40, color: '#4CAF50' }} />
              <Typography variant="h6" fontWeight="bold" sx={{ mt: 1 }}>Produtos</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <Card sx={{ cursor: 'pointer' }} onClick={() => window.location.href = '/stock'}>
            <CardContent>
              <QrCodeScannerIcon sx={{ fontSize: 40, color: '#2196F3' }} />
              <Typography variant="h6" fontWeight="bold" sx={{ mt: 1 }}>Estoque</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </LoggedLayout>
  );
}
