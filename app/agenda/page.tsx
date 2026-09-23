'use client';

import { Fragment, useState } from 'react';
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
  CircularProgress,
  Chip,
  InputAdornment,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import EventNoteIcon from '@mui/icons-material/EventNote';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { agendaItemSchema } from '@/lib/validation';
import {
  useAgendaItems,
  useCreateAgendaItem,
  useUpdateAgendaItem,
  useDeleteAgendaItem,
} from '@/lib/queries';
import { agendaStatus, daysUntil, formatDate, toInputDate, todayISODate } from '@/lib/utils';
import type { AgendaItem } from '@/types';
import LoggedLayout from '../components/LoggedLayout/LoggedLayout';
import ConfirmDialog from '../components/ConfirmDialog/ConfirmDialog';

type AgendaFormValues = z.infer<typeof agendaItemSchema>;

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

const detailLabelSx = {
  color: '#888',
  textTransform: 'uppercase',
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 0.3,
  mb: 0.25,
  display: 'block',
} as const;

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <Typography variant="body2" fontWeight={600} sx={{ mb: 0.75 }}>
      {children}
      {required && ' *'}
    </Typography>
  );
}

function StatusChip({ status }: { status: 'Vencido' | 'No prazo' }) {
  if (status === 'Vencido') {
    return (
      <Chip
        label="Vencido"
        size="small"
        sx={{
          bgcolor: '#E53935',
          color: '#fff',
          fontWeight: 600,
          borderRadius: 1,
        }}
      />
    );
  }
  return (
    <Chip
      label="No prazo"
      size="small"
      sx={{
        bgcolor: '#E8F5E9',
        color: '#2E7D32',
        fontWeight: 600,
        borderRadius: 1,
      }}
    />
  );
}

function DetailValue({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <Box>
      <Typography variant="caption" sx={detailLabelSx}>
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={600} sx={{ color: color || '#333' }}>
        {value}
      </Typography>
    </Box>
  );
}

