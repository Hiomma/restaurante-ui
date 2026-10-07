'use client';

import { useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  CircularProgress,
  Chip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCutIcon from '@mui/icons-material/ContentCut';
import CloseIcon from '@mui/icons-material/Close';
import QrCodeIcon from '@mui/icons-material/QrCode';
import { useSnackbar } from 'notistack';
import {
  usePortionings,
  useCreatePortioning,
  useDeletePortioning,
  useUpdateStockItem,
  useCreateStockItem,
  useCreateStockMovement,
  useProducts,
  useEmployees,
  useMe,
} from '@/lib/queries';
import { formatDate, todayISODate, toInputDate } from '@/lib/utils';
import api from '@/lib/api';
import type { Portioning, StockItem } from '@/types';
import LoggedLayout from '../components/LoggedLayout/LoggedLayout';
import ConfirmDialog from '../components/ConfirmDialog/ConfirmDialog';
import BrDateField from '../components/BrDateField/BrDateField';

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    height: 44,
  },
} as const;

const containedSx = {
  textTransform: 'none',
  borderRadius: 1.5,
  bgcolor: '#1976D2',
  px: 2.5,
  boxShadow: 'none',
  '&:hover': { bgcolor: '#1565C0', boxShadow: 'none' },
} as const;

const outlinedCancelSx = {
  textTransform: 'none',
  color: '#444',
  borderColor: '#e0e0e0',
  bgcolor: '#fff',
  borderRadius: 1.5,
  px: 2.5,
  '&:hover': { borderColor: '#bdbdbd', bgcolor: '#f5f5f5' },
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
        borderBottom: '1px solid #f0f0f0',
      }}
    >
      <Typography variant="body2" sx={{ color: '#666' }}>
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={600} sx={{ textAlign: 'right' }}>
        {value}
      </Typography>
    </Box>
  );
}

