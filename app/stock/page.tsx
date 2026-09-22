'use client';

import { useState } from 'react';
import {
  Box, Typography, Button, Card, CardContent, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, CircularProgress, Chip, Tabs, Tab,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { stockItemSchema } from '@/lib/validation';
import { useStockItems, useCreateStockItem, useDeleteStockItem, useProducts } from '@/lib/queries';
import LoggedLayout from '../components/LoggedLayout/LoggedLayout';
import ConfirmDialog from '../components/ConfirmDialog/ConfirmDialog';

const statusColors: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  in_stock: 'success',
  used: 'default',
  discarded: 'warning',
  expired: 'error',
};

const statusLabels: Record<string, string> = {
  in_stock: 'Em Estoque',
  used: 'Utilizado',
  discarded: 'Descartado',
  expired: 'Vencido',
};

export default function StockPage() {
  const [tab, setTab] = useState(0);
  const statusFilter = tab === 0 ? undefined : tab === 1 ? 'in_stock' : tab === 2 ? 'expired' : undefined;
  const { data: items, isLoading } = useStockItems(statusFilter ? { status: statusFilter } : undefined);
  const { data: products } = useProducts();
  const createItem = useCreateStockItem();
  const deleteItem = useDeleteStockItem();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const form = useForm({
    resolver: zodResolver(stockItemSchema),
    defaultValues: { productId: '', productName: '', type: 'raw' as const, weightGrams: 0, manipulationDate: new Date().toISOString().split('T')[0], expiryDate: '', lote: '', nf: '', employeeName: '', productGroup: '', productStorage: '' },
  });

  const onSubmit = async (data: any) => {
    await createItem.mutateAsync(data);
    setDialogOpen(false);
    form.reset();
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
        <Typography variant="h4" fontWeight="bold">Estoque</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => { form.reset(); setDialogOpen(true); }}>Novo Item</Button>
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Todos" />
        <Tab label="Em Estoque" />
        <Tab label="Vencidos" />
      </Tabs>

      {isLoading ? <CircularProgress /> : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {items?.map((item) => (
            <Card key={item._id}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography variant="h6" fontWeight="bold">{item.product.productName}</Typography>
                    <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                      <Chip label={item.type === 'raw' ? 'Bruto' : 'Porcionado'} size="small" />
                      <Chip label={statusLabels[item.status]} color={statusColors[item.status]} size="small" />
                      <Chip label={`${item.weightGrams}g`} size="small" />
                      {item.qrCode && <Chip icon={<QrCodeScannerIcon />} label={item.qrCode} size="small" />}
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      Manipulacao: {new Date(item.manipulationDate).toLocaleDateString('pt-BR')} | Validade: {new Date(item.expiryDate).toLocaleDateString('pt-BR')}
                    </Typography>
                    {item.lote && <Typography variant="body2" color="text.secondary">Lote: {item.lote}</Typography>}
                    {item.nf && <Typography variant="body2" color="text.secondary">NF: {item.nf}</Typography>}
                  </Box>
                  <IconButton size="small" onClick={() => setDeleteTarget(item._id)}><DeleteIcon fontSize="small" /></IconButton>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Novo Item de Estoque</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField select label="Produto" {...form.register('productId')} onChange={(e) => {
              const p = products?.find((p) => p._id === e.target.value);
              if (p) { form.setValue('productName', p.name); form.setValue('productId', p._id); form.setValue('productGroup', p.group); form.setValue('productStorage', p.storageMethod); }
            }} fullWidth>
              {products?.map((p) => <MenuItem key={p._id} value={p._id}>{p.name}</MenuItem>)}
            </TextField>
            <TextField select label="Tipo" {...form.register('type')} fullWidth>
              <MenuItem value="raw">Bruto</MenuItem>
              <MenuItem value="portioned">Porcionado</MenuItem>
            </TextField>
            <TextField type="number" label="Peso (g)" {...form.register('weightGrams', { valueAsNumber: true })} fullWidth />
            <TextField type="date" label="Data Manipulacao" {...form.register('manipulationDate')} fullWidth InputLabelProps={{ shrink: true }} />
            <TextField type="date" label="Data Validade" {...form.register('expiryDate')} fullWidth InputLabelProps={{ shrink: true }} />
            <TextField label="Lote" {...form.register('lote')} fullWidth />
            <TextField label="Nota Fiscal" {...form.register('nf')} fullWidth />
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
