'use client';

import { useMemo, useState } from 'react';
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
  InputAdornment,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCutIcon from '@mui/icons-material/ContentCut';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import QrCodeIcon from '@mui/icons-material/QrCode';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import PrintIcon from '@mui/icons-material/Print';
import LabelIcon from '@mui/icons-material/Label';
import { useSnackbar } from 'notistack';
import {
  usePortionings,
  useCreatePortioning,
  useDeletePortioning,
  useUpdateStockItem,
  useCreateStockItem,
  useCreateStockMovement,
  useDeleteStockItem,
  useProducts,
  useEmployees,
  useMe,
  useSuppliers,
  useMovementDestinations,
} from '@/lib/queries';
import { formatDate, todayISODate, toInputDate, unitSuffix } from '@/lib/utils';
import { printEtiquetasNativas } from '@/lib/printService';
import { useAccess } from '@/lib/permissions';
import api from '@/lib/api';
import type { Portioning, StockItem, UsedLabelInfo } from '@/types';
import LoggedLayout from '../components/LoggedLayout/LoggedLayout';
import ConfirmDialog from '../components/ConfirmDialog/ConfirmDialog';
import BrDateField from '../components/BrDateField/BrDateField';
import ResponsiveTable from '../components/ResponsiveTable/ResponsiveTable';
import type { ResponsiveTableColumn } from '../components/ResponsiveTable/ResponsiveTable';
import QrScannerDialog from '../components/QrScannerDialog/QrScannerDialog';
import LabelPreview, { type LabelData } from '../components/LabelPreview/LabelPreview';
import { colors } from '@/lib/design-system';

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    height: 44,
  },
} as const;

const containedSx = {
  textTransform: 'none',
  borderRadius: 1.5,
  bgcolor: colors.brand.navy,
  px: 2.5,
  boxShadow: 'none',
  '&:hover': { bgcolor: colors.brand.navyDark, boxShadow: 'none' },
} as const;

const outlinedCancelSx = {
  textTransform: 'none',
  color: colors.gray[700],
  borderColor: colors.border.default,
  bgcolor: colors.common.white,
  borderRadius: 1.5,
  px: 2.5,
  '&:hover': { borderColor: colors.border.strong, bgcolor: colors.surface.muted },
} as const;

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <Typography variant="body2" fontWeight={600} sx={{ mb: 0.75 }}>
      {children}
      {required && ' *'}
    </Typography>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 2,
        py: 1,
        borderBottom: `1px solid ${colors.border.hairline}`,
      }}
    >
      <Typography variant="body2" sx={{ color: colors.gray[500] }}>
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={600} sx={{ textAlign: 'right' }}>
        {value}
      </Typography>
    </Box>
  );
}

/**
 * Colunas do histórico de porcionamentos. Recebe `unitOf` porque os pesos
 * são exibidos na unidade CADASTRA do produto (kg | l) — a base é sempre g.
 */
function buildPortioningColumns(
  unitOf: (productId?: string) => 'kg' | 'l' | undefined,
): ResponsiveTableColumn<Portioning>[] {
  return [
  {
    id: 'product',
    header: 'Produto',
    primary: true,
    cell: (p) => (
      <Typography fontWeight={500}>
        {p.outputs && p.outputs.length > 0
          ? p.outputs
              .map(
                (o) =>
                  `${o.productName} (${o.portionsCount}${
                    o.portionWeightGrams
                      ? ` × ${o.portionWeightGrams}${unitSuffix(unitOf(o.productId))}`
                      : ''
                  })`,
              )
              .join(', ')
          : p.product.productName}
      </Typography>
    ),
  },
  {
    id: 'lote',
    header: 'Lote',
    cell: (p) => (
      <Typography
        variant="body2"
        sx={{ fontFamily: 'monospace', fontSize: 13, color: colors.brand.navyDark }}
      >
        {p.lote || '—'}
      </Typography>
    ),
  },
  {
    id: 'loteOrigem',
    header: 'Lote Origem',
    cell: (p) => (
      <Typography
        variant="body2"
        sx={{ fontFamily: 'monospace', fontSize: 13, color: colors.gray[400] }}
      >
        {p.rawLote || '—'}
      </Typography>
    ),
  },
  {
    id: 'rawWeight',
    header: 'Peso Bruto',
    cell: (p) =>
      `${p.rawWeightGrams}${unitSuffix(unitOf(p.rawProduct?.productId ?? p.product.productId))}`,
  },
  {
    id: 'cleanWeight',
    header: 'Peso Limpo',
    cell: (p) =>
      `${p.cleanWeightGrams}${unitSuffix(unitOf(p.rawProduct?.productId ?? p.product.productId))}`,
  },
  {
    id: 'lossPercentage',
    header: '% Perda',
    cell: (p) => (
      <Chip
        label={`${p.lossPercentage?.toFixed(1) ?? '0.0'}%`}
        size="small"
        sx={{
          bgcolor: colors.status.successTint,
          color: colors.status.success,
          fontWeight: 600,
          borderRadius: 1,
        }}
      />
    ),
  },
  {
    id: 'portions',
    header: 'Porções',
    cell: (p) =>
      `${p.portionsCount} (${p.portionWeightGrams}${unitSuffix(unitOf(p.product.productId))})`,
  },
  {
    id: 'employee',
    header: 'Funcionário',
    cell: (p) => p.employeeName || '—',
  },
  {
    id: 'date',
    header: 'Data',
    cell: (p) => formatDate(p.date),
  },
  ];
}

