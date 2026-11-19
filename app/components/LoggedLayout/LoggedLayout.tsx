'use client';

import { useState } from 'react';
import NavigationRail from '@/app/components/NavigationRail/NavigationRail';
import { AppBar, Box, Drawer, IconButton, Toolbar, useMediaQuery, useTheme } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { colors } from '@/lib/design-system';

export default function LoggedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <Box sx={{ display: 'flex' }}>
      {!isMobile && <NavigationRail />}

      {isMobile && (
        <>
          <AppBar
            position="fixed"
            elevation={1}
            className="no-print"
            sx={{ bgcolor: colors.brand.navy, zIndex: (theme) => theme.zIndex.appBar }}
          >
            <Toolbar variant="dense">
              <IconButton edge="start" color="inherit" onClick={() => setDrawerOpen(true)} aria-label="menu">
                <MenuIcon />
              </IconButton>
              {/* Logotipo SIETIMA na variante para fundo escuro */}
              <Box
                component="img"
                src="/logo-sietima-wordmark-light.svg"
                alt="Sietima"
                sx={{ height: 20, width: 'auto', ml: 1 }}
              />
            </Toolbar>
          </AppBar>
          <Drawer
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            className="no-print"
            sx={{ zIndex: 1300 }}
            PaperProps={{ sx: { width: 240, bgcolor: colors.brand.navy } }}
          >
            <NavigationRail inDrawer onNavigate={() => setDrawerOpen(false)} />
          </Drawer>
        </>
      )}

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          ml: { xs: 0, md: '240px' },
          mt: { xs: '48px', md: 0 },
          p: { xs: 1.5, sm: 3 },
          minHeight: '100vh',
          bgcolor: colors.surface.row,
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
