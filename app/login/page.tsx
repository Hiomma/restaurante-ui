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
import { loginSchema } from '@/lib/validation';
import { useLogin } from '@/lib/queries';

export default function LoginPage() {
  const router = useRouter();
  const login = useLogin();
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
      localStorage.setItem('token', result.access_token);
      localStorage.setItem('accessToken', result.access_token);
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
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#f5f5f5',
      }}
    >
      <Card sx={{ width: 400, p: 2 }}>
        <CardContent>
          <Typography variant="h4" align="center" fontWeight="bold" gutterBottom>
            Restaurante
          </Typography>
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
            <Button
              variant="outlined"
              fullWidth
              onClick={() => router.push('/register')}
            >
              Criar conta
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
