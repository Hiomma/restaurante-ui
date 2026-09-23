'use client';

import { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  MenuItem,
  IconButton,
} from '@mui/material';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import QrCodeIcon from '@mui/icons-material/QrCode';
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

const primaryBtnSx = {
  textTransform: 'none' as const,
  borderRadius: 1.5,
  bgcolor: '#1976D2',
  px: 2.5,
  '&:hover': { bgcolor: '#1565C0' },
};

export default function ReceivingPage() {
  const { enqueueSnackbar } = useSnackbar();
  const { data: products } = useProducts();
  const { data: me } = useMe();
  const createItem = useCreateStockItem();
  const createMovement = useCreateStockMovement();

  const [recebimentoDate, setRecebimentoDate] = useState(todayISODate());
  const [numeroNF, setNumeroNF] = useState('');
  const [rows, setRows] = useState<ReceiveRow[]>([emptyRow()]);
  const [generating, setGenerating] = useState(false);

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

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      for (const row of rows) {
        const product = products?.find((p) => p._id === row.productId);
        if (!product) continue;
        const peso = Number(row.peso);
        const qtd = Number(row.qtd);
        const weightEach = qtd === 1 ? peso : Math.round(peso / qtd);
        const expiryDate =
          row.validadeOriginal || addDays(recebimentoDate, product.shelfLifeDays);
        for (let i = 0; i < qtd; i++) {
          await createItem.mutateAsync({
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
          });
        }
        await createMovement.mutateAsync({
          productId: product._id,
          productName: product.name,
          movementType: 'entry',
          quantity: qtd,
          weightGrams: peso,
          itemType: 'raw',
          reason: `Recebimento — NF ${numeroNF || 'S/N'}`,
          date: recebimentoDate,
        });
      }
      enqueueSnackbar('Etiquetas geradas com sucesso!', { variant: 'success' });
      setRows([emptyRow()]);
    } catch {
      enqueueSnackbar('Erro ao gerar etiquetas.', { variant: 'error' });
    } finally {
      setGenerating(false);
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
            <TextField
              type="date"
              fullWidth
              value={recebimentoDate}
              onChange={(e) => setRecebimentoDate(e.target.value)}
            />
          </Box>
          <Box>
            <FieldLabel>Número da NF</FieldLabel>
            <TextField
              fullWidth
              placeholder="Ex: 000123"
              value={numeroNF}
              onChange={(e) => setNumeroNF(e.target.value)}
            />
          </Box>
          <Box>
            <FieldLabel>Funcionário Responsável</FieldLabel>
            <TextField
              fullWidth
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
            + Adicionar Produto
          </Button>
        </Box>

        {rows.map((row, index) => (
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
                  value={row.productId}
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
                  placeholder="Ex: 200"
                  value={row.peso}
                  onChange={(e) => updateRow(index, { peso: e.target.value })}
                />
              </Box>
              <Box>
                <FieldLabel>Validade Original</FieldLabel>
                <TextField
                  type="date"
                  fullWidth
                  value={row.validadeOriginal}
                  onChange={(e) => updateRow(index, { validadeOriginal: e.target.value })}
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
                  placeholder="Ex: L001"
                  value={row.lote}
                  onChange={(e) => updateRow(index, { lote: e.target.value })}
                />
              </Box>
              <Box>
                <FieldLabel>Qtd. Etiquetas</FieldLabel>
                <TextField
                  type="number"
                  fullWidth
                  value={row.qtd}
                  onChange={(e) => updateRow(index, { qtd: e.target.value })}
                  inputProps={{ min: 1 }}
                />
              </Box>
            </Box>
          </Box>
        ))}

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
          <Button
            variant="contained"
            startIcon={<QrCodeIcon />}
            disabled={!canGenerate || generating}
            onClick={handleGenerate}
            sx={primaryBtnSx}
          >
            Gerar Etiquetas
          </Button>
        </Box>
      </Box>
    </LoggedLayout>
  );
}
