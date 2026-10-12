'use client';

import { useState, type ReactNode } from 'react';
import {
  Box,
  Typography,
  Button,
  Chip,
  Tabs,
  Tab,
  TextField,
  MenuItem,
  InputAdornment,
  CircularProgress,
} from '@mui/material';
import BarChartIcon from '@mui/icons-material/BarChart';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import InventoryIcon from '@mui/icons-material/Inventory';
import ContentCutIcon from '@mui/icons-material/ContentCut';
import FilterListIcon from '@mui/icons-material/FilterList';
import SearchIcon from '@mui/icons-material/Search';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import DownloadIcon from '@mui/icons-material/Download';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ScaleIcon from '@mui/icons-material/Scale';
import PercentIcon from '@mui/icons-material/Percent';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import ScheduleIcon from '@mui/icons-material/Schedule';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { BarChart } from '@mui/x-charts/BarChart';
import {
  formatWeight,
  formatKg,
  formatDate,
  daysUntil,
  lifeStatus,
  downloadCsv,
  printReport,
} from '@/lib/utils';
import {
  useProducts,
  useStockItems,
  useStockMovements,
  usePortionings,
} from '@/lib/queries';
import type { Product, StockItem, StockMovement, Portioning } from '@/types';
import LoggedLayout from '../components/LoggedLayout/LoggedLayout';
import BrDateField from '../components/BrDateField/BrDateField';
import ResponsiveTable from '../components/ResponsiveTable/ResponsiveTable';

const cardSx = {
  bgcolor: '#fff',
  borderRadius: 2,
  border: '1px solid #e8ecf1',
} as const;

const toolbarSx = {
  ...cardSx,
  display: 'flex',
  alignItems: 'center',
  gap: 1.5,
  flexWrap: 'wrap',
  p: 1.5,
  mb: 2,
} as const;

const thSx = {
  bgcolor: '#f5f7fa',
  fontWeight: 700,
  whiteSpace: 'nowrap',
} as const;

const rowRedSx = { bgcolor: '#FFF5F5' } as const;

const kpiGrid4 = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', xl: 'repeat(4, 1fr)' },
  gap: 2,
  mb: 2,
} as const;

const kpiGrid5 = {
  display: 'grid',
  gridTemplateColumns: {
    xs: '1fr',
    sm: '1fr 1fr',
    lg: 'repeat(3, 1fr)',
    xl: 'repeat(5, 1fr)',
  },
  gap: 2,
  mb: 2,
} as const;

const chipTones = {
  green: { bgcolor: '#E8F5E9', color: '#2E7D32' },
  red: { bgcolor: '#FFEBEE', color: '#C62828' },
  amber: { bgcolor: '#FFF3E0', color: '#E65100' },
  gray: { bgcolor: '#F1F3F5', color: '#495057' },
  blue: { bgcolor: '#E3F2FD', color: '#1565C0' },
} as const;

type ChipTone = keyof typeof chipTones;

type BuyStatus = 'comprar' | 'sem' | 'ok';

type ProductAgg = {
  product: Product;
  allItems: StockItem[];
  items: StockItem[];
  weight: number;
  rawCount: number;
  portionedCount: number;
  count: number;
};

type LossAgg = {
  loss: number;
  raw: number;
  count: number;
};

const REPORT_TAB_NAMES = [
  'Perdas',
  'Compras',
  'Recebimento',
  'Movimentações',
  'Estoque',
  'Produção',
];

const comprasStatusOptions = [
  { value: '', label: 'Todos os status' },
  { value: 'comprar', label: 'Comprar' },
  { value: 'ok', label: 'OK' },
  { value: 'sem', label: 'Sem mínimo' },
];

const prodStatusOptions = [
  { value: '', label: 'Todos os status' },
  { value: 'below', label: 'Abaixo do mínimo' },
  { value: 'ok', label: 'OK' },
  { value: 'sem', label: 'Sem mínimo' },
];

const movTypeOptions = [
  { value: '', label: 'Todos os tipos' },
  { value: 'entry', label: 'Entrada' },
  { value: 'exit', label: 'Saída' },
  { value: 'move', label: 'Mover' },
];

const estStatusOptions = [
  { value: '', label: 'Todos os status' },
  { value: 'in_stock', label: 'Em estoque' },
  { value: 'expiring', label: 'Vencendo na semana' },
  { value: 'expired', label: 'Vencidos' },
  { value: 'used', label: 'Utilizados' },
  { value: 'discarded', label: 'Descartados' },
];

const recvStatusLabel: Record<StockItem['status'], string> = {
  in_stock: 'Em estoque',
  used: 'utilizado',
  discarded: 'descartado',
  expired: 'vencido',
};

const fmtG = (grams: number) =>
  `${new Intl.NumberFormat('pt-BR').format(Math.round(grams))}g`;

function buyStatusOf(product: Product, weight: number): BuyStatus {
  if (!product.minQuantity) return 'sem';
  return weight < product.minQuantity ? 'comprar' : 'ok';
}

function recvStatusChip(status: StockItem['status']) {
  const tone: ChipTone =
    status === 'in_stock' ? 'green' : status === 'used' ? 'gray' : 'red';
  return <ToneChip label={recvStatusLabel[status]} tone={tone} />;
}

function movementTypeChip(type: StockMovement['movementType']) {
  if (type === 'move') return <ToneChip label="Mover" tone="blue" />;
  return type === 'entry' ? (
    <ToneChip label="Entrada" tone="green" />
  ) : (
    <ToneChip label="Saída" tone="amber" />
  );
}

function ToneChip({ label, tone }: { label: string; tone: ChipTone }) {
  return (
    <Chip
      label={label}
      size="small"
      sx={{ ...chipTones[tone], fontWeight: 600, borderRadius: 1 }}
    />
  );
}

function SolidRedChip({
  label,
  withWarning = false,
}: {
  label: string;
  withWarning?: boolean;
}) {
  return (
    <Chip
      label={label}
      size="small"
      icon={withWarning ? <WarningAmberIcon /> : undefined}
      sx={{
        bgcolor: '#E53935',
        color: '#fff',
        fontWeight: 600,
        borderRadius: 1,
        '& .MuiChip-icon': { color: '#fff' },
      }}
    />
  );
}

