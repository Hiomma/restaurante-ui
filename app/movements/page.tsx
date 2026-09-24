'use client';

import { useEffect, useRef, useState } from 'react';
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
  useStockItemByQr,
  useUpdateStockItem,
  useCreateStockMovement,
  useMovementDestinations,
  useCreateMovementDestination,
  useDeleteMovementDestination,
} from '@/lib/queries';
import { formatDate, formatWeight, todayISODate } from '@/lib/utils';
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

const fixedDestinations = ['Perda', 'Salão', 'Bar', 'Cozinha', 'Não encontrado'];

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
  const createDestination = useCreateMovementDestination();
  const deleteDestination = useDeleteMovementDestination();

  const [tab, setTab] = useState(0);

  const [qrInput, setQrInput] = useState('');
  const [searchQr, setSearchQr] = useState('');
  const [destino, setDestino] = useState('');
  const [obs, setObs] = useState('');
  const qrRef = useRef<HTMLInputElement>(null);
  const sawFetching = useRef(false);
  const { data: found, isFetching, isError } = useStockItemByQr(searchQr);

  const [countMode, setCountMode] = useState<'product' | 'full'>('product');
  const [countProductId, setCountProductId] = useState('');
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const [dialogOpen, setDialogOpen] = useState(false);
  const [destName, setDestName] = useState('');

  useEffect(() => {
    if (!searchQr) {
      sawFetching.current = false;
      return;
    }
    if (isFetching) {
      sawFetching.current = true;
      return;
    }
    if (isError || (!found && sawFetching.current)) {
      enqueueSnackbar('Etiqueta não encontrada', { variant: 'error' });
      setQrInput('');
      setSearchQr('');
      setDestino('');
      setObs('');
      qrRef.current?.focus();
    }
  }, [searchQr, isFetching, isError, found, enqueueSnackbar]);

  const handleSearch = () => {
    const code = qrInput.trim();
    if (!code) return;
    sawFetching.current = false;
    setSearchQr(code);
  };

  const clearQr = () => {
    setQrInput('');
    setSearchQr('');
    setDestino('');
    setObs('');
    sawFetching.current = false;
    qrRef.current?.focus();
  };

  const handleMove = async (status: 'discarded' | 'used') => {
    if (!found || !destino) return;
    const reason = obs.trim() ? `${destino} — ${obs.trim()}` : destino;
    try {
      await createMovement.mutateAsync({
        productId: found.product.productId,
        productName: found.product.productName,
        movementType: 'exit',
        quantity: 1,
        weightGrams: found.weightGrams,
        itemType: found.type,
        reason,
        date: todayISODate(),
      });
      await updateItem.mutateAsync({ id: found._id, data: { status } });
      enqueueSnackbar('Etiqueta movimentada com sucesso!', { variant: 'success' });
      clearQr();
    } catch {
      enqueueSnackbar('Erro ao movimentar etiqueta.', { variant: 'error' });
    }
  };

  const destinationOptions = [
    ...fixedDestinations,
    ...(destinations ?? [])
      .filter((d) => d.active && !fixedDestinations.includes(d.name))
      .map((d) => d.name),
  ];

  const countItems =
    countMode === 'product' && countProductId
      ? (stockItems ?? []).filter((i) => i.product.productId === countProductId)
      : countMode === 'full'
        ? stockItems ?? []
        : null;

  const showCountTable = countMode === 'full' || (countMode === 'product' && !!countProductId);

  const toggleChecked = (id: string, value: boolean) => {
    setChecked((prev) => ({ ...prev, [id]: value }));
  };

  const handleConcludeCount = async () => {
    if (!countItems) return;
    const unfound = countItems.filter((i) => !(checked[i._id] ?? true));
    try {
      for (const item of unfound) {
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
        await updateItem.mutateAsync({ id: item._id, data: { status: 'discarded' } });
      }
      enqueueSnackbar(
        `Contagem concluída. ${unfound.length} etiqueta(s) baixada(s).`,
        { variant: 'success' },
      );
      setChecked({});
    } catch {
      enqueueSnackbar('Erro ao concluir contagem.', { variant: 'error' });
    }
  };

  const customDestinations = [...(destinations ?? [])].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  const handleAddDestination = async () => {
    const name = destName.trim();
    if (!name) return;
    try {
      await createDestination.mutateAsync({ name });
      enqueueSnackbar('Destino adicionado com sucesso!', { variant: 'success' });
      setDestName('');
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

  const moving = createMovement.isPending || updateItem.isPending;

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
        <Box sx={{ maxWidth: 520, mx: 'auto' }}>
          <Box sx={{ ...cardSx, p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <QrCodeScannerIcon sx={{ color: '#1976D2', fontSize: 20 }} />
              <Typography variant="subtitle1" fontWeight={700}>
                Localizar Etiqueta
              </Typography>
            </Box>
            <FieldLabel required>Código QR (6 dígitos)</FieldLabel>
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
                  if (e.key === 'Enter') handleSearch();
                }}
              />
              <Button
                variant="outlined"
                onClick={handleSearch}
                disabled={!qrInput.trim() || isFetching}
                sx={{
                  textTransform: 'none' as const,
                  borderRadius: 1.5,
                  color: '#1976D2',
                  borderColor: '#90CAF9',
                  px: 2.5,
                  minWidth: 100,
                  '&:hover': { borderColor: '#1976D2', bgcolor: '#E3F2FD' },
                }}
              >
                {isFetching ? <CircularProgress size={18} /> : 'Buscar'}
              </Button>
            </Box>
            <Typography variant="caption" sx={{ color: '#666', display: 'block', mt: 1 }}>
              Aponte a câmera do celular para o QR Code — o campo será preenchido
              automaticamente.
            </Typography>
          </Box>

          {found && found.status === 'in_stock' && (
            <Box sx={{ ...cardSx, p: 3, mt: 2 }}>
              <Typography variant="h6" fontWeight="bold">
                {found.product.productName}
              </Typography>
              <Box
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 1,
                  mt: 1,
                  mb: 2.5,
                }}
              >
                <Chip
                  label={found.type === 'raw' ? 'Bruto' : 'Porcionado'}
                  size="small"
                  sx={{
                    bgcolor: '#E3F2FD',
                    color: '#1565C0',
                    fontWeight: 600,
                    borderRadius: 1.5,
                  }}
                />
                <Chip label={formatWeight(found.weightGrams)} size="small" sx={grayChipSx} />
                <Chip
                  label={`Validade: ${formatDate(found.expiryDate)}`}
                  size="small"
                  sx={grayChipSx}
                />
                {found.lote && <Chip label={`Lote: ${found.lote}`} size="small" sx={grayChipSx} />}
                {found.nf && <Chip label={`NF: ${found.nf}`} size="small" sx={grayChipSx} />}
              </Box>

              <FieldLabel required>Destino</FieldLabel>
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
                  variant="outlined"
                  disabled={!destino || moving}
                  onClick={() => handleMove('discarded')}
                  sx={{
                    textTransform: 'none' as const,
                    borderRadius: 1.5,
                    color: '#C62828',
                    borderColor: '#C62828',
                    px: 2.5,
                    '&:hover': { borderColor: '#C62828', bgcolor: '#FFEBEE' },
                  }}
                >
                  Descartar
                </Button>
                <Button
                  variant="contained"
                  disabled={!destino || moving}
                  onClick={() => handleMove('used')}
                  sx={primaryBtnSx}
                >
                  Confirmar Saída
                </Button>
              </Box>
            </Box>
          )}

          {found && found.status !== 'in_stock' && (
            <Box sx={{ ...cardSx, p: 3, mt: 2 }}>
              <Typography variant="body2" fontWeight={600} sx={{ color: '#C62828' }}>
                Etiqueta não está em estoque (status: {statusLabels[found.status] ?? found.status}).
              </Typography>
              <Button
                variant="outlined"
                onClick={clearQr}
                sx={{
                  textTransform: 'none' as const,
                  borderRadius: 1.5,
                  color: '#444',
                  borderColor: '#e0e0e0',
                  px: 2.5,
                  mt: 1.5,
                  '&:hover': { borderColor: '#bdbdbd', bgcolor: '#f5f5f5' },
                }}
              >
                Nova busca
              </Button>
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
              onClick={() => setCountMode('product')}
              sx={toggleSx(countMode === 'product')}
            >
              Por Produto
            </Button>
            <Button
              variant={countMode === 'full' ? 'contained' : 'outlined'}
              onClick={() => setCountMode('full')}
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
                onChange={(e) => setCountProductId(e.target.value)}
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
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#f5f7fa' }}>
                        <TableCell sx={thSx}>Encontrado</TableCell>
                        <TableCell sx={thSx}>Tipo</TableCell>
                        <TableCell sx={thSx}>Peso</TableCell>
                        <TableCell sx={thSx}>Lote</TableCell>
                        <TableCell sx={thSx}>QR</TableCell>
                        <TableCell sx={thSx}>Validade</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {countItems?.map((item) => (
                        <TableRow key={item._id} hover>
                          <TableCell>
                            <Checkbox
                              checked={checked[item._id] ?? true}
                              onChange={(e) => toggleChecked(item._id, e.target.checked)}
                              sx={{ color: '#1976D2', '&.Mui-checked': { color: '#1976D2' } }}
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={item.type === 'raw' ? 'Bruto' : 'Porcionado'}
                              size="small"
                              sx={grayChipSx}
                            />
                          </TableCell>
                          <TableCell>{formatWeight(item.weightGrams)}</TableCell>
                          <TableCell>{item.lote || '—'}</TableCell>
                          <TableCell>{item.qrCode}</TableCell>
                          <TableCell>{formatDate(item.expiryDate)}</TableCell>
                        </TableRow>
                      ))}
                      {countItems?.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                            <Typography color="text.secondary">
                              Nenhuma etiqueta em estoque
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2.5 }}>
                  <Button
                    variant="contained"
                    disabled={!countItems?.length || moving}
                    onClick={handleConcludeCount}
                    sx={primaryBtnSx}
                  >
                    Concluir Contagem
                  </Button>
                </Box>
              </>
            ))}
        </Box>
      )}

      {tab === 2 && (
        <>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Typography variant="body2" sx={{ color: '#666', flex: 1 }}>
              Gerencie os destinos disponíveis para movimentação
            </Typography>
            <Button
              variant="contained"
              onClick={() => setDialogOpen(true)}
              sx={primaryBtnSx}
            >
              Novo Destino
            </Button>
          </Box>

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
                {fixedDestinations.map((d) => (
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
                {customDestinations.map((d) => (
                  <TableRow key={d._id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {d.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label="Personalizado"
                        size="small"
                        sx={{
                          bgcolor: '#1565C0',
                          color: '#fff',
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
                {customDestinations.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">
                        Nenhum destino personalizado cadastrado
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
          <Box sx={{ pt: 1 }}>
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
