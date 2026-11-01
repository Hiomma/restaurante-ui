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
  Chip,
} from '@mui/material';
import LabelIcon from '@mui/icons-material/Label';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import { useSnackbar } from 'notistack';
import {
  useGroups,
  useCreateGroup,
  useDeleteGroup,
  useUpdateGroup,
} from '@/lib/queries';
import ResponsiveTable from '@/app/components/ResponsiveTable/ResponsiveTable';

const thSx = { fontWeight: 700, color: '#333' };

const primaryBtnSx = {
  textTransform: 'none' as const,
  borderRadius: 1.5,
  bgcolor: '#1976D2',
  px: 2.5,
  boxShadow: 'none',
  '&:hover': { bgcolor: '#1565C0' },
};

const outlinedCancelSx = {
  textTransform: 'none',
  color: '#444',
  borderColor: '#e0e0e0',
  bgcolor: '#fff',
  borderRadius: 1.5,
  px: 2.5,
  '&:hover': { borderColor: '#bdbdbd', bgcolor: '#f5f5f5' },
};

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <Typography variant="body2" fontWeight={600} sx={{ mb: 0.75 }}>
      {children}
      {required && ' *'}
    </Typography>
  );
}

/**
 * Registro de Grupos (guia "Grupos" da página Cadastros).
 * Permite criar/editar/excluir grupos usados para classificar os produtos.
 */
export default function GroupsRegistry() {
  const { enqueueSnackbar } = useSnackbar();
  const { data: groups } = useGroups();
  const createGroup = useCreateGroup();
  const updateGroup = useUpdateGroup();
  const deleteGroup = useDeleteGroup();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [groupName, setGroupName] = useState('');

  const openCreate = () => {
    setEditing(null);
    setGroupName('');
    setDialogOpen(true);
  };

  const openEdit = (g: any) => {
    setEditing(g);
    setGroupName(g.name);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const name = groupName.trim();
    if (!name) return;
    try {
      if (editing) {
        await updateGroup.mutateAsync({ id: editing._id, data: { name } });
      } else {
        await createGroup.mutateAsync({ name });
      }
      enqueueSnackbar('Grupo salvo com sucesso!', { variant: 'success' });
      setGroupName('');
      setEditing(null);
      setDialogOpen(false);
    } catch {
      enqueueSnackbar('Erro ao salvar grupo.', { variant: 'error' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteGroup.mutateAsync(id);
      enqueueSnackbar('Grupo removido com sucesso!', { variant: 'success' });
    } catch {
      enqueueSnackbar('Erro ao remover grupo.', { variant: 'error' });
    }
  };

  const sortedGroups = [...(groups ?? [])].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

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
            <LabelIcon sx={{ color: '#1976D2', fontSize: 22 }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight="bold">
              Grupos
            </Typography>
            <Typography variant="body2" sx={{ color: '#666' }}>
              Cadastre os grupos usados para classificar os produtos
            </Typography>
          </Box>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate} sx={primaryBtnSx}>
          Novo Grupo
        </Button>
      </Box>

      <ResponsiveTable
        containerSx={{ border: '1px solid #e8ecf1' }}
        headerCellSx={thSx}
        rows={sortedGroups}
        rowKey={(g) => g._id}
        actionsLabel="Ações"
        emptyMessage="Nenhum grupo cadastrado"
        actions={(g) => (
          <>
            <IconButton
              size="small"
              onClick={() => openEdit(g)}
              sx={{ color: '#666' }}
            >
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => handleDelete(g._id)}
              sx={{ color: '#C62828' }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </>
        )}
        columns={[
          {
            id: 'grupo',
            header: 'Grupo',
            primary: true,
            cell: (g) => (
              <Typography variant="body2" fontWeight={500}>
                {g.name}
              </Typography>
            ),
          },
          {
            id: 'criado',
            header: 'Criado em',
            cell: (g) => (
              <Typography variant="caption" color="text.secondary">
                {g.createdAt ? g.createdAt.slice(0, 10) : '—'}
              </Typography>
            ),
          },
        ]}
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
          {editing ? 'Editar Grupo' : 'Novo Grupo'}
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
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box>
              <FieldLabel required>Nome do Grupo</FieldLabel>
              <TextField
                fullWidth
                size="small"
                sx={{ '& .MuiOutlinedInput-root': { height: 44 } }}
                placeholder="Ex: Carnes"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave();
                }}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1.5 }}>
          <Button onClick={() => setDialogOpen(false)} variant="outlined" sx={outlinedCancelSx}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            disabled={!groupName.trim() || createGroup.isPending || updateGroup.isPending}
            onClick={handleSave}
            sx={primaryBtnSx}
          >
            {editing ? 'Salvar' : 'Cadastrar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
