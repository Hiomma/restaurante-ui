'use client';

import { useState, useEffect } from 'react';
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
  MenuItem,
  Chip,
  InputAdornment,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import { useSnackbar } from 'notistack';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { productSchema } from '@/lib/validation';
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct, useGroups } from '@/lib/queries';
import ConfirmDialog from '@/app/components/ConfirmDialog/ConfirmDialog';
import ResponsiveTable from '@/app/components/ResponsiveTable/ResponsiveTable';

/**
 * Mensagem de erro vinda da API (Nest devolve string ou array `message`).
 * Sem ela, o usuário só vê o fallback — o motivo real do save falhar
 * (validação, 403 etc.) ficava invisível.
 */
const apiErrorMessage = (err: unknown, fallback: string): string => {
  const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data
    ?.message;
  if (Array.isArray(msg)) return msg.filter(Boolean).join(' — ') || fallback;
  if (typeof msg === 'string' && msg.trim()) return msg;
  return fallback;
};

const groups = ['Carnes', 'Aves', 'Peixes', 'Frios', 'Laticinios', 'Hortifruti', 'Graos', 'Bebidas', 'Temperos', 'Massas', 'Outros'];
const storageMethods = ['Refrigerado', 'Congelado', 'Temperatura Ambiente', 'Camara Fria'];
const categories = [
  { value: 'Materia Prima', label: 'Matéria Prima' },
  { value: 'Porcionado', label: 'Porcionado' },
];

const categoryColors: Record<string, { bg: string; color: string }> = {
  'Materia Prima': { bg: '#fff3e0', color: '#e65100' },
  'Porcionado': { bg: '#e8f5e9', color: '#2e7d32' },
};

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

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

/**
 * Registro de produtos (guia "Produtos" da página Cadastros).
 * Renderizado sem o layout: quem monta é a página que o utiliza.
 */
