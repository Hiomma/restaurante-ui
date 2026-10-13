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
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import { useSnackbar } from 'notistack';
import {
  useMovementDestinations,
  useCreateMovementDestination,
  useDeleteMovementDestination,
} from '@/lib/queries';
import ResponsiveTable from '@/app/components/ResponsiveTable/ResponsiveTable';
import ResponsiveTabs from '@/app/components/ResponsiveTabs/ResponsiveTabs';

const thSx = { fontWeight: 700, color: '#333' };

const grayChipSx = {
  bgcolor: '#F1F3F5',
  color: '#495057',
  borderRadius: 1.5,
};

const primaryBtnSx = {
  textTransform: 'none' as const,
  borderRadius: 1.5,
  bgcolor: '#1976D2',
  px: 2.5,
  boxShadow: 'none',
  '&:hover': { bgcolor: '#1565C0' },
};

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
  const deleteDestination = useDeleteMovementDestination();

  const [dialogOpen, setDialogOpen] = useState(false);
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
    setDestType(destSubTab);
    setDialogOpen(true);
  };

  const handleAddDestination = async () => {
    const name = destName.trim();
    if (!name) return;
    try {
      await createDestination.mutateAsync({ name, type: destType });
      // Show the sub-tab the new destination belongs to, so it is visible
      // immediately after creation without a page refresh.
      setDestSubTab(destType);
      enqueueSnackbar('Destino adicionado com sucesso!', { variant: 'success' });
      setDestName('');
      setDestType('move');
      setDialogOpen(false);
    } catch {
      enqueueSnackbar('Erro ao adicionar destino.', { variant: 'error' });
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
              bgcolor: '#E3F2FD',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <PlaceIcon sx={{ color: '#1976D2', fontSize: 22 }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight="bold">
              Destinos
            </Typography>
            <Typography variant="body2" sx={{ color: '#666' }}>
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
          bgcolor: '#f1f3f5',
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
            color: '#555',
            whiteSpace: 'nowrap',
            justifyContent: 'center',
            '&.Mui-selected': { bgcolor: '#fff', color: '#1976D2' },
          },
        }}
      >
        <Tab label="Mover" value="move" />
        <Tab label="Baixar" value="writeoff" />
      </ResponsiveTabs>

      <ResponsiveTable
        containerSx={{ border: '1px solid #e8ecf1' }}
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
            <Typography variant="body2" sx={{ color: '#999' }}>
              Fixo
            </Typography>
          ) : (
            <IconButton
              size="small"
              aria-label="excluir destino"
              onClick={() => handleDeleteDestination(row.key)}
              sx={{ color: '#C62828' }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
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
                    bgcolor: row.type === 'writeoff' ? '#FFEBEE' : '#E3F2FD',
                    color: row.type === 'writeoff' ? '#C62828' : '#1565C0',
                    fontWeight: 600,
                    borderRadius: 1.5,
                  }}
                />
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
          Novo Destino
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
              <FieldLabel required>Nome do Destino</FieldLabel>
              <TextField
                fullWidth
                size="small"
                sx={{ '& .MuiOutlinedInput-root': { height: 44 } }}
                placeholder="Ex: Freezer 2"
                value={destName}
                onChange={(e) => setDestName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddDestination();
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
          <Button onClick={() => setDialogOpen(false)} variant="outlined" sx={outlinedCancelSx}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            disabled={!destName.trim() || createDestination.isPending}
            onClick={handleAddDestination}
            sx={primaryBtnSx}
          >
            Adicionar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
