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
  MenuItem,
  Chip,
  Tab,
} from '@mui/material';
import PlaceIcon from '@mui/icons-material/Place';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import { useSnackbar } from 'notistack';
import {
  useMovementDestinations,
  useCreateMovementDestination,
  useDeleteMovementDestination,
  useUpdateMovementDestination,
} from '@/lib/queries';
import ResponsiveTable from '@/app/components/ResponsiveTable/ResponsiveTable';
import ResponsiveTabs from '@/app/components/ResponsiveTabs/ResponsiveTabs';
import { colors } from '@/lib/design-system';

const thSx = { fontWeight: 700, color: colors.gray[800] };

const grayChipSx = {
  bgcolor: colors.status.neutralTint,
  color: colors.status.neutral,
  borderRadius: 1.5,
};

const primaryBtnSx = {
  textTransform: 'none' as const,
  borderRadius: 1.5,
  bgcolor: colors.brand.navy,
  px: 2.5,
  boxShadow: 'none',
  '&:hover': { bgcolor: colors.brand.navyDark },
};

const containedSx = {
  textTransform: 'none',
  borderRadius: 1.5,
  bgcolor: colors.brand.navy,
  px: 2.5,
  boxShadow: 'none',
  '&:hover': { bgcolor: colors.brand.navyDark, boxShadow: 'none' },
} as const;

const outlinedCancelSx = {
  textTransform: 'none',
  color: colors.gray[700],
  borderColor: colors.border.default,
  bgcolor: colors.common.white,
  borderRadius: 1.5,
  px: 2.5,
  '&:hover': { borderColor: colors.border.strong, bgcolor: colors.surface.muted },
} as const;

const fixedMoveDestinations = ['Salão', 'Bar', 'Cozinha'];
const fixedWriteoffDestinations = ['Perda', 'Não encontrado'];

/**
 * Unified row of the "Destinos" table: fixed (built-in) destinations and
 * custom ones share a single shape so one `columns` definition covers both.
 */
interface DestinationRow {
  key: string;
  name: string;
  type: 'move' | 'writeoff';
  fixed: boolean;
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <Typography variant="body2" fontWeight={600} sx={{ mb: 0.75 }}>
      {children}
      {required && ' *'}
    </Typography>
  );
}

/**
 * Registro de destinos (guia "Destinos" da página Cadastros).
 * Renderizado sem o layout: quem monta é a página que o utiliza.
 */
