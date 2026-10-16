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
  CircularProgress,
  Tab,
  Button,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import SearchIcon from '@mui/icons-material/Search';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import InventoryIcon from '@mui/icons-material/Inventory';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import {
  useProducts,
  useStockItems,
  useDeleteStockItem,
  useMovementDestinations,
  useCreateStockMovement,
  useUpdateStockItem,
} from '@/lib/queries';
import { formatDate, formatKg, formatWeight, daysUntil, lifeStatus, todayISODate, downloadCsv } from '@/lib/utils';
import { useAccess } from '@/lib/permissions';
import type { StockItem } from '@/types';
import LoggedLayout from '../components/LoggedLayout/LoggedLayout';
import ConfirmDialog from '../components/ConfirmDialog/ConfirmDialog';
import ResponsiveTable from '../components/ResponsiveTable/ResponsiveTable';
import ResponsiveTabs from '../components/ResponsiveTabs/ResponsiveTabs';

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

/** Select-all control shown in the table header (and above the mobile list). */
function SelectAllCheckbox({
  items,
  selected,
  setSelected,
}: {
  items: StockItem[];
  selected: Set<string>;
  setSelected: React.Dispatch<React.SetStateAction<Set<string>>>;
}) {
  return (
    <Checkbox
      size="small"
      checked={items.length > 0 && items.every((i) => selected.has(i._id))}
      indeterminate={
        items.some((i) => selected.has(i._id)) && !items.every((i) => selected.has(i._id))
      }
      onChange={(e) =>
        setSelected((prev) => {
          const next = new Set(prev);
          items.forEach((i) => {
            if (e.target.checked) next.add(i._id);
            else next.delete(i._id);
          });
          return next;
        })
      }
    />
  );
}

const fixedMoveDestinations = ['Salão', 'Bar', 'Cozinha'];
const fixedWriteoffDestinations = ['Perda', 'Não encontrado'];

type StatusFilter = 'all' | 'vencendo' | 'vencidos' | 'abaixo' | 'ok';

/**
 * Filtros alternáveis clicando nos cards de KPI do topo.
 * `life` (vencendo/vencidos) e `type` (bruto/porcionado) são chaves
 * independentes: combinam-se entre si (ex.: vencidos + bruto) e cada card
 * clicado duas vezes zera somente o próprio filtro.
 */
