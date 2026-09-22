'use client';

import NavigationRail from '@/app/components/NavigationRail/NavigationRail';
import { Box } from '@mui/material';

export default function LoggedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Box sx={{ display: 'flex' }}>
      <NavigationRail />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          ml: '240px',
          p: 3,
          minHeight: '100vh',
          bgcolor: '#fafafa',
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
