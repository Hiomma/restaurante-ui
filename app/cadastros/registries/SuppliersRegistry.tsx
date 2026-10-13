'use client';

import { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import CloseIcon from '@mui/icons-material/Close';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { supplierSchema } from '@/lib/validation';
import { useSuppliers, useCreateSupplier, useUpdateSupplier, useDeleteSupplier } from '@/lib/queries';
import type { Supplier } from '@/types';
import ConfirmDialog from '@/app/components/ConfirmDialog/ConfirmDialog';
import ResponsiveTable from '@/app/components/ResponsiveTable/ResponsiveTable';

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

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    height: 44,
  },
} as const;

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <Typography variant="body2" fontWeight={600} sx={{ mb: 0.75 }}>
      {children}
      {required && ' *'}
    </Typography>
  );
}

/**
 * Registro de fornecedores (guia "Fornecedores" da página Cadastros).
 * Renderizado sem o layout: quem monta é a página que o utiliza.
 */
export default function SuppliersRegistry() {
  const { data: suppliers, isLoading } = useSuppliers();
  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();
  const deleteSupplier = useDeleteSupplier();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const form = useForm<{ name: string }>({
    resolver: zodResolver(supplierSchema),
    defaultValues: { name: '' },
  });

  const openCreate = () => {
    setEditing(null);
    form.reset({ name: '' });
    setDialogOpen(true);
  };

  const openEdit = (supplier: Supplier) => {
    setEditing(supplier);
    form.reset({ name: supplier.name });
    setDialogOpen(true);
  };

  const onSubmit = async (data: { name: string }) => {
    if (editing) {
      await updateSupplier.mutateAsync({ id: editing._id, data });
    } else {
      await createSupplier.mutateAsync({ name: data.name });
    }
    setDialogOpen(false);
  };

  const handleDelete = async () => {
    if (deleteTarget) {
      await deleteSupplier.mutateAsync(deleteTarget);
      setDeleteTarget(null);
    }
  };

  return (
    <Box>
      <Box
        sx={{
          mb: 3,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 2,
          flexWrap: 'wrap',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 0 }}>
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
            <LocalShippingIcon sx={{ color: '#1976D2', fontSize: 22 }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight="bold">
              Fornecedores
            </Typography>
            <Typography variant="body2" sx={{ color: '#666' }}>
              Gerencie os fornecedores de matérias-primas
            </Typography>
          </Box>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate} sx={containedSx}>
          Novo Fornecedor
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
          Os fornecedores são selecionados no recebimento e no porcionamento e aparecem nos
          relatórios para comparar custos entre eles. A etiqueta NÃO imprime o fornecedor.
        </Typography>
      </Box>

      <ResponsiveTable
        loading={isLoading}
        rows={suppliers}
        rowKey={(supplier) => supplier._id}
        emptyMessage="Nenhum fornecedor encontrado"
        columns={[
          {
            id: 'nome',
            header: 'Nome',
            primary: true,
            cell: (supplier) => <Typography fontWeight={500}>{supplier.name}</Typography>,
          },
        ]}
        actions={(supplier) => (
          <>
            <IconButton size="small" onClick={() => openEdit(supplier)} sx={{ color: '#666' }}>
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => setDeleteTarget(supplier._id)}
              sx={{ color: '#d32f2f' }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </>
        )}
      />

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            pb: 1,
          }}
        >
          {editing ? 'Editar Fornecedor' : 'Novo Fornecedor'}
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
              <FieldLabel required>Nome</FieldLabel>
              <TextField
                size="small"
                placeholder="Ex: Distribuidora Alfa"
                {...form.register('name')}
                error={!!form.formState.errors.name}
                helperText={form.formState.errors.name?.message}
                fullWidth
                sx={fieldSx}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1.5 }}>
          <Button
            onClick={() => setDialogOpen(false)}
            variant="outlined"
            sx={outlinedCancelSx}
          >
            Cancelar
          </Button>
          <Button onClick={form.handleSubmit(onSubmit)} variant="contained" sx={containedSx}>
            {editing ? 'Salvar' : 'Cadastrar'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Excluir Fornecedor"
        message="Tem certeza que deseja excluir este fornecedor?"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
}
