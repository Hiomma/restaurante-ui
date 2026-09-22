'use client';

import { usePathname, useRouter } from 'next/navigation';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Typography,
  Divider,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import InventoryIcon from '@mui/icons-material/Inventory';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import ScaleIcon from '@mui/icons-material/Scale';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import BarChartIcon from '@mui/icons-material/BarChart';
import EventNoteIcon from '@mui/icons-material/EventNote';
import PeopleIcon from '@mui/icons-material/People';
import DeleteIcon from '@mui/icons-material/Delete';
import LogoutIcon from '@mui/icons-material/Logout';
import ReceiptIcon from '@mui/icons-material/Receipt';
import Inventory2Icon from '@mui/icons-material/Inventory2';

const navItems = [
  { icon: <DashboardIcon />, label: 'Dashboard', path: '/' },
  { icon: <InventoryIcon />, label: 'Produtos', path: '/products' },
  { icon: <LocalShippingIcon />, label: 'Recebimento', path: '/stock-movements' },
  { icon: <ScaleIcon />, label: 'Porcionamento', path: '/portionings' },
  { icon: <SwapHorizIcon />, label: 'Movimentacoes', path: '/stock-movements' },
  { icon: <ReceiptIcon />, label: 'Entradas / Saidas', path: '/stock-movements' },
  { icon: <QrCodeScannerIcon />, label: 'Estoque', path: '/stock' },
  { icon: <BarChartIcon />, label: 'Relatorios', path: '/' },
  { icon: <EventNoteIcon />, label: 'Agenda', path: '/agenda' },
  { icon: <PeopleIcon />, label: 'Funcionarios', path: '/employees' },
];

export default function NavigationRail() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('accessToken');
    router.push('/login');
  };

  return (
    <Box
      sx={{
        width: 240,
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        bgcolor: '#1a2332',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 1000,
        overflow: 'auto',
      }}
    >
      <Box sx={{ px: 2, py: 2.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Avatar sx={{ bgcolor: '#2196F3', width: 40, height: 40, fontSize: 18 }}>
          <Inventory2Icon />
        </Avatar>
        <Box>
          <Typography variant="subtitle1" fontWeight="bold" color="#fff" lineHeight={1.2}>
            Controle de Estoque
          </Typography>
          <Typography variant="caption" color="#8899aa">
            Modoletto
          </Typography>
        </Box>
      </Box>

      <List sx={{ flex: 1, px: 1 }}>
        {navItems.map((item) => {
          const isActive = item.path === '/' ? pathname === '/' : pathname.startsWith(item.path);
          return (
            <ListItem key={item.label} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => router.push(item.path)}
                sx={{
                  borderRadius: 2,
                  color: isActive ? '#fff' : '#8899aa',
                  bgcolor: isActive ? '#2196F3' : 'transparent',
                  '&:hover': {
                    bgcolor: isActive ? '#1976D2' : '#243447',
                  },
                  px: 2,
                  py: 1,
                }}
              >
                <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontSize: '0.875rem',
                    fontWeight: isActive ? 600 : 400,
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      <Divider sx={{ borderColor: '#243447' }} />

      <List sx={{ px: 1 }}>
        <ListItem disablePadding sx={{ mb: 0.5 }}>
          <ListItemButton
            sx={{
              borderRadius: 2,
              color: '#cc4444',
              '&:hover': { bgcolor: '#243447' },
              px: 2,
              py: 1,
            }}
          >
            <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}>
              <DeleteIcon />
            </ListItemIcon>
            <ListItemText primary="Deletar Conta" primaryTypographyProps={{ fontSize: '0.875rem' }} />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton
            onClick={handleLogout}
            sx={{
              borderRadius: 2,
              color: '#8899aa',
              '&:hover': { bgcolor: '#243447' },
              px: 2,
              py: 1,
            }}
          >
            <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}>
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText primary="Sair" primaryTypographyProps={{ fontSize: '0.875rem' }} />
          </ListItemButton>
        </ListItem>
      </List>

      <Typography variant="caption" color="#556677" sx={{ textAlign: 'center', py: 1 }}>
        v2.0 — EstoqueApp
      </Typography>
    </Box>
  );
}
