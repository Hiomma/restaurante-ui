'use client';

import { useRef, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  MenuItem,
  IconButton,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from '@mui/material';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PlaceIcon from '@mui/icons-material/Place';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import { useSnackbar } from 'notistack';
import {
  useProducts,
  useStockItems,
  useUpdateStockItem,
  useDeleteStockItem,
  useCreateStockMovement,
  useMovementDestinations,
  useCreateMovementDestination,
  useDeleteMovementDestination,
} from '@/lib/queries';
import { formatDate, formatWeight, todayISODate } from '@/lib/utils';
import api from '@/lib/api';
import type { StockItem } from '@/types';
import LoggedLayout from '../components/LoggedLayout/LoggedLayout';

const cardSx = {
  bgcolor: '#fff',
  borderRadius: 2,
  border: '1px solid #e8ecf1',
  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
};

const thSx = { fontWeight: 700, color: '#333' };

const grayChipSx = {
  bgcolor: '#F1F3F5',
  color: '#495057',
  borderRadius: 1.5,
};

const primaryBtnSx = {
  textTransform: 'none' as const,
  borderRadius: 1.5,
  bgcolor: '#1976D2',
  px: 2.5,
  '&:hover': { bgcolor: '#1565C0' },
};

const fixedMoveDestinations = ['Salão', 'Bar', 'Cozinha'];
const fixedWriteoffDestinations = ['Perda', 'Não encontrado'];

const statusLabels: Record<string, string> = {
  in_stock: 'Em Estoque',
  used: 'Utilizado',
  discarded: 'Descartado',
  expired: 'Vencido',
};

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <Typography variant="body2" fontWeight={600} sx={{ mb: 0.75 }}>
      {children}
      {required && ' *'}
    </Typography>
  );
}

function toggleSx(active: boolean) {
  return {
    textTransform: 'none' as const,
    borderRadius: 1.5,
    px: 2.5,
    fontWeight: 600,
    ...(active
      ? {
          bgcolor: '#1976D2',
          color: '#fff',
          borderColor: '#1976D2',
          '&:hover': { bgcolor: '#1565C0', borderColor: '#1565C0' },
        }
      : {
          color: '#444',
          borderColor: '#e0e0e0',
          bgcolor: '#fff',
          '&:hover': { borderColor: '#1976D2', color: '#1976D2', bgcolor: '#fff' },
        }),
  };
}

