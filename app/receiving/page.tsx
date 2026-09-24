'use client';

import { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  MenuItem,
  IconButton,
  Chip,
} from '@mui/material';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import QrCodeIcon from '@mui/icons-material/QrCode';
import PrintIcon from '@mui/icons-material/Print';
import DeleteIcon from '@mui/icons-material/Delete';
import { useSnackbar } from 'notistack';
import {
  useProducts,
  useMe,
  useCreateStockItem,
  useCreateStockMovement,
} from '@/lib/queries';
import { todayISODate } from '@/lib/utils';
import LoggedLayout from '../components/LoggedLayout/LoggedLayout';
import BrDateField from '../components/BrDateField/BrDateField';
import LabelPreview, { type LabelData } from '../components/LabelPreview/LabelPreview';

interface ReceiveRow {
  productId: string;
  peso: string;
  validadeOriginal: string;
  lote: string;
  qtd: string;
}

function emptyRow(): ReceiveRow {
  return { productId: '', peso: '', validadeOriginal: '', lote: '', qtd: '1' };
}

function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d + days);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function generateTempQr(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <Typography variant="body2" fontWeight={600} sx={{ mb: 0.75 }}>
      {children}
      {required && ' *'}
    </Typography>
  );
}

const cardSx = {
  bgcolor: '#fff',
  borderRadius: 2,
  border: '1px solid #e8ecf1',
  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
};

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    height: 44,
  },
} as const;

const primaryBtnSx = {
  textTransform: 'none' as const,
  borderRadius: 1.5,
  bgcolor: '#1976D2',
  px: 2.5,
  '&:hover': { bgcolor: '#1565C0' },
};

interface PendingItem {
  label: LabelData;
  payload: {
    productId: string;
    productName: string;
    type: 'raw';
    weightGrams: number;
    manipulationDate: string;
    expiryDate: string;
    originalExpiryDate?: string;
    lote?: string;
    nf?: string;
    employeeName?: string;
    productGroup?: string;
    productStorage?: string;
  };
}