interface KpiFilterState {
  life: 'all' | 'expiring' | 'expired';
  type: 'all' | 'raw' | 'portioned';
}

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
  const { enqueueSnackbar } = useSnackbar();
  const { data: products, isLoading: loadingProducts } = useProducts();
  const { data: items, isLoading: loadingItems } = useStockItems();
  const { data: destinations } = useMovementDestinations();
  const deleteItem = useDeleteStockItem();
  const createMovement = useCreateStockMovement();
  const updateItem = useUpdateStockItem();
  // Permissões: funcionário (restrito) não exporta nem exclui itens — visualização ok.
  const { estoqueExport, estoqueDelete } = useAccess();

  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [destFilter, setDestFilter] = useState('all');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<'move' | 'writeoff' | null>(null);
  const [bulkDest, setBulkDest] = useState('');
  const [kpiFilter, setKpiFilter] = useState<KpiFilterState>({ life: 'all', type: 'all' });

  // Clicar de novo no mesmo card limpa só esse filtro; cards de chaves
  // diferentes (ex.: "Vencidos" + "Total Bruto") permanecem combinados.
  const toggleLifeFilter = (value: 'expiring' | 'expired') =>
    setKpiFilter((prev) => ({ ...prev, life: prev.life === value ? 'all' : value }));
  const toggleTypeFilter = (value: 'raw' | 'portioned') =>
    setKpiFilter((prev) => ({ ...prev, type: prev.type === value ? 'all' : value }));

  const isLoading = loadingProducts || loadingItems;
  const allItems = items ?? [];
  const inStock = allItems.filter((i) => {
    if (i.status !== 'in_stock') return false;
    if (destFilter === 'all') return true;
    if (destFilter === 'none') return !i.destination;
    return i.destination === destFilter;
  });

  // Filtros de KPI (clique nos cards do topo). A base dos grupos abaixo é
  // "em estoque + aba de local + filtros de KPI"; os demais filtros (busca,
  // grupo, status) continuam aplicados depois, sobre as linhas de produto.
  const passesKpiFilter = (i: StockItem) => {
    if (kpiFilter.life === 'expiring' && lifeStatus(i) !== 'expiring') return false;
    if (kpiFilter.life === 'expired' && lifeStatus(i) !== 'expired') return false;
    if (kpiFilter.type === 'raw' && i.type !== 'raw') return false;
    if (kpiFilter.type === 'portioned' && i.type !== 'portioned') return false;
    return true;
  };

  // Contagens dos cards de KPI: sempre sobre a base total (em estoque + aba de
  // local ativa), ANTES dos filtros de KPI/busca/grupo/status — ligar um filtro
  // não altera os números dos cards. "Vencidos" passou a contar apenas itens em
  // estoque (antes usava allItems) para o número bater com a lista exibida ao
  // clicar no card, já que a lista só mostra itens em estoque.
  const rawItems = inStock.filter((i) => i.type === 'raw');
  const portionedItems = inStock.filter((i) => i.type === 'portioned');
  const rawWeight = rawItems.reduce((s, i) => s + i.weightGrams, 0);
  const portionedWeight = portionedItems.reduce((s, i) => s + i.weightGrams, 0);
  const expiringCount = inStock.filter((i) => lifeStatus(i) === 'expiring').length;
  const expiredCount = inStock.filter((i) => lifeStatus(i) === 'expired').length;

  // Base das contagens das abas/chips de local ("onde eles estão"): em estoque +
  // filtros de KPI, mas SEM a aba de local selecionada (cada aba mostra a
  // contagem do próprio local) — assim os números refletem os itens filtrados.
  const kpiFilteredStock = allItems.filter(
    (i) => i.status === 'in_stock' && passesKpiFilter(i),
  );

  // Itens efetivamente listados: em estoque + aba de local + filtros de KPI.
  const visibleItems = inStock.filter(passesKpiFilter);

  const groupedMap = new Map<string, StockItem[]>();
  visibleItems.forEach((item) => {
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

  const groupOptions = Array.from(new Set((products ?? []).map((p) => p.group))).sort();

  const searchQuery = search.trim().toLowerCase();

  // Busca casando contra o nome do produto OU o lote de qualquer etiqueta do
  // grupo ("Lote 255997" com o prefixo ou só o valor "255997") — facilita
  // rastrear quanto ainda resta de um lote problemático.
  const matchesSearch = (r: ProductGroupRow) => {
    if (!searchQuery) return true;
    if (r.name.toLowerCase().includes(searchQuery)) return true;
    return r.items.some((i) => {
      const lote = (i.lote ?? '').toLowerCase();
      if (!lote) return false;
      return lote.includes(searchQuery) || `lote ${lote}`.includes(searchQuery);
    });
  };

  const filteredRows = rows
    .filter(matchesSearch)
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
      accent: '#1976D2',
      icon: <Inventory2Icon sx={{ color: '#1976D2', fontSize: 22 }} />,
      active: kpiFilter.type === 'raw',
      onToggle: () => toggleTypeFilter('raw'),
    },
    {
      label: 'Total Porcionado',
      value: portionedItems.length,
      caption: formatKg(portionedWeight),
      bg: '#E3F2FD',
      accent: '#1976D2',
      icon: <InventoryIcon sx={{ color: '#1976D2', fontSize: 22 }} />,
      active: kpiFilter.type === 'portioned',
      onToggle: () => toggleTypeFilter('portioned'),
    },
    {
      label: 'Vencendo na Semana',
      value: expiringCount,
      caption: 'itens',
      bg: '#FFF3E0',
      accent: '#E65100',
      icon: <AccessTimeIcon sx={{ color: '#E65100', fontSize: 22 }} />,
      active: kpiFilter.life === 'expiring',
      onToggle: () => toggleLifeFilter('expiring'),
    },
    {
      label: 'Vencidos',
      value: expiredCount,
      caption: 'itens',
      bg: '#FFEBEE',
      accent: '#C62828',
      icon: <WarningAmberIcon sx={{ color: '#C62828', fontSize: 22 }} />,
      active: kpiFilter.life === 'expired',
      onToggle: () => toggleLifeFilter('expired'),
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

  // Exporta os itens do grupo, respeitando os filtros ativos da página
  // (grupo, status, busca e filtro de local — os itens já vêm filtrados).
  const exportGroupItems = (r: ProductGroupRow) => {
    const safeName = r.name
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .replace(/[^\w-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase();
    downloadCsv(
      `estoque-${safeName || 'grupo'}`,
      ['Código (QR)', 'Lote', 'Validade', 'Peso (g)', 'Destino', 'Fornecedor', 'Categoria'],
      r.items.map((item) => [
        item.qrCode || '',
        item.lote || '',
        formatDate(item.expiryDate),
        item.weightGrams,
        item.destination || '—',
        item.supplier || '—',
        item.type === 'raw' ? 'Bruto' : 'Porcionado',
      ]),
    );
  };

  const handleDelete = async () => {
    if (deleteTarget) {
      await deleteItem.mutateAsync(deleteTarget);
      setDeleteTarget(null);
    }
  };

  const moveDestinations = [
    ...fixedMoveDestinations,
    ...(destinations ?? [])
      .filter(
        (d) => d.active && (d.type ?? 'move') === 'move' && !fixedMoveDestinations.includes(d.name),
      )
      .map((d) => d.name),
  ];

  const writeoffDestinations = [
    ...fixedWriteoffDestinations,
    ...(destinations ?? [])
      .filter(
        (d) => d.active && d.type === 'writeoff' && !fixedWriteoffDestinations.includes(d.name),
      )
      .map((d) => d.name),
  ];

  const locationTabs = Array.from(
    new Set([
      ...fixedMoveDestinations,
      ...(destinations ?? [])
        .filter((d) => d.active && (d.type ?? 'move') === 'move')
        .map((d) => d.name),
    ]),
  );

  // Contagem por local: usa a base com os filtros de KPI aplicados (reflete
  // "onde estão" os itens filtrados), mantendo cada aba com a contagem do
  // próprio local, independente da aba selecionada.
  const countInTab = (tab: string) =>
    kpiFilteredStock.filter(
      (i) =>
        tab === 'all' ? true : tab === 'none' ? !i.destination : i.destination === tab,
    ).length;

  const selectedItems = allItems.filter((i) => selected.has(i._id) && i.status === 'in_stock');
  const bulkBusy = createMovement.isPending || updateItem.isPending || deleteItem.isPending;

  const toggleSelect = (id: string, isChecked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (isChecked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleBulkConfirm = async () => {
    if (!bulkAction || !bulkDest || selectedItems.length === 0) return;
    try {
      for (const item of selectedItems) {
        if (bulkAction === 'move') {
          await createMovement.mutateAsync({
            productId: item.product.productId,
            productName: item.product.productName,
            movementType: 'move',
            quantity: 1,
            weightGrams: item.weightGrams,
            itemType: item.type,
            reason: `Mover — ${bulkDest}`,
            date: todayISODate(),
          });
          await updateItem.mutateAsync({ id: item._id, data: { destination: bulkDest } });
        } else {
          await createMovement.mutateAsync({
            productId: item.product.productId,
            productName: item.product.productName,
            movementType: 'exit',
            quantity: 1,
            weightGrams: item.weightGrams,
            itemType: item.type,
            reason: `Baixar — ${bulkDest}`,
            date: todayISODate(),
          });
          await deleteItem.mutateAsync(item._id);
        }
      }
      const n = selectedItems.length;
      const dest = bulkDest;
      const wasMove = bulkAction === 'move';
      setSelected(new Set());
      setBulkAction(null);
      setBulkDest('');
      enqueueSnackbar(
        wasMove
          ? `${n} etiqueta(s) movida(s) para ${dest}.`
          : `${n} etiqueta(s) baixada(s) — ${dest}.`,
        { variant: 'success' },
      );
    } catch {
      enqueueSnackbar('Erro ao movimentar etiquetas.', { variant: 'error' });
    }
  };

  return (
    <LoggedLayout>
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5, flexWrap: 'wrap' }}>
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
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
              gap: 2,
              mb: 3,
            }}
          >
            {kpis.map((k) => (
              <Card
                key={k.label}
                onClick={k.onToggle}
                role="button"
                tabIndex={0}
                aria-pressed={k.active}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    k.onToggle();
                  }
                }}
                sx={{
                  ...cardSx,
                  cursor: 'pointer',
                  // Card ativo (filtro aplicado): borda e fundo destacados.
                  bgcolor: k.active ? k.bg : '#fff',
                  border: '2px solid',
                  borderColor: k.active ? k.accent : '#e8ecf1',
                  transition: 'border-color .15s ease-in-out, box-shadow .15s ease-in-out',
                  '&:hover': {
                    boxShadow: '0 3px 8px rgba(0,0,0,0.08)',
                    borderColor: k.active ? k.accent : '#c9d2db',
                  },
                }}
              >
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
                  <Box
                    sx={{
                      bgcolor: k.active ? '#fff' : k.bg,
                      borderRadius: 1.5,
                      p: 1,
                      display: 'flex',
                      flexShrink: 0,
                    }}
                  >
                    {k.icon}
                  </Box>
                </Box>
              </Card>
            ))}
          </Box>

          <ResponsiveTabs
            value={destFilter}
            onChange={(_, v: string) => {
              setDestFilter(v);
              setSelected(new Set());
            }}
            scrollButtons="auto"
            allowScrollButtonsMobile
            sx={{
              bgcolor: '#f1f3f5',
              borderRadius: 2,
              padding: '6px 8px',
              minHeight: 40,
              mb: 3,
              maxWidth: '100%',
              '& .MuiTabs-flexContainer': { gap: 0.5 },
              '& .MuiTabs-indicator': { display: 'none' },
              '& .MuiTab-root': {
                textTransform: 'none',
                color: '#495057',
                minHeight: 36,
                py: 0.75,
                px: 1.5,
                borderRadius: 1.5,
                mx: 0.25,
                fontSize: '0.875rem',
                whiteSpace: 'nowrap',
                '&.Mui-selected': {
                  bgcolor: '#fff',
                  color: '#1976D2',
                  fontWeight: 600,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                },
              },
            }}
          >
            <Tab label={`Todos os locais (${countInTab('all')})`} value="all" />
            <Tab label={`Sem destino (${countInTab('none')})`} value="none" />
            {locationTabs.map((name) => (
              <Tab key={name} label={`${name} (${countInTab(name)})`} value={name} />
            ))}
          </ResponsiveTabs>

          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
            <TextField
              size="small"
              placeholder="Buscar produto ou lote..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
              }}
              sx={{
                bgcolor: '#fff',
                borderRadius: 2,
                flexGrow: 1,
                minWidth: { xs: 0, sm: 220 },
              }}
            />
            <TextField
              select
              size="small"
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
              sx={{ bgcolor: '#fff', borderRadius: 2, minWidth: { xs: 0, sm: 200 } }}
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
              size="small"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              sx={{ bgcolor: '#fff', borderRadius: 2, minWidth: { xs: 0, sm: 200 } }}
            >
              <MenuItem value="all">Todos os status</MenuItem>
              <MenuItem value="vencendo">Vencendo</MenuItem>
              <MenuItem value="vencidos">Vencidos</MenuItem>
              <MenuItem value="abaixo">Abaixo do mínimo</MenuItem>
              <MenuItem value="ok">OK</MenuItem>
            </TextField>
          </Box>

          {selected.size > 0 && (
            <Box
              sx={{
                ...cardSx,
                p: 1.5,
                mb: 2,
                bgcolor: '#E3F2FD',
                borderColor: '#BBDEFB',
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                flexWrap: 'wrap',
              }}
            >
              <Typography variant="body2" fontWeight={700} sx={{ color: '#1565C0' }}>
                {selected.size} etiqueta(s) selecionada(s)
              </Typography>
              <Box sx={{ ml: 'auto', display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => {
                    setBulkAction('move');
                    setBulkDest('');
                  }}
                  sx={{ textTransform: 'none', color: '#1976D2', borderColor: '#90CAF9' }}
                >
                  Mover
                </Button>
                {estoqueDelete && (
                  <Button
                    size="small"
                    variant="contained"
                    color="error"
                    onClick={() => {
                      setBulkAction('writeoff');
                      setBulkDest('');
                    }}
                    sx={{ textTransform: 'none' }}
                  >
                    Baixar
                  </Button>
                )}
                <Button
                  size="small"
                  onClick={() => setSelected(new Set())}
                  sx={{ textTransform: 'none', color: '#666' }}
                >
                  Limpar seleção
                </Button>
              </Box>
            </Box>
          )}

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
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                      {estoqueExport && (
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<DownloadIcon fontSize="small" />}
                          onClick={(e) => {
                            e.stopPropagation();
                            exportGroupItems(r);
                          }}
                          sx={{
                            textTransform: 'none',
                            color: '#495057',
                            borderColor: '#CED4DA',
                            borderRadius: 1.5,
                            flexShrink: 0,
                            '&:hover': { borderColor: '#495057', bgcolor: '#F1F3F5', color: '#212529' },
                          }}
                        >
                          Exportar itens
                        </Button>
                      )}
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
                      <ResponsiveTable
                        paper={false}
                        size="small"
                        tableSx={tableSx}
                        headerCellSx={thSx}
                        actionsLabel="Ações"
                        rows={r.items}
                        rowKey={(item) => item._id}
                        leadingHeader={
                          <SelectAllCheckbox
                            items={r.items}
                            selected={selected}
                            setSelected={setSelected}
                          />
                        }
                        mobileListHeader={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                            <SelectAllCheckbox
                              items={r.items}
                              selected={selected}
                              setSelected={setSelected}
                            />
                            <Typography variant="caption" sx={{ color: '#666' }}>
                              Selecionar todos
                            </Typography>
                          </Box>
                        }
                        leadingPadding="checkbox"
                        leading={(item) => (
                          <Checkbox
                            size="small"
                            checked={selected.has(item._id)}
                            onChange={(e) => toggleSelect(item._id, e.target.checked)}
                          />
                        )}
                        actions={
                          estoqueDelete
                            ? (item) => (
                                <IconButton
                                  size="small"
                                  onClick={() => setDeleteTarget(item._id)}
                                  sx={{ color: '#d32f2f' }}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              )
                            : undefined
                        }
                        columns={[
                          {
                            id: 'tipo',
                            header: 'Tipo',
                            cell: (item) => (
                              <Chip
                                label={item.type === 'raw' ? 'Bruto' : 'Porcionado'}
                                size="small"
                                sx={item.type === 'raw' ? chipBlue : chipGreen}
                              />
                            ),
                          },
                          {
                            id: 'peso',
                            header: 'Peso',
                            cell: (item) => formatWeight(item.weightGrams),
                          },
                          {
                            id: 'local',
                            header: 'Local',
                            cell: (item) =>
                              item.destination ? (
                                <Chip label={item.destination} size="small" sx={chipGray} />
                              ) : (
                                '—'
                              ),
                          },
                          { id: 'lote', header: 'Lote', cell: (item) => item.lote || '—' },
                          { id: 'nf', header: 'NF', cell: (item) => item.nf || '—' },
                          {
                            id: 'recebimento',
                            header: 'Recebimento',
                            cell: (item) => formatDate(item.manipulationDate),
                          },
                          {
                            id: 'validade',
                            header: 'Validade',
                            cell: (item) => formatDate(item.expiryDate),
                          },
                          {
                            id: 'status',
                            header: 'Status',
                            cell: (item) => <DaysChip expiryDate={item.expiryDate} />,
                          },
                          {
                            id: 'qr',
                            header: 'QR',
                            fullWidthOnMobile: true,
                            cell: (item) => (
                              <Typography
                                variant="caption"
                                sx={{ fontFamily: 'monospace', fontSize: 11, color: '#495057' }}
                              >
                                {item.qrCode}
                              </Typography>
                            ),
                          },
                        ]}
                      />
                    </Box>
                  </Collapse>
                </Card>
              );
            })}
          </Box>
        </>
      )}

      <Dialog
        open={bulkAction !== null}
        onClose={() => setBulkAction(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          {bulkAction === 'move' ? 'Mover etiquetas' : 'Baixar etiquetas'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: '#666', mb: 2 }}>
            {selected.size} etiqueta(s) selecionada(s).{' '}
            {bulkAction === 'move'
              ? 'Os itens permanecem no estoque e apenas mudam de local.'
              : 'As etiquetas serão excluídas do sistema.'}
          </Typography>
          <Typography variant="body2" fontWeight={600} sx={{ mb: 0.75 }}>
            Destino
          </Typography>
          <TextField
            select
            fullWidth
            size="small"
            value={bulkDest}
            onChange={(e) => setBulkDest(e.target.value)}
            SelectProps={{
              displayEmpty: true,
              renderValue: (v) =>
                v === '' ? (
                  <Box component="span" sx={{ color: 'text.disabled' }}>
                    Selecione o destino...
                  </Box>
                ) : (
                  String(v)
                ),
            }}
          >
            <MenuItem value="" disabled>
              Selecione o destino...
            </MenuItem>
            {(bulkAction === 'move' ? moveDestinations : writeoffDestinations).map((d) => (
              <MenuItem key={d} value={d}>
                {d}
              </MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1.5 }}>
          <Button
            onClick={() => setBulkAction(null)}
            variant="outlined"
            sx={{
              textTransform: 'none',
              color: '#444',
              borderColor: '#e0e0e0',
              bgcolor: '#fff',
            }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            color={bulkAction === 'writeoff' ? 'error' : 'primary'}
            disabled={!bulkDest || bulkBusy}
            onClick={() => void handleBulkConfirm()}
            sx={{ textTransform: 'none' }}
          >
            {bulkAction === 'move'
              ? `Mover ${selected.size} etiqueta(s)`
              : `Baixar ${selected.size} etiqueta(s)`}
          </Button>
        </DialogActions>
      </Dialog>

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
