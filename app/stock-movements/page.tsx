'use client';

import { useState } from 'react';
import {
  Box, Typography, Button, Card, CardContent, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, CircularProgress, Chip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { stockMovementSchema } from '@/lib/validation';
import { useStockMovements, useCreateStockMovement, useDeleteStockMovement, useProducts } from '@/lib/queries';
import LoggedLayout from '../components/LoggedLayout/LoggedLayout';
import ConfirmDialog from '../components/ConfirmDialog/ConfirmDialog';

export default function StockMovementsPage() {
  const { data: movements, isLoading } = useStockMovements();
  const { data: products } = useProducts();
  const createMovement = useCreateStockMovement();
  const deleteMovement = useDeleteStockMovement();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const form = useForm({
    resolver: zodResolver(stockMovementSchema),
    defaultValues: { productId: '', productName: '', movementType: 'entry' as const, quantity: 0, weightGrams: 0, itemType: 'raw' as const, reason: '', date: new Date().toISOString().split('T')[0] },
  });

  const onSubmit = async (data: any) => {
    await createMovement.mutateAsync(data);
    setDialogOpen(false);
    form.reset();
  };

  const handleDelete = async () => {
    if (deleteTarget) {
      await deleteMovement.mutateAsync(deleteTarget);
      setDeleteTarget(null);
    }
  };

  return (
    <LoggedLayout>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">Movimentacoes</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => { form.reset(); setDialogOpen(true); }}>Nova Movimentacao</Button>
      </Box>

      {isLoading ? <CircularProgress /> : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {movements?.map((m) => (
            <Card key={m._id}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography variant="h6" fontWeight="bold">{m.product.productName}</Typography>
                    <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                      <Chip label={m.movementType === 'entry' ? 'Entrada' : 'Saida'} color={m.movementType === 'entry' ? 'success' : 'error'} size="small" />
                      <Chip label={`Qtd: ${m.quantity}`} size="small" />
                      {m.weightGrams && <Chip label={`${m.weightGrams}g`} size="small" />}
                      {m.itemType && <Chip label={m.itemType === 'raw' ? 'Bruto' : 'Porcionado'} size="small" />}
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {new Date(m.date).toLocaleDateString('pt-BR')}
                    </Typography>
                    {m.reason && <Typography variant="body2" color="text.secondary">Motivo: {m.reason}</Typography>}
                  </Box>
                  <IconButton size="small" onClick={() => setDeleteTarget(m._id)}><DeleteIcon fontSize="small" /></IconButton>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Nova Movimentacao</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField select label="Produto" {...form.register('productId')} onChange={(e) => {
              const p = products?.find((p) => p._id === e.target.value);
              if (p) { form.setValue('productName', p.name); form.setValue('productId', p._id); }
            }} fullWidth>
              {products?.map((p) => <MenuItem key={p._id} value={p._id}>{p.name}</MenuItem>)}
            </TextField>
            <TextField select label="Tipo" {...form.register('movementType')} fullWidth>
              <MenuItem value="entry">Entrada</MenuItem>
              <MenuItem value="exit">Saida</MenuItem>
            </TextField>
            <TextField type="number" label="Quantidade" {...form.register('quantity', { valueAsNumber: true })} fullWidth />
            <TextField type="number" label="Peso (g)" {...form.register('weightGrams', { valueAsNumber: true })} fullWidth />
            <TextField select label="Tipo Item" {...form.register('itemType')} fullWidth>
              <MenuItem value="raw">Bruto</MenuItem>
              <MenuItem value="portioned">Porcionado</MenuItem>
            </TextField>
            <TextField label="Motivo" {...form.register('reason')} fullWidth />
            <TextField type="date" label="Data" {...form.register('date')} fullWidth InputLabelProps={{ shrink: true }} />
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
