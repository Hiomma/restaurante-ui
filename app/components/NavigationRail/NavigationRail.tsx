'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AppRegistrationIcon from '@mui/icons-material/AppRegistration';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import ScaleIcon from '@mui/icons-material/Scale';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import BarChartIcon from '@mui/icons-material/BarChart';
import EventNoteIcon from '@mui/icons-material/EventNote';
import LockIcon from '@mui/icons-material/Lock';
import LogoutIcon from '@mui/icons-material/Logout';
// Versão exibida na barra lateral: fonte única é o `version` do package.json,
// que é atualizado junto com a tag no release (v2.4.0, v2.4.1, ...).
import packageJson from '@/package.json';
import ReceiptIcon from '@mui/icons-material/Receipt';
import ChangePasswordDialog from '@/app/components/ChangePasswordDialog/ChangePasswordDialog';
import { clearToken, resetSessionCache } from '@/lib/session';
import { useAccess } from '@/lib/permissions';
import { colors } from '@/lib/design-system';

const navItems = [
  { icon: <DashboardIcon />, label: 'Dashboard', path: '/' },
  { icon: <AppRegistrationIcon />, label: 'Cadastros', path: '/cadastros' },
  { icon: <LocalShippingIcon />, label: 'Recebimento', path: '/receiving' },
  { icon: <ScaleIcon />, label: 'Porcionamento', path: '/portionings' },
  { icon: <SwapHorizIcon />, label: 'Movimentações', path: '/movements' },
  { icon: <ReceiptIcon />, label: 'Histórico', path: '/history' },
  { icon: <QrCodeScannerIcon />, label: 'Estoque', path: '/stock' },
  { icon: <BarChartIcon />, label: 'Relatórios', path: '/reports' },
  { icon: <EventNoteIcon />, label: 'Agenda', path: '/agenda' },
];

/**
 * Permissão de acesso por rota: a navegação mostra/oculta cada item
 * conforme a matriz de permissões por perfil (aba "Permissões").
 */
const NAV_PERMISSION_BY_PATH: Record<string, keyof ReturnType<typeof useAccess>> = {
  '/': 'dashboard',
  '/cadastros': 'cadastros',
  '/receiving': 'recebimento',
  '/portionings': 'porcionamentoCreate',
  '/movements': 'movimentacoes',
  '/history': 'historico',
  '/stock': 'estoqueView',
  '/reports': 'relatorios',
  '/agenda': 'agendaView',
};

export default function NavigationRail({
  inDrawer = false,
  onNavigate,
}: {
  inDrawer?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [passwordOpen, setPasswordOpen] = useState(false);
  // Matriz de permissões por perfil: cada rota é filtrada pela sua chave.
  const access = useAccess();
  const visibleNavItems = navItems.filter((item) => {
    const key = NAV_PERMISSION_BY_PATH[item.path];
    return key ? access[key] !== false : true;
  });

  const handleLogout = () => {
    clearToken();
    // Remove every cached API response so no user-specific data survives
    // into the next session.
    resetSessionCache(queryClient);
    router.push('/login');
  };

  const navigate = (path: string) => {
    onNavigate?.();
    router.push(path);
  };

  return (
    <Box
      className="no-print"
      sx={{
        width: 240,
        height: inDrawer ? '100%' : '100vh',
        position: inDrawer ? 'static' : 'fixed',
        left: inDrawer ? undefined : 0,
        top: inDrawer ? undefined : 0,
        bgcolor: colors.brand.navy,
        display: 'flex',
        flexDirection: 'column',
        zIndex: inDrawer ? 'auto' : 1200,
        overflow: 'auto',
      }}
    >
      <Box sx={{ px: 2, py: 2.5, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1 }}>
        {/* Logotipo completo SIETIMA na variante para fundo escuro */}
        <Box
          component="img"
          src="/logo-sietima-light.svg"
          alt="Sietima"
          sx={{ width: 168, height: 'auto', display: 'block' }}
        />
        <Typography
          variant="caption"
          sx={{
            color: colors.onNavy.muted,
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: 0.6,
            textTransform: 'uppercase',
            lineHeight: 1.3,
          }}
        >
          Gestão precisa do estoque ao prato
        </Typography>
      </Box>

      <List sx={{ flex: 1, px: 1 }}>
        {visibleNavItems.map((item) => {
          const isActive = item.path === '/' ? pathname === '/' : pathname.startsWith(item.path);
          return (
            <ListItem key={item.label} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => navigate(item.path)}
                sx={{
                  borderRadius: 2,
                  color: isActive ? colors.common.white : colors.onNavy.text,
                  // Item ativo em Verde Esmeralda (destaque da identidade)
                  bgcolor: isActive ? colors.brand.emerald : 'transparent',
                  '&:hover': {
                    bgcolor: isActive ? colors.brand.emeraldDark : colors.brand.navyHover,
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

      <Divider sx={{ borderColor: colors.brand.navyLight }} />

      <List sx={{ px: 1 }}>
        {access.changePassword && (
          <ListItem disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              onClick={() => {
                setPasswordOpen(true);
                onNavigate?.();
              }}
              sx={{
                borderRadius: 2,
                color: colors.onNavy.text,
                '&:hover': { bgcolor: colors.brand.navyHover },
                px: 2,
                py: 1,
              }}
            >
              <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}>
                <LockIcon />
              </ListItemIcon>
              <ListItemText primary="Alterar Senha" primaryTypographyProps={{ fontSize: '0.875rem' }} />
            </ListItemButton>
          </ListItem>
        )}
        <ListItem disablePadding>
          <ListItemButton
            onClick={handleLogout}
            sx={{
              borderRadius: 2,
              color: colors.onNavy.text,
              '&:hover': { bgcolor: colors.brand.navyHover },
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

      <Typography variant="caption" color={colors.onNavy.faint} sx={{ textAlign: 'center', py: 1 }}>
        v{packageJson.version} — Sietima
      </Typography>

      <ChangePasswordDialog
        open={!!access.changePassword && passwordOpen}
        onClose={() => setPasswordOpen(false)}
      />
    </Box>
  );
}
