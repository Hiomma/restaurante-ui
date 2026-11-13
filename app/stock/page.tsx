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
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import {
  useProducts,
  useStockItems,
  useDeleteStockItem,
  useMovementDestinations,
  useCreateStockMovement,
  useUpdateStockItem,
  useMe,
} from '@/lib/queries';
import { formatDate, formatKg, formatWeight, daysUntil, lifeStatus, todayISODate, downloadCsv } from '@/lib/utils';
import { useAccess } from '@/lib/permissions';
import type { StockItem } from '@/types';
import LoggedLayout from '../components/LoggedLayout/LoggedLayout';
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

/** Célula da tabela da conferência de estoque (impressão). */
const confTdStyle: React.CSSProperties = {
  borderBottom: '1px solid #ccc',
  padding: '3px 6px',
  fontSize: 12,
};

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
  const { data: me } = useMe();
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
  const [deleteDest, setDeleteDest] = useState('');
  const [deletePartial, setDeletePartial] = useState(false);
  const [deletePartialWeight, setDeletePartialWeight] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<'move' | 'writeoff' | null>(null);
  const [bulkDest, setBulkDest] = useState('');
  const [kpiFilter, setKpiFilter] = useState<KpiFilterState>({ life: 'all', type: 'all' });
  const [pdfOpen, setPdfOpen] = useState(false);
  const [conferenceAt, setConferenceAt] = useState('');

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
  const searchQuery = search.trim().toLowerCase();

  /**
   * Busca NO ITEM (produto OU lote OU QR da etiqueta): o nome casa para
   * todas as etiquetas do produto; o lote casa SOMENTE para as etiquetas
   * daquele lote; o QR casa só naquela etiqueta.
   */
  const matchesSearch = (item: StockItem): boolean => {
    if (!searchQuery) return true;
    const name =
      (products ?? []).find((p) => p._id === item.product.productId)?.name ??
      item.product.productName;
    if (name.toLowerCase().includes(searchQuery)) return true;
    if ((item.qrCode ?? '').toLowerCase().includes(searchQuery)) return true;
    const lote = (item.lote ?? '').toLowerCase();
    if (!lote) return false;
    return lote.includes(searchQuery) || `lote ${lote}`.includes(searchQuery);
  };

  const visibleItems = inStock.filter(passesKpiFilter).filter(matchesSearch);

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

  const filteredRows = rows
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

  /**
   * Exporta os itens em estoque SEPARADOS POR LOCAL (cada local com apenas
   * os seus itens). Com uma aba de local ativa, exporta só aquele local;
   * em "Todos os locais", une todos os locais em blocos separados.
   */
  const exportAllStock = () => {
    const headers = [
      'Local',
      'Produto',
      'Tipo',
      'Código (QR)',
      'Lote',
      'Validade',
      'Peso (g)',
      'NF',
      'Fornecedor',
    ];

    const inScope = allItems.filter((i) => {
      if (i.status !== 'in_stock') return false;
      if (destFilter === 'all') return true;
      if (destFilter === 'none') return !i.destination;
      return i.destination === destFilter;
    });

    // Ordem dos blocos: "Sem destino" primeiro, depois os locais das abas.
    const locationOrder = ['Sem destino', ...locationTabs];
    const byLocation = new Map<string, StockItem[]>();
    for (const item of inScope) {
      const local = item.destination || 'Sem destino';
      const arr = byLocation.get(local);
      if (arr) arr.push(item);
      else byLocation.set(local, [item]);
    }
    const orderedLocations = [
      ...locationOrder.filter((l) => byLocation.has(l)),
      ...Array.from(byLocation.keys()).filter((l) => !locationOrder.includes(l)),
    ];

    const safeName = (destFilter === 'all' ? 'por-local' : destFilter)
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .replace(/[^\w-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase();

    const rowsOut: (string | number)[][] = [];
    for (const local of orderedLocations) {
      const localItems = byLocation.get(local) ?? [];
      // Cabeçalho do bloco deixa o local explícito na planilha.
      rowsOut.push([`LOCAL: ${local} (${localItems.length} etiqueta(s))`]);
      for (const item of localItems) {
        rowsOut.push([
          local,
          item.product.productName,
          item.type === 'raw' ? 'Bruto' : 'Porcionado',
          item.qrCode || '',
          item.lote || '',
          formatDate(item.expiryDate),
          item.weightGrams,
          item.nf || '',
          item.supplier || '—',
        ]);
      }
      rowsOut.push([]);
    }

    downloadCsv(`estoque-${safeName}`, headers, rowsOut);
  };

  const handleDelete = async () => {
    if (!deleteTarget || !deleteDest) return;
    const item = allItems.find((i) => i._id === deleteTarget);
    if (!item) return;

    const partialGrams = Number(deletePartialWeight);
    if (
      deletePartial &&
      (!partialGrams || partialGrams <= 0 || partialGrams >= item.weightGrams)
    ) {
      enqueueSnackbar('Informe um peso de baixa menor que o peso da etiqueta.', {
        variant: 'error',
      });
      return;
    }

    try {
      if (deletePartial) {
        // Descarte PARCIAL: mede o desperdício em peso; a etiqueta continua
        // no estoque com o restante.
        const restante = item.weightGrams - partialGrams;
        await createMovement.mutateAsync({
          productId: item.product.productId,
          productName: item.product.productName,
          movementType: 'exit',
          quantity: 1,
          weightGrams: partialGrams,
          itemType: item.type,
          destination: deleteDest,
          lote: item.lote,
          reason: `Baixar parcial — ${partialGrams}g de ${item.weightGrams}g — ${deleteDest}`,
          date: todayISODate(),
        });
        await updateItem.mutateAsync({ id: item._id, data: { weightGrams: restante } });
        enqueueSnackbar(
          `Baixa parcial: ${partialGrams}g — ${deleteDest}. Restante na etiqueta: ${restante}g.`,
          { variant: 'success' },
        );
      } else {
        // Descarte TOTAL: movimento de baixa + exclusão com destino no tombstone.
        await createMovement.mutateAsync({
          productId: item.product.productId,
          productName: item.product.productName,
          movementType: 'exit',
          quantity: 1,
          weightGrams: item.weightGrams,
          itemType: item.type,
          destination: deleteDest,
          lote: item.lote,
          reason: `Baixar — ${deleteDest}`,
          date: todayISODate(),
        });
        await deleteItem.mutateAsync({ id: deleteTarget, destination: deleteDest });
        enqueueSnackbar(`Etiqueta baixada — ${deleteDest}.`, { variant: 'success' });
      }
      setDeleteTarget(null);
      setDeleteDest('');
      setDeletePartial(false);
      setDeletePartialWeight('');
    } catch {
      enqueueSnackbar('Erro ao excluir etiqueta.', { variant: 'error' });
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

  // O alerta "Comprar" (chip, cor da linha e indicadores de mínimo) só
  // aparece na aba "Todos os locais"; nas demais abas mantém-se apenas a
  // quantidade bruta e porcionada por local.
  const showBuy = destFilter === 'all';

  // Contagem por local: usa a base com os filtros de KPI aplicados (reflete
  // "onde estão" os itens filtrados), mantendo cada aba com a contagem do
  // próprio local, independente da aba selecionada.
  const countInTab = (tab: string) =>
    kpiFilteredStock.filter(
      (i) =>
        tab === 'all' ? true : tab === 'none' ? !i.destination : i.destination === tab,
    ).length;

  const selectedItems = allItems.filter((i) => selected.has(i._id) && i.status === 'in_stock');
  /** Etiqueta-alvo do diálogo de exclusão (para validar a baixa parcial). */
  const deleteTargetRow = allItems.find((i) => i._id === deleteTarget);
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
            lote: item.lote,
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
            destination: bulkDest,
            lote: item.lote,
            reason: `Baixar — ${bulkDest}`,
            date: todayISODate(),
          });
          await deleteItem.mutateAsync({ id: item._id, destination: bulkDest });
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

  /**
   * Itens da conferência POR LOCAL: cada bloco traz apenas os itens daquele
   * estoque. Com uma aba de local ativa, a conferência sai só para aquele
   * local; em "Todos os locais", um bloco por localidade.
   */
  const conferenceGroups =
    destFilter === 'all'
      ? [
          {
            name: 'Sem destino',
            items: allItems.filter((i) => i.status === 'in_stock' && !i.destination),
          },
          ...locationTabs.map((name) => ({
            name,
            items: allItems.filter(
              (i) => i.status === 'in_stock' && i.destination === name,
            ),
          })),
        ]
      : destFilter === 'none'
        ? [
            {
              name: 'Sem destino',
              items: allItems.filter((i) => i.status === 'in_stock' && !i.destination),
            },
          ]
        : [
            {
              name: destFilter,
              items: allItems.filter(
                (i) => i.status === 'in_stock' && i.destination === destFilter,
              ),
            },
          ];

  /**
   * Imprime a conferência: a área fica no DOM (filha de main) e a classe
   * `printing-conference` faz o CSS imprimir somente ela — o usuário escolhe
   * "Salvar como PDF" no diálogo do navegador.
   */
  const printConference = async () => {
    const removeClass = () => document.body.classList.remove('printing-conference');
    window.addEventListener('afterprint', removeClass, { once: true });
    document.body.classList.add('printing-conference');
    try {
      await new Promise((r) => setTimeout(r, 250));
      window.print();
    } finally {
      window.removeEventListener('afterprint', removeClass);
      removeClass();
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
              placeholder="Buscar por produto, lote ou QR..."
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

            <Box sx={{ ml: 'auto', display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {estoqueExport && (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<DownloadIcon fontSize="small" />}
                  onClick={exportAllStock}
                  sx={{
                    textTransform: 'none',
                    color: '#495057',
                    borderColor: '#CED4DA',
                    bgcolor: '#fff',
                    borderRadius: 2,
                    '&:hover': { borderColor: '#495057', bgcolor: '#F1F3F5' },
                  }}
                >
                  Exportar todos os itens
                </Button>
              )}
              <Button
                size="small"
                variant="outlined"
                startIcon={<PictureAsPdfIcon fontSize="small" />}
                onClick={() => {
                  setConferenceAt(new Date().toLocaleString('pt-BR'));
                  setPdfOpen(true);
                }}
                sx={{
                  textTransform: 'none',
                  color: '#C62828',
                  borderColor: '#F0C0C0',
                  bgcolor: '#fff',
                  borderRadius: 2,
                  '&:hover': { borderColor: '#C62828', bgcolor: '#FFEBEE' },
                }}
              >
                Conferência PDF
              </Button>
            </Box>
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
                      bgcolor: showBuy && r.belowMin ? '#FDECEC' : 'transparent',
                      '&:hover': { bgcolor: showBuy && r.belowMin ? '#FBE4E4' : '#f9fafb' },
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
                        {showBuy && r.belowMin && (
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
                        {showBuy && r.minQuantity > 0 && (
                          <Typography
                            variant="body2"
                            fontWeight={700}
                            sx={{ color: r.totalWeight < r.minQuantity ? '#C62828' : '#2E7D32' }}
                          >
                            {r.totalWeight}/{r.minQuantity} min.
                          </Typography>
                        )}
                        {showBuy && r.minPortionedQuantity > 0 && (
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
                                  onClick={() => {
                                    setDeleteDest('');
                                    setDeletePartial(false);
                                    setDeletePartialWeight('');
                                    setDeleteTarget(item._id);
                                  }}
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

      <Dialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Excluir Etiqueta</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: '#666', mb: 2 }}>
            A etiqueta será excluída do sistema (ou parcialmente baixada). Informe o
            destino da baixa — ele é obrigatório e fica registrado no histórico.
          </Typography>
          <Typography variant="body2" fontWeight={600} sx={{ mb: 0.75 }}>
            Destino *
          </Typography>
          <TextField
            select
            fullWidth
            size="small"
            value={deleteDest}
            onChange={(e) => setDeleteDest(e.target.value)}
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
            {writeoffDestinations.map((d) => (
              <MenuItem key={d} value={d}>
                {d}
              </MenuItem>
            ))}
          </TextField>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
            <Checkbox
              size="small"
              checked={deletePartial}
              onChange={(e) => {
                setDeletePartial(e.target.checked);
                setDeletePartialWeight('');
              }}
            />
            <Typography variant="body2" fontWeight={600}>
              Baixa parcial (apenas parte do peso)
            </Typography>
            {deleteTargetRow && (
              <Typography variant="caption" color="text.secondary">
                (etiqueta: {deleteTargetRow.weightGrams}g)
              </Typography>
            )}
          </Box>
          {deletePartial && deleteTargetRow && (
            <Box sx={{ mt: 1 }}>
              <TextField
                type="number"
                fullWidth
                size="small"
                placeholder={`Peso a baixar em g (máx. ${deleteTargetRow.weightGrams - 1}g)`}
                value={deletePartialWeight}
                onChange={(e) => setDeletePartialWeight(e.target.value)}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1.5 }}>
          <Button
            onClick={() => setDeleteTarget(null)}
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
            color="error"
            disabled={
              !deleteDest ||
              (deletePartial &&
                (!Number(deletePartialWeight) ||
                  Number(deletePartialWeight) <= 0 ||
                  (deleteTargetRow &&
                    Number(deletePartialWeight) >= deleteTargetRow.weightGrams))) ||
              deleteItem.isPending ||
              createMovement.isPending ||
              updateItem.isPending
            }
            onClick={handleDelete}
            sx={{ textTransform: 'none' }}
          >
            {deletePartial ? 'Dar baixa parcial' : 'Excluir'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={pdfOpen} onClose={() => setPdfOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            pb: 1,
          }}
        >
          Conferência de Estoque (PDF)
          <IconButton
            aria-label="fechar"
            onClick={() => setPdfOpen(false)}
            size="small"
            sx={{ color: '#666', mr: -1 }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: '#666', mb: 1.5 }}>
            Documento com os itens de cada local, separados por estoque (com uma aba de
            local ativa, apenas os itens daquele local), com data/hora e campo de
            assinatura do funcionário que está recebendo. No diálogo de impressão,
            escolha &quot;Salvar como PDF&quot;.
          </Typography>
          <Typography variant="body2" sx={{ mb: 0.5 }}>
            Responsável: <b>{me?.name || '—'}</b>
          </Typography>
          <Typography variant="body2" sx={{ mb: 1.5 }}>
            Data/hora: <b>{conferenceAt}</b>
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
            {conferenceGroups.map((g) => (
              <Chip
                key={g.name}
                label={`${g.name}: ${g.items.length} etiqueta(s)`}
                size="small"
                sx={{ bgcolor: '#F1F3F5', color: '#495057', fontWeight: 600 }}
              />
            ))}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1.5 }}>
          <Button
            onClick={() => setPdfOpen(false)}
            variant="outlined"
            sx={{
              textTransform: 'none',
              color: '#444',
              borderColor: '#e0e0e0',
              bgcolor: '#fff',
            }}
          >
            Fechar
          </Button>
          <Button
            variant="contained"
            startIcon={<PictureAsPdfIcon fontSize="small" />}
            onClick={() => void printConference()}
            sx={{ textTransform: 'none' }}
          >
            Imprimir / Salvar PDF
          </Button>
        </DialogActions>
      </Dialog>

      {/* Área da conferência: só aparece na impressão (classe printing-conference). */}
      {pdfOpen && (
        <Box
          className="conferencia-print-area"
          sx={{ p: 2, bgcolor: '#fff' }}
        >
          <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>
            Conferência de Estoque — {me?.company?.name || 'Restaurante'}
          </Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Emitido em {conferenceAt} — Responsável: {me?.name || '—'}
          </Typography>
          {conferenceGroups.map((group) => (
            <Box key={group.name} sx={{ mb: 2.5 }}>
              <Typography variant="subtitle1" fontWeight={700}>
                {group.name} ({group.items.length})
              </Typography>
              {group.items.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Nenhuma etiqueta
                </Typography>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['Produto', 'Tipo', 'Peso', 'Lote', 'Validade', 'QR'].map((h) => (
                        <th
                          key={h}
                          style={{
                            borderBottom: '2px solid #000',
                            textAlign: 'left',
                            padding: '4px 6px',
                            fontSize: 12,
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {group.items.map((item) => (
                      <tr key={item._id}>
                        <td style={confTdStyle}>{item.product.productName}</td>
                        <td style={confTdStyle}>
                          {item.type === 'raw' ? 'Bruto' : 'Porcionado'}
                        </td>
                        <td style={confTdStyle}>{formatWeight(item.weightGrams)}</td>
                        <td style={confTdStyle}>{item.lote || '—'}</td>
                        <td style={confTdStyle}>{formatDate(item.expiryDate)}</td>
                        <td style={{ ...confTdStyle, fontFamily: 'monospace' }}>
                          {item.qrCode}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Box>
          ))}
          <Box sx={{ mt: 4 }}>
            <Typography variant="body2" fontWeight={700}>
              Assinatura do funcionário que está recebendo o estoque:
            </Typography>
            <Box
              sx={{
                borderBottom: '1.5px solid #000',
                width: { xs: '100%', sm: '60%' },
                height: 48,
                mt: 4,
              }}
            />
            <Typography variant="caption" sx={{ color: '#555' }}>
              Nome e assinatura
            </Typography>
          </Box>
        </Box>
      )}
    </LoggedLayout>
  );
}
