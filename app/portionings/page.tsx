'use client';

import { useState } from 'react';
import {
  Box, Typography, Button, Card, CardContent, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, CircularProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { portioningSchema } from '@/lib/validation';
import { usePortionings, useCreatePortioning, useDeletePortioning, useProducts } from '@/lib/queries';
import LoggedLayout from '../components/LoggedLayout/LoggedLayout';
import ConfirmDialog from '../components/ConfirmDialog/ConfirmDialog';

export default function PortioningsPage() {
  const { data: portionings, isLoading } = usePortionings();
  const { data: products } = useProducts();
  const createPortioning = useCreatePortioning();
  const deletePortioning = useDeletePortioning();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const form = useForm({
    resolver: zodResolver(portioningSchema),
    defaultValues: { productId: '', productName: '', rawWeightGrams: 0, cleanWeightGrams: 0, lossGrams: 0, portionsCount: 0, date: new Date().toISOString().split('T')[0], lote: '', employeeName: '' },
  });

  const onSubmit = async (data: any) => {
    await createPortioning.mutateAsync(data);
    setDialogOpen(false);
    form.reset();
  };

  const handleDelete = async () => {
    if (deleteTarget) {
      await deletePortioning.mutateAsync(deleteTarget);
      setDeleteTarget(null);
    }
  };

  return (
    <LoggedLayout>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">Porcionamento</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => { form.reset(); setDialogOpen(true); }}>Novo Porcionamento</Button>
      </Box>

      {isLoading ? <CircularProgress /> : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {portionings?.map((p) => (
            <Card key={p._id}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography variant="h6" fontWeight="bold">{p.product.productName}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Bruto: {p.rawWeightGrams}g | Limpo: {p.cleanWeightGrams}g | Perda: {p.lossGrams}g ({p.lossPercentage?.toFixed(1)}%)
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {p.portionsCount} porcoes de {p.portionWeightGrams?.toFixed(0)}g | {new Date(p.date).toLocaleDateString('pt-BR')}
                    </Typography>
                    {p.lote && <Typography variant="body2" color="text.secondary">Lote: {p.lote}</Typography>}
                  </Box>
                  <IconButton size="small" onClick={() => setDeleteTarget(p._id)}><DeleteIcon fontSize="small" /></IconButton>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Novo Porcionamento</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField select label="Produto" {...form.register('productId')} onChange={(e) => {
              const p = products?.find((p) => p._id === e.target.value);
              if (p) { form.setValue('productName', p.name); form.setValue('productId', p._id); }
            }} fullWidth>
              {products?.map((p) => <MenuItem key={p._id} value={p._id}>{p.name}</MenuItem>)}
            </TextField>
            <TextField type="number" label="Peso Bruto (g)" {...form.register('rawWeightGrams', { valueAsNumber: true })} fullWidth />
            <TextField type="number" label="Peso Limpo (g)" {...form.register('cleanWeightGrams', { valueAsNumber: true })} fullWidth />
            <TextField type="number" label="Perda (g)" {...form.register('lossGrams', { valueAsNumber: true })} fullWidth />
            <TextField type="number" label="Qtd Porcoes" {...form.register('portionsCount', { valueAsNumber: true })} fullWidth />
            <TextField type="date" label="Data" {...form.register('date')} fullWidth InputLabelProps={{ shrink: true }} />
            <TextField label="Lote" {...form.register('lote')} fullWidth />
            <TextField label="Funcionario" {...form.register('employeeName')} fullWidth />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button onClick={form.handleSubmit(onSubmit)} variant="contained">Criar</Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog open={!!deleteTarget} title="Excluir" message="Tem certeza?" onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
    </LoggedLayout>
  );
}
