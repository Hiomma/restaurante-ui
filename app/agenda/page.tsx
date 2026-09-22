'use client';

import { useState } from 'react';
import {
  Box, Typography, Button, Card, CardContent, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, CircularProgress, Chip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { agendaItemSchema } from '@/lib/validation';
import { useAgendaItems, useCreateAgendaItem, useUpdateAgendaItem, useDeleteAgendaItem } from '@/lib/queries';
import LoggedLayout from '../components/LoggedLayout/LoggedLayout';
import ConfirmDialog from '../components/ConfirmDialog/ConfirmDialog';

export default function AgendaPage() {
  const { data: items, isLoading } = useAgendaItems();
  const createItem = useCreateAgendaItem();
  const updateItem = useUpdateAgendaItem();
  const deleteItem = useDeleteAgendaItem();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const form = useForm({
    resolver: zodResolver(agendaItemSchema),
    defaultValues: { name: '', datePerformed: '', expiryDate: '', observations: '' },
  });

  const openCreate = () => {
    setEditing(null);
    form.reset({ name: '', datePerformed: '', expiryDate: '', observations: '' });
    setDialogOpen(true);
  };

  const openEdit = (item: any) => {
    setEditing(item);
    form.reset({
      name: item.name,
      datePerformed: item.datePerformed?.split('T')[0],
      expiryDate: item.expiryDate?.split('T')[0],
      observations: item.observations || '',
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: any) => {
    if (editing) {
      await updateItem.mutateAsync({ id: editing._id, data });
    } else {
      await createItem.mutateAsync(data);
    }
    setDialogOpen(false);
  };

  const handleDelete = async () => {
    if (deleteTarget) {
      await deleteItem.mutateAsync(deleteTarget);
      setDeleteTarget(null);
    }
  };

  return (
    <LoggedLayout>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">Agenda</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>Novo Item</Button>
      </Box>

      {isLoading ? <CircularProgress /> : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {items?.map((item) => (
            <Card key={item._id}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography variant="h6" fontWeight="bold">{item.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Realizado: {new Date(item.datePerformed).toLocaleDateString('pt-BR')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Validade: {new Date(item.expiryDate).toLocaleDateString('pt-BR')}
                    </Typography>
                    {item.observations && (
                      <Typography variant="body2" sx={{ mt: 0.5 }}>{item.observations}</Typography>
                    )}
                  </Box>
                  <Box>
                    <IconButton size="small" onClick={() => openEdit(item)}><EditIcon fontSize="small" /></IconButton>
                    <IconButton size="small" onClick={() => setDeleteTarget(item._id)}><DeleteIcon fontSize="small" /></IconButton>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'Editar Item' : 'Novo Item'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField label="Nome" {...form.register('name')} error={!!form.formState.errors.name} helperText={form.formState.errors.name?.message} fullWidth />
            <TextField type="date" label="Data Realizada" {...form.register('datePerformed')} error={!!form.formState.errors.datePerformed} helperText={form.formState.errors.datePerformed?.message} fullWidth InputLabelProps={{ shrink: true }} />
            <TextField type="date" label="Data Validade" {...form.register('expiryDate')} error={!!form.formState.errors.expiryDate} helperText={form.formState.errors.expiryDate?.message} fullWidth InputLabelProps={{ shrink: true }} />
            <TextField label="Observacoes" {...form.register('observations')} fullWidth multiline rows={2} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button onClick={form.handleSubmit(onSubmit)} variant="contained">{editing ? 'Salvar' : 'Criar'}</Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog open={!!deleteTarget} title="Excluir Item" message="Tem certeza?" onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
    </LoggedLayout>
  );
}
