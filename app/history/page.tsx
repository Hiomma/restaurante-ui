'use client';

import { useMemo, useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  MenuItem,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  InputAdornment,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CloseIcon from '@mui/icons-material/Close';
import PrintIcon from '@mui/icons-material/Print';
import DeleteIcon from '@mui/icons-material/Delete';
import FilterListIcon from '@mui/icons-material/FilterList';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import DownloadIcon from '@mui/icons-material/Download';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import type { StockMovement, StockItem, Portioning } from '@/types';
import {
  useStockMovements,
  useStockItems,
  usePortionings,
  useDeleteStockItem,
  useMe,
  useProducts,
  useMovementDestinations,
} from '@/lib/queries';
import {
  formatDate,
  formatPercent,
  movementTypeView,
  stripBatchCodes,
  downloadCsv,
  printReport,
} from '@/lib/utils';
import { printEtiquetasNativas } from '@/lib/printService';
import LoggedLayout from '../components/LoggedLayout/LoggedLayout';
import ResponsiveTable from '../components/ResponsiveTable/ResponsiveTable';
import type { ResponsiveTableColumn } from '../components/ResponsiveTable/ResponsiveTable';
import BrDateField from '../components/BrDateField/BrDateField';
import LabelPreview, { type LabelData } from '../components/LabelPreview/LabelPreview';

const thSx = { fontWeight: 700, color: '#333' };

/** Destinos fixos (mesmos valores do cadastro). */
const FIXED_MOVE_DESTINATIONS = ['Salão', 'Bar', 'Cozinha'];
const FIXED_WRITEOFF_DESTINATIONS = ['Perda', 'Não encontrado'];

/** Texto normalizado para comparar destinos/motivos sem acento/caixa. */
const norm = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Colunas OPCIONAIS do Relatório de Produção e Baixa (marcadas na tela):
 * as colunas FIXAS são Data, Produto, Fornecedor, Lote, Lote Origem,
 * Peso Bruto, Peso Líquido, Peso em Estoque e Porções em Estoque.
 * Venda = saídas para Salão/Bar/Cozinha; Perda = saídas com destino de baixa.
 */
const OPTIONAL_REL_COLUMNS: { key: string; label: string }[] = [
  { key: 'produzidas', label: 'Porções Produzidas' },
  { key: 'vendaPeso', label: 'Peso Venda (g)' },
  { key: 'vendaPct', label: '% Venda' },
  { key: 'vendaQtd', label: 'Porções Vendidas' },
  { key: 'perdaPeso', label: 'Peso Perdido (g)' },
  { key: 'perdaPct', label: '% Perda' },
  { key: 'perdaQtd', label: 'Porções Perdidas' },
];

/** Linha do Relatório de Produção e Baixa: um porcionamento (lote) por linha. */
interface ProductionReportRow {
  key: string;
  data: string;
  produto: string;
  fornecedor: string;
  lote: string;
  loteOrigem: string;
  bruto: number;
  limpo: number;
  produzidas: number;
  pesoEstoque: number;
  qtdEstoque: number;
  vendaPeso: number;
  vendaQtd: number;
  pctVenda: number;
  perdaPeso: number;
  perdaQtd: number;
  pctPerda: number;
}

/** Botões de exportação (Excel/PDF) do relatório — mesmo tom neutro dos Relatórios. */
const exportBtnSx = {
  color: '#495057',
  borderColor: '#CED4DA',
  textTransform: 'none',
  borderRadius: 1.5,
  '&:hover': { borderColor: '#495057', bgcolor: '#F1F3F5', color: '#212529' },
} as const;

/** Timestamp da coluna "Data" (cai na criação se a data não for reconhecida). */
function dateTimestamp(m: StockMovement): number {
  const d = Date.parse(m.date);
  if (!Number.isNaN(d)) return d;
  const c = Date.parse(m.createdAt);
  return Number.isNaN(c) ? 0 : c;
}

/** Horário de criação: desempata movimentações do mesmo dia. */
function createdAtTimestamp(m: StockMovement): number {
  const c = Date.parse(m.createdAt);
  return Number.isNaN(c) ? 0 : c;
}

/** Última movimentação primeiro, coerente com a ordenação da coluna "Data". */
function moreRecentFirst(a: StockMovement, b: StockMovement): number {
  return dateTimestamp(b) - dateTimestamp(a) || createdAtTimestamp(b) - createdAtTimestamp(a);
}

/** Monta os dados da etiqueta (mesmo layout da pré-visualização) para reimpressão. */
function toLabelData(
  item: StockItem,
  companyName: string,
  consumeAfterOpeningDays?: number,
): LabelData {
  return {
    key: item._id,
    companyName,
    productName: item.product.productName,
    storage: item.product.productStorage ?? '',
    weightGrams: item.weightGrams,
    recebimentoDate: item.manipulationDate,
    expiryDate: item.expiryDate,
    lote: item.lote,
    responsavel: item.employeeName,
    consumeAfterOpeningDays,
    qrCode: item.qrCode,
  };
}

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
  const { data: me } = useMe();
  const { data: products } = useProducts();
  const { data: customDestinations = [] } = useMovementDestinations();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  /** Filtro de PERÍODO da lista de movimentações (aba Histórico). */
  const [histFrom, setHistFrom] = useState('');
  const [histTo, setHistTo] = useState('');
  const [detail, setDetail] = useState<StockMovement | null>(null);
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const deleteStockItem = useDeleteStockItem();

  // ===== Relatório de Produção e Baixas =====
  const { data: portionings, isLoading: loadingPortionings } = usePortionings();
  // Sem filtro: TODOS os itens, para contar estoque e baixas por produto
  // (o useStockItems do diálogo muda de chave quando um detalhe é aberto).
  const { data: allStockItems = [], isLoading: loadingStockItems } = useStockItems();

  const [relGroup, setRelGroup] = useState('');
  const [relProduct, setRelProduct] = useState('');
  const [relSupplier, setRelSupplier] = useState('');
  const [relFrom, setRelFrom] = useState('');
  const [relTo, setRelTo] = useState('');
  /** Colunas opcionais marcadas do relatório (as fixas sempre aparecem). */
  const [relCols, setRelCols] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(OPTIONAL_REL_COLUMNS.map((c) => [c.key, true])),
  );

  const toggleRelCol = (key: string) =>
    setRelCols((prev) => ({ ...prev, [key]: !prev[key] }));

  /** Chip de tipo do diálogo: mesmo rótulo/paleta da coluna "Tipo". */
  const detailType = detail ? movementTypeView(detail) : null;

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
      // Lote identificado: mostra apenas as etiquetas daquele lote.
      // O fallback por data juntava etiquetas de porcionamentos
      // diferentes do mesmo produto, então não é usado aqui.
      return allItems.filter((i) => i.batchId === batchFromReason);
    }
    return allItems.filter(
      (i) =>
        !i.batchId &&
        i.manipulationDate === detail.date &&
        (detail.itemType ? i.type === detail.itemType : true),
    );
  }, [allItems, detail, batchFromReason]);

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

  /** Etiquetas marcadas: é o que sai na reimpressão. */
  const labelsToPrint = batchLabels.filter((i) => selectedLabels.includes(i._id));

  /**
   * Mesmo array (e mesmo conteúdo) que alimenta a área
   * `.etiquetas-print-area`: é ele que vai para o serviço de impressão
   * nativo e, no fallback, para o `window.print()` do navegador.
   */
  const printAreaLabels = labelsToPrint.map((item) =>
    toLabelData(
      item,
      me?.company?.name ?? '',
      products?.find((p) => p._id === item.product.productId)?.consumeAfterOpeningDays,
    ),
  );

  /**
   * Imprime a área de etiquetas, seguindo o padrão do Recebimento: antes de
   * tudo tenta o serviço de impressão local (Zebra ZD220) com o MESMO
   * conteúdo da tela — sucesso pula o `window.print()`, falha segue o
   * diálogo do navegador. A classe `printing-labels` marca o body durante a
   * tentativa e é removida tanto pelo `finally` quanto pelo evento
   * `afterprint` — nos dois caminhos.
   */
  const printLabels = async (labels: LabelData[]) => {
    const removePrintClass = () => document.body.classList.remove('printing-labels');
    window.addEventListener('afterprint', removePrintClass, { once: true });
    document.body.classList.add('printing-labels');
    try {
      // Impressão nativa (serviço em 127.0.0.1:17421) → sai sem diálogo.
      if (await printEtiquetasNativas(labels)) return;
      // Fallback: diálogo do navegador sobre a área .etiquetas-print-area.
      await new Promise((r) => setTimeout(r, 250));
      window.print();
    } finally {
      window.removeEventListener('afterprint', removePrintClass);
      removePrintClass();
    }
  };

  /**
   * Reimprime só as etiquetas selecionadas (antes imprimia a página inteira).
   * O diálogo continua aberto e as etiquetas permanecem no DOM durante toda a
   * impressão — o estado só muda quando o usuário fecha ou exclui.
   */
  const handleReprint = async () => {
    if (selectedLabels.length === 0) return;
    await printLabels(printAreaLabels);
  };

  const handleDeleteLabels = async () => {
    for (const id of selectedLabels) {
      await deleteStockItem.mutateAsync(id);
    }
    setSelectedLabels([]);
  };

  const filtered = movements?.filter((m) => {
    if (typeFilter && m.movementType !== typeFilter) return false;
    // Período (aba Histórico): casa a data da movimentação (YYYY-MM-DD).
    const mDate = m.date.slice(0, 10);
    if (histFrom && mDate < histFrom) return false;
    if (histTo && mDate > histTo) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      m.product.productName.toLowerCase().includes(q) ||
      (m.reason ?? '').toLowerCase().includes(q) ||
      (m.lote ?? '').toLowerCase().includes(q) ||
      formatDate(m.date).includes(q) ||
      m.date.includes(q)
    );
  });

  /** Última movimentação no topo. */
  const sorted = filtered ? [...filtered].sort(moreRecentFirst) : undefined;

  // ===== Cálculos do Relatório de Produção e Baixas =====

  const productList = products ?? [];
  const productMap = new Map(productList.map((p) => [p._id, p]));

  // Opções dos filtros (mesma origem da aba Perdas): grupos vêm do cadastro
  // de produtos; produtos e fornecedores vêm dos porcionamentos.
  const relGroupOptions = [
    { value: '', label: 'Todos os grupos' },
    ...Array.from(new Set(productList.map((p) => p.group)))
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, 'pt-BR'))
      .map((g) => ({ value: g, label: g })),
  ];

  const relProductOptions = [
    { value: '', label: 'Todos os produtos' },
    ...Array.from(
      new Map(
        (portionings ?? []).map((pt) => [pt.product.productId, pt.product.productName]),
      ).entries(),
    )
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR')),
  ];

  const relSupplierOptions = [
    { value: '', label: 'Todos os fornecedores' },
    ...Array.from(
      new Set((portionings ?? []).map((pt) => (pt.supplier ?? '').trim()).filter(Boolean)),
    )
      .sort((a, b) => a.localeCompare(b, 'pt-BR'))
      .map((s) => ({ value: s, label: s })),
  ];

  // Mesmos filtros da aba Perdas: grupo (via cadastro), produto, fornecedor e
  // período aplicados sobre a DATA do porcionamento.
  const filteredPortionings = (portionings ?? []).filter((pt) => {
    if (relGroup && (productMap.get(pt.product.productId)?.group ?? '') !== relGroup) {
      return false;
    }
    if (relProduct && pt.product.productId !== relProduct) return false;
    if (relSupplier && (pt.supplier ?? '').trim() !== relSupplier) return false;
    const d = pt.date.slice(0, 10);
    if (relFrom && d < relFrom) return false;
    if (relTo && d > relTo) return false;
    return true;
  });

  // ===== Linhas do Relatório de Produção e Baixas =====
  // Uma linha por PORCIONAMENTO (lote): colunas fixas de identificação e
  // produção + colunas opcionais de venda/perda derivadas das movimentações
  // (venda = saídas para Salão/Bar/Cozinha; perda = saídas com destino de
  // baixa), sempre no período filtrado.

  /** Destinos de venda (Salão/Bar/Cozinha + cadastrados tipo "mover"). */
  const moveDestSet = new Set(
    [
      ...FIXED_MOVE_DESTINATIONS,
      ...customDestinations
        .filter((d) => d.active && (d.type ?? 'move') === 'move')
        .map((d) => d.name),
    ].map(norm),
  );

  /** Destinos de baixa (Perda/Não encontrado + cadastrados tipo "baixar"). */
  const writeoffDestSet = new Set(
    [
      ...FIXED_WRITEOFF_DESTINATIONS,
      ...customDestinations
        .filter((d) => d.active && d.type === 'writeoff')
        .map((d) => d.name),
    ].map(norm),
  );

  /** Destino do movimento (campo próprio ou derivado do motivo legado). */
  const movementDest = (m: StockMovement): string => {
    const dest = (m.destination ?? '').trim();
    if (dest) return dest;
    const match = stripBatchCodes(m.reason ?? '').match(/^\s*\S+\s*[—–-]\s*(.+)$/);
    return match ? match[1].trim() : '';
  };

  const productIdsOf = (pt: Portioning): Set<string> =>
    new Set(
      pt.outputs && pt.outputs.length > 0
        ? pt.outputs.map((o) => o.productId)
        : [pt.product.productId],
    );

  /**
   * Itens PORCIONADOS gerados por um porcionamento: `batchId` (registros
   * novos), senão o lote + produtos gerados, senão a data do porcionamento
   * (registros antigos, sem vínculo).
   */
  const itemsOfBatch = (pt: Portioning): StockItem[] => {
    const portioned = allStockItems.filter((i) => i.type === 'portioned');
    if (pt.batchId) return portioned.filter((i) => i.batchId === pt.batchId);
    const productIds = productIdsOf(pt);
    if (pt.lote) {
      return portioned.filter(
        (i) => i.lote === pt.lote && productIds.has(i.product.productId),
      );
    }
    const d = pt.date.slice(0, 10);
    return portioned.filter(
      (i) =>
        productIds.has(i.product.productId) &&
        (i.manipulationDate || '').slice(0, 10) === d,
    );
  };

  const movementInRange = (m: StockMovement): boolean => {
    const d = m.date.slice(0, 10);
    if (relFrom && d < relFrom) return false;
    if (relTo && d > relTo) return false;
    return true;
  };

  /** Porcionamento dono de uma movimentação (por lote; senão o mais recente). */
  const batchOfMovement = (m: StockMovement): Portioning | null => {
    const candidates = filteredPortionings.filter((pt) =>
      productIdsOf(pt).has(m.product.productId),
    );
    if (candidates.length === 0) return null;
    if (m.lote) {
      const byLote = candidates.find((pt) => (pt.lote ?? '') === m.lote);
      if (byLote) return byLote;
    }
    // Fallback p/ movimentações antigas sem lote: lote mais recente do
    // produto anterior à movimentação.
    return (
      candidates
        .filter((pt) => pt.date.slice(0, 10) <= m.date.slice(0, 10))
        .sort((a, b) => b.date.localeCompare(a.date))[0] ?? null
    );
  };

  const extrasByBatch = new Map<
    string,
    { vendaPeso: number; vendaQtd: number; perdaPeso: number; perdaQtd: number }
  >();
  for (const m of movements ?? []) {
    if (m.itemType !== 'portioned') continue;
    if (m.movementType !== 'move' && m.movementType !== 'exit') continue;
    if (!movementInRange(m)) continue;
    const dest = norm(movementDest(m));
    const isVenda = m.movementType === 'move' && moveDestSet.has(dest);
    const isPerda = m.movementType === 'exit' && writeoffDestSet.has(dest);
    if (!isVenda && !isPerda) continue;
    const pt = batchOfMovement(m);
    if (!pt) continue;
    const cur = extrasByBatch.get(pt._id) ?? {
      vendaPeso: 0,
      vendaQtd: 0,
      perdaPeso: 0,
      perdaQtd: 0,
    };
    if (isVenda) {
      cur.vendaPeso += m.weightGrams ?? 0;
      cur.vendaQtd += m.quantity;
    } else {
      cur.perdaPeso += m.weightGrams ?? 0;
      cur.perdaQtd += m.quantity;
    }
    extrasByBatch.set(pt._id, cur);
  }

  const productionReportRows: ProductionReportRow[] = filteredPortionings
    .map((pt) => {
      const batchItems = itemsOfBatch(pt);
      const inStock = batchItems.filter((i) => i.status === 'in_stock');
      const pesoEstoque = inStock.reduce((s, i) => s + i.weightGrams, 0);
      const extras = extrasByBatch.get(pt._id) ?? {
        vendaPeso: 0,
        vendaQtd: 0,
        perdaPeso: 0,
        perdaQtd: 0,
      };
      const base = pt.cleanWeightGrams > 0 ? pt.cleanWeightGrams : 0;
      return {
        key: pt._id,
        data: pt.date,
        produto:
          pt.outputs && pt.outputs.length > 0
            ? pt.outputs.map((o) => o.productName).join(', ')
            : pt.product.productName,
        fornecedor: pt.supplier || '—',
        lote: pt.lote || '—',
        loteOrigem: pt.rawLote || '—',
        bruto: pt.rawWeightGrams,
        limpo: pt.cleanWeightGrams,
        produzidas: pt.portionsCount ?? 0,
        pesoEstoque,
        qtdEstoque: inStock.length,
        vendaPeso: extras.vendaPeso,
        vendaQtd: extras.vendaQtd,
        pctVenda: base > 0 ? (extras.vendaPeso / base) * 100 : 0,
        perdaPeso: extras.perdaPeso,
        perdaQtd: extras.perdaQtd,
        pctPerda: base > 0 ? (extras.perdaPeso / base) * 100 : 0,
      };
    })
    .sort((a, b) => b.data.localeCompare(a.data));

  // Totais gerais (rodapé).
  const totalPesoEstoque = productionReportRows.reduce((s, r) => s + r.pesoEstoque, 0);
  const totalQtdEstoque = productionReportRows.reduce((s, r) => s + r.qtdEstoque, 0);
  const totalVendaPeso = productionReportRows.reduce((s, r) => s + r.vendaPeso, 0);
  const totalVendaQtd = productionReportRows.reduce((s, r) => s + r.vendaQtd, 0);
  const totalPerdaPeso = productionReportRows.reduce((s, r) => s + r.perdaPeso, 0);
  const totalPerdaQtd = productionReportRows.reduce((s, r) => s + r.perdaQtd, 0);

  /** Exporta o relatório filtrado para Excel (CSV separado por ";"). */
  const exportProducaoBaixas = () => {
    const headers = [
      'Data',
      'Produto',
      'Fornecedor',
      'Lote',
      'Lote Origem',
      'Peso Bruto (g)',
      'Peso Líquido (g)',
      'Peso em Estoque (g)',
      'Porções em Estoque',
    ];
    for (const col of OPTIONAL_REL_COLUMNS) {
      if (relCols[col.key]) headers.push(col.label);
    }
    const rowsOut = productionReportRows.map((r) => {
      const cells: (string | number)[] = [
        formatDate(r.data),
        r.produto,
        r.fornecedor,
        r.lote === '—' ? '' : r.lote,
        r.loteOrigem === '—' ? '' : r.loteOrigem,
        r.bruto,
        r.limpo,
        r.pesoEstoque,
        r.qtdEstoque,
      ];
      if (relCols.produzidas) cells.push(r.produzidas);
      if (relCols.vendaPeso) cells.push(r.vendaPeso);
      if (relCols.vendaPct) cells.push(r.pctVenda.toFixed(1));
      if (relCols.vendaQtd) cells.push(r.vendaQtd);
      if (relCols.perdaPeso) cells.push(r.perdaPeso);
      if (relCols.perdaPct) cells.push(r.pctPerda.toFixed(1));
      if (relCols.perdaQtd) cells.push(r.perdaQtd);
      return cells;
    });
    downloadCsv('relatorio-producao-e-baixas', headers, rowsOut);
  };

  /** Colunas da tabela: fixas + opcionais marcadas. */
  const relTableColumns: ResponsiveTableColumn<ProductionReportRow>[] = [
    { id: 'data', header: 'Data', cell: (r) => formatDate(r.data) },
    {
      id: 'produto',
      header: 'Produto',
      primary: true,
      cell: (r) => (
        <Typography variant="body2" fontWeight={500}>
          {r.produto}
        </Typography>
      ),
    },
    { id: 'fornecedor', header: 'Fornecedor', cell: (r) => r.fornecedor },
    {
      id: 'lote',
      header: 'Lote',
      cell: (r) => (
        <Typography
          variant="body2"
          sx={{ fontFamily: 'monospace', fontSize: 13, color: '#1565C0' }}
        >
          {r.lote}
        </Typography>
      ),
    },
    {
      id: 'loteOrigem',
      header: 'Lote Origem',
      cell: (r) => (
        <Typography
          variant="body2"
          sx={{ fontFamily: 'monospace', fontSize: 13, color: '#888' }}
        >
          {r.loteOrigem}
        </Typography>
      ),
    },
    { id: 'bruto', header: 'Peso Bruto', cell: (r) => `${r.bruto}g` },
    { id: 'limpo', header: 'Peso Líquido', cell: (r) => `${r.limpo}g` },
    { id: 'pesoEstoque', header: 'Peso em Estoque', cell: (r) => `${r.pesoEstoque}g` },
    {
      id: 'qtdEstoque',
      header: 'Porções em Estoque',
      align: 'right',
      cell: (r) => r.qtdEstoque,
    },
    ...(relCols.produzidas
      ? [
          {
            id: 'produzidas',
            header: 'Porções Produzidas',
            align: 'right' as const,
            cell: (r: ProductionReportRow) => r.produzidas,
          },
        ]
      : []),
    ...(relCols.vendaPeso
      ? [
          {
            id: 'vendaPeso',
            header: 'Peso Venda',
            cell: (r: ProductionReportRow) => `${r.vendaPeso}g`,
          },
        ]
      : []),
    ...(relCols.vendaPct
      ? [
          {
            id: 'vendaPct',
            header: '% Venda',
            cell: (r: ProductionReportRow) => formatPercent(r.pctVenda),
          },
        ]
      : []),
    ...(relCols.vendaQtd
      ? [
          {
            id: 'vendaQtd',
            header: 'Porções Vendidas',
            align: 'right' as const,
            cell: (r: ProductionReportRow) => r.vendaQtd,
          },
        ]
      : []),
    ...(relCols.perdaPeso
      ? [
          {
            id: 'perdaPeso',
            header: 'Peso Perdido',
            cell: (r: ProductionReportRow) => `${r.perdaPeso}g`,
          },
        ]
      : []),
    ...(relCols.perdaPct
      ? [
          {
            id: 'perdaPct',
            header: '% Perda',
            cell: (r: ProductionReportRow) => formatPercent(r.pctPerda),
          },
        ]
      : []),
    ...(relCols.perdaQtd
      ? [
          {
            id: 'perdaQtd',
            header: 'Porções Perdidas',
            align: 'right' as const,
            cell: (r: ProductionReportRow) => r.perdaQtd,
          },
        ]
      : []),
  ];

  return (
    <LoggedLayout>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
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
          <SwapHorizIcon sx={{ color: '#1976D2' }} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h5" fontWeight="bold">
            Histórico
          </Typography>
          <Typography variant="body2" sx={{ color: '#666' }}>
            Histórico de movimentações de estoque
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 3 }}>
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
          sx={{ bgcolor: '#fff', borderRadius: 2, flex: '1 1 280px', minWidth: 0 }}
        />
        <TextField
          select
          size="small"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          sx={{ width: 180, flexShrink: 0, bgcolor: '#fff', borderRadius: 2 }}
        >
          <MenuItem value="">Todos os tipos</MenuItem>
          <MenuItem value="entry">Entrada</MenuItem>
          <MenuItem value="exit">Saída</MenuItem>
          <MenuItem value="move">Movimentação</MenuItem>
        </TextField>
        {/* Filtro de PERÍODO da lista (aba Histórico). */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <CalendarTodayIcon sx={{ color: '#1976D2', fontSize: 18, flexShrink: 0 }} />
          <BrDateField label="De" value={histFrom} onChange={setHistFrom} fullWidth={false} />
          <Typography variant="body2" sx={{ color: '#666' }}>
            até
          </Typography>
          <BrDateField label="Até" value={histTo} onChange={setHistTo} fullWidth={false} />
        </Box>
      </Box>

      <ResponsiveTable
        loading={isLoading}
        rows={sorted}
        rowKey={(m) => m._id}
        emptyMessage="Nenhuma movimentação encontrada"
        headerCellSx={thSx}
        columns={[
          {
            id: 'tipo',
            header: 'Tipo',
            cell: (m) => {
              const view = movementTypeView(m);
              return (
                <Chip
                  label={view.label}
                  size="small"
                  sx={{
                    bgcolor: view.bgcolor,
                    color: view.color,
                    fontWeight: 600,
                    borderRadius: 1.5,
                  }}
                />
              );
            },
          },
          {
            id: 'produto',
            header: 'Produto',
            primary: true,
            cell: (m) => (
              <Typography variant="body2" fontWeight={500}>
                {m.product.productName}
              </Typography>
            ),
          },
          {
            id: 'categoria',
            header: 'Categoria',
            cell: (m) =>
              m.itemType ? (
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
              ),
          },
          { id: 'qtd', header: 'Qtd', cell: (m) => m.quantity },
          {
            id: 'peso',
            header: 'Peso',
            cell: (m) => (m.weightGrams != null ? `${m.weightGrams}g` : '—'),
          },
          {
            id: 'motivo',
            header: 'Motivo',
            sx: { maxWidth: 220 },
            fullWidthOnMobile: true,
            // Exibição sem os códigos internos de lote (BATCH-*). A
            // reimpressão continua lendo o motivo original (batchFromReason).
            cell: (m) => {
              const reason = stripBatchCodes(m.reason);
              return (
                <Typography variant="body2" noWrap title={reason || undefined}>
                  {reason || '—'}
                </Typography>
              );
            },
          },
          { id: 'data', header: 'Data', cell: (m) => formatDate(m.date) },
        ]}
        actions={(m) => (
          <IconButton
            size="small"
            aria-label="ver detalhes"
            onClick={() => {
              setSelectedLabels([]);
              setDetail(m);
            }}
            sx={{ color: '#666' }}
          >
            <VisibilityIcon fontSize="small" />
          </IconButton>
        )}
      />

      {/* ===== Relatório de Produção e Baixas ===== */}
      <Box
        className="producao-baixas-report"
        sx={{ mt: 4, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e8ecf1', p: 2 }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1.5,
            flexWrap: 'wrap',
            mb: 2,
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" fontWeight={700}>
              Relatório de Produção e Baixas
            </Typography>
            <Typography variant="body2" sx={{ color: '#666' }}>
              Um registro por porcionamento (lote): identificação, pesos, estoque atual e —
              nas colunas opcionais — vendas e perdas registradas no período
            </Typography>
          </Box>
          <Box className="no-print" sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<DownloadIcon fontSize="small" />}
              onClick={exportProducaoBaixas}
              sx={exportBtnSx}
            >
              Excel
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<PictureAsPdfIcon fontSize="small" />}
              onClick={printReport}
              sx={exportBtnSx}
            >
              PDF
            </Button>
          </Box>
        </Box>

        {/* Filtros no mesmo estilo da aba Perdas: grupo, produto, fornecedor e período. */}
        <Box
          className="no-print"
          sx={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 1.5,
            mb: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <FilterListIcon sx={{ color: '#1976D2', fontSize: 20 }} />
            <Typography variant="subtitle2" fontWeight={700}>
              Filtros:
            </Typography>
          </Box>
          <TextField
            select
            size="small"
            value={relGroup}
            onChange={(e) => {
              setRelGroup(e.target.value);
              setRelProduct('');
            }}
            sx={{ width: 190, bgcolor: '#fff', borderRadius: 2, flexShrink: 0 }}
          >
            {relGroupOptions.map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            value={relProduct}
            onChange={(e) => setRelProduct(e.target.value)}
            sx={{ width: 210, bgcolor: '#fff', borderRadius: 2, flexShrink: 0 }}
          >
            {relProductOptions.map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            value={relSupplier}
            onChange={(e) => setRelSupplier(e.target.value)}
            sx={{ width: 210, bgcolor: '#fff', borderRadius: 2, flexShrink: 0 }}
          >
            {relSupplierOptions.map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </TextField>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <BrDateField
              label="Data inicial"
              value={relFrom}
              onChange={setRelFrom}
              fullWidth={false}
            />
            <Typography variant="body2" sx={{ color: '#666' }}>
              até
            </Typography>
            <BrDateField
              label="Data final"
              value={relTo}
              onChange={setRelTo}
              fullWidth={false}
            />
          </Box>
        </Box>

        {/* Colunas opcionais: as fixas (Data, Produto, Fornecedor, Lote,
            Lote Origem, Peso Bruto, Peso Líquido, Peso em Estoque e
            Porções em Estoque) sempre aparecem. */}
        <Box
          className="no-print"
          sx={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 0.5,
            mb: 1.5,
          }}
        >
          <Typography variant="subtitle2" fontWeight={700} sx={{ mr: 1 }}>
            Colunas opcionais:
          </Typography>
          {OPTIONAL_REL_COLUMNS.map((c) => (
            <FormControlLabel
              key={c.key}
              control={
                <Checkbox
                  size="small"
                  checked={!!relCols[c.key]}
                  onChange={() => toggleRelCol(c.key)}
                />
              }
              label={<Typography variant="body2">{c.label}</Typography>}
              sx={{ mr: 0.5 }}
            />
          ))}
        </Box>

        <ResponsiveTable
          loading={loadingPortionings || loadingStockItems}
          rows={productionReportRows}
          rowKey={(r) => r.key}
          emptyMessage="Nenhum porcionamento para os filtros selecionados"
          headerCellSx={thSx}
          footerNote={
            productionReportRows.length > 0 ? (
              <Typography variant="body2" fontWeight={700}>
                Total: {totalQtdEstoque} porção(ões) em estoque ({totalPesoEstoque}g)
                {relCols.vendaQtd &&
                  ` · Venda: ${totalVendaQtd} porção(ões) (${totalVendaPeso}g)`}
                {relCols.perdaQtd &&
                  ` · Perdido: ${totalPerdaQtd} porção(ões) (${totalPerdaPeso}g)`}
              </Typography>
            ) : undefined
          }
          columns={relTableColumns}
        />
      </Box>

      <Dialog
        open={!!detail}
        onClose={() => setDetail(null)}
        maxWidth="sm"
        fullWidth
        className="reprint-dialog"
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
            label={detailType?.label ?? ''}
            size="small"
            sx={{ fontWeight: 700, bgcolor: detailType?.bgcolor, color: detailType?.color }}
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
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
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
                <InfoField
                  label="Motivo"
                  value={stripBatchCodes(detail?.reason) || '—'}
                />
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
                  onClick={() => void handleReprint()}
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

      {/* Área de etiquetas da reimpressão. Fica FORA do diálogo (portal, com
          scroll/position próprios) para as páginas não serem cortadas, e fora
          da tela enquanto o diálogo está aberto — só aparece na impressão,
          exatamente como no Recebimento (uma etiqueta de 58mm por página). */}
      {detail && labelsToPrint.length > 0 && (
        <Box
          className="etiquetas-print-area etiquetas-print-area-offscreen"
          sx={{ gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}
        >
          {printAreaLabels.map((label) => (
            <LabelPreview key={label.key} data={label} />
          ))}
        </Box>
      )}
    </LoggedLayout>
  );
}