export default function ReceivingPage() {
  const { enqueueSnackbar } = useSnackbar();
  const { data: products } = useProducts();
  const { data: me } = useMe();
  const createItem = useCreateStockItem();
  const createMovement = useCreateStockMovement();

  const [recebimentoDate, setRecebimentoDate] = useState(todayISODate());
  const [numeroNF, setNumeroNF] = useState('');
  const [rows, setRows] = useState<ReceiveRow[]>([emptyRow()]);
  const [pending, setPending] = useState<PendingItem[] | null>(null);
  const [saving, setSaving] = useState(false);

  const updateRow = (index: number, patch: Partial<ReceiveRow>) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const addRow = () => setRows((prev) => [...prev, emptyRow()]);

  const removeRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const canGenerate = rows.every(
    (r) => r.productId !== '' && Number(r.peso) > 0 && Number(r.qtd) >= 1,
  );

  const handleGenerate = () => {
    if (!canGenerate || !products) return;
    const items: PendingItem[] = [];
    for (const row of rows) {
      const product = products.find((p) => p._id === row.productId);
      if (!product) continue;
      const peso = Number(row.peso);
      const qtd = Number(row.qtd);
      const weightEach = qtd === 1 ? peso : Math.round(peso / qtd);
      const expiryDate =
        row.validadeOriginal || addDays(recebimentoDate, product.shelfLifeDays);
      for (let i = 0; i < qtd; i++) {
        const qrCode = generateTempQr();
        items.push({
          label: {
            key: `${row.productId}-${i}-${Date.now()}`,
            companyName: me?.company?.name ?? '',
            productName: product.name,
            storage: product.storageMethod,
            weightGrams: weightEach,
            recebimentoDate,
            expiryDate,
            lote: row.lote,
            responsavel: me?.name,
            consumeAfterOpeningDays: product.consumeAfterOpeningDays,
            qrCode,
          },
          payload: {
            productId: product._id,
            productName: product.name,
            type: 'raw',
            weightGrams: weightEach,
            manipulationDate: recebimentoDate,
            expiryDate,
            originalExpiryDate: row.validadeOriginal || undefined,
            lote: row.lote,
            nf: numeroNF,
            employeeName: me?.name,
            productGroup: product.group,
            productStorage: product.storageMethod,
          },
        });
      }
    }
    setPending(items);
  };

  const handleSaveAndPrint = async () => {
    if (!pending || pending.length === 0) return;
    setSaving(true);
    try {
      const withRealQr: LabelData[] = [];
      let idx = 0;
      for (const item of pending) {
        const created = await createItem.mutateAsync(item.payload);
        withRealQr[idx] = { ...item.label, qrCode: created.qrCode };
        idx += 1;
      }

      const byProduct = new Map<
        string,
        { productName: string; quantity: number; weightGrams: number }
      >();
      for (const item of pending) {
        const key = item.payload.productId;
        const agg = byProduct.get(key) ?? {
          productName: item.payload.productName,
          quantity: 0,
          weightGrams: 0,
        };
        agg.quantity += 1;
        agg.weightGrams += item.payload.weightGrams;
        byProduct.set(key, agg);
      }
      for (const [productId, agg] of byProduct) {
        await createMovement.mutateAsync({
          productId,
          productName: agg.productName,
          movementType: 'entry',
          quantity: agg.quantity,
          weightGrams: agg.weightGrams,
          itemType: 'raw',
          reason: `Recebimento — NF ${numeroNF || 'S/N'}`,
          date: recebimentoDate,
        });
      }

      const finalPending = pending.map((item, i) => ({
        ...item,
        label: withRealQr[i] ?? item.label,
      }));
      setPending(finalPending);

      enqueueSnackbar('Etiquetas salvas no estoque!', { variant: 'success' });

      setRows([emptyRow()]);
      setNumeroNF('');

      await new Promise((r) => setTimeout(r, 250));
      window.print();

      setPending(null);
    } catch {
      enqueueSnackbar('Erro ao salvar etiquetas.', { variant: 'error' });
    } finally {
      setSaving(false);
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
          <LocalOfferIcon sx={{ color: '#1976D2' }} />
        </Box>
        <Box>
          <Typography variant="h5" fontWeight="bold">
            Recebimento
          </Typography>
          <Typography variant="body2" sx={{ color: '#666' }}>
            Gere etiquetas de recebimento com QR Code
          </Typography>
        </Box>
      </Box>

      <Box sx={{ ...cardSx, p: 3, mb: 3 }}>
        <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
          Cabeçalho do Recebimento
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
            gap: 2,
          }}
        >
          <Box>
            <FieldLabel>Data de Recebimento</FieldLabel>
            <BrDateField
              value={recebimentoDate}
              onChange={setRecebimentoDate}
            />
          </Box>
          <Box>
            <FieldLabel>Número da NF</FieldLabel>
            <TextField
              fullWidth
              size="small"
              sx={fieldSx}
              placeholder="Ex: 000123"
              value={numeroNF ?? ''}
              onChange={(e) => setNumeroNF(e.target.value)}
            />
          </Box>
          <Box>
            <FieldLabel>Funcionário Responsável</FieldLabel>
            <TextField
              fullWidth
              size="small"
              sx={fieldSx}
              disabled
              placeholder="Nenhum funcionário logado"
              value={me?.name ?? ''}
              onChange={() => undefined}
              InputProps={{
                sx: me
                  ? { color: '#333', WebkitTextFillColor: '#333' }
                  : {
                      fontStyle: 'italic',
                      color: '#999',
                      WebkitTextFillColor: '#999',
                      '&::placeholder': {
                        fontStyle: 'italic',
                        color: '#999',
                        opacity: 1,
                      },
                    },
              }}
            />
          </Box>
        </Box>
      </Box>

      <Box sx={{ ...cardSx, p: 3 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 2,
          }}
        >
          <Typography variant="h6" fontWeight="bold">
            Produtos
          </Typography>
          <Button
            variant="outlined"
            onClick={addRow}
            sx={{
              textTransform: 'none' as const,
              borderRadius: 1.5,
              color: '#1976D2',
              borderColor: '#90CAF9',
              px: 2.5,
              '&:hover': { borderColor: '#1976D2', bgcolor: '#E3F2FD' },
            }}
          >
            Adicionar Produto
          </Button>
        </Box>

        {rows.map((row, index) => {
          const selectedProduct = products?.find((p) => p._id === row.productId);
          return (
            <Box
              key={index}
              sx={{
                position: 'relative',
                bgcolor: '#f8f9fa',
                borderRadius: 1.5,
                p: 2,
                mb: 2,
                border: '1px solid #eef1f4',
              }}
            >
              <Typography
                variant="body2"
                fontWeight={700}
                sx={{ color: '#666', mb: 1.5, pr: 5 }}
              >
                Produto #{index + 1}
              </Typography>
              {rows.length > 1 && (
                <IconButton
                  size="small"
                  aria-label="remover produto"
                  onClick={() => removeRow(index)}
                  sx={{ position: 'absolute', top: 8, right: 8, color: '#C62828' }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              )}

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
                  gap: 2,
                  mb: 2,
                }}
              >
                <Box>
                  <FieldLabel required>Produto</FieldLabel>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    sx={fieldSx}
                    value={row.productId ?? ''}
                    onChange={(e) => updateRow(index, { productId: e.target.value })}
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
                <Box>
                  <FieldLabel required>Peso (g)</FieldLabel>
                  <TextField
                    type="number"
                    fullWidth
                    size="small"
                    sx={fieldSx}
                    placeholder="Ex: 200"
                    value={row.peso ?? ''}
                    onChange={(e) => updateRow(index, { peso: e.target.value })}
                  />
                </Box>
                <Box>
                  <FieldLabel>Validade Original</FieldLabel>
                  <BrDateField
                    value={row.validadeOriginal}
                    onChange={(v) => updateRow(index, { validadeOriginal: v })}
                  />
                </Box>
              </Box>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
                  gap: 2,
                }}
              >
                <Box>
                  <FieldLabel>Lote</FieldLabel>
                  <TextField
                    fullWidth
                    size="small"
                    sx={fieldSx}
                    placeholder="Ex: L001"
                    value={row.lote ?? ''}
                    onChange={(e) => updateRow(index, { lote: e.target.value })}
                  />
                </Box>
                <Box>
                  <FieldLabel>Qtd. Etiquetas</FieldLabel>
                  <TextField
                    type="number"
                    fullWidth
                    size="small"
                    sx={fieldSx}
                    value={row.qtd ?? '1'}
                    onChange={(e) => updateRow(index, { qtd: e.target.value })}
                    inputProps={{ min: 1 }}
                  />
                </Box>
              </Box>

              {selectedProduct && (
                <Box sx={{ display: 'flex', gap: 1, mt: 1.5, flexWrap: 'wrap' }}>
                  <Chip
                    label={selectedProduct.group}
                    size="small"
                    sx={{ bgcolor: '#E3F2FD', color: '#1565C0', fontWeight: 600 }}
                  />
                  <Chip
                    label={selectedProduct.storageMethod}
                    size="small"
                    sx={{ bgcolor: '#E8F5E9', color: '#2E7D32', fontWeight: 600 }}
                  />
                  <Chip
                    label={`Validade: ${selectedProduct.shelfLifeDays} dias`}
                    size="small"
                    sx={{ bgcolor: '#FFF3E0', color: '#E65100', fontWeight: 600 }}
                  />
                </Box>
              )}
            </Box>
          );
        })}

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
          <Button
            variant="contained"
            startIcon={<QrCodeIcon />}
            disabled={!canGenerate || saving}
            onClick={handleGenerate}
            sx={primaryBtnSx}
          >
            Gerar Etiquetas
          </Button>
        </Box>
      </Box>

      {pending && pending.length > 0 && (
        <>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mt: 3,
              mb: 2,
            }}
          >
            <Typography variant="body1" sx={{ color: '#666' }}>
              {pending.length} etiqueta(s) gerada(s)
            </Typography>
            <Button
              variant="contained"
              startIcon={<PrintIcon />}
              disabled={saving}
              onClick={handleSaveAndPrint}
              sx={primaryBtnSx}
            >
              Imprimir e Salvar no Estoque
            </Button>
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
            {pending.map((item) => (
              <LabelPreview key={item.label.key} data={item.label} />
            ))}
          </Box>
        </>
      )}
    </LoggedLayout>
  );
}
