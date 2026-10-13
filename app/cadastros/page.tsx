'use client';

import { useState } from 'react';
import { Box, Tab, Typography } from '@mui/material';
import AppRegistrationIcon from '@mui/icons-material/AppRegistration';
import InventoryIcon from '@mui/icons-material/Inventory';
import PeopleIcon from '@mui/icons-material/People';
import PlaceIcon from '@mui/icons-material/Place';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import LoggedLayout from '../components/LoggedLayout/LoggedLayout';
import ResponsiveTabs from '../components/ResponsiveTabs/ResponsiveTabs';
import ProductsRegistry from './registries/ProductsRegistry';
import EmployeesRegistry from './registries/EmployeesRegistry';
import DestinosRegistry from './registries/DestinosRegistry';
import SuppliersRegistry from './registries/SuppliersRegistry';

export default function CadastrosPage() {
  const [tab, setTab] = useState(0);

  return (
    <LoggedLayout>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            bgcolor: '#E3F2FD',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <AppRegistrationIcon sx={{ color: '#1976D2' }} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h5" fontWeight="bold">
            Cadastros
          </Typography>
          <Typography variant="body2" sx={{ color: '#666' }}>
            Produtos, funcionários, destinos e fornecedores
          </Typography>
        </Box>
      </Box>

      <ResponsiveTabs
        fit="equal"
        value={tab}
        onChange={(_, v) => setTab(v)}
        scrollButtons="auto"
        allowScrollButtonsMobile
        sx={{
          bgcolor: '#f1f3f5',
          borderRadius: 2,
          p: 0.5,
          mb: 3,
          minHeight: 44,
          '& .MuiTabs-indicator': { display: 'none' },
          '& .MuiTab-root': {
            textTransform: 'none',
            borderRadius: 1.5,
            minHeight: 40,
            fontWeight: 600,
            color: '#555',
            whiteSpace: 'nowrap',
            alignItems: 'center',
            flexDirection: 'row',
            gap: 1,
            '&.Mui-selected': { bgcolor: '#fff', color: '#1976D2' },
          },
        }}
      >
        <Tab icon={<InventoryIcon fontSize="small" />} iconPosition="start" label="Produtos" />
        <Tab icon={<PeopleIcon fontSize="small" />} iconPosition="start" label="Funcionários" />
        <Tab icon={<PlaceIcon fontSize="small" />} iconPosition="start" label="Destinos" />
        <Tab icon={<LocalShippingIcon fontSize="small" />} iconPosition="start" label="Fornecedores" />
      </ResponsiveTabs>

      {tab === 0 && <ProductsRegistry />}
      {tab === 1 && <EmployeesRegistry />}
      {tab === 2 && <DestinosRegistry />}
      {tab === 3 && <SuppliersRegistry />}
    </LoggedLayout>
  );
}