export default function AgendaPage() {
  const { data: items, isLoading } = useAgendaItems();
  const createItem = useCreateAgendaItem();
  const updateItem = useUpdateAgendaItem();
  const deleteItem = useDeleteAgendaItem();

  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AgendaItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const form = useForm<AgendaFormValues>({
    resolver: zodResolver(agendaItemSchema),
    defaultValues: {
      name: '',
      datePerformed: '',
      expiryDate: '',
      observations: '',
    },
  });

  const q = search.trim().toLowerCase();
  const filteredItems = items?.filter((item) => {
    if (!q) return true;
    return (
      item.name.toLowerCase().includes(q) ||
      (item.observations ?? '').toLowerCase().includes(q) ||
      formatDate(item.datePerformed).toLowerCase().includes(q) ||
      formatDate(item.expiryDate).toLowerCase().includes(q) ||
      toInputDate(item.datePerformed).includes(q) ||
      toInputDate(item.expiryDate).includes(q)
    );
  });

  const openCreate = () => {
    setEditing(null);
    form.reset({
      name: '',
      datePerformed: todayISODate(),
      expiryDate: todayISODate(),
      observations: '',
    });
    setDialogOpen(true);
  };

  const openEdit = (item: AgendaItem) => {
    setEditing(item);
    form.reset({
      name: item.name,
      datePerformed: toInputDate(item.datePerformed),
      expiryDate: toInputDate(item.expiryDate),
      observations: item.observations ?? '',
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: AgendaFormValues) => {
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
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
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
            <EventNoteIcon sx={{ color: '#1976D2', fontSize: 22 }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight="bold">
              Agenda
            </Typography>
            <Typography variant="body2" sx={{ color: '#666' }}>
              Controle de itens com data de realização e validade
            </Typography>
          </Box>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate} sx={containedSx}>
          + Novo Item
        </Button>
      </Box>

      <TextField
        fullWidth
        placeholder="Buscar por nome, observação ou data..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
          },
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
                <TableCell sx={{ fontWeight: 700, color: '#333' }}>Nome</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#333' }}>Data Realizado</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#333' }}>Data de Validade</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#333' }}>Observações</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#333' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#333' }} align="center">
                  Ações
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredItems?.map((item) => {
                const status = agendaStatus(item.expiryDate);
                const days = daysUntil(item.expiryDate);
                const expanded = expandedId === item._id;
                return (
                  <Fragment key={item._id}>
                    <TableRow
                      hover
                      sx={{ bgcolor: status === 'Vencido' ? '#FFF5F5' : undefined }}
                    >
                      <TableCell padding="none" sx={{ pl: 1, width: 48 }}>
                        <IconButton
                          size="small"
                          onClick={() => setExpandedId(expanded ? null : item._id)}
                          sx={{
                            color: '#666',
                            transform: expanded ? 'rotate(180deg)' : 'none',
                            transition: 'transform 0.2s',
                          }}
                        >
                          <ExpandMoreIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                      <TableCell>
                        <Typography fontWeight={500}>{item.name}</Typography>
                      </TableCell>
                      <TableCell>{formatDate(item.datePerformed)}</TableCell>
                      <TableCell>
                        <Typography fontWeight={700}>{formatDate(item.expiryDate)}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          title={item.observations || ''}
                          sx={{
                            maxWidth: 320,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {item.observations || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <StatusChip status={status} />
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          onClick={() => openEdit(item)}
                          sx={{ color: '#666' }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => setDeleteTarget(item._id)}
                          sx={{ color: '#d32f2f' }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                    {expanded && (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          sx={{ py: 2, bgcolor: '#F8F9FA', borderTop: 'none' }}
                        >
                          <Box
                            sx={{
                              display: 'grid',
                              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                              gap: 2,
                              px: 1,
                            }}
                          >
                            <Box>
                              <Typography variant="caption" sx={detailLabelSx}>
                                Nome
                              </Typography>
                              <Typography variant="body2" fontWeight={600}>
                                {item.name}
                              </Typography>
                            </Box>
                            <Box>
                              <Typography variant="caption" sx={detailLabelSx}>
                                Status
                              </Typography>
                              <StatusChip status={status} />
                            </Box>
                            <DetailValue
                              label="Data que foi realizado"
                              value={formatDate(item.datePerformed)}
                            />
                            <DetailValue
                              label="Data de Validade"
                              value={formatDate(item.expiryDate)}
                            />
                            <DetailValue
                              label="Dias até o vencimento"
                              value={days !== null ? `${days} dia(s)` : '—'}
                              color={days !== null && days >= 0 ? '#2E7D32' : '#C62828'}
                            />
                            <Box sx={{ gridColumn: { xs: 'auto', md: '1 / -1' } }}>
                              <Typography variant="caption" sx={detailLabelSx}>
                                Observações
                              </Typography>
                              <TextField
                                fullWidth
                                multiline
                                minRows={2}
                                value={item.observations || ''}
                                slotProps={{ htmlInput: { readOnly: true } }}
                                sx={{ mt: 0.5, bgcolor: '#fff' }}
                              />
                            </Box>
                          </Box>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
              {filteredItems?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">Nenhum item encontrado</Typography>
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
          {editing ? 'Editar Item da Agenda' : 'Novo Item da Agenda'}
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
                placeholder="Ex: Limpeza da câmera fria"
                {...form.register('name')}
                error={!!form.formState.errors.name}
                helperText={form.formState.errors.name?.message}
                fullWidth
              />
            </Box>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                gap: 2,
              }}
            >
              <Box>
                <FieldLabel required>Data que foi realizado</FieldLabel>
                <TextField
                  type="date"
                  {...form.register('datePerformed')}
                  error={!!form.formState.errors.datePerformed}
                  helperText={form.formState.errors.datePerformed?.message}
                  fullWidth
                />
              </Box>
              <Box>
                <FieldLabel required>Data de Validade</FieldLabel>
                <TextField
                  type="date"
                  {...form.register('expiryDate')}
                  error={!!form.formState.errors.expiryDate}
                  helperText={form.formState.errors.expiryDate?.message}
                  fullWidth
                />
              </Box>
            </Box>
            <Box>
              <FieldLabel>Observações</FieldLabel>
              <TextField
                placeholder="Detalhes adicionais..."
                {...form.register('observations')}
                error={!!form.formState.errors.observations}
                helperText={form.formState.errors.observations?.message}
                fullWidth
                multiline
                minRows={3}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1.5 }}>
          <Button onClick={() => setDialogOpen(false)} variant="outlined" sx={outlinedCancelSx}>
            Cancelar
          </Button>
          <Button onClick={form.handleSubmit(onSubmit)} variant="contained" sx={containedSx}>
            {editing ? 'Salvar' : 'Cadastrar'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Excluir Item da Agenda"
        message="Tem certeza que deseja excluir este item?"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </LoggedLayout>
  );
}