function KpiCard({
  label,
  value,
  caption,
  icon,
  iconBg,
  iconColor,
}: {
  label: string;
  value: string | number;
  caption?: string;
  icon: ReactNode;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <Box sx={{ ...cardSx, p: 2, display: 'flex', alignItems: 'center', gap: 1.75 }}>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="body2" color="text.secondary" noWrap>
          {label}
        </Typography>
        <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.25 }}>
          {value}
        </Typography>
        {caption && (
          <Typography variant="caption" color="text.secondary">
            {caption}
          </Typography>
        )}
      </Box>
      <Box
        sx={{
          width: 44,
          height: 44,
          borderRadius: 1.5,
          bgcolor: iconBg,
          color: iconColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {icon}
      </Box>
    </Box>
  );
}

function ExportButtons({
  onExcel,
  onPdf,
}: {
  onExcel: () => void;
  onPdf?: () => void;
}) {
  const neutralSx = {
    color: '#495057',
    borderColor: '#CED4DA',
    textTransform: 'none',
    borderRadius: 1.5,
    '&:hover': { borderColor: '#495057', bgcolor: '#F1F3F5', color: '#212529' },
  } as const;
  return (
    <Box sx={{ display: 'flex', gap: 1 }} className="no-print">
      <Button
        variant="outlined"
        size="small"
        startIcon={<DownloadIcon fontSize="small" />}
        onClick={onExcel}
        sx={neutralSx}
      >
        Excel
      </Button>
      {onPdf && (
        <Button
          variant="outlined"
          size="small"
          startIcon={<PictureAsPdfIcon fontSize="small" />}
          onClick={onPdf}
          sx={neutralSx}
        >
          PDF
        </Button>
      )}
    </Box>
  );
}

function WeightPair({
  grams,
  tone = 'default',
}: {
  grams?: number | null;
  tone?: 'default' | 'amber';
}) {
  if (grams === undefined || grams === null) {
    return <Typography color="text.secondary">—</Typography>;
  }
  return (
    <Typography component="span" variant="body2" sx={{ whiteSpace: 'nowrap' }}>
      <Box
        component="span"
        sx={{ fontWeight: 700, color: tone === 'amber' ? '#E65100' : 'inherit' }}
      >
        {grams}g
      </Box>
      <Box component="span" sx={{ color: 'text.secondary', ml: 0.5 }}>
        ({formatKg(grams)})
      </Box>
    </Typography>
  );
}

function SearchField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <TextField
      size="small"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      sx={{ width: { xs: '100%', sm: 'auto' }, minWidth: { xs: 0, sm: 250 } }}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon fontSize="small" />
          </InputAdornment>
        ),
      }}
    />
  );
}

function SelectFilter({
  value,
  onChange,
  options,
  minWidth = 170,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  minWidth?: number;
}) {
  return (
    <TextField
      select
      size="small"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      sx={{ width: { xs: '100%', sm: 'auto' }, minWidth: { xs: 0, sm: minWidth } }}
      SelectProps={{
        displayEmpty: true,
        renderValue: (v) => options.find((o) => o.value === v)?.label ?? '',
      }}
    >
      {options.map((o) => (
        <MenuItem key={o.value} value={o.value}>
          {o.label}
        </MenuItem>
      ))}
    </TextField>
  );
}

function DateRangeField({
  from,
  to,
  onFrom,
  onTo,
}: {
  from: string;
  to: string;
  onFrom: (v: string) => void;
  onTo: (v: string) => void;
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        flexWrap: 'wrap',
        minWidth: 0,
      }}
    >
      <CalendarTodayIcon sx={{ color: '#1976D2', fontSize: 18, flexShrink: 0 }} />
      <Box
        sx={{
          minWidth: 0,
          flex: { xs: '1 1 120px', sm: '0 1 auto' },
          '& .MuiTextField-root': { width: { xs: '100%', sm: 'auto' } },
        }}
      >
        <BrDateField
          value={from}
          onChange={onFrom}
          fullWidth={false}
        />
      </Box>
      <Typography variant="body2" color="text.secondary">
        até
      </Typography>
      <Box
        sx={{
          minWidth: 0,
          flex: { xs: '1 1 120px', sm: '0 1 auto' },
          '& .MuiTextField-root': { width: { xs: '100%', sm: 'auto' } },
        }}
      >
        <BrDateField
          value={to}
          onChange={onTo}
          fullWidth={false}
        />
      </Box>
    </Box>
  );
}

