'use client';

import { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  CircularProgress,
  Chip,
  Switch,
  InputAdornment,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PeopleIcon from '@mui/icons-material/People';
import CloseIcon from '@mui/icons-material/Close';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { employeeSchema } from '@/lib/validation';
import {
  useEmployees,
  useCreateEmployee,
  useUpdateEmployee,
  useDeleteEmployee,
} from '@/lib/queries';
import type { Employee } from '@/types';
import LoggedLayout from '../components/LoggedLayout/LoggedLayout';
import ConfirmDialog from '../components/ConfirmDialog/ConfirmDialog';

type EmployeeFormValues = z.infer<typeof employeeSchema>;

const containedSx = {
  textTransform: 'none',
  borderRadius: 1.5,
  bgcolor: '#1976D2',
  px: 2.5,
  boxShadow: 'none',
  '&:hover': { bgcolor: '#1565C0', boxShadow: 'none' },
} as const;

const outlinedCancelSx = {
  textTransform: 'none',
  color: '#444',
  borderColor: '#e0e0e0',
  bgcolor: '#fff',
  borderRadius: 1.5,
  px: 2.5,
  '&:hover': { borderColor: '#bdbdbd', bgcolor: '#f5f5f5' },
} as const;

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <Typography variant="body2" fontWeight={600} sx={{ mb: 0.75 }}>
      {children}
      {required && ' *'}
    </Typography>
  );
}

