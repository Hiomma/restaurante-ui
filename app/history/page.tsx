'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  InputAdornment,
  CircularProgress,
  Checkbox,
} from '@mui/material';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CloseIcon from '@mui/icons-material/Close';
import PrintIcon from '@mui/icons-material/Print';
import DeleteIcon from '@mui/icons-material/Delete';
import type { StockMovement, StockItem } from '@/types';
import { useStockMovements, useStockItems, useDeleteStockItem } from '@/lib/queries';
import { formatDate } from '@/lib/utils';
import LoggedLayout from '../components/LoggedLayout/LoggedLayout';

const thSx = { fontWeight: 700, color: '#333' };

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <Typography variant="body2" sx={{ color: '#666' }}>
      {label}:{' '}
      <Box component="span" sx={{ fontWeight: 700, color: '#000' }}>
        {value}
      </Box>
    </Typography>
  );
}

function LabelCard({
  item,
  checked,
  onToggle,
}: {
  item: StockItem;
  checked: boolean;
  onToggle: () => void;
}) {
  const statusLabel =
    item.status === 'in_stock'
      ? 'Em estoque'
      : item.status === 'used'
        ? 'Usado'
        : item.status === 'discarded'
          ? 'Descartado'
          : 'Expirado';
  const statusColor =
    item.status === 'in_stock'
      ? { bgcolor: '#E8F5E9', color: '#2E7D32' }
      : item.status === 'used'
        ? { bgcolor: '#FFF3E0', color: '#E65100' }
        : { bgcolor: '#FFEBEE', color: '#C62828' };

  return (
    <Box
      sx={{
        border: '1px solid #e0e0e0',
        borderRadius: 1.5,
        p: 1.5,
        width: 160,
        flexShrink: 0,
        bgcolor: '#fff',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
        <Checkbox size="small" checked={checked} onChange={onToggle} sx={{ p: 0, mr: 0.5 }} />
        <Typography variant="body2" fontWeight={700} noWrap>
          {item.product.productName}
        </Typography>
      </Box>
      <Typography variant="body2" fontWeight={700}>{item.weightGrams}g</Typography>
      <Typography variant="caption" sx={{ color: '#666', display: 'block' }}>
        Val: {formatDate(item.expiryDate)}
      </Typography>
      <Typography variant="caption" sx={{ color: '#666', display: 'block', fontFamily: 'monospace' }}>
        {item.qrCode}
      </Typography>
      <Chip
        label={statusLabel}
        size="small"
        sx={{ ...statusColor, mt: 0.75, height: 22, fontSize: 11 }}
      />
    </Box>
  );
}

export default function HistoryPage() {
  const { data: movements, isLoading } = useStockMovements();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [detail, setDetail] = useState<StockMovement | null>(null);
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const deleteStockItem = useDeleteStockItem();

  const batchFromReason = useMemo(() => {
    const match = detail?.reason?.match(/BATCH-[A-Z0-9-]+/i);
    return match ? match[0] : undefined;
  }, [detail]);

  const { data: allItems } = useStockItems(
    detail ? { productId: detail.product.productId } : undefined,
  );

  const batchLabels = useMemo(() => {
    if (!allItems || !detail) return [];
    if (batchFromReason) {
      const filtered = allItems.filter((i) => i.batchId === batchFromReason);
      if (filtered.length > 0) return filtered;
    }
    return allItems.filter(
      (i) =>
        i.manipulationDate === detail.date &&
        (detail.itemType ? i.type === detail.itemType : true),
    );
  }, [allItems, detail, batchFromReason]);

  useEffect(() => {
    setSelectedLabels([]);
  }, [detail]);

  const toggleLabel = (id: string) => {
    setSelectedLabels((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const toggleAll = () => {
    setSelectedLabels((prev) =>
      prev.length === batchLabels.length ? [] : batchLabels.map((i) => i._id),
    );
  };

  const handleReprint = () => {
    if (selectedLabels.length === 0) return;
    window.print();
  };

  const handleDeleteLabels = async () => {
    for (const id of selectedLabels) {
      await deleteStockItem.mutateAsync(id);
    }
    setSelectedLabels([]);
  };

  const filtered = movements?.filter((m) => {
    if (typeFilter && m.movementType !== typeFilter) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      m.product.productName.toLowerCase().includes(q) ||
      (m.reason ?? '').toLowerCase().includes(q) ||
      formatDate(m.date).includes(q) ||
      m.date.includes(q)
    );
  });

  return (
    <LoggedLayout>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            bgcolor: '#E3F2FD',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <SwapHorizIcon sx={{ color: '#1976D2' }} />
        </Box>
        <Box>
          <Typography variant="h5" fontWeight="bold">
            Entradas e Saídas
          </Typography>
          <Typography variant="body2" sx={{ color: '#666' }}>
            Histórico de movimentações de estoque
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', gap: 1.5, mb: 3 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Buscar por produto, data ou lote..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
          }}
          sx={{ bgcolor: '#fff', borderRadius: 2 }}
        />
        <TextField
          select
          size="small"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          sx={{ width: 180, bgcolor: '#fff', borderRadius: 2 }}
        >
          <MenuItem value="">Todos os tipos</MenuItem>
          <MenuItem value="entry">Entrada</MenuItem>
          <MenuItem value="exit">Saída</MenuItem>
        </TextField>
      </Box>

      {isLoading ? (
        <CircularProgress />
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#f5f7fa' }}>
                <TableCell sx={thSx}>Tipo</TableCell>
                <TableCell sx={thSx}>Produto</TableCell>
                <TableCell sx={thSx}>Categoria</TableCell>
                <TableCell sx={thSx}>Qtd</TableCell>
                <TableCell sx={thSx}>Peso</TableCell>
                <TableCell sx={thSx}>Motivo</TableCell>
                <TableCell sx={thSx}>Data</TableCell>
                <TableCell sx={thSx} align="center">
                  Ações
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered?.map((m) => (
                <TableRow key={m._id} hover>
                  <TableCell>
                    <Chip
                      label={m.movementType === 'entry' ? '↘ Entrada' : '↗ Saída'}
                      size="small"
                      sx={{
                        bgcolor: m.movementType === 'entry' ? '#E8F5E9' : '#FFEBEE',
                        color: m.movementType === 'entry' ? '#2E7D32' : '#C62828',
                        fontWeight: 600,
                        borderRadius: 1.5,
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>
                      {m.product.productName}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {m.itemType ? (
                      <Chip
                        label={m.itemType === 'raw' ? 'Bruto' : 'Porcionado'}
                        size="small"
                        sx={{
                          bgcolor: '#F1F3F5',
                          color: '#495057',
                          borderRadius: 1.5,
                        }}
                      />
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell>{m.quantity}</TableCell>
                  <TableCell>
                    {m.weightGrams != null ? `${m.weightGrams}g` : '—'}
                  </TableCell>
                  <TableCell sx={{ maxWidth: 220 }}>
                    <Typography variant="body2" noWrap title={m.reason || undefined}>
                      {m.reason || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>{formatDate(m.date)}</TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      aria-label="ver detalhes"
                      onClick={() => setDetail(m)}
                      sx={{ color: '#666' }}
                    >
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {filtered?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">
                      Nenhuma movimentação encontrada
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog
        open={!!detail}
        onClose={() => setDetail(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            pb: 1,
          }}
        >
          <Chip
            label={detail?.movementType === 'entry' ? 'Entrada' : 'Saída'}
            color={detail?.movementType === 'entry' ? 'success' : 'error'}
            size="small"
            sx={{ fontWeight: 700 }}
          />
          <Typography variant="h6" fontWeight={700} sx={{ flex: 1 }}>
            {detail?.product.productName}
          </Typography>
          <IconButton
            aria-label="fechar"
            onClick={() => setDetail(null)}
            size="small"
            sx={{ color: '#666', mr: -1 }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <Box
              sx={{
                bgcolor: '#f5f7fa',
                borderRadius: 2,
                p: 2,
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                rowGap: 1.25,
                columnGap: 2,
              }}
            >
              <InfoField label="Data" value={detail ? formatDate(detail.date) : '—'} />
              <InfoField label="Quantidade" value={detail ? String(detail.quantity) : '—'} />
              <InfoField
                label="Peso"
                value={detail?.weightGrams != null ? `${detail.weightGrams}g` : '—'}
              />
              <InfoField
                label="Tipo"
                value={
                  detail?.itemType
                    ? detail.itemType === 'raw'
                      ? 'Bruto'
                      : 'Porcionado'
                    : '—'
                }
              />
              <Box sx={{ gridColumn: '1 / -1' }}>
                <InfoField label="Motivo" value={detail?.reason || '—'} />
              </Box>
            </Box>

            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                mt: 3,
                mb: 1.5,
                flexWrap: 'wrap',
                gap: 1,
              }}
            >
              <Typography variant="subtitle1" fontWeight={700}>
                Etiquetas do Lote ({batchLabels.length})
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Typography
                  variant="body2"
                  sx={{ color: '#1976D2', cursor: 'pointer', fontWeight: 600 }}
                  onClick={toggleAll}
                >
                  {selectedLabels.length === batchLabels.length && batchLabels.length > 0
                    ? 'Desmarcar todas'
                    : 'Selecionar todas'}
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<PrintIcon />}
                  disabled={selectedLabels.length === 0}
                  onClick={handleReprint}
                  sx={{ textTransform: 'none', color: '#555', borderColor: '#ddd' }}
                >
                  Reimprimir ({selectedLabels.length})
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  color="error"
                  startIcon={<DeleteIcon />}
                  disabled={selectedLabels.length === 0}
                  onClick={() => void handleDeleteLabels()}
                  sx={{ textTransform: 'none' }}
                >
                  Excluir ({selectedLabels.length})
                </Button>
              </Box>
            </Box>

            {batchLabels.length === 0 ? (
              <Typography variant="body2" sx={{ color: '#888' }}>
                Nenhuma etiqueta encontrada para este lote.
              </Typography>
            ) : (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                {batchLabels.map((item) => (
                  <LabelCard
                    key={item._id}
                    item={item}
                    checked={selectedLabels.includes(item._id)}
                    onToggle={() => toggleLabel(item._id)}
                  />
                ))}
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button
            onClick={() => setDetail(null)}
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
            Fechar
          </Button>
        </DialogActions>
      </Dialog>
    </LoggedLayout>
  );
}