export default function MovementsPage() {
  const { enqueueSnackbar } = useSnackbar();
  const { data: products } = useProducts();
  const { data: stockItems, isLoading: loadingStock } = useStockItems({ status: 'in_stock' });
  const { data: destinations } = useMovementDestinations();
  const createMovement = useCreateStockMovement();
  const updateItem = useUpdateStockItem();
  const deleteItem = useDeleteStockItem();
  const createDestination = useCreateMovementDestination();
  const deleteDestination = useDeleteMovementDestination();

  const [tab, setTab] = useState(0);

  const [qrInput, setQrInput] = useState('');
  const [scanned, setScanned] = useState<StockItem[]>([]);
  const [scanning, setScanning] = useState(false);
  const [action, setAction] = useState<'move' | 'writeoff' | ''>('');
  const [destino, setDestino] = useState('');
  const [obs, setObs] = useState('');
  const qrRef = useRef<HTMLInputElement>(null);

  const [countMode, setCountMode] = useState<'product' | 'full'>('product');
  const [countProductId, setCountProductId] = useState('');
  const [countScanInput, setCountScanInput] = useState('');
  const [countScanned, setCountScanned] = useState<string[]>([]);
  const [countScanning, setCountScanning] = useState(false);
  const [countResult, setCountResult] = useState<{
    expected: number;
    found: number;
    missing: StockItem[];
  } | null>(null);
  const [missingDest, setMissingDest] = useState<Record<string, string>>({});
  const [missingSelected, setMissingSelected] = useState<Record<string, boolean>>({});
  const [bulkDest, setBulkDest] = useState('');
  const countScanRef = useRef<HTMLInputElement>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [destName, setDestName] = useState('');
  const [destType, setDestType] = useState<'move' | 'writeoff'>('move');
  const [destSubTab, setDestSubTab] = useState<'move' | 'writeoff'>('move');

  const handleScan = async () => {
    const code = qrInput.trim().toUpperCase();
    if (!code || scanning) return;
    setScanning(true);
    try {
      const res = await api.get<StockItem>(`/stock-items/qr/${code}`);
      const item = res.data;
      if (item.status !== 'in_stock') {
        enqueueSnackbar(
          `Etiqueta não está em estoque (status: ${statusLabels[item.status] ?? item.status}).`,
          { variant: 'error' },
        );
        setQrInput('');
        return;
      }
      if (scanned.some((s) => s._id === item._id)) {
        enqueueSnackbar('Esta etiqueta já foi adicionada.', { variant: 'error' });
        setQrInput('');
        return;
      }
      setScanned((prev) => [...prev, item]);
      setQrInput('');
      qrRef.current?.focus();
    } catch {
      enqueueSnackbar('Etiqueta não encontrada.', { variant: 'error' });
      setQrInput('');
    } finally {
      setScanning(false);
    }
  };

  const removeScanned = (id: string) => {
    setScanned((prev) => prev.filter((item) => item._id !== id));
  };

  const clearScanned = () => {
    setScanned([]);
    setAction('');
    setDestino('');
    setObs('');
    qrRef.current?.focus();
  };

  const selectAction = (next: 'move' | 'writeoff') => {
    if (action === next) return;
    setAction(next);
    setDestino('');
  };

  const destinationOptions =
    action === 'move'
      ? [
          ...fixedMoveDestinations,
          ...(destinations ?? [])
            .filter(
              (d) => d.active && (d.type ?? 'move') === 'move' && !fixedMoveDestinations.includes(d.name),
            )
            .map((d) => d.name),
        ]
      : action === 'writeoff'
        ? [
            ...fixedWriteoffDestinations,
            ...(destinations ?? [])
              .filter(
                (d) => d.active && d.type === 'writeoff' && !fixedWriteoffDestinations.includes(d.name),
              )
              .map((d) => d.name),
          ]
        : [];

  const moving = createMovement.isPending || updateItem.isPending || deleteItem.isPending;

  const handleConfirm = async () => {
    if (scanned.length === 0 || !action || !destino) return;
    const suffix = obs.trim() ? ` — ${obs.trim()}` : '';
    try {
      for (const item of scanned) {
        if (action === 'move') {
          await createMovement.mutateAsync({
            productId: item.product.productId,
            productName: item.product.productName,
            movementType: 'move',
            quantity: 1,
            weightGrams: item.weightGrams,
            itemType: item.type,
            reason: `Mover — ${destino}${suffix}`,
            date: todayISODate(),
          });
          await updateItem.mutateAsync({ id: item._id, data: { destination: destino } });
        } else {
          await createMovement.mutateAsync({
            productId: item.product.productId,
            productName: item.product.productName,
            movementType: 'exit',
            quantity: 1,
            weightGrams: item.weightGrams,
            itemType: item.type,
            reason: `Baixar — ${destino}${suffix}`,
            date: todayISODate(),
          });
          await deleteItem.mutateAsync(item._id);
        }
      }
      enqueueSnackbar(
        action === 'move'
          ? `${scanned.length} etiqueta(s) movida(s) para ${destino}.`
          : `${scanned.length} etiqueta(s) baixada(s) — ${destino}.`,
        { variant: 'success' },
      );
      clearScanned();
    } catch {
      enqueueSnackbar('Erro ao movimentar etiquetas.', { variant: 'error' });
    }
  };

  const countItems =
    countMode === 'product' && countProductId
      ? (stockItems ?? []).filter((i) => i.product.productId === countProductId)
      : countMode === 'full'
        ? stockItems ?? []
        : null;

  const showCountTable = countMode === 'full' || (countMode === 'product' && !!countProductId);

  const allCountDestinations = [
    ...fixedMoveDestinations,
    ...(destinations ?? [])
      .filter(
        (d) => d.active && (d.type ?? 'move') === 'move' && !fixedMoveDestinations.includes(d.name),
      )
      .map((d) => d.name),
    ...fixedWriteoffDestinations,
    ...(destinations ?? [])
      .filter(
        (d) =>
          d.active && d.type === 'writeoff' && !fixedWriteoffDestinations.includes(d.name),
      )
      .map((d) => d.name),
  ];

  const resetCount = () => {
    setCountScanInput('');
    setCountScanned([]);
    setCountResult(null);
    setMissingDest({});
    setMissingSelected({});
    setBulkDest('');
  };

  const handleCountScan = async () => {
    const code = countScanInput.trim().toUpperCase();
    if (!code || countScanning || !countItems) return;
    setCountScanning(true);
    try {
      const res = await api.get<StockItem>(`/stock-items/qr/${code}`);
      const item = res.data;
      if (item.status !== 'in_stock') {
        enqueueSnackbar(
          `Etiqueta não está em estoque (status: ${statusLabels[item.status] ?? item.status}).`,
          { variant: 'error' },
        );
        setCountScanInput('');
        return;
      }
      if (!countItems.some((i) => i._id === item._id)) {
        enqueueSnackbar('Etiqueta fora do escopo desta contagem.', { variant: 'error' });
        setCountScanInput('');
        return;
      }
      if (countScanned.includes(item.qrCode)) {
        enqueueSnackbar('Código já escaneado.', { variant: 'error' });
        setCountScanInput('');
        return;
      }
      setCountScanned((prev) => [...prev, item.qrCode]);
      setCountResult(null);
      setCountScanInput('');
      countScanRef.current?.focus();
    } catch {
      enqueueSnackbar('Etiqueta não encontrada.', { variant: 'error' });
      setCountScanInput('');
    } finally {
      setCountScanning(false);
    }
  };

  const removeCountScan = (qr: string) => {
    setCountScanned((prev) => prev.filter((c) => c !== qr));
    setCountResult(null);
  };

  const handleVerifyCount = () => {
    if (!countItems) return;
    const found = countItems.filter((i) => countScanned.includes(i.qrCode)).length;
    const missing = countItems.filter((i) => !countScanned.includes(i.qrCode));
    setCountResult({ expected: countItems.length, found, missing });
    setMissingDest({});
    setMissingSelected({});
    setBulkDest('');
  };

  const resolveMissing = (id: string) => {
    setCountResult((prev) =>
      prev ? { ...prev, missing: prev.missing.filter((m) => m._id !== id) } : prev,
    );
    setMissingSelected((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const handleMoveMissing = async (item: StockItem) => {
    const dest = missingDest[item._id];
    if (!dest) {
      enqueueSnackbar('Selecione o destino da etiqueta.', { variant: 'warning' });
      return;
    }
    try {
      await createMovement.mutateAsync({
        productId: item.product.productId,
        productName: item.product.productName,
        movementType: 'move',
        quantity: 1,
        weightGrams: item.weightGrams,
        itemType: item.type,
        reason: `Contagem — Mover — ${dest}`,
        date: todayISODate(),
      });
      await updateItem.mutateAsync({ id: item._id, data: { destination: dest } });
      resolveMissing(item._id);
      enqueueSnackbar(`Etiqueta movida para ${dest}.`, { variant: 'success' });
    } catch {
      enqueueSnackbar('Erro ao mover etiqueta.', { variant: 'error' });
    }
  };

  const handleDropMissing = async (item: StockItem) => {
    try {
      await createMovement.mutateAsync({
        productId: item.product.productId,
        productName: item.product.productName,
        movementType: 'exit',
        quantity: 1,
        weightGrams: item.weightGrams,
        itemType: item.type,
        reason: 'Contagem — Não encontrado',
        date: todayISODate(),
      });
      await deleteItem.mutateAsync(item._id);
      resolveMissing(item._id);
      enqueueSnackbar('Etiqueta baixada.', { variant: 'success' });
    } catch {
      enqueueSnackbar('Erro ao baixar etiqueta.', { variant: 'error' });
    }
  };

  const selectedMissing = (countResult?.missing ?? []).filter((i) => missingSelected[i._id]);

  const toggleMissing = (id: string, value: boolean) => {
    setMissingSelected((prev) => ({ ...prev, [id]: value }));
  };

  const toggleAllMissing = () => {
    const allSelected =
      (countResult?.missing.length ?? 0) > 0 &&
      selectedMissing.length === countResult?.missing.length;
    setMissingSelected(
      allSelected
        ? {}
        : Object.fromEntries((countResult?.missing ?? []).map((i) => [i._id, true])),
    );
  };

  const handleBulkMove = async () => {
    if (selectedMissing.length === 0 || !bulkDest) return;
    try {
      for (const item of selectedMissing) {
        await createMovement.mutateAsync({
          productId: item.product.productId,
          productName: item.product.productName,
          movementType: 'move',
          quantity: 1,
          weightGrams: item.weightGrams,
          itemType: item.type,
          reason: `Contagem — Mover — ${bulkDest}`,
          date: todayISODate(),
        });
        await updateItem.mutateAsync({ id: item._id, data: { destination: bulkDest } });
      }
      const ids = selectedMissing.map((i) => i._id);
      setCountResult((prev) =>
        prev ? { ...prev, missing: prev.missing.filter((m) => !ids.includes(m._id)) } : prev,
      );
      setMissingSelected({});
      setBulkDest('');
      enqueueSnackbar(`${ids.length} etiqueta(s) movida(s) para ${bulkDest}.`, {
        variant: 'success',
      });
    } catch {
      enqueueSnackbar('Erro ao mover etiquetas.', { variant: 'error' });
    }
  };

  const handleBulkDrop = async () => {
    if (selectedMissing.length === 0) return;
    try {
      for (const item of selectedMissing) {
        await createMovement.mutateAsync({
          productId: item.product.productId,
          productName: item.product.productName,
          movementType: 'exit',
          quantity: 1,
          weightGrams: item.weightGrams,
          itemType: item.type,
          reason: 'Contagem — Não encontrado',
          date: todayISODate(),
        });
        await deleteItem.mutateAsync(item._id);
      }
      const ids = selectedMissing.map((i) => i._id);
      setCountResult((prev) =>
        prev ? { ...prev, missing: prev.missing.filter((m) => !ids.includes(m._id)) } : prev,
      );
      setMissingSelected({});
      enqueueSnackbar(`${ids.length} etiqueta(s) baixada(s).`, { variant: 'success' });
    } catch {
      enqueueSnackbar('Erro ao baixar etiquetas.', { variant: 'error' });
    }
  };

  const customDestinations = [...(destinations ?? [])].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  const handleAddDestination = async () => {
    const name = destName.trim();
    if (!name) return;
    try {
      await createDestination.mutateAsync({ name, type: destType });
      enqueueSnackbar('Destino adicionado com sucesso!', { variant: 'success' });
      setDestName('');
      setDestType('move');
      setDialogOpen(false);
    } catch {
      enqueueSnackbar('Erro ao adicionar destino.', { variant: 'error' });
    }
  };

  const handleDeleteDestination = async (id: string) => {
    try {
      await deleteDestination.mutateAsync(id);
      enqueueSnackbar('Destino removido com sucesso!', { variant: 'success' });
    } catch {
      enqueueSnackbar('Erro ao remover destino.', { variant: 'error' });
    }
  };

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
            Movimentações
          </Typography>
          <Typography variant="body2" sx={{ color: '#666' }}>
            Escaneie etiquetas para movimentar ou realizar contagem de estoque
          </Typography>
        </Box>
      </Box>

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{
          bgcolor: '#f1f3f5',
          borderRadius: 2,
          p: 0.5,
          mb: 3,
          minHeight: 44,
          '& .MuiTabs-indicator': { display: 'none' },
          '& .MuiTab-root': {
            textTransform: 'none',
            borderRadius: 1.5,
            minHeight: 40,
            fontWeight: 600,
            color: '#555',
            alignItems: 'center',
            flexDirection: 'row',
            gap: 1,
            '&.Mui-selected': { bgcolor: '#fff', color: '#1976D2' },
          },
        }}
      >
        <Tab icon={<QrCodeScannerIcon fontSize="small" />} iconPosition="start" label="Movimentar Etiqueta" />
        <Tab icon={<AssignmentIcon fontSize="small" />} iconPosition="start" label="Contagem" />
        <Tab icon={<PlaceIcon fontSize="small" />} iconPosition="start" label="Destinos" />
      </Tabs>

      {tab === 0 && (
        <Box sx={{ maxWidth: 560, mx: 'auto' }}>
          <Box sx={{ ...cardSx, p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <QrCodeScannerIcon sx={{ color: '#1976D2', fontSize: 20 }} />
              <Typography variant="subtitle1" fontWeight={700}>
                Escanear Etiquetas
              </Typography>
            </Box>
            <FieldLabel>Código QR (6 dígitos)</FieldLabel>
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <TextField
                fullWidth
                size="small"
                sx={{ '& .MuiOutlinedInput-root': { height: 44 } }}
                placeholder="Ex: AB1234"
                value={qrInput}
                inputRef={qrRef}
                inputProps={{ maxLength: 6 }}
                onChange={(e) => setQrInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleScan();
                }}
              />
              <Button
                variant="outlined"
                onClick={handleScan}
                disabled={!qrInput.trim() || scanning}
                sx={{
                  textTransform: 'none' as const,
                  borderRadius: 1.5,
                  color: '#1976D2',
                  borderColor: '#90CAF9',
                  px: 2.5,
                  minWidth: 110,
                  '&:hover': { borderColor: '#1976D2', bgcolor: '#E3F2FD' },
                }}
              >
                {scanning ? <CircularProgress size={18} /> : 'Adicionar'}
              </Button>
            </Box>
            <Typography variant="caption" sx={{ color: '#666', display: 'block', mt: 1 }}>
              Escaneie quantas etiquetas quiser — depois escolha a opção Mover ou Baixar.
            </Typography>
          </Box>

          {scanned.length > 0 && (
            <Box sx={{ ...cardSx, p: 3, mt: 2 }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  mb: 2,
                }}
              >
                <Typography variant="subtitle1" fontWeight={700}>
                  Etiquetas selecionadas ({scanned.length})
                </Typography>
                <Button
                  size="small"
                  onClick={clearScanned}
                  sx={{
                    textTransform: 'none',
                    color: '#666',
                    '&:hover': { bgcolor: '#f5f5f5' },
                  }}
                >
                  Limpar
                </Button>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2.5 }}>
                {scanned.map((item) => (
                  <Box
                    key={item._id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      p: 1.25,
                      borderRadius: 2,
                      border: '1px solid #e8ecf1',
                      bgcolor: '#f9fafc',
                    }}
                  >
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={600} noWrap>
                        {item.product.productName}
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 0.5 }}>
                        <Chip
                          label={item.type === 'raw' ? 'Bruto' : 'Porcionado'}
                          size="small"
                          sx={{
                            bgcolor: '#E3F2FD',
                            color: '#1565C0',
                            fontWeight: 600,
                            borderRadius: 1.5,
                            height: 20,
                          }}
                        />
                        <Chip
                          label={formatWeight(item.weightGrams)}
                          size="small"
                          sx={{ ...grayChipSx, height: 20 }}
                        />
                        <Chip
                          label={`QR: ${item.qrCode}`}
                          size="small"
                          sx={{ ...grayChipSx, height: 20 }}
                        />
                        <Chip
                          label={`Validade: ${formatDate(item.expiryDate)}`}
                          size="small"
                          sx={{ ...grayChipSx, height: 20 }}
                        />
                        {item.destination && (
                          <Chip
                            label={`Em: ${item.destination}`}
                            size="small"
                            sx={{ ...grayChipSx, height: 20 }}
                          />
                        )}
                      </Box>
                    </Box>
                    <IconButton
                      size="small"
                      aria-label="remover etiqueta"
                      onClick={() => removeScanned(item._id)}
                      sx={{ color: '#C62828' }}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
              </Box>

              <FieldLabel required>Ação</FieldLabel>
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <Button
                  variant="contained"
                  onClick={() => selectAction('move')}
                  sx={toggleSx(action === 'move')}
                >
                  Mover
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => selectAction('writeoff')}
                  sx={toggleSx(action === 'writeoff')}
                >
                  Baixar
                </Button>
              </Box>

              {action && (
                <>
                  <Typography variant="caption" sx={{ color: '#666', display: 'block', mb: 1.5 }}>
                    {action === 'move'
                      ? 'O item permanece no estoque e apenas muda de local.'
                      : 'A etiqueta será excluída do sistema.'}
                  </Typography>

                  <FieldLabel required>Destino ({action === 'move' ? 'Mover' : 'Baixar'})</FieldLabel>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    sx={{ '& .MuiOutlinedInput-root': { height: 44 } }}
                    value={destino}
                    onChange={(e) => setDestino(e.target.value)}
                    SelectProps={{
                      displayEmpty: true,
                      renderValue: (value) =>
                        value === '' ? (
                          <Box component="span" sx={{ color: 'text.disabled' }}>
                            Selecione...
                          </Box>
                        ) : (
                          String(value)
                        ),
                    }}
                  >
                    <MenuItem value="" disabled>
                      Selecione...
                    </MenuItem>
                    {destinationOptions.map((d) => (
                      <MenuItem key={d} value={d}>
                        {d}
                      </MenuItem>
                    ))}
                  </TextField>

                  <Box sx={{ mt: 2 }}>
                    <FieldLabel>Observação</FieldLabel>
                    <TextField
                      fullWidth
                      size="small"
                      sx={{ '& .MuiOutlinedInput-root': { height: 44 } }}
                      placeholder="Ex: Retirado para o salão"
                      value={obs}
                      onChange={(e) => setObs(e.target.value)}
                    />
                  </Box>

                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      gap: 1.5,
                      mt: 2.5,
                    }}
                  >
                    <Button
                      variant="contained"
                      disabled={!destino || moving}
                      onClick={handleConfirm}
                      sx={
                        action === 'writeoff'
                          ? {
                              textTransform: 'none' as const,
                              borderRadius: 1.5,
                              bgcolor: '#C62828',
                              px: 2.5,
                              '&:hover': { bgcolor: '#B71C1C' },
                            }
                          : primaryBtnSx
                      }
                    >
                      {action === 'move'
                        ? `Mover ${scanned.length} etiqueta(s)`
                        : `Baixar ${scanned.length} etiqueta(s)`}
                    </Button>
                  </Box>
                </>
              )}
            </Box>
          )}
        </Box>
      )}

      {tab === 1 && (
        <Box sx={{ ...cardSx, p: 3 }}>
          <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
            Contagem de Estoque
          </Typography>

          <FieldLabel>Tipo de Contagem</FieldLabel>
          <Box sx={{ display: 'flex', gap: 1, mb: 2.5 }}>
            <Button
              variant={countMode === 'product' ? 'contained' : 'outlined'}
              onClick={() => {
                setCountMode('product');
                resetCount();
              }}
              sx={toggleSx(countMode === 'product')}
            >
              Por Produto
            </Button>
            <Button
              variant={countMode === 'full' ? 'contained' : 'outlined'}
              onClick={() => {
                setCountMode('full');
                resetCount();
              }}
              sx={toggleSx(countMode === 'full')}
            >
              Estoque Completo
            </Button>
          </Box>

          {countMode === 'product' && (
            <Box sx={{ mb: 2.5 }}>
              <FieldLabel required>Produto</FieldLabel>
              <TextField
                select
                fullWidth
                size="small"
                sx={{ '& .MuiOutlinedInput-root': { height: 44 } }}
                value={countProductId}
                onChange={(e) => {
                  setCountProductId(e.target.value);
                  resetCount();
                }}
                SelectProps={{
                  displayEmpty: true,
                  renderValue: (value) => {
                    if (value === '') {
                      return (
                        <Box component="span" sx={{ color: 'text.disabled' }}>
                          Selecione...
                        </Box>
                      );
                    }
                    const p = products?.find((prod) => prod._id === String(value));
                    return p?.name ?? '';
                  },
                }}
              >
                <MenuItem value="" disabled>
                  Selecione...
                </MenuItem>
                {products?.map((p) => (
                  <MenuItem key={p._id} value={p._id}>
                    {p.name}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
          )}

          {showCountTable &&
            (loadingStock ? (
              <CircularProgress />
            ) : (
              <>
                <Typography variant="body2" sx={{ color: '#666', mb: 2 }}>
                  {countItems?.length ?? 0} etiqueta(s) em estoque
                  {countMode === 'product' && countProductId ? ' para este produto' : ''}.
                </Typography>

                <FieldLabel>Escanear / Digitar código das etiquetas</FieldLabel>
                <Box sx={{ display: 'flex', gap: 1.5 }}>
                  <TextField
                    fullWidth
                    size="small"
                    sx={{ '& .MuiOutlinedInput-root': { height: 44 } }}
                    placeholder="Escaneie ou digite o QR..."
                    value={countScanInput}
                    inputRef={countScanRef}
                    inputProps={{ maxLength: 6 }}
                    onChange={(e) => setCountScanInput(e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void handleCountScan();
                    }}
                  />
                  <Button
                    variant="contained"
                    onClick={() => void handleCountScan()}
                    disabled={!countScanInput.trim() || countScanning}
                    sx={primaryBtnSx}
                  >
                    {countScanning ? <CircularProgress size={18} /> : 'Adicionar'}
                  </Button>
                </Box>
                {countScanned.length > 0 && (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1.5 }}>
                    {countScanned.map((qr) => (
                      <Chip
                        key={qr}
                        label={qr}
                        size="small"
                        onDelete={() => removeCountScan(qr)}
                        sx={{ ...grayChipSx, fontWeight: 600 }}
                      />
                    ))}
                  </Box>
                )}
                <Typography variant="caption" sx={{ color: '#666', display: 'block', mt: 1 }}>
                  {countScanned.length} código(s) escaneado(s). Clique no código para remover.
                </Typography>

                <Box sx={{ display: 'flex', gap: 1.5, mt: 2 }}>
                  <Button
                    variant="contained"
                    disabled={!countItems?.length || moving}
                    onClick={handleVerifyCount}
                    sx={primaryBtnSx}
                  >
                    Verificar Contagem
                  </Button>
                  <Button
                    variant="outlined"
                    disabled={moving}
                    onClick={resetCount}
                    sx={{
                      textTransform: 'none',
                      borderRadius: 1.5,
                      color: '#444',
                      borderColor: '#e0e0e0',
                    }}
                  >
                    Limpar
                  </Button>
                </Box>

                {countResult && (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
                      Resultado da Contagem
                    </Typography>
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
                        gap: 2,
                        mb: 2,
                      }}
                    >
                      {[
                        {
                          value: countResult.expected,
                          label: 'No sistema',
                          bg: '#E3F2FD',
                          color: '#1565C0',
                        },
                        {
                          value: countResult.found,
                          label: 'Encontradas',
                          bg: '#E8F5E9',
                          color: '#2E7D32',
                        },
                        {
                          value: countResult.missing.length,
                          label: 'Faltando',
                          bg: '#FFEBEE',
                          color: '#C62828',
                        },
                      ].map((k) => (
                        <Box
                          key={k.label}
                          sx={{ p: 1.5, borderRadius: 2, bgcolor: k.bg, textAlign: 'center' }}
                        >
                          <Typography variant="h5" fontWeight={700} sx={{ color: k.color }}>
                            {k.value}
                          </Typography>
                          <Typography variant="caption" sx={{ color: k.color }}>
                            {k.label}
                          </Typography>
                        </Box>
                      ))}
                    </Box>

                    {countResult.missing.length === 0 ? (
                      <Box sx={{ p: 2, borderRadius: 2, bgcolor: '#E8F5E9', textAlign: 'center' }}>
                        <Typography variant="body2" sx={{ color: '#2E7D32', fontWeight: 600 }}>
                          Todas as {countResult.expected} etiquetas foram encontradas.
                        </Typography>
                      </Box>
                    ) : (
                      <Box sx={{ border: '1px solid #FFCDD2', borderRadius: 2, overflow: 'hidden' }}>
                        <Typography
                          variant="body2"
                          sx={{ color: '#C62828', fontWeight: 600, px: 1.5, pt: 1.5, mb: 1 }}
                        >
                          Etiquetas não encontradas na contagem — identifique o destino ou exclua:
                        </Typography>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            px: 1.5,
                            py: 0.75,
                            bgcolor: '#FFF5F5',
                            borderTop: '1px solid #FFCDD2',
                            borderBottom: '1px solid #FFCDD2',
                            flexWrap: 'wrap',
                          }}
                        >
                          <Checkbox
                            checked={
                              countResult.missing.length > 0 &&
                              selectedMissing.length === countResult.missing.length
                            }
                            indeterminate={
                              selectedMissing.length > 0 &&
                              selectedMissing.length < countResult.missing.length
                            }
                            onChange={toggleAllMissing}
                            sx={{ color: '#C62828', '&.Mui-checked': { color: '#C62828' } }}
                          />
                          <Typography variant="body2" fontWeight={600}>
                            Selecionar tudo
                          </Typography>
                          {selectedMissing.length > 0 && (
                            <Box
                              sx={{ ml: 'auto', display: 'flex', gap: 1, alignItems: 'center' }}
                            >
                              <TextField
                                select
                                size="small"
                                sx={{ minWidth: 160 }}
                                value={bulkDest}
                                onChange={(e) => setBulkDest(e.target.value)}
                                SelectProps={{
                                  displayEmpty: true,
                                  renderValue: (v) =>
                                    v === '' ? (
                                      <Box component="span" sx={{ color: 'text.disabled' }}>
                                        Destino...
                                      </Box>
                                    ) : (
                                      String(v)
                                    ),
                                }}
                              >
                                <MenuItem value="" disabled>
                                  Destino...
                                </MenuItem>
                                {allCountDestinations.map((d) => (
                                  <MenuItem key={d} value={d}>
                                    {d}
                                  </MenuItem>
                                ))}
                              </TextField>
                              <Button
                                size="small"
                                variant="outlined"
                                disabled={!bulkDest || moving}
                                onClick={() => void handleBulkMove()}
                                sx={{ textTransform: 'none' }}
                              >
                                Mover ({selectedMissing.length})
                              </Button>
                              <Button
                                size="small"
                                variant="contained"
                                color="error"
                                disabled={moving}
                                onClick={() => void handleBulkDrop()}
                                sx={{ textTransform: 'none' }}
                              >
                                Baixar ({selectedMissing.length})
                              </Button>
                            </Box>
                          )}
                        </Box>
                        <TableContainer>
                          <Table size="small">
                            <TableHead>
                              <TableRow sx={{ bgcolor: '#f5f7fa' }}>
                                <TableCell sx={thSx} padding="checkbox" />
                                <TableCell sx={thSx}>Produto</TableCell>
                                <TableCell sx={thSx}>Peso</TableCell>
                                <TableCell sx={thSx}>Lote</TableCell>
                                <TableCell sx={thSx}>Validade</TableCell>
                                <TableCell sx={thSx}>QR</TableCell>
                                <TableCell sx={thSx}>Destino</TableCell>
                                <TableCell sx={thSx} align="center">
                                  Ações
                                </TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {countResult.missing.map((item) => (
                                <TableRow key={item._id} hover sx={{ bgcolor: '#FFF5F5' }}>
                                  <TableCell padding="checkbox">
                                    <Checkbox
                                      checked={!!missingSelected[item._id]}
                                      onChange={(e) => toggleMissing(item._id, e.target.checked)}
                                      sx={{
                                        color: '#C62828',
                                        '&.Mui-checked': { color: '#C62828' },
                                      }}
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Typography variant="body2" fontWeight={600}>
                                      {item.product.productName}
                                    </Typography>
                                  </TableCell>
                                  <TableCell>{item.weightGrams}g</TableCell>
                                  <TableCell>{item.lote || '—'}</TableCell>
                                  <TableCell>{formatDate(item.expiryDate)}</TableCell>
                                  <TableCell sx={{ fontFamily: 'monospace' }}>
                                    {item.qrCode}
                                  </TableCell>
                                  <TableCell>
                                    <TextField
                                      select
                                      size="small"
                                      sx={{ minWidth: 130 }}
                                      value={missingDest[item._id] ?? ''}
                                      onChange={(e) =>
                                        setMissingDest((prev) => ({
                                          ...prev,
                                          [item._id]: e.target.value,
                                        }))
                                      }
                                      SelectProps={{
                                        displayEmpty: true,
                                        renderValue: (v) =>
                                          v === '' ? (
                                            <Box component="span" sx={{ color: 'text.disabled' }}>
                                              Destino...
                                            </Box>
                                          ) : (
                                            String(v)
                                          ),
                                      }}
                                    >
                                      <MenuItem value="" disabled>
                                        Destino...
                                      </MenuItem>
                                      {allCountDestinations.map((d) => (
                                        <MenuItem key={d} value={d}>
                                          {d}
                                        </MenuItem>
                                      ))}
                                    </TextField>
                                  </TableCell>
                                  <TableCell align="center">
                                    <IconButton
                                      size="small"
                                      aria-label="mover etiqueta"
                                      disabled={!missingDest[item._id] || moving}
                                      onClick={() => void handleMoveMissing(item)}
                                      sx={{ color: '#1976D2' }}
                                    >
                                      <SwapHorizIcon fontSize="small" />
                                    </IconButton>
                                    <IconButton
                                      size="small"
                                      aria-label="baixar etiqueta"
                                      disabled={moving}
                                      onClick={() => void handleDropMissing(item)}
                                      sx={{ color: '#C62828' }}
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
                    )}
                  </Box>
                )}
              </>
            ))}
        </Box>
      )}

      {tab === 2 && (
        <>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Typography variant="body2" sx={{ color: '#666', flex: 1 }}>
              Gerencie os destinos disponíveis para as ações Mover e Baixar
            </Typography>
            <Button
              variant="contained"
              onClick={() => {
                setDestType(destSubTab);
                setDialogOpen(true);
              }}
              sx={primaryBtnSx}
            >
              Novo Destino
            </Button>
          </Box>

          <Tabs
            value={destSubTab}
            onChange={(_, v) => setDestSubTab(v)}
            sx={{
              bgcolor: '#f1f3f5',
              borderRadius: 2,
              p: 0.5,
              mb: 2,
              minHeight: 44,
              maxWidth: 400,
              '& .MuiTabs-indicator': { display: 'none' },
              '& .MuiTab-root': {
                textTransform: 'none',
                borderRadius: 1.5,
                minHeight: 40,
                fontWeight: 600,
                color: '#555',
                '&.Mui-selected': { bgcolor: '#fff', color: '#1976D2' },
              },
            }}
          >
            <Tab label="Mover" />
            <Tab label="Baixar" />
          </Tabs>

          <TableContainer component={Paper} sx={{ borderRadius: 2, border: '1px solid #e8ecf1' }}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#f5f7fa' }}>
                  <TableCell sx={thSx}>Destino</TableCell>
                  <TableCell sx={thSx}>Tipo</TableCell>
                  <TableCell sx={thSx} align="center">
                    Ações
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {destSubTab === 'move'
                  ? fixedMoveDestinations.map((d) => (
                      <TableRow key={d} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500}>
                            {d}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label="Padrão" size="small" sx={grayChipSx} />
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2" sx={{ color: '#999' }}>
                            Fixo
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))
                  : fixedWriteoffDestinations.map((d) => (
                      <TableRow key={d} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500}>
                            {d}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label="Padrão" size="small" sx={grayChipSx} />
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2" sx={{ color: '#999' }}>
                            Fixo
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                {customDestinations
                  .filter((d) => (d.type ?? 'move') === destSubTab)
                  .map((d) => (
                    <TableRow key={d._id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {d.name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={d.type === 'writeoff' ? 'Baixar' : 'Mover'}
                          size="small"
                          sx={{
                            bgcolor: d.type === 'writeoff' ? '#FFEBEE' : '#E3F2FD',
                            color: d.type === 'writeoff' ? '#C62828' : '#1565C0',
                            fontWeight: 600,
                            borderRadius: 1.5,
                          }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          aria-label="excluir destino"
                          onClick={() => handleDeleteDestination(d._id)}
                          sx={{ color: '#C62828' }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                {customDestinations.filter((d) => (d.type ?? 'move') === destSubTab).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">
                        Nenhum destino personalizado nesta subguia
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </>
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
          Novo Destino
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
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box>
              <FieldLabel required>Nome do Destino</FieldLabel>
              <TextField
                fullWidth
                size="small"
                sx={{ '& .MuiOutlinedInput-root': { height: 44 } }}
                placeholder="Ex: Freezer 2"
                value={destName}
                onChange={(e) => setDestName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddDestination();
                }}
              />
            </Box>
            <Box>
              <FieldLabel required>Tipo de Uso</FieldLabel>
              <TextField
                select
                fullWidth
                size="small"
                sx={{ '& .MuiOutlinedInput-root': { height: 44 } }}
                value={destType}
                onChange={(e) => setDestType(e.target.value as 'move' | 'writeoff')}
              >
                <MenuItem value="move">Mover (item permanece no estoque)</MenuItem>
                <MenuItem value="writeoff">Baixar (etiqueta excluída do sistema)</MenuItem>
              </TextField>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1.5 }}>
          <Button
            onClick={() => setDialogOpen(false)}
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
            Cancelar
          </Button>
          <Button
            variant="contained"
            disabled={!destName.trim() || createDestination.isPending}
            onClick={handleAddDestination}
            sx={primaryBtnSx}
          >
            Adicionar
          </Button>
        </DialogActions>
      </Dialog>
    </LoggedLayout>
  );
}