export default function EmployeesPage() {
  const { data: employees, isLoading } = useEmployees();
  const createEmp = useCreateEmployee();
  const updateEmp = useUpdateEmployee();
  const deleteEmp = useDeleteEmployee();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: { name: '', username: '', password: '', role: 'employee' },
  });

  const openCreate = () => {
    setEditing(null);
    setShowPassword(false);
    form.reset({ name: '', username: '', password: '', role: 'employee' });
    setDialogOpen(true);
  };

  const openEdit = (emp: Employee) => {
    setEditing(emp);
    setShowPassword(false);
    form.reset({ name: emp.name, username: emp.username, password: '', role: emp.role });
    setDialogOpen(true);
  };

  const onSubmit = async (data: EmployeeFormValues) => {
    if (!editing) {
      if (!data.password) {
        form.setError('password', { message: 'Senha é obrigatória' });
        return;
      }
      if ((data.password ?? '').length < 6) {
        form.setError('password', { message: 'Senha deve ter pelo menos 6 caracteres' });
        return;
      }
      await createEmp.mutateAsync({
        name: data.name,
        username: data.username,
        password: data.password,
        role: data.role ?? 'employee',
      });
    } else {
      const payload: Partial<EmployeeFormValues> = {
        name: data.name,
        username: data.username,
        role: data.role ?? 'employee',
      };
      if (data.password) payload.password = data.password;
      await updateEmp.mutateAsync({ id: editing._id, data: payload });
    }
    setDialogOpen(false);
  };

  const toggleActive = (emp: Employee) => {
    updateEmp.mutate({ id: emp._id, data: { active: !emp.active } });
  };

  const handleDelete = async () => {
    if (deleteTarget) {
      await deleteEmp.mutateAsync(deleteTarget);
      setDeleteTarget(null);
    }
  };

  return (
    <LoggedLayout>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
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
            <PeopleIcon sx={{ color: '#1976D2', fontSize: 22 }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight="bold">
              Funcionários
            </Typography>
            <Typography variant="body2" sx={{ color: '#666' }}>
              Gerencie os usuários do sistema
            </Typography>
          </Box>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate} sx={containedSx}>
          + Novo Funcionário
        </Button>
      </Box>

      <Box
        sx={{
          bgcolor: '#E8F4FD',
          border: '1px solid #B3DDF2',
          borderRadius: 2,
          p: 2,
          mb: 3,
        }}
      >
        <Typography variant="body2" sx={{ color: '#333', lineHeight: 1.6 }}>
          <Box component="span" sx={{ fontWeight: 700 }}>
            Como funciona:{' '}
          </Box>
          Funcionários acessam o sistema pela tela de login usando nome de usuário e senha. O ADM
          (acesso pelo e-mail) pode criar e excluir funcionários. As etiquetas geradas sairão com o
          nome do funcionário logado.
        </Typography>
      </Box>

      {isLoading ? (
        <CircularProgress />
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#f5f7fa' }}>
                <TableCell sx={{ fontWeight: 700, color: '#333' }}>Nome</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#333' }}>Usuário</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#333' }}>Perfil</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#333' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#333' }} align="center">
                  Ações
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {employees?.map((emp) => (
                <TableRow key={emp._id} hover>
                  <TableCell>
                    <Typography fontWeight={500}>{emp.name}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ color: '#666' }}>
                      {emp.username}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {emp.role === 'admin' ? (
                      <Chip
                        label="Admin"
                        size="small"
                        sx={{
                          bgcolor: '#EDE7F6',
                          color: '#5E35B1',
                          fontWeight: 600,
                          borderRadius: 1,
                        }}
                      />
                    ) : (
                      <Chip
                        label="Funcionário"
                        size="small"
                        sx={{
                          bgcolor: '#E3F2FD',
                          color: '#1565C0',
                          fontWeight: 600,
                          borderRadius: 1,
                        }}
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={emp.active}
                      color="primary"
                      size="small"
                      onChange={() => toggleActive(emp)}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      onClick={() => openEdit(emp)}
                      sx={{ color: '#666' }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => setDeleteTarget(emp._id)}
                      sx={{ color: '#d32f2f' }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {employees?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">Nenhum funcionário encontrado</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            pb: 1,
          }}
        >
          {editing ? 'Editar Funcionário' : 'Novo Funcionário'}
          <IconButton
            aria-label="fechar"
            onClick={() => setDialogOpen(false)}
            size="small"
            sx={{ color: '#666', mr: -1 }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
            <Box>
              <FieldLabel required>Nome Completo</FieldLabel>
              <TextField
                placeholder="Ex: João Silva"
                {...form.register('name')}
                error={!!form.formState.errors.name}
                helperText={form.formState.errors.name?.message}
                fullWidth
              />
            </Box>
            <Box>
              <FieldLabel required>Nome de Usuário</FieldLabel>
              <TextField
                placeholder="Ex: joao.silva"
                {...form.register('username')}
                error={!!form.formState.errors.username}
                helperText={form.formState.errors.username?.message}
                fullWidth
              />
            </Box>
            <Box>
              <FieldLabel required>Senha</FieldLabel>
              <TextField
                type={showPassword ? 'text' : 'password'}
                placeholder={editing ? 'Deixe vazio para manter' : undefined}
                {...form.register('password')}
                error={!!form.formState.errors.password}
                helperText={form.formState.errors.password?.message}
                fullWidth
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          edge="end"
                          onClick={() => setShowPassword((v) => !v)}
                          aria-label="mostrar senha"
                        >
                          {showPassword ? (
                            <VisibilityOffIcon fontSize="small" />
                          ) : (
                            <VisibilityIcon fontSize="small" />
                          )}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />
            </Box>
            <Box>
              <FieldLabel>Perfil</FieldLabel>
              <TextField select {...form.register('role')} fullWidth>
                <MenuItem value="employee">Funcionário</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
              </TextField>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1.5 }}>
          <Button onClick={() => setDialogOpen(false)} variant="outlined" sx={outlinedCancelSx}>
            Cancelar
          </Button>
          <Button onClick={form.handleSubmit(onSubmit)} variant="contained" sx={containedSx}>
            {editing ? 'Salvar' : 'Cadastrar'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Excluir Funcionário"
        message="Tem certeza?"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </LoggedLayout>
  );
}