export default function PortioningsPage() {
  const { enqueueSnackbar } = useSnackbar();
  const { data: portionings, isLoading } = usePortionings();
  const { data: products } = useProducts();
  const { data: employees } = useEmployees();
  const { data: me } = useMe();
  const createPortioning = useCreatePortioning();
  const deletePortioning = useDeletePortioning();
  const updateStockItem = useUpdateStockItem();
  const createStockItem = useCreateStockItem();
  const createMovement = useCreateStockMovement();

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
  const [date, setDate] = useState(todayISODate());
  const [submitting, setSubmitting] = useState(false);

  const totalGrams = scanned.reduce((sum, item) => sum + item.weightGrams, 0);
  const limpo = Number(cleanWeight) || 0;
  const limpoExcedeBruto = limpo > totalGrams;
  const perda = Math.max(0, totalGrams - limpo);
  const perdaPct = totalGrams > 0 ? (perda / totalGrams) * 100 : 0;
  const product = products?.find((p) => p._id === scanned[0]?.product.productId);

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
    setDate(todayISODate());
  };

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleScan = async () => {
    const code = scanInput.trim().toUpperCase();
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
      if (!lote && item.lote) setLote(item.lote);
      setScanInput('');
    } catch {
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
    if (limpo > totalGrams) {
      enqueueSnackbar('Peso Limpo não pode ser maior que o Peso Bruto.', { variant: 'error' });
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

      await createPortioning.mutateAsync({
        productId: rows[0].productId,
        productName: nameOf(rows[0].productId),
        outputs: rows.map((row) => ({
          productId: row.productId,
          productName: nameOf(row.productId),
          portionsCount: row.count,
          portionWeightGrams: Math.round(row.weight / row.count),
        })),
        rawWeightGrams: bruto,
        cleanWeightGrams: limpo,
        lossGrams,
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
          await createStockItem.mutateAsync({
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
        }

        await createMovement.mutateAsync({
          productId: row.productId,
          productName: rowProductName,
          movementType: 'entry',
          quantity: row.count,
          weightGrams: row.count * rowPpg,
          itemType: 'portioned',
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
        reason: `Porcionamento — Lote ${lote || '-'} — Perda: ${lossGrams}g (${pct}%) — ${employeeName || '-'} — ${batchId}`,
        date,
      });

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

  return (
    <LoggedLayout>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
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
            <ContentCutIcon sx={{ color: '#1976D2', fontSize: 22 }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight="bold">
              Porcionamento
            </Typography>
            <Typography variant="body2" sx={{ color: '#666' }}>
              Converta produto bruto em porcionado com controle de perdas
            </Typography>
          </Box>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate} sx={containedSx}>
          Novo Porcionamento
        </Button>
      </Box>

      {isLoading ? (
        <CircularProgress />
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#f5f7fa' }}>
                <TableCell sx={{ fontWeight: 700, color: '#333' }}>Produto</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#333' }}>Lote</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#333' }}>Peso Bruto</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#333' }}>Peso Limpo</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#333' }}>% Perda</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#333' }}>Porções</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#333' }}>Funcionário</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#333' }}>Data</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#333' }} align="center">
                  Ações
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {portionings?.map((p) => (
                <TableRow key={p._id} hover>
                  <TableCell>
                    <Typography fontWeight={500}>
                      {p.outputs && p.outputs.length > 0
                        ? p.outputs
                            .map(
                              (o) =>
                                `${o.productName} (${o.portionsCount}${
                                  o.portionWeightGrams ? ` × ${o.portionWeightGrams}g` : ''
                                })`,
                            )
                            .join(', ')
                        : p.product.productName}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography
                      variant="body2"
                      sx={{ fontFamily: 'monospace', fontSize: 13, color: '#1565C0' }}
                    >
                      {p.lote || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>{p.rawWeightGrams}g</TableCell>
                  <TableCell>{p.cleanWeightGrams}g</TableCell>
                  <TableCell>
                    <Chip
                      label={`${p.lossPercentage?.toFixed(1) ?? '0.0'}%`}
                      size="small"
                      sx={{
                        bgcolor: '#E8F5E9',
                        color: '#2E7D32',
                        fontWeight: 600,
                        borderRadius: 1,
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    {p.portionsCount} ({p.portionWeightGrams}g)
                  </TableCell>
                  <TableCell>{p.employeeName || '—'}</TableCell>
                  <TableCell>{formatDate(p.date)}</TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      onClick={() => setViewTarget(p)}
                      sx={{ color: '#666' }}
                    >
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => setDeleteTarget(p._id)}
                      sx={{ color: '#d32f2f' }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {portionings?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">Nenhum porcionamento encontrado</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

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
            sx={{ color: '#666', mr: -1 }}
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
                  sx={fieldSx}
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
                    color: '#1976D2',
                    borderColor: '#1976D2',
                    px: 2.5,
                    height: 40,
                    '&:hover': { borderColor: '#1565C0', bgcolor: '#E3F2FD' },
                  }}
                >
                  Add
                </Button>
              </Box>
              <Typography variant="caption" sx={{ color: '#666', mt: 0.75, display: 'block' }}>
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
                      border: '1px solid #E0E0E0',
                      borderRadius: 1.5,
                      px: 1.5,
                      py: 1,
                      bgcolor: '#FAFAFA',
                    }}
                  >
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        {item.product.productName}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#666' }}>
                        {item.weightGrams}g — QR {item.qrCode}
                        {item.lote ? ` — Lote ${item.lote}` : ''}
                      </Typography>
                    </Box>
                    <IconButton
                      size="small"
                      onClick={() => removeScanned(item._id)}
                      sx={{ color: '#d32f2f' }}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
                <Typography variant="body2" sx={{ color: '#666', fontWeight: 600 }}>
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
                      error={limpoExcedeBruto}
                      helperText={
                        limpoExcedeBruto
                          ? `Máx. ${totalGrams}g (peso bruto)`
                          : undefined
                      }
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
                    <FieldLabel>Data</FieldLabel>
                    <BrDateField
                      value={date}
                      onChange={setDate}
                    />
                  </Box>
                </Box>
                <Box sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                  <Typography variant="body2" sx={{ color: '#888' }}>
                    Peso bruto: {totalGrams}g
                  </Typography>
                  <Typography variant="body2" sx={{ color: limpoExcedeBruto ? '#d32f2f' : '#888' }}>
                    Perda: {perda}g ({perdaPct.toFixed(1)}%)
                  </Typography>
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
                            sx={{ color: '#d32f2f' }}
                          >
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </Box>
                        {ppg > 0 && (
                          <Typography
                            variant="caption"
                            sx={{ color: '#1565C0', display: 'block', ml: 0.5, mt: -0.5 }}
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
                      color: '#1976D2',
                      borderColor: '#90CAF9',
                      alignSelf: 'flex-start',
                      '&:hover': { borderColor: '#1976D2', bgcolor: '#E3F2FD' },
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
                      ? '#FFEBEE'
                      : totalPortions > 0 && allocatedWeight > 0
                        ? '#E3F2FD'
                        : '#f5f7fa',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0.25,
                  }}
                >
                  <Typography variant="body2" sx={{ color: '#555' }}>
                    Total de porções: <b>{totalPortions}</b> — Peso alocado:{' '}
                    <b>{allocatedWeight}g</b>
                    {limpo > 0 ? ` de ${limpo}g (Peso Limpo)` : ''}
                  </Typography>
                  {overAllocated && (
                    <Typography variant="body2" sx={{ color: '#d32f2f', fontWeight: 600 }}>
                      A soma dos pesos excede o Peso Limpo em {allocatedWeight - limpo}g.
                    </Typography>
                  )}
                  {!overAllocated && unallocatedWeight > 0 && limpo > 0 && (
                    <Typography variant="body2" sx={{ color: '#E65100' }}>
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
                              sx={{ color: '#1565C0' }}
                            >
                              {name}: {rowPortionWeight(r)}g por porção
                              <Typography
                                component="span"
                                variant="caption"
                                sx={{ color: '#555', fontWeight: 400, ml: 1 }}
                              >
                                ({Number(r.weight) || 0}g ÷ {r.count || 0} porções)
                              </Typography>
                            </Typography>
                          );
                        })}
                    </Box>
                  ) : (
                    <Typography variant="body2" sx={{ color: '#999', mt: 0.5 }}>
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
              limpoExcedeBruto ||
              overAllocated ||
              outputs.some((r) => r.productId && (parseInt(r.count, 10) || 0) > 0 && !(Number(r.weight) > 0))
            }
            sx={containedSx}
          >
            Gerar Porcionamento
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
            sx={{ color: '#666', mr: -1 }}
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
                            `${o.productName}: ${o.portionWeightGrams ?? viewTarget.portionWeightGrams}g`,
                        )
                        .join(', ')
                    : `${viewTarget.portionWeightGrams}g`
                  : '—'
              }
            />
            <DetailRow label="Lote" value={viewTarget?.lote || '—'} />
            <DetailRow
              label="Peso Bruto"
              value={viewTarget ? `${viewTarget.rawWeightGrams}g` : '—'}
            />
            <DetailRow
              label="Peso Limpo"
              value={viewTarget ? `${viewTarget.cleanWeightGrams}g` : '—'}
            />
            <DetailRow
              label="Perda"
              value={
                viewTarget
                  ? `${viewTarget.lossGrams}g (${viewTarget.lossPercentage?.toFixed(1) ?? '0.0'}%)`
                  : '—'
              }
            />
            <DetailRow
              label="Porções"
              value={viewTarget ? `${viewTarget.portionsCount}` : '—'}
            />
            <DetailRow label="Funcionário" value={viewTarget?.employeeName || '—'} />
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
    </LoggedLayout>
  );
}
