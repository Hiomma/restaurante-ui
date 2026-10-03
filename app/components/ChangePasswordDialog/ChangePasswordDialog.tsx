'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  InputAdornment,
  IconButton,
  Box,
  Typography,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { useSnackbar } from 'notistack';
import { useChangePassword } from '@/lib/queries';

export default function ChangePasswordDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { enqueueSnackbar } = useSnackbar();
  const changePassword = useChangePassword();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    setError('');
    if (!currentPassword || !newPassword) {
      setError('Preencha todos os campos.');
      return;
    }
    if (newPassword.length < 4) {
      setError('A nova senha deve ter pelo menos 4 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('A confirmação não confere com a nova senha.');
      return;
    }
    try {
      setSaving(true);
      await changePassword.mutateAsync({ currentPassword, newPassword });
      enqueueSnackbar('Senha alterada com sucesso.', { variant: 'success' });
      handleClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Não foi possível alterar a senha.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
      <DialogTitle>Alterar Senha</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            label="Senha atual"
            type={showPasswords ? 'text' : 'password'}
            size="small"
            fullWidth
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPasswords((v) => !v)} edge="end" size="small">
                      {showPasswords ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />
          <TextField
            label="Nova senha"
            type={showPasswords ? 'text' : 'password'}
            size="small"
            fullWidth
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <TextField
            label="Confirmar nova senha"
            type={showPasswords ? 'text' : 'password'}
            size="small"
            fullWidth
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          {error && (
            <Typography variant="caption" color="#d32f2f">
              {error}
            </Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} variant="outlined">
          Cancelar
        </Button>
        <Button onClick={() => void handleSubmit()} variant="contained" disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
