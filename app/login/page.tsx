'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
} from '@mui/material';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { loginSchema } from '@/lib/validation';
import { useLogin } from '@/lib/queries';
import { storeToken, resetSessionCache } from '@/lib/session';
import { colors } from '@/lib/design-system';

export default function LoginPage() {
  const router = useRouter();
  const login = useLogin();
  const queryClient = useQueryClient();
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: { username: string; password: string }) => {
    try {
      setError('');
      const result = await login.mutateAsync(data);
      storeToken(result.access_token);
      // Drop everything cached under the previous session so the new user
      // never sees the previous user's data.
      resetSessionCache(queryClient);
      router.push('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Credenciais invalidas');
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
        // Fundo Azul Petróleo Escuro da identidade visual SIETIMA
        bgcolor: colors.brand.navy,
        px: 1.5,
        py: 4,
      }}
    >
      {/* Logotipo completo na variante para fundo escuro + slogan (Montserrat SemiBold) */}
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
        <Box
          component="img"
          src="/logo-sietima-light.svg"
          alt="Sietima"
          sx={{ width: 'min(280px, 78vw)', height: 'auto' }}
        />
        <Typography
          sx={{
            color: colors.common.white,
            fontSize: { xs: 11, sm: 13 },
            fontWeight: 600,
            letterSpacing: { xs: 1, sm: 1.5 },
            textTransform: 'uppercase',
          }}
        >
          Gestão precisa do estoque ao prato
        </Typography>
      </Box>

      <Card sx={{ width: '100%', maxWidth: 400, p: 2 }}>
        <CardContent>
          <Typography variant="body2" align="center" color="text.secondary" sx={{ mb: 3 }}>
            Faca login para continuar
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Usuario"
              {...register('username')}
              error={!!errors.username}
              helperText={errors.username?.message}
              fullWidth
              size="small"
            />
            <TextField
              label="Senha"
              type="password"
              {...register('password')}
              error={!!errors.password}
              helperText={errors.password?.message}
              fullWidth
              size="small"
            />
            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={login.isPending}
            >
              {login.isPending ? 'Entrando...' : 'Entrar'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