export default function DestinosRegistry() {
  const { enqueueSnackbar } = useSnackbar();
  const { data: destinations } = useMovementDestinations();
  const createDestination = useCreateMovementDestination();
  const updateDestination = useUpdateMovementDestination();
  const deleteDestination = useDeleteMovementDestination();

  const [dialogOpen, setDialogOpen] = useState(false);
  /** Destino personalizado em edição (null = criação). */
  const [editingId, setEditingId] = useState<string | null>(null);
  const [destName, setDestName] = useState('');
  const [destType, setDestType] = useState<'move' | 'writeoff'>('move');
  const [destSubTab, setDestSubTab] = useState<'move' | 'writeoff'>('move');

  const customDestinations = [...(destinations ?? [])].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  // Fixed + custom destinations of the active sub-tab, as one row array.
  const destRows: DestinationRow[] = [
    ...(destSubTab === 'move' ? fixedMoveDestinations : fixedWriteoffDestinations).map((name) => ({
      key: `fixed-${name}`,
      name,
      type: destSubTab,
      fixed: true,
    })),
    ...customDestinations
      .filter((d) => (d.type ?? 'move') === destSubTab)
      .map((d) => ({
        key: d._id,
        name: d.name,
        type: d.type ?? 'move',
        fixed: false,
      })),
  ];
  const hasCustomDestinations = destRows.some((r) => !r.fixed);

  const openCreate = () => {
    setEditingId(null);
    setDestName('');
    setDestType(destSubTab);
    setDialogOpen(true);
  };

  /** Edição de destino personalizado (os fixos são embutidos no sistema). */
  const openEdit = (row: DestinationRow) => {
    setEditingId(row.key);
    setDestName(row.name);
    setDestType(row.type);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setEditingId(null);
    setDestName('');
    setDialogOpen(false);
  };

  const handleSaveDestination = async () => {
    const name = destName.trim();
    if (!name) return;
    try {
      if (editingId) {
        await updateDestination.mutateAsync({ id: editingId, data: { name, type: destType } });
        enqueueSnackbar('Destino atualizado com sucesso!', { variant: 'success' });
      } else {
        await createDestination.mutateAsync({ name, type: destType });
        enqueueSnackbar('Destino adicionado com sucesso!', { variant: 'success' });
      }
      // Show the sub-tab the destination belongs to, so it is visible
      // immediately after creation/update without a page refresh.
      setDestSubTab(destType);
      setDestName('');
      setDestType('move');
      setEditingId(null);
      setDialogOpen(false);
    } catch {
      enqueueSnackbar(
        editingId ? 'Erro ao atualizar destino.' : 'Erro ao adicionar destino.',
        { variant: 'error' },
      );
    }
  };

  const handleDeleteDestination = async (id: string) => {
    try {
      await deleteDestination.mutateAsync(id);
      enqueueSnackbar('Destino removido com sucesso!', { variant: 'success' });
    } catch {
      enqueueSnackbar('Erro ao remover destino.', { variant: 'error' });
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
              bgcolor: colors.brand.navyTint,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <PlaceIcon sx={{ color: colors.brand.navy, fontSize: 22 }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight="bold">
              Destinos
            </Typography>
            <Typography variant="body2" sx={{ color: colors.gray[500] }}>
              Gerencie os destinos disponíveis para as ações Mover e Baixar
            </Typography>
          </Box>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate} sx={containedSx}>
          Novo Destino
        </Button>
      </Box>

      <ResponsiveTabs
        value={destSubTab}
        onChange={(_, v: 'move' | 'writeoff') => setDestSubTab(v)}
        scrollButtons="auto"
        allowScrollButtonsMobile
        sx={{
          bgcolor: colors.status.neutralTint,
          borderRadius: 2,
          p: 0.5,
          mb: 2,
          minHeight: 44,
          width: 'fit-content',
          maxWidth: '100%',
          mx: 'auto',
          '& .MuiTabs-indicator': { display: 'none' },
          '& .MuiTab-root': {
            textTransform: 'none',
            borderRadius: 1.5,
            minHeight: 40,
            minWidth: 96,
            fontWeight: 600,
            color: colors.gray[600],
            whiteSpace: 'nowrap',
            justifyContent: 'center',
            '&.Mui-selected': { bgcolor: colors.common.white, color: colors.brand.navy },
          },
        }}
      >
        <Tab label="Mover" value="move" />
        <Tab label="Baixar" value="writeoff" />
      </ResponsiveTabs>

      <ResponsiveTable
        containerSx={{ border: `1px solid ${colors.border.subtle}` }}
        headerCellSx={thSx}
        rows={destRows}
        rowKey={(row) => row.key}
        actionsLabel="Ações"
        emptyMessage="Nenhum destino personalizado nesta subguia"
        // The table always has the fixed rows, so the "no custom
        // destination in this sub-tab" hint is a footer, not an empty state.
        footerNote={
          destRows.length > 0 && !hasCustomDestinations ? (
            <Typography color="text.secondary">
              Nenhum destino personalizado nesta subguia
            </Typography>
          ) : null
        }
        actions={(row) =>
          row.fixed ? (
            <Typography variant="body2" sx={{ color: colors.gray[300] }}>
              Fixo
            </Typography>
          ) : (
            <>
              <IconButton
                size="small"
                aria-label="editar destino"
                onClick={() => openEdit(row)}
                sx={{ color: colors.gray[500] }}
              >
                <EditIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                aria-label="excluir destino"
                onClick={() => handleDeleteDestination(row.key)}
                sx={{ color: colors.status.danger }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </>
          )
        }
        columns={[
          {
            id: 'destino',
            header: 'Destino',
            primary: true,
            cell: (row) => (
              <Typography variant="body2" fontWeight={500}>
                {row.name}
              </Typography>
            ),
          },
          {
            id: 'tipo',
            header: 'Tipo',
            cell: (row) =>
              row.fixed ? (
                <Chip label="Padrão" size="small" sx={grayChipSx} />
              ) : (
                <Chip
                  label={row.type === 'writeoff' ? 'Baixar' : 'Mover'}
                  size="small"
                  sx={{
                    bgcolor: row.type === 'writeoff' ? colors.status.dangerTint : colors.brand.navyTint,
                    color: row.type === 'writeoff' ? colors.status.danger : colors.brand.navyDark,
                    fontWeight: 600,
                    borderRadius: 1.5,
                  }}
                />
              ),
          },
        ]}
      />

      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            pb: 1,
          }}
        >
          {editingId ? 'Editar Destino' : 'Novo Destino'}
          <IconButton
            aria-label="fechar"
            onClick={closeDialog}
            size="small"
            sx={{ color: colors.gray[500], mr: -1 }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box>
              <FieldLabel required>Nome do Destino</FieldLabel>
              <TextField
                fullWidth
                size="small"
                sx={{ '& .MuiOutlinedInput-root': { height: 44 } }}
                placeholder="Ex: Freezer 2"
                value={destName}
                onChange={(e) => setDestName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveDestination();
                }}
              />
            </Box>
            <Box>
              <FieldLabel required>Tipo de Uso</FieldLabel>
              <TextField
                select
                fullWidth
                size="small"
                sx={{ '& .MuiOutlinedInput-root': { height: 44 } }}
                value={destType}
                onChange={(e) => setDestType(e.target.value as 'move' | 'writeoff')}
              >
                <MenuItem value="move">Mover (item permanece no estoque)</MenuItem>
                <MenuItem value="writeoff">Baixar (etiqueta excluída do sistema)</MenuItem>
              </TextField>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1.5 }}>
          <Button onClick={closeDialog} variant="outlined" sx={outlinedCancelSx}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            disabled={
              !destName.trim() || createDestination.isPending || updateDestination.isPending
            }
            onClick={handleSaveDestination}
            sx={primaryBtnSx}
          >
            {editingId ? 'Salvar' : 'Adicionar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
