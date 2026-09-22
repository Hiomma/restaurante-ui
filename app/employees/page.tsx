'use client';

import { useState } from 'react';
import {
  Box, Typography, Button, Card, CardContent, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, CircularProgress, Chip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { employeeSchema } from '@/lib/validation';
import { useEmployees, useCreateEmployee, useUpdateEmployee, useDeleteEmployee } from '@/lib/queries';
import LoggedLayout from '../components/LoggedLayout/LoggedLayout';
import ConfirmDialog from '../components/ConfirmDialog/ConfirmDialog';

export default function EmployeesPage() {
  const { data: employees, isLoading } = useEmployees();
  const createEmp = useCreateEmployee();
  const updateEmp = useUpdateEmployee();
  const deleteEmp = useDeleteEmployee();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const form = useForm({
    resolver: zodResolver(employeeSchema),
    defaultValues: { name: '', username: '', password: '', role: 'employee' as const },
  });

  const openCreate = () => {
    setEditing(null);
    form.reset({ name: '', username: '', password: '', role: 'employee' });
    setDialogOpen(true);
  };

  const openEdit = (emp: any) => {
    setEditing(emp);
    form.reset({ name: emp.name, username: emp.username, password: '', role: emp.role });
    setDialogOpen(true);
  };

  const onSubmit = async (data: any) => {
    const payload = { ...data };
    if (editing && !payload.password) delete payload.password;
    if (editing) {
      await updateEmp.mutateAsync({ id: editing._id, data: payload });
    } else {
      await createEmp.mutateAsync(payload);
    }
    setDialogOpen(false);
  };

  const handleDelete = async () => {
    if (deleteTarget) {
      await deleteEmp.mutateAsync(deleteTarget);
      setDeleteTarget(null);
    }
  };

  return (
    <LoggedLayout>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">Funcionarios</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>Novo Funcionario</Button>
      </Box>

      {isLoading ? <CircularProgress /> : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {employees?.map((emp) => (
            <Card key={emp._id}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="h6" fontWeight="bold">{emp.name}</Typography>
                    <Typography variant="body2" color="text.secondary">@{emp.username}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip label={emp.role} color={emp.role === 'admin' ? 'primary' : 'default'} size="small" />
                    <Chip label={emp.active ? 'Ativo' : 'Inativo'} color={emp.active ? 'success' : 'default'} size="small" />
                    <IconButton size="small" onClick={() => openEdit(emp)}><EditIcon fontSize="small" /></IconButton>
                    <IconButton size="small" onClick={() => setDeleteTarget(emp._id)}><DeleteIcon fontSize="small" /></IconButton>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'Editar Funcionario' : 'Novo Funcionario'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField label="Nome" {...form.register('name')} error={!!form.formState.errors.name} helperText={form.formState.errors.name?.message} fullWidth />
            <TextField label="Username" {...form.register('username')} error={!!form.formState.errors.username} helperText={form.formState.errors.username?.message} fullWidth />
            <TextField label={editing ? 'Nova Senha (deixe vazio para manter)' : 'Senha'} type="password" {...form.register('password')} error={!!form.formState.errors.password} helperText={form.formState.errors.password?.message} fullWidth />
            <TextField select label="Role" {...form.register('role')} fullWidth>
              <MenuItem value="employee">Funcionario</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button onClick={form.handleSubmit(onSubmit)} variant="contained">{editing ? 'Salvar' : 'Criar'}</Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog open={!!deleteTarget} title="Excluir Funcionario" message="Tem certeza?" onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
    </LoggedLayout>
  );
}
