'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  IconButton,
  Collapse,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
} from '@mui/material';
import GridOnIcon from '@mui/icons-material/GridOn';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import InventoryIcon from '@mui/icons-material/Inventory';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useProducts, useStockItems } from '@/lib/queries';
import { formatKg, formatDate, daysUntil, lifeStatus } from '@/lib/utils';
import type { StockItem } from '@/types';
import LoggedLayout from './components/LoggedLayout/LoggedLayout';

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

const tableSx = { '& td': { borderBottom: '1px solid #eef1f5' } };

interface ProductGroupRow {
  productId: string;
  name: string;
  items: StockItem[];
  expiredCount: number;
  expiringCount: number;
  totalWeight: number;
}

interface LowStockRow {
  name: string;
  weight: number;
  minQuantity: number;
  falta: number;
}

function DaysChip({ expiryDate }: { expiryDate: string }) {
  const days = daysUntil(expiryDate);
  if (days === null) return <Chip label="—" size="small" sx={chipGray} />;
  if (days < 0) return <Chip label="Vencido" size="small" sx={chipRed} />;
  if (days <= 7) return <Chip label={`${days}d`} size="small" sx={chipAmber} />;
  return <Chip label={`${days}d`} size="small" sx={chipGreen} />;
}

function KpiCard({
  label,
  value,
  caption,
  icon,
  iconBg,
}: {
  label: string;
  value: number;
  caption: string;
  icon: React.ReactNode;
  iconBg: string;
}) {
  return (
    <Card sx={cardSx}>
      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" sx={{ color: '#666', mb: 1 }}>
              {label}
            </Typography>
            <Typography variant="h4" fontWeight="bold" sx={{ lineHeight: 1.2 }}>
              {value}
            </Typography>
            <Typography variant="body2" sx={{ color: '#999', mt: 0.5 }}>
              {caption}
            </Typography>
          </Box>
          <Box sx={{ bgcolor: iconBg, borderRadius: 1.5, p: 1, display: 'flex', flexShrink: 0 }}>
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { data: products, isLoading: loadingProducts } = useProducts();
  const { data: items, isLoading: loadingItems } = useStockItems();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const isLoading = loadingProducts || loadingItems;
  const allItems = items ?? [];
  const inStock = allItems.filter((i) => i.status === 'in_stock');

  const expiredCount = allItems.filter((i) => lifeStatus(i) === 'expired').length;
  const distinctProducts = new Set(inStock.map((i) => i.product.productId)).size;
  const expiringCount = inStock.filter((i) => lifeStatus(i) === 'expiring').length;

  const lowStockList: LowStockRow[] = (products ?? [])
    .filter((p) => (p.minQuantity || 0) > 0)
    .map((p) => {
      const weight = inStock
        .filter((i) => i.product.productId === p._id)
        .reduce((s, i) => s + i.weightGrams, 0);
      return { name: p.name, weight, minQuantity: p.minQuantity, falta: p.minQuantity - weight };
    })
    .filter((r) => r.weight < r.minQuantity);

  const groupedMap = new Map<string, StockItem[]>();
  inStock.forEach((item) => {
    const key = item.product.productId;
    const arr = groupedMap.get(key);
    if (arr) arr.push(item);
    else groupedMap.set(key, [item]);
  });

  const groups: ProductGroupRow[] = Array.from(groupedMap.entries())
    .map(([productId, gItems]) => ({
      productId,
      name: products?.find((p) => p._id === productId)?.name ?? gItems[0].product.productName,
      items: gItems,
      expiredCount: gItems.filter((i) => lifeStatus(i) === 'expired').length,
      expiringCount: gItems.filter((i) => lifeStatus(i) === 'expiring').length,
      totalWeight: gItems.reduce((s, i) => s + i.weightGrams, 0),
    }))
    .sort((a, b) => {
      const pa = a.expiredCount > 0 ? 0 : a.expiringCount > 0 ? 1 : 2;
      const pb = b.expiredCount > 0 ? 0 : b.expiringCount > 0 ? 1 : 2;
      return pa - pb;
    });

  const attention = inStock
    .filter((i) => {
      const ls = lifeStatus(i);
      return ls === 'expired' || ls === 'expiring';
    })
    .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <LoggedLayout>
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
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
            <GridOnIcon sx={{ color: '#1976D2', fontSize: 20 }} />
          </Box>
          <Typography variant="h5" fontWeight="bold">
            Dashboard
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ color: '#666', ml: 6.5 }}>
          Visão geral do sistema — {new Date().toLocaleDateString('pt-BR')}
        </Typography>
      </Box>

      {isLoading ? (
        <CircularProgress />
      ) : (
        <>
          {expiredCount > 0 && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                bgcolor: '#FDECEC',
                border: '1px solid #F5C2C7',
                borderRadius: 2,
                p: 2,
                mb: 2.5,
              }}
            >
              <WarningAmberIcon sx={{ color: '#C62828', flexShrink: 0 }} />
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography sx={{ fontWeight: 700, color: '#C62828' }}>
                  {expiredCount} etiqueta(s) VENCIDA(S) no estoque!
                </Typography>
                <Typography variant="body2" sx={{ color: '#C62828', mt: 0.25 }}>
                  Verifique e dê baixa imediatamente.
                </Typography>
              </Box>
              <Button
                variant="contained"
                onClick={() => router.push('/stock')}
                sx={{
                  bgcolor: '#C62828',
                  textTransform: 'none',
                  borderRadius: 1.5,
                  flexShrink: 0,
                  px: 2.5,
                  '&:hover': { bgcolor: '#B71C1C' },
                }}
              >
                Ver Estoque
              </Button>
            </Box>
          )}

          {lowStockList.length > 0 && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                bgcolor: '#FFF4E5',
                border: '1px solid #FFD699',
                borderRadius: 2,
                p: 2,
                mb: 3,
              }}
            >
              <ShoppingCartIcon sx={{ color: '#E65100', flexShrink: 0 }} />
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography sx={{ fontWeight: 700, color: '#E65100' }}>
                  {lowStockList.length} produto(s) abaixo do peso mínimo em estoque!
                </Typography>
                <Typography variant="body2" sx={{ color: '#E65100', mt: 0.25 }}>
                  {lowStockList.map((r) => r.name).join(', ')}
                </Typography>
              </Box>
              <Button
                variant="outlined"
                onClick={() => router.push('/reports')}
                sx={{
                  textTransform: 'none',
                  borderRadius: 1.5,
                  color: '#E65100',
                  borderColor: '#E65100',
                  flexShrink: 0,
                  px: 2.5,
                  '&:hover': { borderColor: '#E65100', bgcolor: 'rgba(230,81,0,0.06)' },
                }}
              >
                Ver Relatório
              </Button>
            </Box>
          )}

          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <KpiCard
                label="Total em Estoque"
                value={inStock.length}
                caption="etiquetas"
                iconBg="#E3F2FD"
                icon={<Inventory2Icon sx={{ color: '#1976D2', fontSize: 22 }} />}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <KpiCard
                label="Produtos"
                value={distinctProducts}
                caption="diferentes"
                iconBg="#E8F5E9"
                icon={<InventoryIcon sx={{ color: '#2E7D32', fontSize: 22 }} />}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <KpiCard
                label="Vencendo esta Semana"
                value={expiringCount}
                caption="etiquetas"
                iconBg="#FFF3E0"
                icon={<AccessTimeIcon sx={{ color: '#E65100', fontSize: 22 }} />}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <KpiCard
                label="Precisam Comprar"
                value={lowStockList.length}
                caption="produtos"
                iconBg="#FFEBEE"
                icon={<ShoppingCartIcon sx={{ color: '#C62828', fontSize: 22 }} />}
              />
            </Grid>
          </Grid>

          <Card sx={{ ...cardSx, mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, p: 2.5, pb: 1.5 }}>
              <Inventory2Icon sx={{ color: '#1976D2', fontSize: 20 }} />
              <Typography variant="h6" fontWeight="bold">
                Estoque por Produto
              </Typography>
            </Box>
            <Box>
              {groups.length === 0 && (
                <Typography variant="body2" sx={{ color: '#666', px: 2.5, pb: 2.5 }}>
                  Nenhum item em estoque
                </Typography>
              )}
              {groups.map((g) => {
                const open = expanded.has(g.productId);
                return (
                  <Box
                    key={g.productId}
                    sx={{ borderBottom: '1px solid #eef1f5' }}
                  >
                    <Box
                      onClick={() => toggle(g.productId)}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        px: 2.5,
                        py: 1.75,
                        cursor: 'pointer',
                        '&:hover': { bgcolor: '#f9fafb' },
                      }}
                    >
                      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                          <Typography fontWeight={700}>{g.name}</Typography>
                          {g.expiredCount > 0 && (
                            <Chip label={`${g.expiredCount} vencido(s)`} size="small" sx={chipRed} />
                          )}
                          {g.expiringCount > 0 && (
                            <Chip label={`${g.expiringCount} vencendo`} size="small" sx={chipAmber} />
                          )}
                        </Box>
                        <Typography variant="body2" sx={{ color: '#666', mt: 0.5 }}>
                          <Box component="span" fontWeight={700}>
                            {g.items.length} etiquetas
                          </Box>
                          {' · '}
                          <Box component="span" fontWeight={700}>
                            {formatKg(g.totalWeight)}
                          </Box>
                        </Typography>
                      </Box>
                      <IconButton size="small" sx={{ color: '#666' }}>
                        {open ? <ExpandMoreIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
                      </IconButton>
                    </Box>
                    <Collapse in={open} timeout="auto" unmountOnExit>
                      <Box sx={{ px: 2.5, pb: 2 }}>
                        <TableContainer>
                          <Table size="small" sx={tableSx}>
                            <TableHead>
                              <TableRow sx={{ bgcolor: '#f5f7fa' }}>
                                <TableCell sx={thSx}>Tipo</TableCell>
                                <TableCell sx={thSx}>Peso</TableCell>
                                <TableCell sx={thSx}>Validade</TableCell>
                                <TableCell sx={thSx}>Status</TableCell>
                                <TableCell sx={thSx}>QR</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {g.items.map((item) => (
                                <TableRow key={item._id}>
                                  <TableCell>
                                    <Chip
                                      label={item.type === 'raw' ? 'Bruto' : 'Porcionado'}
                                      size="small"
                                      sx={item.type === 'raw' ? { ...chipGray } : { ...chipGreen }}
                                    />
                                  </TableCell>
                                  <TableCell>{item.weightGrams}g</TableCell>
                                  <TableCell>{formatDate(item.expiryDate)}</TableCell>
                                  <TableCell>
                                    <DaysChip expiryDate={item.expiryDate} />
                                  </TableCell>
                                  <TableCell>
                                    <Typography
                                      variant="caption"
                                      sx={{ fontFamily: 'monospace', fontSize: 11, color: '#495057' }}
                                    >
                                      {item.qrCode}
                                    </Typography>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </Box>
                    </Collapse>
                  </Box>
                );
              })}
            </Box>
          </Card>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={cardSx}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, p: 2.5, pb: 1.5 }}>
                  <WarningAmberIcon sx={{ color: '#C62828', fontSize: 20 }} />
                  <Typography variant="h6" fontWeight="bold">
                    Atenção Urgente
                  </Typography>
                </Box>
                <Box sx={{ px: 2.5, pb: 2.5 }}>
                  <TableContainer>
                    <Table size="small" sx={tableSx}>
                      <TableHead>
                        <TableRow sx={{ bgcolor: '#f5f7fa' }}>
                          <TableCell sx={thSx}>Produto</TableCell>
                          <TableCell sx={thSx}>Validade</TableCell>
                          <TableCell sx={thSx}>Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {attention.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={3} align="center" sx={{ py: 3, color: '#666' }}>
                              Nenhum item em atenção
                            </TableCell>
                          </TableRow>
                        )}
                        {attention.map((item) => {
                          const expired = lifeStatus(item) === 'expired';
                          return (
                            <TableRow key={item._id}>
                              <TableCell>
                                <Typography fontWeight={600}>{item.product.productName}</Typography>
                              </TableCell>
                              <TableCell>{formatDate(item.expiryDate)}</TableCell>
                              <TableCell>
                                {expired ? (
                                  <Chip label="Vencido" size="small" sx={chipRed} />
                                ) : (
                                  <Chip label="Esta semana" size="small" sx={chipAmber} />
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={cardSx}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, p: 2.5, pb: 1.5 }}>
                  <ShoppingCartIcon sx={{ color: '#1976D2', fontSize: 20 }} />
                  <Typography variant="h6" fontWeight="bold">
                    Lista de Compras
                  </Typography>
                </Box>
                <Box sx={{ px: 2.5, pb: 2.5 }}>
                  <TableContainer>
                    <Table size="small" sx={tableSx}>
                      <TableHead>
                        <TableRow sx={{ bgcolor: '#f5f7fa' }}>
                          <TableCell sx={thSx}>Produto</TableCell>
                          <TableCell sx={thSx}>Estoque</TableCell>
                          <TableCell sx={thSx}>Mínimo</TableCell>
                          <TableCell sx={thSx}>Falta</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {lowStockList.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} align="center" sx={{ py: 3, color: '#666' }}>
                              Nenhum produto abaixo do mínimo
                            </TableCell>
                          </TableRow>
                        )}
                        {lowStockList.map((r) => (
                          <TableRow key={r.name}>
                            <TableCell>
                              <Typography fontWeight={600}>{r.name}</Typography>
                            </TableCell>
                            <TableCell>{r.weight}g</TableCell>
                            <TableCell>{r.minQuantity}g</TableCell>
                            <TableCell>
                              <Chip label={`${r.falta}g`} size="small" sx={chipRed} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              </Card>
            </Grid>
          </Grid>
        </>
      )}
    </LoggedLayout>
  );
}
