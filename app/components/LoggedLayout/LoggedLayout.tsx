'use client';

import { useState } from 'react';
import NavigationRail from '@/app/components/NavigationRail/NavigationRail';
import { AppBar, Box, Drawer, IconButton, Toolbar, Typography, useMediaQuery, useTheme } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';

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
            sx={{ bgcolor: '#1a2332', zIndex: 1300 }}
          >
            <Toolbar variant="dense">
              <IconButton edge="start" color="inherit" onClick={() => setDrawerOpen(true)} aria-label="menu">
                <MenuIcon />
              </IconButton>
              <Typography variant="subtitle1" fontWeight="bold" sx={{ ml: 1 }}>
                Controle de Estoque
              </Typography>
            </Toolbar>
          </AppBar>
          <Drawer
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            className="no-print"
            PaperProps={{ sx: { width: 240, bgcolor: '#1a2332' } }}
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
          bgcolor: '#fafafa',
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
