'use client';

import { useState } from 'react';
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
} from '@mui/material';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CloseIcon from '@mui/icons-material/Close';
import type { StockMovement } from '@/types';
import { useStockMovements } from '@/lib/queries';
import { formatDate } from '@/lib/utils';
import LoggedLayout from '../components/LoggedLayout/LoggedLayout';

const thSx = { fontWeight: 700, color: '#333' };

export default function HistoryPage() {
  const { data: movements, isLoading } = useStockMovements();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [detail, setDetail] = useState<StockMovement | null>(null);

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

  const detailRows: [string, string][] = detail
    ? [
        ['Produto', detail.product.productName],
        ['Tipo', detail.movementType === 'entry' ? 'Entrada' : 'Saída'],
        [
          'Categoria',
          detail.itemType
            ? detail.itemType === 'raw'
              ? 'Bruto'
              : 'Porcionado'
            : '—',
        ],
        ['Quantidade', String(detail.quantity)],
        ['Peso', detail.weightGrams != null ? `${detail.weightGrams}g` : '—'],
        ['Motivo', detail.reason || '—'],
        ['Data', formatDate(detail.date)],
        ['Criado em', formatDate(detail.createdAt)],
        ['ID', detail._id],
      ]
    : [];

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
            justifyContent: 'space-between',
            pb: 1,
          }}
        >
          Detalhes da Movimentação
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
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: 1 }}>
            {detailRows.map(([label, value]) => (
              <Box key={label}>
                <Typography variant="body2" fontWeight={600}>
                  {label}
                </Typography>
                <Typography variant="body2" sx={{ color: '#666' }}>
                  {value}
                </Typography>
              </Box>
            ))}
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
