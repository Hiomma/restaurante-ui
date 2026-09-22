'use client';

import { useRouter } from 'next/navigation';
import { Box, Typography, IconButton, Avatar, Badge } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

interface BackButtonProps {
  title?: string;
}

export default function BackButton({ title }: BackButtonProps) {
  const router = useRouter();

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
      <IconButton onClick={() => router.back()} size="small">
        <ArrowBackIcon />
      </IconButton>
      {title && (
        <Typography variant="h6" fontWeight="bold">
          {title}
        </Typography>
      )}
    </Box>
  );
}
