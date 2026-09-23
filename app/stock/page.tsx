'use client';

import { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  Chip,
  IconButton,
  Collapse,
  TextField,
  MenuItem,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import InventoryIcon from '@mui/icons-material/Inventory';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DeleteIcon from '@mui/icons-material/Delete';
import { useProducts, useStockItems, useDeleteStockItem } from '@/lib/queries';
import { formatDate, formatKg, formatWeight, daysUntil, lifeStatus } from '@/lib/utils';
import type { StockItem } from '@/types';
import LoggedLayout from '../components/LoggedLayout/LoggedLayout';
import ConfirmDialog from '../components/ConfirmDialog/ConfirmDialog';

const cardSx = {
  bgcolor: '#fff',
  borderRadius: 2,
  border: '1px solid #e8ecf1',
  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
};

const thSx = { fontWeight: 700, color: '#333', fontSize: 13 };

const chipGreen = { bgcolor: '#E8F5E9', color: '#2E7D32', fontWeight: 600, fontSize: 12 };
const chipRed = { bgcolor: '#FFEBEE', color: '#C62828', fontWeight: 600, fontSize: 12 };
const chipAmber = { bgcolor: '#FFF3E0', color: '#E65100', fontWeight: 600, fontSize: 12 };
const chipGray = { bgcolor: '#F1F3F5', color: '#495057', fontWeight: 600, fontSize: 12 };
const chipBlue = { bgcolor: '#E3F2FD', color: '#1976D2', fontWeight: 600, fontSize: 12 };

const tableSx = { '& td': { borderBottom: '1px solid #eef1f5' } };

type StatusFilter = 'all' | 'vencendo' | 'vencidos' | 'abaixo' | 'ok';

interface ProductGroupRow {
  productId: string;
  name: string;
  group: string;
  items: StockItem[];
  totalWeight: number;
  rawCount: number;
  portionedCount: number;
  expiredCount: number;
  expiringCount: number;
  minQuantity: number;
  minPortionedQuantity: number;
  belowMin: boolean;
}

function DaysChip({ expiryDate }: { expiryDate: string }) {
  const days = daysUntil(expiryDate);
  if (days === null) return <Chip label="—" size="small" sx={chipGray} />;
  if (days < 0) return <Chip label="Vencido" size="small" sx={chipRed} />;
  if (days <= 7) return <Chip label={`${days}d`} size="small" sx={chipAmber} />;
  return <Chip label={`${days}d`} size="small" sx={chipGreen} />;
}

export default function StockPage() {
  const { data: products, isLoading: loadingProducts } = useProducts();
  const { data: items, isLoading: loadingItems } = useStockItems();
  const deleteItem = useDeleteStockItem();

  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const isLoading = loadingProducts || loadingItems;
  const allItems = items ?? [];
  const inStock = allItems.filter((i) => i.status === 'in_stock');

  const rawItems = inStock.filter((i) => i.type === 'raw');
  const portionedItems = inStock.filter((i) => i.type === 'portioned');
  const rawWeight = rawItems.reduce((s, i) => s + i.weightGrams, 0);
  const portionedWeight = portionedItems.reduce((s, i) => s + i.weightGrams, 0);
  const expiringCount = inStock.filter((i) => lifeStatus(i) === 'expiring').length;
  const expiredCount = allItems.filter((i) => lifeStatus(i) === 'expired').length;

  const groupedMap = new Map<string, StockItem[]>();
  inStock.forEach((item) => {
    const key = item.product.productId;
    const arr = groupedMap.get(key);
    if (arr) arr.push(item);
    else groupedMap.set(key, [item]);
  });

  const rows: ProductGroupRow[] = [];
  groupedMap.forEach((gItems, productId) => {
    const product = (products ?? []).find((p) => p._id === productId);
    const totalWeight = gItems.reduce((s, i) => s + i.weightGrams, 0);
    const rawCount = gItems.filter((i) => i.type === 'raw').length;
    const portionedCount = gItems.length - rawCount;
    const minQuantity = product?.minQuantity ?? 0;
    const minPortionedQuantity = product?.minPortionedQuantity ?? 0;
    const productItems = allItems.filter((i) => i.product.productId === productId);
    rows.push({
      productId,
      name: product?.name ?? gItems[0].product.productName,
      group: product?.group ?? gItems[0].product.productGroup ?? '',
      items: gItems,
      totalWeight,
      rawCount,
      portionedCount,
      expiredCount: productItems.filter((i) => lifeStatus(i) === 'expired').length,
      expiringCount: gItems.filter((i) => lifeStatus(i) === 'expiring').length,
      minQuantity,
      minPortionedQuantity,
      belowMin: minQuantity > 0 && totalWeight < minQuantity,
    });
  });

  const lowCount = rows.filter((r) => r.belowMin).length;

  const groupOptions = Array.from(new Set((products ?? []).map((p) => p.group))).sort();

  const filteredRows = rows
    .filter((r) => r.name.toLowerCase().includes(search.trim().toLowerCase()))
    .filter((r) => groupFilter === 'all' || r.group === groupFilter)
    .filter((r) => {
      if (statusFilter === 'all') return true;
      if (statusFilter === 'vencendo') return r.expiringCount > 0;
      if (statusFilter === 'vencidos') return r.expiredCount > 0;
      if (statusFilter === 'abaixo') return r.belowMin;
      return r.expiredCount === 0 && r.expiringCount === 0 && !r.belowMin;
    })
    .sort((a, b) => {
      const pa = a.belowMin ? 0 : a.expiredCount > 0 ? 1 : a.expiringCount > 0 ? 2 : 3;
      const pb = b.belowMin ? 0 : b.expiredCount > 0 ? 1 : b.expiringCount > 0 ? 2 : 3;
      if (pa !== pb) return pa - pb;
      return a.name.localeCompare(b.name);
    });

  const kpis = [
    {
      label: 'Total Bruto',
      value: rawItems.length,
      caption: formatKg(rawWeight),
      bg: '#E3F2FD',
      icon: <Inventory2Icon sx={{ color: '#1976D2', fontSize: 22 }} />,
    },
    {
      label: 'Total Porcionado',
      value: portionedItems.length,
      caption: formatKg(portionedWeight),
      bg: '#E3F2FD',
      icon: <InventoryIcon sx={{ color: '#1976D2', fontSize: 22 }} />,
    },
    {
      label: 'Vencendo na Semana',
      value: expiringCount,
      caption: 'itens',
      bg: '#FFF3E0',
      icon: <AccessTimeIcon sx={{ color: '#E65100', fontSize: 22 }} />,
    },
    {
      label: 'Vencidos',
      value: expiredCount,
      caption: 'itens',
      bg: '#FFEBEE',
      icon: <WarningAmberIcon sx={{ color: '#C62828', fontSize: 22 }} />,
    },
    {
      label: 'Precisam Comprar',
      value: lowCount,
      caption: 'produtos',
      bg: '#FFEBEE',
      icon: <ShoppingCartIcon sx={{ color: '#C62828', fontSize: 22 }} />,
    },
  ];

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDelete = async () => {
    if (deleteTarget) {
      await deleteItem.mutateAsync(deleteTarget);
      setDeleteTarget(null);
    }
  };

  return (
    <LoggedLayout>
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
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
            <Inventory2Icon sx={{ color: '#1976D2', fontSize: 20 }} />
          </Box>
          <Typography variant="h5" fontWeight="bold">
            Estoque
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ color: '#666', ml: 6.5 }}>
          Visão geral agrupada por produto
        </Typography>
      </Box>

      {isLoading ? (
        <CircularProgress />
      ) : (
        <>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(5, 1fr)' },
              gap: 2,
              mb: 3,
            }}
          >
            {kpis.map((k) => (
              <Card key={k.label} sx={cardSx}>
                <Box sx={{ p: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" sx={{ color: '#666', mb: 1 }}>
                      {k.label}
                    </Typography>
                    <Typography variant="h4" fontWeight="bold" sx={{ lineHeight: 1.2 }}>
                      {k.value}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#999', mt: 0.5 }}>
                      {k.caption}
                    </Typography>
                  </Box>
                  <Box sx={{ bgcolor: k.bg, borderRadius: 1.5, p: 1, display: 'flex', flexShrink: 0 }}>
                    {k.icon}
                  </Box>
                </Box>
              </Card>
            ))}
          </Box>

          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
            <TextField
              placeholder="Buscar produto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
              }}
              sx={{ bgcolor: '#fff', borderRadius: 2, flexGrow: 1, minWidth: 220 }}
            />
            <TextField
              select
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
              sx={{ bgcolor: '#fff', borderRadius: 2, minWidth: 200 }}
            >
              <MenuItem value="all">Todos os grupos</MenuItem>
              {groupOptions.map((g) => (
                <MenuItem key={g} value={g}>
                  {g}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              sx={{ bgcolor: '#fff', borderRadius: 2, minWidth: 200 }}
            >
              <MenuItem value="all">Todos os status</MenuItem>
              <MenuItem value="vencendo">Vencendo</MenuItem>
              <MenuItem value="vencidos">Vencidos</MenuItem>
              <MenuItem value="abaixo">Abaixo do mínimo</MenuItem>
              <MenuItem value="ok">OK</MenuItem>
            </TextField>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {filteredRows.length === 0 && (
              <Card sx={{ ...cardSx, p: 3 }}>
                <Typography variant="body2" sx={{ color: '#666', textAlign: 'center' }}>
                  Nenhum produto encontrado
                </Typography>
              </Card>
            )}
            {filteredRows.map((r) => {
              const open = expanded.has(r.productId);
              return (
                <Card key={r.productId} sx={{ ...cardSx, overflow: 'hidden' }}>
                  <Box
                    onClick={() => toggle(r.productId)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      p: 2,
                      cursor: 'pointer',
                      bgcolor: r.belowMin ? '#FDECEC' : 'transparent',
                      '&:hover': { bgcolor: r.belowMin ? '#FBE4E4' : '#f9fafb' },
                    }}
                  >
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Typography fontWeight={700}>{r.name}</Typography>
                        {r.group && (
                          <Chip
                            label={r.group}
                            size="small"
                            variant="outlined"
                            sx={{
                              borderColor: '#CED4DA',
                              color: '#495057',
                              bgcolor: 'transparent',
                              fontWeight: 500,
                              fontSize: 12,
                            }}
                          />
                        )}
                        {r.expiredCount > 0 && (
                          <Chip label={`${r.expiredCount} vencido(s)`} size="small" sx={chipRed} />
                        )}
                        {r.expiringCount > 0 && (
                          <Chip label={`${r.expiringCount} vencendo`} size="small" sx={chipAmber} />
                        )}
                        {r.belowMin && (
                          <Chip
                            label="Comprar"
                            size="small"
                            sx={{ bgcolor: '#C62828', color: '#fff', fontWeight: 700, fontSize: 12 }}
                          />
                        )}
                      </Box>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1.25,
                          flexWrap: 'wrap',
                          mt: 0.75,
                        }}
                      >
                        <Typography variant="body2" fontWeight={700} sx={{ color: '#333' }}>
                          {r.items.length} etiquetas
                        </Typography>
                        <Typography variant="body2" fontWeight={700} sx={{ color: '#333' }}>
                          {formatKg(r.totalWeight)} total
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#666' }}>
                          {r.rawCount} bruto
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#666' }}>
                          {r.portionedCount} porcionado
                        </Typography>
                        {r.minQuantity > 0 && (
                          <Typography
                            variant="body2"
                            fontWeight={700}
                            sx={{ color: r.totalWeight < r.minQuantity ? '#C62828' : '#2E7D32' }}
                          >
                            {r.totalWeight}/{r.minQuantity} min.
                          </Typography>
                        )}
                        {r.minPortionedQuantity > 0 && (
                          <Typography
                            variant="body2"
                            fontWeight={700}
                            sx={{
                              color:
                                r.portionedCount < r.minPortionedQuantity ? '#C62828' : '#2E7D32',
                            }}
                          >
                            {r.portionedCount}/{r.minPortionedQuantity} min.
                          </Typography>
                        )}
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                      <Typography variant="body2" sx={{ color: '#666' }}>
                        Ver etiquetas
                      </Typography>
                      <IconButton size="small" sx={{ color: '#666' }}>
                        {open ? <ExpandMoreIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
                      </IconButton>
                    </Box>
                  </Box>
                  <Collapse in={open} timeout="auto" unmountOnExit>
                    <Box sx={{ borderTop: '1px solid #eef1f5', p: 2 }}>
                      <TableContainer>
                        <Table size="small" sx={tableSx}>
                          <TableHead>
                            <TableRow sx={{ bgcolor: '#f5f7fa' }}>
                              <TableCell sx={thSx}>Tipo</TableCell>
                              <TableCell sx={thSx}>Peso</TableCell>
                              <TableCell sx={thSx}>Lote</TableCell>
                              <TableCell sx={thSx}>NF</TableCell>
                              <TableCell sx={thSx}>Recebimento</TableCell>
                              <TableCell sx={thSx}>Validade</TableCell>
                              <TableCell sx={thSx}>Status</TableCell>
                              <TableCell sx={thSx}>QR</TableCell>
                              <TableCell sx={thSx} align="center">
                                Ações
                              </TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {r.items.map((item) => (
                              <TableRow key={item._id}>
                                <TableCell>
                                  <Chip
                                    label={item.type === 'raw' ? 'Bruto' : 'Porcionado'}
                                    size="small"
                                    sx={item.type === 'raw' ? chipBlue : chipGreen}
                                  />
                                </TableCell>
                                <TableCell>{formatWeight(item.weightGrams)}</TableCell>
                                <TableCell>{item.lote || '—'}</TableCell>
                                <TableCell>{item.nf || '—'}</TableCell>
                                <TableCell>{formatDate(item.manipulationDate)}</TableCell>
                                <TableCell>{formatDate(item.expiryDate)}</TableCell>
                                <TableCell>
                                  <DaysChip expiryDate={item.expiryDate} />
                                </TableCell>
                                <TableCell>
                                  <Typography
                                    variant="caption"
                                    sx={{ fontFamily: 'monospace', fontSize: 11, color: '#495057' }}
                                  >
                                    {item.qrCode}
                                  </Typography>
                                </TableCell>
                                <TableCell align="center">
                                  <IconButton
                                    size="small"
                                    onClick={() => setDeleteTarget(item._id)}
                                    sx={{ color: '#d32f2f' }}
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Box>
                  </Collapse>
                </Card>
              );
            })}
          </Box>
        </>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Excluir Item"
        message="Tem certeza que deseja excluir este item do estoque?"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </LoggedLayout>
  );
}
