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
  InputAdornment,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import CloseIcon from '@mui/icons-material/Close';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { productSchema } from '@/lib/validation';
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct } from '@/lib/queries';
import LoggedLayout from '../components/LoggedLayout/LoggedLayout';
import ConfirmDialog from '../components/ConfirmDialog/ConfirmDialog';

const groups = ['Carnes', 'Aves', 'Peixes', 'Frios', 'Laticinios', 'Hortifruti', 'Graos', 'Bebidas', 'Temperos', 'Massas', 'Outros'];
const storageMethods = ['Refrigerado', 'Congelado', 'Temperatura Ambiente', 'Camara Fria'];

const storageColors: Record<string, string> = {
  'Refrigerado': '#00897b',
  'Congelado': '#1565c0',
  'Temperatura Ambiente': '#f9a825',
  'Camara Fria': '#5c6bc0',
};

const storageBg: Record<string, string> = {
  'Refrigerado': '#e0f2f1',
  'Congelado': '#e3f2fd',
  'Temperatura Ambiente': '#fffde7',
  'Camara Fria': '#e8eaf6',
};

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

export default function ProductsPage() {
  const [search, setSearch] = useState('');
  const { data: products, isLoading } = useProducts();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const form = useForm({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      group: '',
      storageMethod: '',
      shelfLifeDays: undefined,
      minQuantity: undefined,
      minPortionedQuantity: undefined,
      consumeAfterOpeningDays: undefined,
    },
  });

  const filteredProducts = products?.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.group.toLowerCase().includes(search.toLowerCase()),
  );

  const openCreate = () => {
    setEditing(null);
    form.reset({
      name: '',
      group: '',
      storageMethod: '',
      shelfLifeDays: undefined,
      minQuantity: undefined,
      minPortionedQuantity: undefined,
      consumeAfterOpeningDays: undefined,
    });
    setDialogOpen(true);
  };

  const openEdit = (p: any) => {
    setEditing(p);
    form.reset({
      name: p.name,
      group: p.group,
      storageMethod: p.storageMethod,
      shelfLifeDays: p.shelfLifeDays,
      minQuantity: p.minQuantity || undefined,
      minPortionedQuantity: p.minPortionedQuantity || undefined,
      consumeAfterOpeningDays: p.consumeAfterOpeningDays || undefined,
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: any) => {
    if (editing) {
      await updateProduct.mutateAsync({ id: editing._id, data });
    } else {
      await createProduct.mutateAsync(data);
    }
    setDialogOpen(false);
  };

  const handleDelete = async () => {
    if (deleteTarget) {
      await deleteProduct.mutateAsync(deleteTarget);
      setDeleteTarget(null);
    }
  };

  const formatWeight = (grams: number) => {
    if (!grams) return '—';
    if (grams >= 1000) return `${grams}g / ${(grams / 1000).toFixed(2)}kg`;
    return `${grams}g`;
  };

  return (
    <LoggedLayout>
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
          <Inventory2Icon sx={{ color: '#2196F3', fontSize: 28 }} />
          <Typography variant="h5" fontWeight="bold">
            Cadastro de Produtos
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Gerencie seus produtos e suas configurações
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={openCreate}
            sx={{
              bgcolor: '#2196F3',
              '&:hover': { bgcolor: '#1e88e5' },
              borderRadius: 2,
              textTransform: 'none',
            }}
          >
            Novo Produto
          </Button>
        </Box>
      </Box>

      <TextField
        fullWidth
        size="small"
        placeholder="Buscar por nome ou grupo..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon color="action" />
            </InputAdornment>
          ),
        }}
        sx={{ mb: 3, bgcolor: '#fff', borderRadius: 2 }}
      />

      {isLoading ? (
        <CircularProgress />
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#f5f7fa' }}>
                <TableCell sx={{ fontWeight: 700, color: '#333' }}>Produto</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#333' }}>Grupo</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#333' }}>Armazenamento</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#333' }} align="right">Validade (dias)</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#333' }} align="right">Mínimo em Estoque</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#333' }} align="right">Min. Porcionadas</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#333' }} align="center">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredProducts?.map((p) => (
                <TableRow key={p._id} hover>
                  <TableCell>
                    <Typography fontWeight={500}>{p.name}</Typography>
                  </TableCell>
                  <TableCell>{p.group}</TableCell>
                  <TableCell>
                    <Chip
                      label={p.storageMethod}
                      size="small"
                      sx={{
                        bgcolor: storageBg[p.storageMethod] || '#f5f5f5',
                        color: storageColors[p.storageMethod] || '#333',
                        fontWeight: 500,
                        borderRadius: 1,
                      }}
                    />
                  </TableCell>
                  <TableCell align="right">{p.shelfLifeDays}</TableCell>
                  <TableCell align="right">
                    {p.minQuantity ? formatWeight(p.minQuantity) : '—'}
                  </TableCell>
                  <TableCell align="right">
                    {p.minPortionedQuantity ? `${p.minPortionedQuantity} etiquetas` : '—'}
                  </TableCell>
                  <TableCell align="center">
                    <IconButton size="small" onClick={() => openEdit(p)} sx={{ color: '#666' }}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => setDeleteTarget(p._id)} sx={{ color: '#d32f2f' }}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {filteredProducts?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">Nenhum produto encontrado</Typography>
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
          {editing ? 'Editar Produto' : 'Novo Produto'}
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
              <FieldLabel required>Nome do Produto</FieldLabel>
              <TextField
                size="small"
                {...form.register('name')}
                error={!!form.formState.errors.name}
                helperText={form.formState.errors.name?.message}
                fullWidth
                sx={fieldSx}
              />
            </Box>

            <Box>
              <FieldLabel required>Grupo</FieldLabel>
              <TextField
                select
                size="small"
                value={form.watch('group') || ''}
                {...form.register('group')}
                error={!!form.formState.errors.group}
                helperText={form.formState.errors.group?.message}
                fullWidth
                sx={fieldSx}
                SelectProps={{
                  displayEmpty: true,
                  renderValue: (value) =>
                    !value ? (
                      <Box component="span" sx={{ color: 'text.disabled' }}>
                        Selecione o grupo
                      </Box>
                    ) : (
                      String(value)
                    ),
                }}
              >
                <MenuItem value="" disabled>
                  Selecione o grupo
                </MenuItem>
                {groups.map((g) => (
                  <MenuItem key={g} value={g}>{g}</MenuItem>
                ))}
              </TextField>
            </Box>

            <Box>
              <FieldLabel required>Armazenamento</FieldLabel>
              <TextField
                select
                size="small"
                value={form.watch('storageMethod') || ''}
                {...form.register('storageMethod')}
                error={!!form.formState.errors.storageMethod}
                helperText={form.formState.errors.storageMethod?.message}
                fullWidth
                sx={fieldSx}
                SelectProps={{
                  displayEmpty: true,
                  renderValue: (value) =>
                    !value ? (
                      <Box component="span" sx={{ color: 'text.disabled' }}>
                        Forma de armazenamento
                      </Box>
                    ) : (
                      String(value)
                    ),
                }}
              >
                <MenuItem value="" disabled>
                  Forma de armazenamento
                </MenuItem>
                {storageMethods.map((s) => (
                  <MenuItem key={s} value={s}>{s}</MenuItem>
                ))}
              </TextField>
            </Box>

            <Box>
              <FieldLabel required>Validade pós manipulação (dias)</FieldLabel>
              <TextField
                size="small"
                type="number"
                placeholder="Ex: 7"
                {...form.register('shelfLifeDays', { valueAsNumber: true })}
                error={!!form.formState.errors.shelfLifeDays}
                helperText={form.formState.errors.shelfLifeDays?.message}
                fullWidth
                sx={fieldSx}
              />
            </Box>

            <Box>
              <FieldLabel>Peso/Volume Mínimo em Estoque (g ou ml)</FieldLabel>
              <TextField
                size="small"
                type="number"
                placeholder="Ex: 2000 (= 2kg)"
                {...form.register('minQuantity', { valueAsNumber: true })}
                error={!!form.formState.errors.minQuantity}
                helperText={form.formState.errors.minQuantity?.message}
                fullWidth
                sx={fieldSx}
              />
            </Box>

            <Box>
              <FieldLabel>Quantidade Mínima Porcionadas (etiquetas)</FieldLabel>
              <TextField
                size="small"
                type="number"
                placeholder="Ex: 10"
                {...form.register('minPortionedQuantity', { valueAsNumber: true })}
                error={!!form.formState.errors.minPortionedQuantity}
                helperText={
                  form.formState.errors.minPortionedQuantity
                    ? form.formState.errors.minPortionedQuantity.message
                    : 'Alerta na aba Produção quando o nº de etiquetas porcionadas em estoque cair abaixo deste valor.'
                }
                fullWidth
                sx={fieldSx}
              />
            </Box>

            <Box>
              <FieldLabel>Depois de aberto ou retirado do congelamento, consumir em (dias)</FieldLabel>
              <TextField
                size="small"
                type="number"
                placeholder="Ex: 30"
                {...form.register('consumeAfterOpeningDays', { valueAsNumber: true })}
                error={!!form.formState.errors.consumeAfterOpeningDays}
                helperText={
                  form.formState.errors.consumeAfterOpeningDays
                    ? form.formState.errors.consumeAfterOpeningDays.message
                    : 'Será impresso na etiqueta abaixo de "Data de retirada".'
                }
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
            sx={{
              textTransform: 'none',
              color: '#444',
              borderColor: '#e0e0e0',
              bgcolor: '#fff',
              borderRadius: 1.5,
              px: 2.5,
              '&:hover': { borderColor: '#bdbdbd', bgcolor: '#f5f5f5' },
            }}
          >
            Cancelar
          </Button>
          <Button
            onClick={form.handleSubmit(onSubmit)}
            variant="contained"
            sx={{
              textTransform: 'none',
              bgcolor: '#2196F3',
              borderRadius: 1.5,
              px: 2.5,
              '&:hover': { bgcolor: '#1e88e5' },
            }}
          >
            {editing ? 'Salvar' : 'Cadastrar'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Excluir Produto"
        message="Tem certeza que deseja excluir este produto?"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </LoggedLayout>
  );
}
