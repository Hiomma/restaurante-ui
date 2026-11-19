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
} from '@mui/material';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CloseIcon from '@mui/icons-material/Close';
import PrintIcon from '@mui/icons-material/Print';
import DeleteIcon from '@mui/icons-material/Delete';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import type { StockMovement, StockItem } from '@/types';
import {
  useStockMovements,
  useStockItems,
  useDeleteStockItem,
  useMe,
  useProducts,
} from '@/lib/queries';
import { formatDate, movementTypeView, stripBatchCodes, unitSuffix } from '@/lib/utils';
import { printEtiquetasNativas } from '@/lib/printService';
import LoggedLayout from '../components/LoggedLayout/LoggedLayout';
import ResponsiveTable from '../components/ResponsiveTable/ResponsiveTable';
import BrDateField from '../components/BrDateField/BrDateField';
import LabelPreview, { type LabelData } from '../components/LabelPreview/LabelPreview';
import { colors } from '@/lib/design-system';

const thSx = { fontWeight: 700, color: colors.gray[800] };

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
  unit?: 'kg' | 'l',
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
    unit,
    qrCode: item.qrCode,
  };
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <Typography variant="body2" sx={{ color: colors.gray[500] }}>
      {label}:{' '}
      <Box component="span" sx={{ fontWeight: 700, color: colors.common.black }}>
        {value}
      </Box>
    </Typography>
  );
}

function LabelCard({
  item,
  checked,
  onToggle,
  unit,
}: {
  item: StockItem;
  checked: boolean;
  onToggle: () => void;
  /** Unidade (kg | l) do produto no cadastro. */
  unit?: 'kg' | 'l';
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
      ? { bgcolor: colors.status.successTint, color: colors.status.success }
      : item.status === 'used'
        ? { bgcolor: colors.status.warningTint, color: colors.status.warning }
        : { bgcolor: colors.status.dangerTint, color: colors.status.danger };

  return (
    <Box
      sx={{
        border: `1px solid ${colors.border.default}`,
        borderRadius: 1.5,
        p: 1.5,
        width: 160,
        flexShrink: 0,
        bgcolor: colors.common.white,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
        <Checkbox size="small" checked={checked} onChange={onToggle} sx={{ p: 0, mr: 0.5 }} />
        <Typography variant="body2" fontWeight={700} noWrap>
          {item.product.productName}
        </Typography>
      </Box>
      <Typography variant="body2" fontWeight={700}>
        {item.weightGrams}
        {unitSuffix(unit)}
      </Typography>
      <Typography variant="caption" sx={{ color: colors.gray[500], display: 'block' }}>
        Val: {formatDate(item.expiryDate)}
      </Typography>
      <Typography variant="caption" sx={{ color: colors.gray[500], display: 'block', fontFamily: 'monospace' }}>
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

  /** Unidade (kg | l) de um produto, lida no cadastro. */
  const unitOf = (productId?: string) =>
    (products ?? []).find((p) => p._id === productId)?.unit;
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  /** Filtro de PERÍODO da lista de movimentações (aba Histórico). */
  const [histFrom, setHistFrom] = useState('');
  const [histTo, setHistTo] = useState('');
  const [detail, setDetail] = useState<StockMovement | null>(null);
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const deleteStockItem = useDeleteStockItem();

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
      products?.find((p) => p._id === item.product.productId)?.unit,
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

  return (
    <LoggedLayout>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
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
          <SwapHorizIcon sx={{ color: colors.brand.navy }} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h5" fontWeight="bold">
            Histórico
          </Typography>
          <Typography variant="body2" sx={{ color: colors.gray[500] }}>
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
          sx={{ bgcolor: colors.common.white, borderRadius: 2, flex: '1 1 280px', minWidth: 0 }}
        />
        <TextField
          select
          size="small"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          sx={{ width: 180, flexShrink: 0, bgcolor: colors.common.white, borderRadius: 2 }}
        >
          <MenuItem value="">Todos os tipos</MenuItem>
          <MenuItem value="entry">Entrada</MenuItem>
          <MenuItem value="exit">Saída</MenuItem>
          <MenuItem value="move">Movimentação</MenuItem>
        </TextField>
        {/* Filtro de PERÍODO da lista (aba Histórico). */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <CalendarTodayIcon sx={{ color: colors.brand.navy, fontSize: 18, flexShrink: 0 }} />
          <BrDateField label="De" value={histFrom} onChange={setHistFrom} fullWidth={false} />
          <Typography variant="body2" sx={{ color: colors.gray[500] }}>
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
                    bgcolor: colors.status.neutralTint,
                    color: colors.status.neutral,
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
            cell: (m) =>
              m.weightGrams != null
                ? `${m.weightGrams}${unitSuffix(unitOf(m.product.productId))}`
                : '—',
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
            sx={{ color: colors.gray[500] }}
          >
            <VisibilityIcon fontSize="small" />
          </IconButton>
        )}
      />

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
            sx={{ color: colors.gray[500], mr: -1 }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <Box
              sx={{
                bgcolor: colors.surface.sunken,
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
                value={
                  detail?.weightGrams != null
                    ? `${detail.weightGrams}${unitSuffix(unitOf(detail.product.productId))}`
                    : '—'
                }
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
                  sx={{ color: colors.brand.navy, cursor: 'pointer', fontWeight: 600 }}
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
                  sx={{ textTransform: 'none', color: colors.gray[600], borderColor: colors.gray[200] }}
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
              <Typography variant="body2" sx={{ color: colors.gray[400] }}>
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
                    unit={products?.find((p) => p._id === item.product.productId)?.unit}
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
              color: colors.gray[700],
              borderColor: colors.border.default,
              bgcolor: colors.common.white,
              borderRadius: 1.5,
              px: 2.5,
              '&:hover': { borderColor: colors.border.strong, bgcolor: colors.surface.muted },
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