export default function ReportsPage() {
  const [tab, setTab] = useState(0);

  const { data: products = [], isLoading: lp } = useProducts();
  const { data: stockItems = [], isLoading: li } = useStockItems();
  const { data: movements = [], isLoading: lm } = useStockMovements();
  const { data: portionings = [], isLoading: lt } = usePortionings();

  const [perdasGroup, setPerdasGroup] = useState('');
  const [perdasFrom, setPerdasFrom] = useState('');
  const [perdasTo, setPerdasTo] = useState('');

  const [comprasSearch, setComprasSearch] = useState('');
  const [comprasGroup, setComprasGroup] = useState('');
  const [comprasStatus, setComprasStatus] = useState('');

  const [recvSearch, setRecvSearch] = useState('');
  const [recvFrom, setRecvFrom] = useState('');
  const [recvTo, setRecvTo] = useState('');

  const [movSearch, setMovSearch] = useState('');
  const [movType, setMovType] = useState('');
  const [movFrom, setMovFrom] = useState('');
  const [movTo, setMovTo] = useState('');

  const [estSearch, setEstSearch] = useState('');
  const [estGroup, setEstGroup] = useState('');
  const [estStatus, setEstStatus] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const [prodSearch, setProdSearch] = useState('');
  const [prodGroup, setProdGroup] = useState('');
  const [prodStatus, setProdStatus] = useState('');

  const productMap = new Map(products.map((p) => [p._id, p]));
  const groups = Array.from(new Set(products.map((p) => p.group))).sort((a, b) =>
    a.localeCompare(b, 'pt-BR'),
  );
  const groupOptions = [
    { value: '', label: 'Todos os grupos' },
    ...groups.map((g) => ({ value: g, label: g })),
  ];

  const inStockItems = stockItems.filter((i) => i.status === 'in_stock');
  const rawInStockItems = inStockItems.filter((i) => i.type === 'raw');
  const portionedInStock = inStockItems.filter((i) => i.type === 'portioned');
  const rawInStockWeight = rawInStockItems.reduce((s, i) => s + i.weightGrams, 0);
  const portionedInStockWeight = portionedInStock.reduce((s, i) => s + i.weightGrams, 0);

  const aggs: ProductAgg[] = products.map((product) => {
    const allItems = stockItems.filter((i) => i.product.productId === product._id);
    const items = allItems.filter((i) => i.status === 'in_stock');
    let weight = 0;
    let rawCount = 0;
    let portionedCount = 0;
    for (const item of items) {
      weight += item.weightGrams;
      if (item.type === 'raw') rawCount += 1;
      else portionedCount += 1;
    }
    return { product, allItems, items, weight, rawCount, portionedCount, count: items.length };
  });

  const latestPortioning = new Map<string, Portioning>();
  for (const pt of portionings) {
    const prev = latestPortioning.get(pt.product.productId);
    if (!prev || pt.date >= prev.date) latestPortioning.set(pt.product.productId, pt);
  }

  // Separa os itens por categoria do cadastro do produto:
  // "Materia Prima" (ou sem categoria cadastrada) entra em Compras;
  // "Porcionado" entra em Produção. Produtos antigos sem categoria
  // continuam aparecendo nas duas abas, como antes.
  const isPurchaseProduct = (p: Product) => p.category !== 'Porcionado';
  const isProductionProduct = (p: Product) => p.category === 'Porcionado' || !p.category;

  const filteredPerdas = portionings.filter((pt) => {
    if (perdasGroup) {
      const group = productMap.get(pt.product.productId)?.group ?? '';
      if (group !== perdasGroup) return false;
    }
    if (perdasFrom && perdasTo) {
      const d = pt.date.slice(0, 10);
      if (d < perdasFrom || d > perdasTo) return false;
    }
    return true;
  });

  let rawSum = 0;
  let cleanSum = 0;
  let lossSum = 0;
  for (const pt of filteredPerdas) {
    rawSum += pt.rawWeightGrams;
    cleanSum += pt.cleanWeightGrams;
    lossSum += pt.lossGrams;
  }
  const generalLossPct = rawSum > 0 ? (lossSum / rawSum) * 100 : 0;

  const groupLossMap = new Map<string, LossAgg>();
  const productLossMap = new Map<string, LossAgg & { name: string }>();
  for (const pt of filteredPerdas) {
    const g = productMap.get(pt.product.productId)?.group ?? 'Outros';
    const cur = groupLossMap.get(g) ?? { loss: 0, raw: 0, count: 0 };
    cur.loss += pt.lossGrams;
    cur.raw += pt.rawWeightGrams;
    cur.count += 1;
    groupLossMap.set(g, cur);

    const key = pt.product.productId;
    const curP = productLossMap.get(key) ?? {
      name: pt.product.productName,
      loss: 0,
      raw: 0,
      count: 0,
    };
    curP.loss += pt.lossGrams;
    curP.raw += pt.rawWeightGrams;
    curP.count += 1;
    productLossMap.set(key, curP);
  }

  const groupLossRows = Array.from(groupLossMap.entries())
    .map(([group, v]) => ({
      group,
      loss: v.loss,
      raw: v.raw,
      count: v.count,
      pct: v.raw > 0 ? (v.loss / v.raw) * 100 : 0,
    }))
    .sort((a, b) => b.loss - a.loss);

  const productLossRows = Array.from(productLossMap.entries())
    .map(([productId, v]) => ({
      productId,
      name: v.name,
      loss: v.loss,
      raw: v.raw,
      count: v.count,
      pct: v.raw > 0 ? (v.loss / v.raw) * 100 : 0,
    }))
    .sort((a, b) => b.loss - a.loss);

  const perdasHistory = [...filteredPerdas].sort((a, b) => b.date.localeCompare(a.date));

  const exportPerdas = () => {
    downloadCsv(
      'relatorio-perdas',
      ['Data', 'Produto', 'Bruto (g)', 'Limpo (g)', 'Perda (g)', '% Perda'],
      perdasHistory.map((p) => [
        formatDate(p.date),
        p.product.productName,
        p.rawWeightGrams,
        p.cleanWeightGrams,
        p.lossGrams,
        (p.lossPercentage ?? 0).toFixed(1),
      ]),
    );
  };

  const comprasRank: Record<BuyStatus, number> = { comprar: 0, sem: 1, ok: 2 };
  const comprasRows = aggs
    .filter((a) => isPurchaseProduct(a.product))
    .map((a) => ({
      product: a.product,
      count: a.count,
      weight: a.weight,
      status: buyStatusOf(a.product, a.weight),
    }))
    .filter((r) => {
      const q = comprasSearch.trim().toLowerCase();
      if (q && !r.product.name.toLowerCase().includes(q)) return false;
      if (comprasGroup && r.product.group !== comprasGroup) return false;
      if (comprasStatus && r.status !== comprasStatus) return false;
      return true;
    })
    .sort(
      (a, b) =>
        comprasRank[a.status] - comprasRank[b.status] ||
        a.product.name.localeCompare(b.product.name, 'pt-BR'),
    );

  const exportCompras = () => {
    downloadCsv(
      'relatorio-compras',
      ['Produto', 'Grupo', 'Armazenamento', 'Etiquetas', 'Peso Estoque (g)', 'Mínimo (g)', 'Status'],
      comprasRows.map((r) => [
        r.product.name,
        r.product.group,
        r.product.storageMethod,
        r.count,
        r.weight,
        r.product.minQuantity || 0,
        r.status === 'sem'
          ? 'Sem mínimo'
          : r.status === 'comprar'
            ? `Comprar (falta ${fmtG(r.product.minQuantity - r.weight)})`
            : `OK (+${fmtG(r.weight - r.product.minQuantity)})`,
      ]),
    );
  };

  const recvItems = stockItems
    .filter((i) => i.type === 'raw')
    .filter((i) => {
      const q = recvSearch.trim().toLowerCase();
      if (q && !i.product.productName.toLowerCase().includes(q)) return false;
      const d = (i.manipulationDate || i.createdAt).slice(0, 10);
      if (recvFrom && d < recvFrom) return false;
      if (recvTo && d > recvTo) return false;
      return true;
    })
    .sort((a, b) =>
      (b.manipulationDate || b.createdAt).localeCompare(a.manipulationDate || a.createdAt),
    );

  const exportRecebimento = () => {
    downloadCsv(
      'relatorio-recebimento',
      ['Data', 'Produto', 'Grupo', 'Peso (g)', 'Validade', 'QR', 'Lote', 'NF', 'Funcionário', 'Status'],
      recvItems.map((i) => [
        formatDate(i.manipulationDate || i.createdAt),
        i.product.productName,
        i.product.productGroup || '',
        i.weightGrams,
        formatDate(i.expiryDate),
        i.qrCode || '',
        i.lote || '',
        i.nf || '',
        i.employeeName || '',
        recvStatusLabel[i.status],
      ]),
    );
  };

  const movRows = movements
    .filter((m) => {
      const q = movSearch.trim().toLowerCase();
      if (
        q &&
        !m.product.productName.toLowerCase().includes(q) &&
        !(m.reason ?? '').toLowerCase().includes(q)
      ) {
        return false;
      }
      if (movType && m.movementType !== movType) return false;
      const d = m.date.slice(0, 10);
      if (movFrom && d < movFrom) return false;
      if (movTo && d > movTo) return false;
      return true;
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  const exportMovimentacoes = () => {
    downloadCsv(
      'relatorio-movimentacoes',
      ['Data', 'Tipo', 'Produto', 'Qtd. Itens', 'Peso Total (g)', 'Tipo Item', 'Destino/Motivo'],
      movRows.map((m) => [
        formatDate(m.date),
        m.movementType === 'entry'
          ? 'Entrada'
          : m.movementType === 'move'
            ? 'Mover'
            : 'Saída',
        m.product.productName,
        m.quantity,
        m.weightGrams ?? 0,
        m.itemType === 'raw' ? 'Bruto' : m.itemType === 'portioned' ? 'Porcionado' : '',
        m.reason || '',
      ]),
    );
  };

  const stockExpiring = inStockItems.filter((i) => lifeStatus(i) === 'expiring').length;
  const stockExpired = inStockItems.filter((i) => lifeStatus(i) === 'expired').length;
  const needBuy = aggs.filter(
    (a) => a.product.minQuantity > 0 && a.weight < a.product.minQuantity,
  ).length;

  const matchesEstStatus = (a: ProductAgg): boolean => {
    if (!estStatus) return true;
    if (estStatus === 'in_stock') return a.allItems.some((i) => i.status === 'in_stock');
    if (estStatus === 'used') return a.allItems.some((i) => i.status === 'used');
    if (estStatus === 'discarded') return a.allItems.some((i) => i.status === 'discarded');
    if (estStatus === 'expiring') return a.allItems.some((i) => lifeStatus(i) === 'expiring');
    if (estStatus === 'expired') return a.allItems.some((i) => lifeStatus(i) === 'expired');
    return true;
  };

  const estRows = aggs.filter((a) => {
    const q = estSearch.trim().toLowerCase();
    if (q && !a.product.name.toLowerCase().includes(q)) return false;
    if (estGroup && a.product.group !== estGroup) return false;
    return matchesEstStatus(a);
  });

  const exportEstoque = () => {
    downloadCsv(
      'relatorio-estoque',
      ['Produto', 'Grupo', 'Etiquetas', 'Peso (g)', 'Bruto', 'Porcionado', 'Mínimo Port.'],
      estRows.map((a) => [
        a.product.name,
        a.product.group,
        a.count,
        a.weight,
        a.rawCount,
        a.portionedCount,
        a.product.minPortionedQuantity || 0,
      ]),
    );
  };

  const prodBase = aggs
    .filter((a) => isProductionProduct(a.product))
    .map((a) => {
    const min = a.product.minPortionedQuantity;
    const below = min > 0 && a.portionedCount < min;
    const latest = latestPortioning.get(a.product._id);
    const deficit = below ? min - a.portionedCount : 0;
    const estimatedRaw = below && latest ? deficit * latest.portionWeightGrams : 0;
    return {
      product: a.product,
      portionedCount: a.portionedCount,
      min,
      below,
      deficit,
      latest,
      estimatedRaw,
    };
  });

  const belowCount = prodBase.filter((r) => r.below).length;
  const estimatedRawTotal = prodBase.reduce((s, r) => s + r.estimatedRaw, 0);

  const prodRows = prodBase
    .filter((r) => {
      const q = prodSearch.trim().toLowerCase();
      if (
        q &&
        !r.product.name.toLowerCase().includes(q) &&
        !r.product.group.toLowerCase().includes(q)
      ) {
        return false;
      }
      if (prodGroup && r.product.group !== prodGroup) return false;
      if (prodStatus === 'below' && !r.below) return false;
      if (prodStatus === 'sem' && r.min > 0) return false;
      if (prodStatus === 'ok' && (r.min <= 0 || r.below)) return false;
      return true;
    })
    .sort(
      (a, b) =>
        Number(b.below) - Number(a.below) ||
        a.product.name.localeCompare(b.product.name, 'pt-BR'),
    );

  const exportProducao = () => {
    downloadCsv(
      'relatorio-producao',
      [
        'Produto',
        'Grupo',
        'Porcionadas',
        'Mínimo',
        'Déficit',
        '% Perda Últ.',
        'Peso Porção (g)',
        'Bruto Estimado (g)',
        'Status',
      ],
      prodRows.map((r) => [
        r.product.name,
        r.product.group,
        r.portionedCount,
        r.min,
        r.below ? r.deficit : 0,
        r.latest ? (r.latest.lossPercentage ?? 0).toFixed(1) : '',
        r.latest ? r.latest.portionWeightGrams : '',
        r.below && r.latest ? r.estimatedRaw : '',
        r.below ? 'Abaixo do mínimo' : r.min <= 0 ? 'Sem mínimo' : 'OK',
      ]),
    );
  };

  const loading = lp || li || lm || lt;

  return (
    <LoggedLayout>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3, minWidth: 0 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            flexShrink: 0,
            borderRadius: '50%',
            bgcolor: '#E3F2FD',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <BarChartIcon sx={{ color: '#1976D2' }} />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h5" fontWeight="bold">
            Relatórios
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Análise de perdas, controle de compras e movimentações
          </Typography>
        </Box>
      </Box>

      <Box className="print-only" sx={{ mb: 2 }}>
        <Typography variant="h6" fontWeight={700}>
          Relatórios — {REPORT_TAB_NAMES[tab]}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Emitido em {formatDate(new Date().toISOString())}
        </Typography>
      </Box>

      <Tabs
        value={tab}
        onChange={(_, v: number) => setTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        className="no-print"
        sx={{
          bgcolor: '#f1f3f5',
          borderRadius: 2,
          padding: '6px 8px',
          minHeight: 40,
          mb: 3,
          maxWidth: '100%',
          overflowX: 'auto',
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
          '& .MuiTabs-flexContainer': { gap: 0.5, flexWrap: 'nowrap' },
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
            maxWidth: '100%',
            '&.Mui-selected': {
              bgcolor: '#fff',
              color: '#1976D2',
              fontWeight: 600,
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            },
          },
        }}
      >
        <Tab
          label="Perdas"
          icon={<TrendingDownIcon sx={{ fontSize: 18 }} />}
          iconPosition="start"
        />
        <Tab
          label="Compras"
          icon={<ShoppingCartIcon sx={{ fontSize: 18 }} />}
          iconPosition="start"
        />
        <Tab
          label="Recebimento"
          icon={<Inventory2Icon sx={{ fontSize: 18 }} />}
          iconPosition="start"
        />
        <Tab
          label="Movimentações"
          icon={<SwapHorizIcon sx={{ fontSize: 18 }} />}
          iconPosition="start"
        />
        <Tab
          label="Estoque"
          icon={<InventoryIcon sx={{ fontSize: 18 }} />}
          iconPosition="start"
        />
        <Tab
          label="Produção"
          icon={<ContentCutIcon sx={{ fontSize: 18 }} />}
          iconPosition="start"
        />
      </Tabs>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {tab === 0 && (
            <Box>
              <Box sx={toolbarSx} className="no-print">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <FilterListIcon sx={{ color: '#1976D2', fontSize: 20 }} />
                  <Typography variant="subtitle2" fontWeight={700}>
                    Filtros:
                  </Typography>
                </Box>
                <SelectFilter
                  value={perdasGroup}
                  onChange={setPerdasGroup}
                  options={groupOptions}
                  minWidth={190}
                />
                <DateRangeField
                  from={perdasFrom}
                  to={perdasTo}
                  onFrom={setPerdasFrom}
                  onTo={setPerdasTo}
                />
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                <ExportButtons onExcel={exportPerdas} onPdf={printReport} />
              </Box>

              <Box sx={kpiGrid4}>
                <KpiCard
                  label="Total Bruto"
                  value={formatKg(rawSum)}
                  icon={<ScaleIcon />}
                  iconBg="#E3F2FD"
                  iconColor="#1976D2"
                />
                <KpiCard
                  label="Total Limpo"
                  value={formatKg(cleanSum)}
                  icon={<ScaleIcon />}
                  iconBg="#E3F2FD"
                  iconColor="#1976D2"
                />
                <KpiCard
                  label="Total Perdido"
                  value={formatKg(lossSum)}
                  icon={<TrendingDownIcon />}
                  iconBg="#FFEBEE"
                  iconColor="#C62828"
                />
                <KpiCard
                  label="% Perda Geral"
                  value={`${generalLossPct.toFixed(1)}%`}
                  icon={<PercentIcon />}
                  iconBg="#FFF3E0"
                  iconColor="#E65100"
                />
              </Box>

              <Box sx={{ ...cardSx, p: 2, mb: 2 }}>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                  Perda em Gramas por Grupo
                </Typography>
                {groupLossRows.length === 0 ? (
                  <Box
                    sx={{
                      height: 300,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Typography color="text.secondary">Sem dados</Typography>
                  </Box>
                ) : (
                  <BarChart
                    height={300}
                    hideLegend
                    series={[
                      {
                        data: groupLossRows.map((r) => r.loss),
                        color: '#22C55E',
                        label: 'Perda (g)',
                      },
                    ]}
                    xAxis={[
                      { scaleType: 'band', data: groupLossRows.map((r) => r.group) },
                    ]}
                    yAxis={[
                      {
                        valueFormatter: (v: number) =>
                          `${new Intl.NumberFormat('pt-BR').format(v)}g`,
                      },
                    ]}
                    grid={{ horizontal: true, vertical: false }}
                    margin={{ top: 10, right: 16, bottom: 30, left: 56 }}
                    sx={{
                      '& .MuiChartsGrid-line': {
                        strokeDasharray: '4 4',
                      },
                    }}
                  />
                )}
              </Box>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                  gap: 2,
                  mb: 2,
                }}
              >
                <Box sx={{ ...cardSx, p: 2 }}>
                  <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5 }}>
                    Perda por Grupo
                  </Typography>
                  <ResponsiveTable
                    paper={false}
                    size="small"
                    loading={loading}
                    headerCellSx={thSx}
                    rows={groupLossRows}
                    rowKey={(r) => r.group}
                    columns={[
                      { id: 'grupo', header: 'Grupo', primary: true, cell: (r) => r.group },
                      {
                        id: 'perda',
                        header: 'Perda (g)',
                        cell: (r) => (
                          <Typography fontWeight={700} sx={{ color: '#C62828' }}>
                            {fmtG(r.loss)}
                          </Typography>
                        ),
                      },
                      {
                        id: 'pct',
                        header: '% Perda',
                        cell: (r) => <ToneChip label={`${r.pct.toFixed(1)}%`} tone="green" />,
                      },
                      { id: 'registos', header: 'Registos', cell: (r) => r.count },
                    ]}
                  />
                </Box>

                <Box sx={{ ...cardSx, p: 2 }}>
                  <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5 }}>
                    Perda por Produto
                  </Typography>
                  <ResponsiveTable
                    paper={false}
                    size="small"
                    loading={loading}
                    headerCellSx={thSx}
                    rows={productLossRows}
                    rowKey={(r) => r.productId}
                    columns={[
                      { id: 'produto', header: 'Produto', primary: true, cell: (r) => r.name },
                      {
                        id: 'perda',
                        header: 'Perda (g)',
                        cell: (r) => (
                          <Typography fontWeight={700} sx={{ color: '#C62828' }}>
                            {fmtG(r.loss)}
                          </Typography>
                        ),
                      },
                      {
                        id: 'pct',
                        header: '% Perda',
                        cell: (r) => <ToneChip label={`${r.pct.toFixed(1)}%`} tone="green" />,
                      },
                    ]}
                  />
                </Box>
              </Box>

              <Box sx={{ ...cardSx, p: 2 }}>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5 }}>
                  Histórico de Porcionamentos
                </Typography>
                <ResponsiveTable
                  paper={false}
                  size="small"
                  loading={loading}
                  headerCellSx={thSx}
                  rows={perdasHistory}
                  rowKey={(p) => p._id}
                  columns={[
                    { id: 'data', header: 'Data', cell: (p) => formatDate(p.date) },
                    {
                      id: 'produto',
                      header: 'Produto',
                      primary: true,
                      cell: (p) => p.product.productName,
                    },
                    { id: 'bruto', header: 'Bruto', cell: (p) => `${p.rawWeightGrams}g` },
                    { id: 'limpo', header: 'Limpo', cell: (p) => `${p.cleanWeightGrams}g` },
                    {
                      id: 'perda',
                      header: 'Perda (g)',
                      cell: (p) => (
                        <Typography fontWeight={700} sx={{ color: '#C62828' }}>
                          {fmtG(p.lossGrams)}
                        </Typography>
                      ),
                    },
                    {
                      id: 'pct',
                      header: '% Perda',
                      cell: (p) => (
                        <ToneChip
                          label={`${(p.lossPercentage ?? 0).toFixed(1)}%`}
                          tone="green"
                        />
                      ),
                    },
                  ]}
                />
              </Box>
            </Box>
          )}

          {tab === 1 && (
            <Box>
              <Box sx={toolbarSx} className="no-print">
                <SearchField
                  value={comprasSearch}
                  onChange={setComprasSearch}
                  placeholder="Buscar por produto..."
                />
                <SelectFilter
                  value={comprasGroup}
                  onChange={setComprasGroup}
                  options={groupOptions}
                />
                <SelectFilter
                  value={comprasStatus}
                  onChange={setComprasStatus}
                  options={comprasStatusOptions}
                />
                <Box sx={{ ml: 'auto' }}>
                  <ExportButtons onExcel={exportCompras} onPdf={printReport} />
                </Box>
              </Box>

              <Box sx={{ ...cardSx, p: 2 }}>
                <Typography variant="h6" fontWeight={700}>
                  Relatório de Estoque para Compras
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Comparação baseada no peso total em estoque vs. peso mínimo definido
                </Typography>
                <ResponsiveTable
                  paper={false}
                  size="small"
                  loading={loading}
                  headerCellSx={thSx}
                  rows={comprasRows}
                  rowKey={(r) => r.product._id}
                  rowSx={(r) => (r.status === 'comprar' ? rowRedSx : undefined)}
                  columns={[
                    {
                      id: 'produto',
                      header: 'Produto',
                      primary: true,
                      cell: (r) => <Typography fontWeight={500}>{r.product.name}</Typography>,
                    },
                    { id: 'grupo', header: 'Grupo', cell: (r) => r.product.group },
                    {
                      id: 'armazenamento',
                      header: 'Armazenamento',
                      cell: (r) => r.product.storageMethod,
                    },
                    { id: 'etiquetas', header: 'Etiquetas', cell: (r) => r.count },
                    {
                      id: 'peso',
                      header: 'Peso em Estoque',
                      cell: (r) => <WeightPair grams={r.weight} />,
                    },
                    {
                      id: 'minimo',
                      header: 'Mínimo (g)',
                      cell: (r) =>
                        r.product.minQuantity
                          ? `${r.product.minQuantity}g (${formatKg(r.product.minQuantity)})`
                          : '—',
                    },
                    {
                      id: 'status',
                      header: 'Status',
                      fullWidthOnMobile: true,
                      cell: (r) =>
                        r.status === 'sem' ? (
                          <Typography variant="body2" color="text.secondary">
                            Sem mínimo
                          </Typography>
                        ) : r.status === 'comprar' ? (
                          <SolidRedChip
                            label={`Comprar (falta ${fmtG(r.product.minQuantity - r.weight)})`}
                          />
                        ) : (
                          <ToneChip
                            label={`OK (+${fmtG(r.weight - r.product.minQuantity)})`}
                            tone="green"
                          />
                        ),
                    },
                  ]}
                />
              </Box>
            </Box>
          )}

          {tab === 2 && (
            <Box>
              <Box sx={toolbarSx} className="no-print">
                <SearchField
                  value={recvSearch}
                  onChange={setRecvSearch}
                  placeholder="Buscar por produto..."
                />
                <DateRangeField from={recvFrom} to={recvTo} onFrom={setRecvFrom} onTo={setRecvTo} />
                <Box sx={{ ml: 'auto' }}>
                  <ExportButtons onExcel={exportRecebimento} onPdf={printReport} />
                </Box>
              </Box>

              <Box sx={{ ...cardSx, p: 2 }}>
                <Typography variant="h6" fontWeight={700}>
                  Histórico de Recebimento
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {recvItems.length} itens brutos registrados
                </Typography>
                <ResponsiveTable
                  paper={false}
                  size="small"
                  loading={loading}
                  headerCellSx={thSx}
                  rows={recvItems}
                  rowKey={(i) => i._id}
                  columns={[
                    {
                      id: 'data',
                      header: 'Data',
                      cell: (i) => formatDate(i.manipulationDate || i.createdAt),
                    },
                    {
                      id: 'produto',
                      header: 'Produto',
                      primary: true,
                      cell: (i) => i.product.productName,
                    },
                    { id: 'grupo', header: 'Grupo', cell: (i) => i.product.productGroup || '—' },
                    { id: 'peso', header: 'Peso', cell: (i) => <WeightPair grams={i.weightGrams} /> },
                    { id: 'validade', header: 'Validade', cell: (i) => formatDate(i.expiryDate) },
                    { id: 'qr', header: 'QR', cell: (i) => i.qrCode || '—' },
                    { id: 'lote', header: 'Lote', cell: (i) => i.lote || '—' },
                    { id: 'nf', header: 'NF', cell: (i) => i.nf || '—' },
                    { id: 'funcionario', header: 'Funcionário', cell: (i) => i.employeeName || '—' },
                    {
                      id: 'status',
                      header: 'Status',
                      fullWidthOnMobile: true,
                      cell: (i) => recvStatusChip(i.status),
                    },
                  ]}
                />
              </Box>
            </Box>
          )}

          {tab === 3 && (
            <Box>
              <Box sx={toolbarSx} className="no-print">
                <SearchField
                  value={movSearch}
                  onChange={setMovSearch}
                  placeholder="Buscar por produto ou destino..."
                />
                <SelectFilter value={movType} onChange={setMovType} options={movTypeOptions} />
                <DateRangeField from={movFrom} to={movTo} onFrom={setMovFrom} onTo={setMovTo} />
                <Box sx={{ ml: 'auto' }}>
                  <ExportButtons onExcel={exportMovimentacoes} onPdf={printReport} />
                </Box>
              </Box>

              <Box sx={{ ...cardSx, p: 2 }}>
                <Typography variant="h6" fontWeight={700}>
                  Histórico de Movimentações
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {movRows.length} registros
                </Typography>
                <ResponsiveTable
                  paper={false}
                  size="small"
                  loading={loading}
                  headerCellSx={thSx}
                  rows={movRows}
                  rowKey={(m) => m._id}
                  columns={[
                    { id: 'data', header: 'Data', cell: (m) => formatDate(m.date) },
                    {
                      id: 'tipo',
                      header: 'Tipo',
                      cell: (m) => movementTypeChip(m.movementType),
                    },
                    {
                      id: 'produto',
                      header: 'Produto',
                      primary: true,
                      cell: (m) => m.product.productName,
                    },
                    { id: 'qtd', header: 'Qtd. Itens', cell: (m) => m.quantity },
                    {
                      id: 'peso',
                      header: 'Peso Total',
                      cell: (m) => <WeightPair grams={m.weightGrams ?? null} />,
                    },
                    {
                      id: 'tipoItem',
                      header: 'Tipo Item',
                      cell: (m) =>
                        m.itemType === 'raw'
                          ? 'Bruto'
                          : m.itemType === 'portioned'
                            ? 'Porcionado'
                            : '—',
                    },
                    {
                      id: 'motivo',
                      header: 'Destino/Motivo',
                      fullWidthOnMobile: true,
                      cell: (m) => m.reason || '—',
                    },
                  ]}
                />
              </Box>
            </Box>
          )}

          {tab === 4 && (
            <Box>
              <Box sx={kpiGrid5}>
                <KpiCard
                  label="Total Bruto"
                  value={rawInStockItems.length}
                  caption={formatKg(rawInStockWeight)}
                  icon={<Inventory2Icon />}
                  iconBg="#E3F2FD"
                  iconColor="#1976D2"
                />
                <KpiCard
                  label="Total Porcionado"
                  value={portionedInStock.length}
                  caption={formatKg(portionedInStockWeight)}
                  icon={<ContentCutIcon />}
                  iconBg="#E8F5E9"
                  iconColor="#2E7D32"
                />
                <KpiCard
                  label="Vencendo na Semana"
                  value={stockExpiring}
                  caption="itens"
                  icon={<ScheduleIcon />}
                  iconBg="#FFF3E0"
                  iconColor="#E65100"
                />
                <KpiCard
                  label="Vencidos"
                  value={stockExpired}
                  caption="itens"
                  icon={<ErrorOutlineIcon />}
                  iconBg="#FFEBEE"
                  iconColor="#C62828"
                />
                <KpiCard
                  label="Precisam Comprar"
                  value={needBuy}
                  caption="produtos"
                  icon={<ShoppingCartIcon />}
                  iconBg="#FFEBEE"
                  iconColor="#C62828"
                />
              </Box>

              <Box sx={toolbarSx} className="no-print">
                <SearchField
                  value={estSearch}
                  onChange={setEstSearch}
                  placeholder="Buscar por produto..."
                />
                <SelectFilter value={estGroup} onChange={setEstGroup} options={groupOptions} />
                <SelectFilter
                  value={estStatus}
                  onChange={setEstStatus}
                  options={estStatusOptions}
                />
                <Box sx={{ ml: 'auto' }}>
                  <ExportButtons onExcel={exportEstoque} onPdf={printReport} />
                </Box>
              </Box>

              <Box>
                {estRows.length === 0 ? (
                  <Box sx={{ ...cardSx, p: 4 }}>
                    <Typography color="text.secondary" sx={{ textAlign: 'center' }}>
                      Nenhum produto encontrado
                    </Typography>
                  </Box>
                ) : (
                  estRows.map((a) => {
                    const isBelow =
                      a.product.minQuantity > 0 && a.weight < a.product.minQuantity;
                    const expCount = a.items.filter((i) => lifeStatus(i) === 'expiring').length;
                    const expdCount = a.items.filter((i) => lifeStatus(i) === 'expired').length;
                    const isOpen = expanded === a.product._id;
                    const sortedItems = [...a.items].sort((x, y) =>
                      y.manipulationDate.localeCompare(x.manipulationDate),
                    );
                    return (
                      <Box key={a.product._id} sx={{ ...cardSx, p: 2, mb: 1.5 }}>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            justifyContent: 'space-between',
                            gap: 2,
                          }}
                        >
                          <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Box
                              sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}
                            >
                              <Typography variant="subtitle1" fontWeight={700}>
                                {a.product.name}
                              </Typography>
                              <ToneChip label={a.product.group} tone="blue" />
                              {isBelow && <SolidRedChip label="Comprar" />}
                              {expdCount > 0 && (
                                <ToneChip label={`${expdCount} vencidos`} tone="red" />
                              )}
                              {expCount > 0 && (
                                <ToneChip label={`${expCount} vencendo`} tone="amber" />
                              )}
                              {a.count > 0 && expdCount === 0 && expCount === 0 && (
                                <ToneChip label="Em estoque" tone="green" />
                              )}
                            </Box>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mt: 1 }}>
                              <Typography variant="caption" color="text.secondary">
                                {a.count} etiquetas
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {formatKg(a.weight)} total
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {a.rawCount} bruto
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {a.portionedCount} porcionado
                              </Typography>
                              {a.product.minPortionedQuantity > 0 && (
                                <Typography variant="caption" fontWeight={700} color="text.secondary">
                                  {a.portionedCount}/{a.product.minPortionedQuantity} min.
                                </Typography>
                              )}
                            </Box>
                          </Box>
                          <Button
                            size="small"
                            onClick={() => setExpanded(isOpen ? null : a.product._id)}
                            endIcon={
                              isOpen ? (
                                <KeyboardArrowUpIcon fontSize="small" />
                              ) : (
                                <KeyboardArrowDownIcon fontSize="small" />
                              )
                            }
                            sx={{
                              bgcolor: '#1976D2',
                              color: '#fff',
                              textTransform: 'none',
                              borderRadius: 1.5,
                              flexShrink: 0,
                              '&:hover': { bgcolor: '#1565C0' },
                            }}
                          >
                            {isOpen ? 'Fechar' : 'Expandir'}
                          </Button>
                        </Box>

                        {isOpen && (
                          <Box sx={{ mt: 2 }}>
                            {sortedItems.length === 0 ? (
                              <Typography variant="body2" color="text.secondary">
                                Nenhum item em estoque
                              </Typography>
                            ) : (
                              <ResponsiveTable
                                paper={false}
                                size="small"
                                loading={loading}
                                headerCellSx={thSx}
                                rows={sortedItems}
                                rowKey={(item) => item._id}
                                emptyMessage="Nenhum item em estoque"
                                columns={[
                                  {
                                    id: 'tipo',
                                    header: 'Tipo',
                                    cell: (item) => (item.type === 'raw' ? 'Bruto' : 'Porcionado'),
                                  },
                                  {
                                    id: 'peso',
                                    header: 'Peso',
                                    cell: (item) => formatWeight(item.weightGrams),
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
                                    cell: (item) => {
                                      const days = daysUntil(item.expiryDate);
                                      const st = lifeStatus(item);
                                      const tone: ChipTone =
                                        st === 'expired'
                                          ? 'red'
                                          : st === 'expiring'
                                            ? 'amber'
                                            : 'green';
                                      return days === null ? (
                                        <ToneChip label="—" tone="gray" />
                                      ) : (
                                        <ToneChip label={`${days}d`} tone={tone} />
                                      );
                                    },
                                  },
                                  {
                                    id: 'qr',
                                    header: 'QR',
                                    fullWidthOnMobile: true,
                                    cell: (item) => item.qrCode || '—',
                                  },
                                ]}
                              />
                            )}
                          </Box>
                        )}
                      </Box>
                    );
                  })
                )}
              </Box>
            </Box>
          )}

          {tab === 5 && (
            <Box>
              <Box sx={kpiGrid4}>
                <KpiCard
                  label="Produtos"
                  value={products.length}
                  icon={<InventoryIcon />}
                  iconBg="#E3F2FD"
                  iconColor="#1976D2"
                />
                <KpiCard
                  label="Abaixo do Mínimo"
                  value={belowCount}
                  icon={<WarningAmberIcon />}
                  iconBg="#FFEBEE"
                  iconColor="#C62828"
                />
                <KpiCard
                  label="Porcionadas em Estoque"
                  value={portionedInStock.length}
                  icon={<ContentCutIcon />}
                  iconBg="#E8F5E9"
                  iconColor="#2E7D32"
                />
                <KpiCard
                  label="Bruto Estimado a Retirar"
                  value={formatKg(estimatedRawTotal)}
                  icon={<ScaleIcon />}
                  iconBg="#FFF3E0"
                  iconColor="#E65100"
                />
              </Box>

              <Box sx={toolbarSx} className="no-print">
                <SearchField
                  value={prodSearch}
                  onChange={setProdSearch}
                  placeholder="Buscar por produto ou grupo..."
                />
                <SelectFilter value={prodGroup} onChange={setProdGroup} options={groupOptions} />
                <SelectFilter
                  value={prodStatus}
                  onChange={setProdStatus}
                  options={prodStatusOptions}
                />
                <Box sx={{ ml: 'auto' }}>
                  <ExportButtons onExcel={exportProducao} onPdf={printReport} />
                </Box>
              </Box>

              <Box sx={{ ...cardSx, p: 2 }}>
                <Typography variant="h6" fontWeight={700}>
                  Relatório de Produção (Porcionadas)
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Quantidade de etiquetas porcionadas em estoque vs. mínimo definido. O bruto
                  estimado considera a perda do último porcionamento de cada produto.
                </Typography>
                <ResponsiveTable
                  paper={false}
                  size="small"
                  loading={loading}
                  headerCellSx={thSx}
                  rows={prodRows}
                  rowKey={(r) => r.product._id}
                  rowSx={(r) => (r.below ? rowRedSx : undefined)}
                  columns={[
                    {
                      id: 'produto',
                      header: 'Produto',
                      primary: true,
                      cell: (r) => <Typography fontWeight={500}>{r.product.name}</Typography>,
                    },
                    { id: 'grupo', header: 'Grupo', cell: (r) => r.product.group },
                    {
                      id: 'porcionadas',
                      header: 'Porcionadas em Estoque',
                      cell: (r) => r.portionedCount,
                    },
                    { id: 'minimo', header: 'Mínimo', cell: (r) => (r.min > 0 ? r.min : '—') },
                    {
                      id: 'deficit',
                      header: 'Déficit',
                      cell: (r) =>
                        r.below ? (
                          <Typography fontWeight={700} sx={{ color: '#C62828' }}>
                            {r.deficit}
                          </Typography>
                        ) : (
                          '—'
                        ),
                    },
                    {
                      id: 'pctPerda',
                      header: '% Perda Últ. Porcion.',
                      cell: (r) =>
                        r.latest ? (
                          <ToneChip
                            label={`${(r.latest.lossPercentage ?? 0).toFixed(1)}%`}
                            tone="green"
                          />
                        ) : (
                          '—'
                        ),
                    },
                    {
                      id: 'pesoPorcao',
                      header: 'Peso Porção',
                      cell: (r) => (r.latest ? `${r.latest.portionWeightGrams}g` : '—'),
                    },
                    {
                      id: 'brutoEstimado',
                      header: 'Bruto Estimado a Retirar',
                      cell: (r) =>
                        r.below && r.latest ? (
                          <WeightPair grams={r.estimatedRaw} tone="amber" />
                        ) : (
                          '—'
                        ),
                    },
                    {
                      id: 'status',
                      header: 'Status',
                      fullWidthOnMobile: true,
                      cell: (r) =>
                        r.below ? (
                          <SolidRedChip label="Abaixo do mínimo" withWarning />
                        ) : r.min <= 0 ? (
                          <ToneChip label="Sem mínimo" tone="gray" />
                        ) : (
                          <ToneChip label="OK" tone="green" />
                        ),
                    },
                  ]}
                />
              </Box>
            </Box>
          )}
        </>
      )}
    </LoggedLayout>
  );
}