export default function ProductsRegistry() {
  const { enqueueSnackbar } = useSnackbar();
  const [search, setSearch] = useState('');
  const { data: products, isLoading } = useProducts();
  const { data: groups } = useGroups();
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
      groupId: '',
      category: 'Materia Prima',
      storageMethod: '',
      shelfLifeDays: undefined,
      minQuantity: undefined,
      minPortionedQuantity: undefined,
      consumeAfterOpeningDays: undefined,
      allowLooseLabel: false,
    },
  });

  const filteredProducts = products?.filter((p) => {
    const term = normalize(search.trim());
    if (!term) return true;
    return (
      normalize(p.name).includes(term) ||
      normalize(p.group).includes(term) ||
      normalize(p.category || '').includes(term)
    );
  });

  const groupOptions = (groups ?? []).map((g) => ({ value: g._id, label: g.name }));

  // Sincroniza o campo `group` (string, obrigatório) com o nome do grupo
  // cadastrado selecionado, para que a validação do formulário passe. Só
  // escreve quando há grupo cadastrado selecionado — produtos antigos sem
  // `groupId` mantêm o `group` original gravado.
  useEffect(() => {
    const gid = form.watch('groupId');
    if (!gid) return;
    const selected = groupOptions.find((o) => o.value === gid);
    if (selected) form.setValue('group', selected.label);
  }, [form, groupOptions]);

  const openCreate = () => {
    setEditing(null);
    form.reset({
      name: '',
      group: '',
      groupId: '',
      category: 'Materia Prima',
      storageMethod: '',
      shelfLifeDays: undefined,
      minQuantity: undefined,
      minPortionedQuantity: undefined,
      consumeAfterOpeningDays: undefined,
      allowLooseLabel: false,
    });
    setDialogOpen(true);
  };

  const openEdit = (p: any) => {
    setEditing(p);
    form.reset({
      name: p.name,
      group: p.group,
      // Produto antigo sem referência: casa o `group` gravado pelo nome com
      // um grupo cadastrado, para o select exibir o valor atual.
      groupId:
        p.groupId || (groups ?? []).find((g) => g.name === p.group)?._id || '',
      category: p.category || 'Materia Prima',
      storageMethod: p.storageMethod,
      shelfLifeDays: p.shelfLifeDays,
      minQuantity: p.minQuantity || undefined,
      minPortionedQuantity: p.minPortionedQuantity || undefined,
      consumeAfterOpeningDays: p.consumeAfterOpeningDays || undefined,
      allowLooseLabel: !!p.allowLooseLabel,
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: any) => {
    // Quando um grupo cadastrado é selecionado, grava seu nome no campo
    // `group` (compatível com relatórios/estoque) e sua referência em
    // `groupId`, permitindo incluir/excluir grupos pelo cadastro próprio.
    const selectedGroup = (groups ?? []).find((g) => g._id === data.groupId);
    const payload: any = {
      ...data,
      group: selectedGroup ? selectedGroup.name : data.group || '',
      // Sempre enviado — inclusive `false` — para o cadastro nunca depender
      // do estado do checkbox para salvar.
      allowLooseLabel: !!data.allowLooseLabel,
    };
    if (!payload.groupId) delete payload.groupId;
    try {
      if (editing) {
        await updateProduct.mutateAsync({ id: editing._id, data: payload });
        enqueueSnackbar('Produto atualizado com sucesso!', { variant: 'success' });
      } else {
        await createProduct.mutateAsync(payload);
        enqueueSnackbar('Produto cadastrado com sucesso!', { variant: 'success' });
      }
      setDialogOpen(false);
    } catch (err) {
      // O erro ficava silencioso (rejeição não tratada): o diálogo simplesmente
      // não fechava, parecendo que "não salvou" sem nenhum motivo na tela.
      enqueueSnackbar(apiErrorMessage(err, 'Erro ao salvar o produto.'), { variant: 'error' });
    }
  };

  const handleDelete = async () => {
    if (deleteTarget) {
      try {
        await deleteProduct.mutateAsync(deleteTarget);
        enqueueSnackbar('Produto removido.', { variant: 'success' });
      } catch (err) {
        enqueueSnackbar(apiErrorMessage(err, 'Erro ao excluir o produto.'), {
          variant: 'error',
        });
      }
      setDeleteTarget(null);
    }
  };

  const formatWeight = (grams: number) => {
    if (!grams) return '—';
    if (grams >= 1000) return `${grams}g / ${(grams / 1000).toFixed(2)}kg`;
    return `${grams}g`;
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
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

      <TextField
        fullWidth
        size="small"
        placeholder="Buscar por qualquer parte do nome, grupo ou categoria..."
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

      <ResponsiveTable
        loading={isLoading}
        rows={filteredProducts}
        rowKey={(p) => p._id}
        emptyMessage="Nenhum produto encontrado"
        columns={[
          {
            id: 'produto',
            header: 'Produto',
            primary: true,
            cell: (p) => <Typography fontWeight={500}>{p.name}</Typography>,
          },
          { id: 'grupo', header: 'Grupo', cell: (p) => p.group },
          {
            id: 'categoria',
            header: 'Categoria',
            cell: (p) => (
              <Chip
                label={
                  categories.find((c) => c.value === p.category)?.label ||
                  (p.category === 'Porcionado' ? 'Porcionado' : 'Matéria Prima')
                }
                size="small"
                sx={{
                  bgcolor: categoryColors[p.category || 'Materia Prima']?.bg || '#f5f5f5',
                  color: categoryColors[p.category || 'Materia Prima']?.color || '#333',
                  fontWeight: 500,
                  borderRadius: 1,
                }}
              />
            ),
          },
          {
            id: 'armazenamento',
            header: 'Armazenamento',
            cell: (p) => (
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
            ),
          },
          {
            id: 'validade',
            header: 'Validade (dias)',
            align: 'right',
            cell: (p) => p.shelfLifeDays,
          },
          {
            id: 'minimo-estoque',
            header: 'Mínimo em Estoque',
            align: 'right',
            cell: (p) => (p.minQuantity ? formatWeight(p.minQuantity) : '—'),
          },
          {
            id: 'min-porcionadas',
            header: 'Min. Porcionadas',
            align: 'right',
            cell: (p) => (p.minPortionedQuantity ? `${p.minPortionedQuantity} etiquetas` : '—'),
          },
        ]}
        actions={(p) => (
          <>
            <IconButton size="small" onClick={() => openEdit(p)} sx={{ color: '#666' }}>
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => setDeleteTarget(p._id)}
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
                value={form.watch('groupId') || ''}
                {...form.register('groupId')}
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
                      groupOptions.find((o) => o.value === value)?.label ??
                      String(value)
                    ),
                }}
              >
                <MenuItem value="" disabled>
                  Selecione o grupo
                </MenuItem>
                {groupOptions.map((o) => (
                  <MenuItem key={o.value} value={o.value}>
                    {o.label}
                  </MenuItem>
                ))}
              </TextField>
              {groups?.length === 0 && (
                <Typography variant="caption" sx={{ color: '#888', mt: 0.5, display: 'block' }}>
                  Nenhum grupo cadastrado. Cadastre em Cadastros → Grupos.
                </Typography>
              )}
            </Box>
            {/* Mantém o campo `group` (exigido pelo schema/relatórios) preenchido com
                 o nome do grupo cadastrado selecionado. */}
            <input
              type="hidden"
              {...form.register('group')}
              value={
                groupOptions.find((o) => o.value === form.watch('groupId'))?.label ??
                (form.watch('group') || '')
              }
            />

            <Box>
              <FieldLabel required>Categoria</FieldLabel>
              <TextField
                select
                size="small"
                value={form.watch('category') || 'Materia Prima'}
                {...form.register('category')}
                error={!!form.formState.errors.category}
                helperText={
                  form.formState.errors.category?.message ||
                  'Usada nos relatórios para separar Compras (Matéria Prima) e Produção (Porcionado).'
                }
                fullWidth
                sx={fieldSx}
              >
                {categories.map((c) => (
                  <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>
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

            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                pt: 1,
                borderTop: '1px solid #eef1f5',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <input
                  type="checkbox"
                  {...form.register('allowLooseLabel')}
                  style={{ width: 20, height: 20 }}
                />
                <Typography variant="body2" fontWeight={600}>
                  Permitir etiqueta avulsa
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary">
                Quando marcado, este produto permite gerar etiqueta avulsa (fora da
                produção), respeitando lote e validade gerados automaticamente.
              </Typography>
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
    </Box>
  );
}