export default function PortioningsPage() {
  const { enqueueSnackbar } = useSnackbar();
  const { data: portionings, isLoading } = usePortionings();
  const { data: products } = useProducts();

  /** Unidade (kg | l) de um produto, lida no cadastro. */
  const unitOf = (productId?: string) =>
    (products ?? []).find((p) => p._id === productId)?.unit;
  const { data: employees } = useEmployees();
  const { data: me } = useMe();
  const { data: suppliers } = useSuppliers();
  const { data: looseDestinations } = useMovementDestinations();
  const createPortioning = useCreatePortioning();
  const deletePortioning = useDeletePortioning();
  const updateStockItem = useUpdateStockItem();
  const createStockItem = useCreateStockItem();
  const createMovement = useCreateStockMovement();
  const deleteStockItem = useDeleteStockItem();
  // Funcionário com acesso restrito: pode criar porcionamento, mas o
  // histórico é somente visualização (sem editar/excluir).
  const { porcionamentoCreate, porcionamentoDelete } = useAccess();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewTarget, setViewTarget] = useState<Portioning | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [scanInput, setScanInput] = useState('');
  const [scanned, setScanned] = useState<StockItem[]>([]);
  const [scanning, setScanning] = useState(false);
  const [cleanWeight, setCleanWeight] = useState('');
  const [outputs, setOutputs] = useState<
    { productId: string; count: string; weight: string }[]
  >([]);
  const [lote, setLote] = useState('');
  const [employeeName, setEmployeeName] = useState('');
  const [supplier, setSupplier] = useState('');
  const [date, setDate] = useState(todayISODate());
  const [submitting, setSubmitting] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [printingLabels, setPrintingLabels] = useState<LabelData[] | null>(null);
  // Busca por produto/lote na tabela do histórico de porcionamento.
  const [historySearch, setHistorySearch] = useState('');
  const [looseLabelOpen, setLooseLabelOpen] = useState(false);
  const [looseProduct, setLooseProduct] = useState('');
  const [looseWeight, setLooseWeight] = useState('');
  const [looseDest, setLooseDest] = useState('');
  /** Quantidade de etiquetas avulsas a gerar (cada uma com lote/QR próprio). */
  const [looseQty, setLooseQty] = useState('1');
  const [looseSaving, setLooseSaving] = useState(false);
  /** Etiquetas avulsas geradas na última ação (preview + devolução/descarte). */
  const [looseItems, setLooseItems] = useState<StockItem[]>([]);

  // ===== Devolução / descarte de etiqueta avulsa (total ou parcial) =====
  const [looseAction, setLooseAction] = useState<{
    item: StockItem;
    action: 'devolucao' | 'descarte';
  } | null>(null);
  const [looseActionMode, setLooseActionMode] = useState<'total' | 'parcial'>('total');
  const [looseActionWeight, setLooseActionWeight] = useState('');
  const [looseActionReason, setLooseActionReason] = useState('');
  const [looseActionOther, setLooseActionOther] = useState('');
  const [looseActionSaving, setLooseActionSaving] = useState(false);

  /** Destinos fixos de baixa (mesmos do cadastro). */
  const fixedWriteoffDestinations = ['Perda', 'Não encontrado'];
  /**
   * Motivos de baixa: os destinos cadastrados como "Baixar" em Cadastros →
   * Destinos — os MESMOS da Contagem (a lista antiga era hardcoded).
   */
  const writeoffReasons = [
    ...fixedWriteoffDestinations,
    ...(looseDestinations ?? [])
      .filter(
        (d) =>
          d.active && d.type === 'writeoff' && !fixedWriteoffDestinations.includes(d.name),
      )
      .map((d) => d.name),
  ];

  const totalGrams = scanned.reduce((sum, item) => sum + item.weightGrams, 0);
  const limpo = Number(cleanWeight) || 0;
  /** Peso limpo maior que o bruto = ganho (não é rejeitado). */
  const gainGrams = Math.max(0, limpo - totalGrams);
  const perda = Math.max(0, totalGrams - limpo);
  const perdaPct = totalGrams > 0 ? (perda / totalGrams) * 100 : 0;
  const supplierOptions = (suppliers ?? []).filter((s) => s.active !== false);
  const product = products?.find((p) => p._id === scanned[0]?.product.productId);
  const looseProducts = (products ?? []).filter((p) => p.allowLooseLabel === true);

  const fixedLooseDestinations = ['Salão', 'Bar', 'Cozinha'];
  const looseDestOptions = [
    ...fixedLooseDestinations,
    ...(looseDestinations ?? [])
      .filter(
        (d) =>
          d.active &&
          (d.type ?? 'move') === 'move' &&
          !fixedLooseDestinations.includes(d.name),
      )
      .map((d) => d.name),
  ];

  const totalPortions = outputs.reduce((sum, row) => sum + (parseInt(row.count, 10) || 0), 0);
  const allocatedWeight = outputs.reduce((sum, row) => sum + (Number(row.weight) || 0), 0);
  const unallocatedWeight = Math.max(0, limpo - allocatedWeight);
  const overAllocated = allocatedWeight > limpo;
  const rowPortionWeight = (row: { count: string; weight: string }): number => {
    const count = parseInt(row.count, 10) || 0;
    const weight = Number(row.weight) || 0;
    return count > 0 && weight > 0 ? Math.round(weight / count) : 0;
  };

  const employeeOptions = useMemo(() => {
    const names = new Set<string>();
    if (me?.name) names.add(me.name);
    employees?.filter((e) => e.active !== false).forEach((e) => names.add(e.name));
    return Array.from(names);
  }, [employees, me]);

  const resetForm = () => {
    setScanInput('');
    setScanned([]);
    setCleanWeight('');
    setOutputs([]);
    setLote('');
    setEmployeeName(me?.name ?? '');
    setSupplier('');
    setDate(todayISODate());
  };

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  /**
   * Busca a etiqueta pelo código. `codeInput` permite usar o valor lido pela
   * câmera (QrScannerDialog) sem depender do estado do campo de texto.
   */
  const handleScan = async (codeInput?: string) => {
    const code = (codeInput ?? scanInput).trim().toUpperCase();
    if (!code || scanning) return;
    setScanning(true);
    try {
      const res = await api.get<StockItem>(`/stock-items/qr/${code}`);
      const item = res.data;
      if (item.status !== 'in_stock' || item.type !== 'raw') {
        enqueueSnackbar('Etiqueta inválida: precisa estar em estoque e ser do tipo bruto.', {
          variant: 'error',
        });
        return;
      }
      if (scanned.some((s) => s._id === item._id)) {
        enqueueSnackbar('Esta etiqueta já foi adicionada.', { variant: 'error' });
        return;
      }
      if (scanned.length > 0 && scanned[0].product.productId !== item.product.productId) {
        enqueueSnackbar('Todas as etiquetas devem ser do mesmo produto.', { variant: 'error' });
        return;
      }
      setScanned((prev) => {
        const next = [...prev, item];
        if (next.length === 1) {
          setOutputs([{ productId: item.product.productId, count: '', weight: '' }]);
        }
        return next;
      });
      // Lote de ORIGEM da matéria-prima fica em `rawLote` (gravado no submit);
      // o número do lote do porcionamento é criado automaticamente.
      if (!lote) setLote(generatePortioningLote());
      // Fornecedor da entrada da matéria-prima (rastreamento de lote de origem).
      if (!supplier && item.supplier) setSupplier(item.supplier);
      setScanInput('');
    } catch (err) {
      const response = (err as { response?: { status?: number; data?: unknown } }).response;
      const used = response?.data as UsedLabelInfo | undefined;
      if (response?.status === 410 && used?.used) {
        // Etiqueta já baixada: informa o destino/autor em vez do 404 genérico
        // e NÃO segue com o porcionamento a partir desta etiqueta.
        const details: string[] = [];
        if (used.productName) details.push(used.productName);
        if (used.destination) details.push(`destino: ${used.destination}`);
        if (used.userName) details.push(`por ${used.userName}`);
        if (used.removedAt) details.push(`em ${formatDate(used.removedAt)}`);
        enqueueSnackbar(
          details.length > 0
            ? `Etiqueta já usada: ${details.join(' — ')}`
            : 'Etiqueta já usada.',
          { variant: 'info' },
        );
        return;
      }
      enqueueSnackbar('Etiqueta não encontrada.', { variant: 'error' });
    } finally {
      setScanning(false);
    }
  };

  const removeScanned = (id: string) => {
    setScanned((prev) => {
      const next = prev.filter((item) => item._id !== id);
      if (next.length === 0) setOutputs([]);
      return next;
    });
  };

  const updateOutput = (
    index: number,
    patch: { productId?: string; count?: string; weight?: string },
  ) => {
    setOutputs((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const addOutput = () => {
    setOutputs((prev) => [...prev, { productId: '', count: '', weight: '' }]);
  };

  const removeOutput = (index: number) => {
    setOutputs((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (scanned.length === 0) return;
    const rows = outputs
      .map((row) => ({
        ...row,
        count: parseInt(row.count, 10) || 0,
        weight: Number(row.weight) || 0,
      }))
      .filter((row) => row.productId && row.count > 0);
    const n = rows.reduce((sum, row) => sum + row.count, 0);
    const allocated = rows.reduce((sum, row) => sum + row.weight, 0);

    if (!limpo || limpo <= 0) {
      enqueueSnackbar('Informe o Peso Limpo (g).', { variant: 'error' });
      return;
    }
    if (rows.length === 0 || n < 1) {
      enqueueSnackbar('Informe os produtos gerados e a quantidade de porções.', {
        variant: 'error',
      });
      return;
    }
    if (rows.some((row) => !row.productId)) {
      enqueueSnackbar('Selecione o produto de cada linha.', { variant: 'error' });
      return;
    }
    if (rows.some((row) => row.weight <= 0)) {
      enqueueSnackbar('Informe o peso a porcionar de cada produto gerado.', { variant: 'error' });
      return;
    }
    if (allocated > limpo) {
      enqueueSnackbar('A soma dos pesos dos produtos excede o Peso Limpo.', { variant: 'error' });
      return;
    }
    setSubmitting(true);
    try {
      const bruto = totalGrams;
      const lossGrams = Math.max(0, bruto - limpo);
      const pct = bruto > 0 ? ((lossGrams / bruto) * 100).toFixed(1) : '0.0';
      const first = scanned[0];
      const batchId = `BATCH-PORT-${Date.now()}`;
      const nameOf = (id: string) =>
        products?.find((p) => p._id === id)?.name ??
        (first.product.productId === id ? first.product.productName : id);
      const createdItems: StockItem[] = [];

      await createPortioning.mutateAsync({
        productId: rows[0].productId,
        productName: nameOf(rows[0].productId),
        // Matéria-prima real escaneada (produto do item de entrada): sem
        // isto a API gravava em `rawProduct` o produto de SAÍDA e o
        // relatório de Rendimento descartava o registro.
        rawProductId: first.product.productId,
        rawProductName: first.product.productName,
        outputs: rows.map((row) => ({
          productId: row.productId,
          productName: nameOf(row.productId),
          portionsCount: row.count,
          portionWeightGrams: Math.round(row.weight / row.count),
        })),
        rawWeightGrams: bruto,
        cleanWeightGrams: limpo,
        lossGrams,
        // Ganho: peso limpo maior que o bruto (informado apenas quando houver).
        ...(gainGrams > 0 ? { gainGrams } : {}),
        supplier: supplier || undefined,
        // Lote de origem da matéria-prima (rastreamento): lote da etiqueta
        // de entrada escaneada.
        rawLote: scanned[0]?.lote || undefined,
        // Vínculo com as etiquetas geradas (relatório de produção e baixa).
        batchId,
        portionsCount: n,
        date,
        lote,
        employeeName,
      });

      for (const item of scanned) {
        await updateStockItem.mutateAsync({
          id: item._id,
          data: { status: 'used', batchId },
        });
      }

      for (const row of rows) {
        const rowProduct = products?.find((p) => p._id === row.productId);
        const rowProductName = nameOf(row.productId);
        const rowPpg = Math.round(row.weight / row.count);
        let expiryDate = first.expiryDate;
        if (rowProduct) {
          const [y, m, d] = date.split('-').map(Number);
          const exp = new Date(y, (m || 1) - 1, d || 1);
          exp.setDate(exp.getDate() + (rowProduct.shelfLifeDays ?? 0));
          expiryDate = toInputDate(exp.toISOString());
        }

        for (let i = 0; i < row.count; i++) {
          const created = await createStockItem.mutateAsync({
            productId: row.productId,
            productName: rowProductName,
            type: 'portioned',
            weightGrams: rowPpg,
            manipulationDate: date,
            expiryDate,
            lote,
            employeeName,
            productGroup: rowProduct?.group ?? first.product.productGroup,
            productStorage: rowProduct?.storageMethod ?? first.product.productStorage,
            batchId,
          });
          createdItems.push(created as StockItem);
        }

        await createMovement.mutateAsync({
          productId: row.productId,
          productName: rowProductName,
          movementType: 'entry',
          quantity: row.count,
          weightGrams: row.count * rowPpg,
          itemType: 'portioned',
          // Lote gerado no porcionamento: filtro de busca por lote.
          lote: lote || undefined,
          reason: `Porcionamento — Lote ${lote || '-'} — ${row.count} porções de ${rowPpg}g — ${employeeName || '-'} — ${batchId}`,
          date,
        });
      }

      await createMovement.mutateAsync({
        productId: first.product.productId,
        productName: product?.name ?? first.product.productName,
        movementType: 'exit',
        quantity: scanned.length,
        weightGrams: bruto,
        itemType: 'raw',
        // Lote de ORIGEM da matéria-prima consumida no porcionamento.
        lote: scanned[0]?.lote || undefined,
        reason: `Porcionamento — Lote ${lote || '-'} — Perda: ${lossGrams}g (${pct}%) — ${employeeName || '-'} — ${batchId}`,
        date,
      });

      // Monta as etiquetas dos itens porcionados para impressão (igual ao recebimento).
      const labels: LabelData[] = createdItems.map((item, idx) => {
        const rowProduct = products?.find((p) => p._id === item.product.productId);
        return {
          key: `${item._id}-${idx}`,
          companyName: me?.company?.name ?? '',
          productName: item.product.productName,
          storage: item.product.productStorage ?? '',
          weightGrams: item.weightGrams,
          unit: rowProduct?.unit,
          recebimentoDate: item.manipulationDate,
          expiryDate: item.expiryDate,
          lote: item.lote,
          responsavel: item.employeeName,
          consumeAfterOpeningDays: rowProduct?.consumeAfterOpeningDays,
          qrCode: item.qrCode,
        };
      });
      setPrintingLabels(labels);

      enqueueSnackbar('Porcionamento gerado com sucesso.', { variant: 'success' });
      setDialogOpen(false);
      resetForm();
    } catch {
      enqueueSnackbar('Erro ao gerar porcionamento. Verifique os dados e tente novamente.', {
        variant: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (deleteTarget) {
      await deletePortioning.mutateAsync(deleteTarget);
      setDeleteTarget(null);
    }
  };

  const printLabels = async (labels: LabelData[]) => {
    const removePrintClass = () => document.body.classList.remove('printing-labels');
    window.addEventListener('afterprint', removePrintClass, { once: true });
    document.body.classList.add('printing-labels');
    try {
      if (await printEtiquetasNativas(labels)) return;
      await new Promise((r) => setTimeout(r, 250));
      window.print();
    } finally {
      window.removeEventListener('afterprint', removePrintClass);
      removePrintClass();
    }
  };

  const handlePrintPendingLabels = async () => {
    if (!printingLabels || printingLabels.length === 0) return;
    await printLabels(printingLabels);
    setPrintingLabels(null);
  };

  /**
   * Lote da etiqueta avulsa: até 6 dígitos, letras e números, DIFERENTE
   * para cada etiqueta da mesma geração (o `used` evita repetir dentro do
   * próprio lote).
   */
  function generateLooseLote(used: Set<string>): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    do {
      result = '';
      for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    } while (used.has(result));
    return result;
  }

  /** Número de lote criado automaticamente para cada porcionamento. */
  function generatePortioningLote(): string {
    return `P${Date.now().toString(36).toUpperCase()}`;
  }

  const handleCreateLooseLabel = async () => {
    if (!looseProduct || !looseWeight || !looseDest) return;
    const qty = Math.max(1, Math.min(100, parseInt(looseQty, 10) || 1));
    const product = products?.find((p) => p._id === looseProduct);
    if (!product || product.allowLooseLabel !== true) {
      enqueueSnackbar('Este produto não permite etiqueta avulsa.', {
        variant: 'error',
      });
      return;
    }
    setLooseSaving(true);
    const created: StockItem[] = [];
    try {
      const weightGrams = Number(looseWeight);
      const [y, m, d] = todayISODate().split('-').map(Number);
      const exp = new Date(y, (m || 1) - 1, d || 1);
      exp.setDate(exp.getDate() + (product.shelfLifeDays ?? 0));
      const expiryDate = toInputDate(exp.toISOString());
      const type = product.category === 'Porcionado' ? 'portioned' : 'raw';
      const usedLotes = new Set<string>();

      for (let i = 0; i < qty; i++) {
        // Cada etiqueta: lote próprio (≤6 alfanuméricos) e QR próprio — o QR
        // é gerado pela API (índice único), garantindo um código por etiqueta.
        const loteAvulsa = generateLooseLote(usedLotes);
        usedLotes.add(loteAvulsa);

        const item = await createStockItem.mutateAsync({
          productId: product._id,
          productName: product.name,
          type,
          weightGrams,
          manipulationDate: todayISODate(),
          expiryDate,
          lote: loteAvulsa,
          employeeName: me?.name,
          productGroup: product.group,
          productStorage: product.storageMethod,
          destination: looseDest,
        });
        created.push(item as StockItem);

        await createMovement.mutateAsync({
          productId: product._id,
          productName: product.name,
          movementType: 'entry',
          quantity: 1,
          weightGrams,
          itemType: type,
          destination: looseDest,
          lote: loteAvulsa,
          reason: `Etiqueta avulsa — Destino: ${looseDest} — ${me?.name ?? '-'} — Lote ${loteAvulsa}`,
          date: todayISODate(),
        });
      }

      enqueueSnackbar(
        qty > 1
          ? `${qty} etiquetas avulsas geradas e lançadas no estoque!`
          : 'Etiqueta avulsa gerada e lançada no estoque!',
        { variant: 'success' },
      );
      setLooseLabelOpen(false);
      setLooseProduct('');
      setLooseWeight('');
      setLooseDest('');
      setLooseQty('1');
    } catch {
      enqueueSnackbar(
        created.length > 0
          ? `${created.length} etiqueta(s) gerada(s), mas houve erro na geração. Verifique o estoque.`
          : 'Erro ao gerar etiqueta avulsa.',
        { variant: 'error' },
      );
    } finally {
      // Preview + ações valem para as etiquetas efetivamente criadas.
      if (created.length > 0) setLooseItems(created);
      setLooseSaving(false);
    }
  };

  /**
   * Devolução/DESCARTE de etiqueta avulsa, total ou parcial, sempre com um
   * dos motivos de baixa — é o que permite medir o desperdício por motivo.
   */
  const openLooseAction = (item: StockItem, action: 'devolucao' | 'descarte') => {
    setLooseAction({ item, action });
    setLooseActionMode('total');
    setLooseActionWeight('');
    setLooseActionReason('');
    setLooseActionOther('');
  };

  const handleLooseAction = async () => {
    if (!looseAction) return;
    const { item, action } = looseAction;
    const motivo =
      looseActionReason === 'Outro' ? looseActionOther.trim() : looseActionReason;
    if (!motivo) {
      enqueueSnackbar('Informe o motivo da baixa.', { variant: 'error' });
      return;
    }
    const partialGrams = Number(looseActionWeight);
    if (
      looseActionMode === 'parcial' &&
      (!partialGrams || partialGrams <= 0 || partialGrams >= item.weightGrams)
    ) {
      enqueueSnackbar('Informe um peso de baixa menor que o peso da etiqueta.', {
        variant: 'error',
      });
      return;
    }

    const label = action === 'devolucao' ? 'Devolução' : 'Descarte';
    // Descarte: o destino É o motivo marcado (já é um destino de baixa
    // cadastrado) — a antiga lógica rebaixava tudo para 'Perda'.
    const destination = action === 'devolucao' ? 'Devolução' : looseActionReason;
    const loteLabel = item.lote || '-';

    setLooseActionSaving(true);
    try {
      if (looseActionMode === 'parcial') {
        // PARCIAL: mede o desperdício em peso; a etiqueta segue no estoque.
        const restante = item.weightGrams - partialGrams;
        await createMovement.mutateAsync({
          productId: item.product.productId,
          productName: item.product.productName,
          movementType: 'exit',
          quantity: 1,
          weightGrams: partialGrams,
          itemType: item.type,
          destination,
          lote: item.lote,
          reason: `Etiqueta avulsa — ${label} parcial — ${partialGrams}g de ${item.weightGrams}g — ${motivo} — Lote ${loteLabel}`,
          date: todayISODate(),
        });
        await updateStockItem.mutateAsync({ id: item._id, data: { weightGrams: restante } });
        setLooseItems((prev) =>
          prev.map((i) => (i._id === item._id ? { ...i, weightGrams: restante } : i)),
        );
        enqueueSnackbar(
          `${label} parcial: ${partialGrams}g — ${motivo}. Restante na etiqueta: ${restante}g.`,
          { variant: 'success' },
        );
      } else {
        // TOTAL: movimento de baixa + exclusão com destino no tombstone.
        await createMovement.mutateAsync({
          productId: item.product.productId,
          productName: item.product.productName,
          movementType: 'exit',
          quantity: 1,
          weightGrams: item.weightGrams,
          itemType: item.type,
          destination,
          lote: item.lote,
          reason: `Etiqueta avulsa — ${label} — ${motivo} — Lote ${loteLabel}`,
          date: todayISODate(),
        });
        await deleteStockItem.mutateAsync({ id: item._id, destination });
        setLooseItems((prev) => prev.filter((i) => i._id !== item._id));
        enqueueSnackbar(`${label} registrada — ${motivo} (Lote ${loteLabel}).`, {
          variant: 'success',
        });
      }
      setLooseAction(null);
    } catch {
      enqueueSnackbar(`Erro ao registrar ${label.toLowerCase()}.`, { variant: 'error' });
    } finally {
      setLooseActionSaving(false);
    }
  };

  /** Dados das etiquetas avulsas para preview/impressão (padrão do sistema). */
  const looseLabelsData: LabelData[] = looseItems.map((item) => ({
    key: `loose-${item._id}`,
    companyName: me?.company?.name ?? '',
    productName: item.product.productName,
    storage: item.product.productStorage ?? '',
    weightGrams: item.weightGrams,
    unit: products?.find((p) => p._id === item.product.productId)?.unit,
    recebimentoDate: item.manipulationDate,
    expiryDate: item.expiryDate,
    lote: item.lote,
    responsavel: item.employeeName,
    consumeAfterOpeningDays: products?.find((p) => p._id === item.product.productId)
      ?.consumeAfterOpeningDays,
    qrCode: item.qrCode,
  }));

  /**
   * Busca do histórico por produto OU lote — casa o lote GERADO no
   * porcionamento e o lote de ORIGEM da matéria-prima.
   */
  const normalized = (value: string) =>
    value.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
  const historyQuery = normalized(historySearch.trim());
  const filteredPortioningRows = (portionings ?? []).filter((pt) => {
    if (!historyQuery) return true;
    const names = [
      pt.product.productName,
      pt.rawProduct?.productName ?? '',
      ...(pt.outputs ?? []).map((o) => o.productName),
    ];
    if (names.some((n) => normalized(n).includes(historyQuery))) return true;
    if (normalized(pt.lote ?? '').includes(historyQuery)) return true;
    if (normalized(pt.rawLote ?? '').includes(historyQuery)) return true;
    return false;
  });

  return (
    <LoggedLayout>
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
              bgcolor: colors.brand.navyTint,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <ContentCutIcon sx={{ color: colors.brand.navy, fontSize: 22 }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight="bold">
              Porcionamento
            </Typography>
            <Typography variant="body2" sx={{ color: colors.gray[500] }}>
              Converta produto bruto em porcionado com controle de perdas
            </Typography>
          </Box>
        </Box>
        {porcionamentoCreate && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate} sx={containedSx}>
            Novo Porcionamento
          </Button>
        )}
        {porcionamentoCreate && (
          <Button
            variant="contained"
            startIcon={<LabelIcon />}
            onClick={() => setLooseLabelOpen(true)}
            sx={containedSx}
          >
            Etiqueta Avulsa
          </Button>
        )}
      </Box>

      <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
        <TextField
          size="small"
          placeholder="Buscar por produto ou lote..."
          value={historySearch}
          onChange={(e) => setHistorySearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
          }}
          sx={{ bgcolor: colors.common.white, borderRadius: 2, flexGrow: 1, minWidth: { xs: 0, sm: 260 } }}
        />
      </Box>

      <ResponsiveTable
        columns={buildPortioningColumns(unitOf)}
        rows={filteredPortioningRows}
        rowKey={(p) => p._id}
        loading={isLoading}
        emptyMessage="Nenhum porcionamento encontrado"
        actions={(p) => (
          <>
            <IconButton
              size="small"
              onClick={() => setViewTarget(p)}
              sx={{ color: colors.gray[500] }}
            >
              <VisibilityIcon fontSize="small" />
            </IconButton>
            {!porcionamentoDelete && (
              <IconButton
                size="small"
                onClick={() => setDeleteTarget(p._id)}
                sx={{ color: colors.status.dangerStrong }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            )}
          </>
        )}
      />

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            pb: 1,
          }}
        >
          Novo Porcionamento
          <IconButton
            aria-label="fechar"
            onClick={() => setDialogOpen(false)}
            size="small"
            sx={{ color: colors.gray[500], mr: -1 }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
            <Box>
              <Typography variant="body1" fontWeight={700} sx={{ mb: 1.5 }}>
                1. Escanear etiquetas brutas
              </Typography>
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                <TextField
                  autoFocus
                  fullWidth
                  size="small"
                  sx={{ ...fieldSx, minWidth: 0 }}
                  placeholder="Escaneie o QR ou digite o código (6 dígitos)..."
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void handleScan();
                    }
                  }}
                  slotProps={{ htmlInput: { maxLength: 6 } }}
                />
                <Button
                  variant="outlined"
                  startIcon={<QrCodeIcon />}
                  onClick={() => void handleScan()}
                  disabled={scanning}
                  sx={{
                    textTransform: 'none',
                    borderRadius: 1.5,
                    color: colors.brand.navy,
                    borderColor: colors.brand.navy,
                    px: 2.5,
                    height: 40,
                    '&:hover': { borderColor: colors.brand.navyDark, bgcolor: colors.brand.navyTint },
                  }}
                >
                  Add
                </Button>
                <IconButton
                  aria-label="Ler QR Code pela câmera"
                  onClick={() => setQrDialogOpen(true)}
                  disabled={scanning}
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 1.5,
                    border: `1px solid ${colors.brand.navy}`,
                    color: colors.brand.navy,
                    '&:hover': { bgcolor: colors.brand.navyTint },
                  }}
                >
                  <QrCodeScannerIcon fontSize="small" />
                </IconButton>
              </Box>
              <Typography variant="caption" sx={{ color: colors.gray[500], mt: 0.75, display: 'block' }}>
                Pressione Enter após cada leitura.
              </Typography>
            </Box>

            {scanned.length > 0 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {scanned.map((item) => (
                  <Box
                    key={item._id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 2,
                      border: `1px solid ${colors.border.default}`,
                      borderRadius: 1.5,
                      px: 1.5,
                      py: 1,
                      bgcolor: colors.surface.row,
                    }}
                  >
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        {item.product.productName}
                      </Typography>
                      <Typography variant="caption" sx={{ color: colors.gray[500] }}>
                        {item.weightGrams}
                        {unitSuffix(unitOf(item.product.productId))} — QR {item.qrCode}
                        {item.lote ? ` — Lote ${item.lote}` : ''}
                      </Typography>
                    </Box>
                    <IconButton
                      size="small"
                      onClick={() => removeScanned(item._id)}
                      sx={{ color: colors.status.dangerStrong }}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
                <Typography variant="body2" sx={{ color: colors.gray[500], fontWeight: 600 }}>
                  {scanned.length} etiquetas — {totalGrams}g
                </Typography>
              </Box>
            )}

            {scanned.length > 0 && (
              <Box>
                <Typography variant="body1" fontWeight={700} sx={{ mb: 1.5 }}>
                  2. Dados do porcionamento
                </Typography>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                    gap: 2,
                  }}
                >
                  <Box>
                    <FieldLabel required>Peso Limpo (g)</FieldLabel>
                    <TextField
                      type="number"
                      placeholder="Ex: 18000"
                      value={cleanWeight}
                      onChange={(e) => setCleanWeight(e.target.value)}
                      fullWidth
                      size="small"
                      sx={fieldSx}
                    />
                  </Box>
                  <Box>
                    <FieldLabel>Lote</FieldLabel>
                    <TextField
                      placeholder="Ex: L001"
                      value={lote}
                      onChange={(e) => setLote(e.target.value)}
                      fullWidth
                      size="small"
                      sx={fieldSx}
                    />
                  </Box>
                  <Box>
                    <FieldLabel>Funcionário</FieldLabel>
                    <TextField
                      select
                      fullWidth
                      size="small"
                      value={employeeName}
                      onChange={(e) => setEmployeeName(e.target.value)}
                      sx={fieldSx}
                      SelectProps={{
                        displayEmpty: true,
                        renderValue: (value) =>
                          !value ? (
                            <Box component="span" sx={{ color: 'text.disabled' }}>
                              Selecione o funcionário
                            </Box>
                          ) : (
                            String(value)
                          ),
                      }}
                    >
                      <MenuItem value="">
                        <em>Selecione o funcionário</em>
                      </MenuItem>
                      {employeeOptions.map((name) => (
                        <MenuItem key={name} value={name}>
                          {name}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Box>
                  <Box>
                    <FieldLabel>Fornecedor</FieldLabel>
                    <TextField
                      select
                      fullWidth
                      size="small"
                      value={supplier}
                      onChange={(e) => setSupplier(e.target.value)}
                      sx={fieldSx}
                      SelectProps={{
                        displayEmpty: true,
                        renderValue: (value) =>
                          !value ? (
                            <Box component="span" sx={{ color: 'text.disabled' }}>
                              — Sem fornecedor —
                            </Box>
                          ) : (
                            String(value)
                          ),
                      }}
                    >
                      <MenuItem value="">— Sem fornecedor —</MenuItem>
                      {supplierOptions.map((s) => (
                        <MenuItem key={s._id} value={s.name}>
                          {s.name}
                        </MenuItem>
                      ))}
                    </TextField>
                    {supplierOptions.length === 0 && (
                      <Typography variant="caption" sx={{ color: colors.gray[400], mt: 0.5, display: 'block' }}>
                        Nenhum fornecedor cadastrado. Cadastre em Cadastros → Fornecedores.
                      </Typography>
                    )}
                  </Box>
                  <Box>
                    <FieldLabel>Data</FieldLabel>
                    <BrDateField
                      value={date}
                      onChange={setDate}
                    />
                  </Box>
                </Box>
                <Box sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                  <Typography variant="body2" sx={{ color: colors.gray[400] }}>
                    Peso bruto: {totalGrams}g
                  </Typography>
                  <Typography variant="body2" sx={{ color: colors.gray[400] }}>
                    Perda: {perda}g ({perdaPct.toFixed(1)}%)
                  </Typography>
                  {gainGrams > 0 && (
                    <Chip
                      label={`Ganho: ${gainGrams} g`}
                      size="small"
                      sx={{
                        alignSelf: 'flex-start',
                        mt: 0.5,
                        bgcolor: colors.status.successTint,
                        color: colors.status.success,
                        fontWeight: 600,
                      }}
                    />
                  )}
                </Box>
              </Box>
            )}

            {scanned.length > 0 && (
              <Box>
                <Typography variant="body1" fontWeight={700} sx={{ mb: 1.5 }}>
                  3. Produtos gerados
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {outputs.map((row, index) => {
                    const ppg = rowPortionWeight(row);
                    return (
                      <Box key={index}>
                        <Box
                          sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr', sm: '1fr 100px 140px 44px' },
                            gap: 1.5,
                            alignItems: 'center',
                          }}
                        >
                      <TextField
                        select
                        size="small"
                        fullWidth
                        value={row.productId}
                        onChange={(e) => updateOutput(index, { productId: e.target.value })}
                        sx={fieldSx}
                        SelectProps={{
                          displayEmpty: true,
                          renderValue: (value) =>
                            !value ? (
                              <Box component="span" sx={{ color: 'text.disabled' }}>
                                Produto gerado
                              </Box>
                            ) : (
                              products?.find((p) => p._id === value)?.name ?? String(value)
                            ),
                        }}
                      >
                        <MenuItem value="">
                          <em>Produto gerado</em>
                        </MenuItem>
                        {products?.map((p) => (
                          <MenuItem key={p._id} value={p._id}>
                            {p.name}
                          </MenuItem>
                        ))}
                      </TextField>
                          <TextField
                            type="number"
                            size="small"
                            fullWidth
                            placeholder="Porções"
                            value={row.count}
                            onChange={(e) => updateOutput(index, { count: e.target.value })}
                            slotProps={{ htmlInput: { min: 1 } }}
                            sx={fieldSx}
                          />
                          <TextField
                            type="number"
                            size="small"
                            fullWidth
                            placeholder="Peso total (g)"
                            value={row.weight}
                            onChange={(e) => updateOutput(index, { weight: e.target.value })}
                            slotProps={{ htmlInput: { min: 0 } }}
                            sx={fieldSx}
                          />
                          <IconButton
                            size="small"
                            onClick={() => removeOutput(index)}
                            disabled={outputs.length <= 1}
                            sx={{ color: colors.status.dangerStrong }}
                          >
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </Box>
                        {ppg > 0 && (
                          <Typography
                            variant="caption"
                            sx={{ color: colors.brand.navyDark, display: 'block', ml: 0.5, mt: -0.5 }}
                          >
                            {Number(row.weight) || 0}g ÷ {row.count} porções = {ppg}g por porção
                          </Typography>
                        )}
                      </Box>
                    );
                  })}
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={addOutput}
                    sx={{
                      textTransform: 'none',
                      borderRadius: 1.5,
                      color: colors.brand.navy,
                      borderColor: colors.brand.navyBorder,
                      alignSelf: 'flex-start',
                      '&:hover': { borderColor: colors.brand.navy, bgcolor: colors.brand.navyTint },
                    }}
                  >
                    Adicionar tipo de produto
                  </Button>
                </Box>

                <Box
                  sx={{
                    mt: 2,
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: overAllocated
                      ? colors.status.dangerTint
                      : totalPortions > 0 && allocatedWeight > 0
                        ? colors.brand.navyTint
                        : colors.surface.sunken,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0.25,
                  }}
                >
                  <Typography variant="body2" sx={{ color: colors.gray[600] }}>
                    Total de porções: <b>{totalPortions}</b> — Peso alocado:{' '}
                    <b>{allocatedWeight}g</b>
                    {limpo > 0 ? ` de ${limpo}g (Peso Limpo)` : ''}
                  </Typography>
                  {overAllocated && (
                    <Typography variant="body2" sx={{ color: colors.status.dangerStrong, fontWeight: 600 }}>
                      A soma dos pesos excede o Peso Limpo em {allocatedWeight - limpo}g.
                    </Typography>
                  )}
                  {!overAllocated && unallocatedWeight > 0 && limpo > 0 && (
                    <Typography variant="body2" sx={{ color: colors.status.warning }}>
                      Peso ainda não alocado: {unallocatedWeight}g
                    </Typography>
                  )}
                  {outputs.some((r) => r.productId && rowPortionWeight(r) > 0) ? (
                    <Box sx={{ mt: 0.5, display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                      {outputs
                        .filter((r) => r.productId && rowPortionWeight(r) > 0)
                        .map((r, i) => {
                          const name =
                            products?.find((p) => p._id === r.productId)?.name ?? r.productId;
                          return (
                            <Typography
                              key={i}
                              variant="body1"
                              fontWeight={700}
                              sx={{ color: colors.brand.navyDark }}
                            >
                              {name}: {rowPortionWeight(r)}g por porção
                              <Typography
                                component="span"
                                variant="caption"
                                sx={{ color: colors.gray[600], fontWeight: 400, ml: 1 }}
                              >
                                ({Number(r.weight) || 0}g ÷ {r.count || 0} porções)
                              </Typography>
                            </Typography>
                          );
                        })}
                    </Box>
                  ) : (
                    <Typography variant="body2" sx={{ color: colors.gray[300], mt: 0.5 }}>
                      Informe o peso de cada produto gerado para ver o peso da porção de cada item.
                    </Typography>
                  )}
                </Box>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1.5 }}>
          <Button onClick={() => setDialogOpen(false)} variant="outlined" sx={outlinedCancelSx}>
            Cancelar
          </Button>
          <Button
            onClick={() => void handleSubmit()}
            variant="contained"
            disabled={
              submitting ||
              scanned.length === 0 ||
              overAllocated ||
              outputs.some((r) => r.productId && (parseInt(r.count, 10) || 0) > 0 && !(Number(r.weight) > 0))
            }
            sx={containedSx}
          >
            Gerar Porcionamento
          </Button>
        </DialogActions>
      </Dialog>

      <QrScannerDialog
        open={qrDialogOpen}
        onClose={() => setQrDialogOpen(false)}
        onScan={(value) => {
          setQrDialogOpen(false);
          setScanInput(value);
          void handleScan(value);
        }}
        title="Ler etiqueta bruta"
        hint="Aponte a câmera para o QR Code da etiqueta de matéria-prima."
      />

      <Dialog
        open={looseLabelOpen}
        onClose={() => setLooseLabelOpen(false)}
        maxWidth="md"
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
          Etiqueta Avulsa
          <IconButton
            aria-label="fechar"
            onClick={() => setLooseLabelOpen(false)}
            size="small"
            sx={{ color: colors.gray[500], mr: -1 }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box>
              <FieldLabel required>Produto</FieldLabel>
              <TextField
                select
                fullWidth
                size="small"
                value={looseProduct}
                onChange={(e) => setLooseProduct(e.target.value)}
                sx={fieldSx}
                SelectProps={{
                  displayEmpty: true,
                  renderValue: (value) =>
                    !value ? (
                      <Box component="span" sx={{ color: 'text.disabled' }}>
                        Selecione o produto
                      </Box>
                    ) : (
                      looseProducts.find((p) => p._id === value)?.name ??
                      String(value)
                    ),
                }}
              >
                <MenuItem value="" disabled>Selecione o produto</MenuItem>
                {looseProducts.map((p) => (
                  <MenuItem key={p._id} value={p._id}>
                    {p.name}
                  </MenuItem>
                ))}
              </TextField>
              {looseProducts.length === 0 && (
                <Typography variant="caption" sx={{ color: colors.gray[400], mt: 0.5, display: 'block' }}>
                  Nenhum produto com permissão de etiqueta avulsa. Marque
                  &quot;Permitir etiqueta avulsa&quot; no cadastro do produto (Cadastros →
                  Produtos).
                </Typography>
              )}
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2 }}>
              <Box>
                <FieldLabel required>Peso (g)</FieldLabel>
                <TextField
                  type="number"
                  fullWidth
                  size="small"
                  value={looseWeight}
                  onChange={(e) => setLooseWeight(e.target.value)}
                  sx={fieldSx}
                />
              </Box>
              <Box>
                <FieldLabel required>Quantidade de etiquetas</FieldLabel>
                <TextField
                  type="number"
                  fullWidth
                  size="small"
                  value={looseQty}
                  onChange={(e) => setLooseQty(e.target.value)}
                  slotProps={{ htmlInput: { min: 1, max: 100 } }}
                  sx={fieldSx}
                />
                <Typography variant="caption" sx={{ color: colors.gray[400], mt: 0.5, display: 'block' }}>
                  Cada etiqueta sai com um lote (até 6 dígitos) e um QR Code diferentes.
                </Typography>
              </Box>
              <Box>
                <FieldLabel required>Destino</FieldLabel>
                <TextField
                  select
                  fullWidth
                  size="small"
                  value={looseDest}
                  onChange={(e) => setLooseDest(e.target.value)}
                  sx={fieldSx}
                  SelectProps={{
                    displayEmpty: true,
                    renderValue: (value) =>
                      !value ? (
                        <Box component="span" sx={{ color: 'text.disabled' }}>
                          Selecione o destino
                        </Box>
                      ) : (
                        String(value)
                      ),
                  }}
                >
                  <MenuItem value="" disabled>Selecione o destino</MenuItem>
                  {looseDestOptions.map((name) => (
                    <MenuItem key={name} value={name}>
                      {name}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1.5 }}>
          <Button
            onClick={() => setLooseLabelOpen(false)}
            variant="outlined"
            sx={outlinedCancelSx}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            disabled={!looseProduct || !looseWeight || !looseDest || looseSaving}
            onClick={handleCreateLooseLabel}
            sx={containedSx}
          >
            {(parseInt(looseQty, 10) || 1) > 1
              ? `Gerar ${parseInt(looseQty, 10) || 1} Etiquetas Avulsas`
              : 'Gerar Etiqueta Avulsa'}
          </Button>
        </DialogActions>
      </Dialog>

      {looseItems.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: 2,
              gap: 1.5,
              flexWrap: 'wrap',
            }}
          >
            <Typography variant="body1" sx={{ color: colors.gray[500] }}>
              {looseItems.length} etiqueta(s) avulsa(s) gerada(s) —{' '}
              {looseItems[0].product.productName}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                onClick={() => setLooseItems([])}
                variant="outlined"
                sx={outlinedCancelSx}
              >
                Fechar
              </Button>
              <Button
                variant="contained"
                startIcon={<PrintIcon />}
                onClick={() => void printLabels(looseLabelsData)}
                sx={containedSx}
              >
                Imprimir Etiquetas ({looseLabelsData.length})
              </Button>
            </Box>
          </Box>
          <Box
            className="etiquetas-print-area"
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 2,
              justifyContent: 'center',
            }}
          >
            {looseLabelsData.map((label) => (
              <LabelPreview key={label.key} data={label} />
            ))}
          </Box>

          {/* Devolução/descarte por etiqueta, com motivo de baixa — alimenta
              a medição do desperdício de etiquetas avulsas. */}
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
            {looseItems.map((item) => (
              <Box
                key={item._id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 1.5,
                  flexWrap: 'wrap',
                  border: `1px solid ${colors.border.default}`,
                  borderRadius: 1.5,
                  px: 1.5,
                  py: 1,
                  bgcolor: colors.surface.row,
                }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={600}>
                    {item.product.productName} — {item.weightGrams}
                    {unitSuffix(unitOf(item.product.productId))}
                  </Typography>
                  <Typography variant="caption" sx={{ color: colors.gray[500] }}>
                    Lote {item.lote || '—'} — QR {item.qrCode} — Destino {item.destination || '—'}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => openLooseAction(item, 'devolucao')}
                    sx={{
                      textTransform: 'none',
                      color: colors.brand.navyDark,
                      borderColor: colors.brand.navyBorder,
                      borderRadius: 1.5,
                    }}
                  >
                    Devolver
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    onClick={() => openLooseAction(item, 'descarte')}
                    sx={{
                      textTransform: 'none',
                      color: colors.status.danger,
                      borderColor: colors.status.dangerBorder,
                      borderRadius: 1.5,
                      '&:hover': { borderColor: colors.status.danger, bgcolor: colors.status.dangerTint },
                    }}
                  >
                    Descartar
                  </Button>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* Diálogo de devolução/descarte (total ou parcial) com motivo. */}
      <Dialog
        open={!!looseAction}
        onClose={() => setLooseAction(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          {looseAction?.action === 'devolucao'
            ? 'Devolver etiqueta avulsa'
            : 'Descartar etiqueta avulsa'}
        </DialogTitle>
        <DialogContent>
          {looseAction && (
            <>
              <Typography variant="body2" sx={{ color: colors.gray[500], mb: 2 }}>
                {looseAction.item.product.productName} — lote{' '}
                <b>{looseAction.item.lote || '—'}</b> — etiqueta de{' '}
                <b>
                  {looseAction.item.weightGrams}
                  {unitSuffix(unitOf(looseAction.item.product.productId))}
                </b>
                . Escolha o modo e o motivo da
                baixa.
              </Typography>
              <Typography variant="body2" fontWeight={600} sx={{ mb: 0.75 }}>
                Modo da baixa
              </Typography>
              <TextField
                select
                fullWidth
                size="small"
                value={looseActionMode}
                onChange={(e) => {
                  setLooseActionMode(e.target.value as 'total' | 'parcial');
                  setLooseActionWeight('');
                }}
                sx={{ mb: 2 }}
              >
                <MenuItem value="total">Total (etiqueta sai do estoque)</MenuItem>
                <MenuItem value="parcial">Parcial (apenas parte do peso)</MenuItem>
              </TextField>
              {looseActionMode === 'parcial' && (
                <TextField
                  type="number"
                  fullWidth
                  size="small"
                  placeholder={`Peso em g (máx. ${looseAction.item.weightGrams - 1}g)`}
                  value={looseActionWeight}
                  onChange={(e) => setLooseActionWeight(e.target.value)}
                  sx={{ mb: 2 }}
                />
              )}
              <Typography variant="body2" fontWeight={600} sx={{ mb: 0.75 }}>
                Motivo da baixa *
              </Typography>
              <TextField
                select
                fullWidth
                size="small"
                value={looseActionReason}
                onChange={(e) => setLooseActionReason(e.target.value)}
                SelectProps={{
                  displayEmpty: true,
                  renderValue: (v) =>
                    v === '' ? (
                      <Box component="span" sx={{ color: 'text.disabled' }}>
                        Selecione o motivo...
                      </Box>
                    ) : (
                      String(v)
                    ),
                }}
              >
                <MenuItem value="" disabled>
                  Selecione o motivo...
                </MenuItem>
                {writeoffReasons.map((r) => (
                  <MenuItem key={r} value={r}>
                    {r}
                  </MenuItem>
                ))}
              </TextField>
              {looseActionReason === 'Outro' && (
                <TextField
                  fullWidth
                  size="small"
                  autoFocus
                  placeholder="Descreva o motivo"
                  value={looseActionOther}
                  onChange={(e) => setLooseActionOther(e.target.value)}
                  sx={{ mt: 1.5 }}
                />
              )}
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1.5 }}>
          <Button
            onClick={() => setLooseAction(null)}
            variant="outlined"
            sx={{
              textTransform: 'none',
              color: colors.gray[700],
              borderColor: colors.border.default,
              bgcolor: colors.common.white,
            }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={
              !looseActionReason ||
              (looseActionReason === 'Outro' && !looseActionOther.trim()) ||
              (looseActionMode === 'parcial' &&
                (!Number(looseActionWeight) ||
                  Number(looseActionWeight) <= 0 ||
                  (looseAction &&
                    Number(looseActionWeight) >= looseAction.item.weightGrams))) ||
              looseActionSaving
            }
            onClick={() => void handleLooseAction()}
            sx={{ textTransform: 'none' }}
          >
            {looseActionMode === 'parcial' ? 'Confirmar baixa parcial' : 'Confirmar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={!!viewTarget}
        onClose={() => setViewTarget(null)}
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
          Detalhes do Porcionamento
          <IconButton
            aria-label="fechar"
            onClick={() => setViewTarget(null)}
            size="small"
            sx={{ color: colors.gray[500], mr: -1 }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <DetailRow
              label="Produto"
              value={
                viewTarget?.outputs && viewTarget.outputs.length > 0
                  ? viewTarget.outputs
                      .map((o) => `${o.productName} (${o.portionsCount})`)
                      .join(', ')
                  : (viewTarget?.product.productName ?? '—')
              }
            />
            <DetailRow
              label="Peso por porção"
              value={
                viewTarget
                  ? viewTarget.outputs && viewTarget.outputs.length > 0
                    ? viewTarget.outputs
                        .map(
                          (o) =>
                            `${o.productName}: ${o.portionWeightGrams ?? viewTarget.portionWeightGrams}${unitSuffix(unitOf(o.productId))}`,
                        )
                        .join(', ')
                    : `${viewTarget.portionWeightGrams}${unitSuffix(unitOf(viewTarget.product.productId))}`
                  : '—'
              }
            />
            <DetailRow label="Lote" value={viewTarget?.lote || '—'} />
            <DetailRow
              label="Lote de origem (matéria-prima)"
              value={viewTarget?.rawLote || '—'}
            />
            <DetailRow
              label="Peso Bruto"
              value={
                viewTarget
                  ? `${viewTarget.rawWeightGrams}${unitSuffix(unitOf(viewTarget.rawProduct?.productId ?? viewTarget.product.productId))}`
                  : '—'
              }
            />
            <DetailRow
              label="Peso Limpo"
              value={
                viewTarget
                  ? `${viewTarget.cleanWeightGrams}${unitSuffix(unitOf(viewTarget.rawProduct?.productId ?? viewTarget.product.productId))}`
                  : '—'
              }
            />
            <DetailRow
              label="Perda"
              value={
                viewTarget
                  ? `${viewTarget.lossGrams}${unitSuffix(unitOf(viewTarget.rawProduct?.productId ?? viewTarget.product.productId))} (${viewTarget.lossPercentage?.toFixed(1) ?? '0.0'}%)`
                  : '—'
              }
            />
            <DetailRow
              label="Ganho"
              value={
                viewTarget
                  ? `${(viewTarget.gainGrams ?? 0).toFixed(0)}${unitSuffix(unitOf(viewTarget.rawProduct?.productId ?? viewTarget.product.productId))} (${
                      viewTarget.rawWeightGrams > 0
                        ? (((viewTarget.gainGrams ?? 0) / viewTarget.rawWeightGrams) * 100).toFixed(1)
                        : 0
                    }%)`
                  : '—'
              }
            />
            <DetailRow
              label="Porções"
              value={viewTarget ? `${viewTarget.portionsCount}` : '—'}
            />
            <DetailRow label="Funcionário" value={viewTarget?.employeeName || '—'} />
            <DetailRow label="Fornecedor" value={viewTarget?.supplier || '—'} />
            <DetailRow label="Data" value={formatDate(viewTarget?.date)} />
          </Box>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Excluir Porcionamento"
        message="Tem certeza que deseja excluir este porcionamento?"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {printingLabels && printingLabels.length > 0 && (
        <Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: 2,
              mt: 3,
              flexWrap: 'wrap',
              gap: 1.5,
            }}
          >
            <Typography variant="body1" sx={{ color: colors.gray[500] }}>
              {printingLabels.length} etiqueta(s) do porcionamento
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                onClick={() => setPrintingLabels(null)}
                variant="outlined"
                sx={outlinedCancelSx}
              >
                Fechar
              </Button>
              <Button
                variant="contained"
                startIcon={<PrintIcon />}
                onClick={() => void handlePrintPendingLabels()}
                sx={containedSx}
              >
                Imprimir Etiquetas
              </Button>
            </Box>
          </Box>
          <Box
            className="etiquetas-print-area"
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 2,
              justifyContent: 'center',
            }}
          >
            {printingLabels.map((label) => (
              <LabelPreview key={label.key} data={label} />
            ))}
          </Box>
        </Box>
      )}
    </LoggedLayout>
  );
}
