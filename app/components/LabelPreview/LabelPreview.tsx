'use client';

import { Box, Typography } from '@mui/material';
import { QRCodeSVG } from 'qrcode.react';
import { formatDate, unitSuffix } from '@/lib/utils';
import { colors } from '@/lib/design-system';

export interface LabelData {
  key: string;
  companyName: string;
  productName: string;
  storage: string;
  weightGrams: number;
  /** Unidade do produto no cadastro (kg | l) — em litro a etiqueta sai em ml. */
  unit?: 'kg' | 'l';
  recebimentoDate: string;
  expiryDate: string;
  lote?: string;
  responsavel?: string;
  consumeAfterOpeningDays?: number;
  qrCode: string;
}

const COMPANY_FALLBACK = 'Restaurante';

export default function LabelPreview({ data }: { data: LabelData }) {
  return (
    <Box
      className="etiqueta-print"
      sx={{
        width: 220,
        bgcolor: colors.common.white,
        border: `1px solid ${colors.common.black}`,
        p: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: 0.5,
        fontFamily: 'Arial, sans-serif',
        color: colors.common.black,
        flexShrink: 0,
      }}
    >
      <Typography
        sx={{
          fontSize: 8,
          fontWeight: 700,
          textAlign: 'center',
          textTransform: 'uppercase',
          lineHeight: 1.2,
        }}
      >
        {data.companyName || COMPANY_FALLBACK}
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
        <Box
          sx={{
        bgcolor: colors.common.black,
        color: colors.common.white,
        textAlign: 'center',
        py: 0.4,
        px: 0.5,
        printColorAdjust: 'exact',
        WebkitPrintColorAdjust: 'exact',
          }}
        >
          <Typography sx={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', lineHeight: 1.2 }}>
            {data.productName}
          </Typography>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
          {[
            { label: null as string | null, value: data.storage, align: 'left' as const },
            { label: null, value: `${data.weightGrams}${unitSuffix(data.unit)}`, align: 'right' as const },
            { label: 'Data do recebimento:', value: formatDate(data.recebimentoDate), align: 'left' as const },
            { label: 'Lote:', value: data.lote || '—', align: 'left' as const },
            { label: 'Data validade:', value: formatDate(data.expiryDate), align: 'left' as const },
            { label: 'Responsável:', value: data.responsavel || '—', align: 'left' as const },
          ].map((cell, i) => (
            <Box
              key={i}
              sx={{
              p: 0.5,
              borderBottom: `1px solid ${colors.common.black}`,
              borderRight: i % 2 === 0 ? `1px solid ${colors.common.black}` : 'none',
              textAlign: cell.align,
              }}
            >
              {cell.label && (
                <Typography sx={{ fontSize: 7, fontWeight: 700, textTransform: 'uppercase' }}>
                  {cell.label}
                </Typography>
              )}
              <Typography
                sx={{
                  fontSize: cell.label ? 11 : 10,
                  fontWeight: 700,
                  textTransform: cell.label ? 'none' : 'uppercase',
                }}
              >
                {cell.value}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 1 }}>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontSize: 7, fontWeight: 700, textTransform: 'uppercase' }}>
            Data de retirada: __/__/____
          </Typography>
          <Typography sx={{ fontSize: 7, lineHeight: 1.3, mt: 0.5 }}>
            Depois de aberto é retirado do congelamento conforme{' '}
            <Box component="span" sx={{ fontWeight: 700, borderBottom: `1px solid ${colors.common.black}`, px: 1 }}>
              {data.consumeAfterOpeningDays ?? '—'}
            </Box>{' '}
            dias
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25 }}>
          <QRCodeSVG value={data.qrCode} size={56} level="M" />
          <Typography sx={{ fontSize: 10, fontWeight: 700, lineHeight: 1.2, letterSpacing: 1 }}>
            {data.qrCode}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
