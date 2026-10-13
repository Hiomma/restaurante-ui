'use client';

import { useEffect, useRef, useState } from 'react';
import { Box, Button, Dialog, DialogContent, DialogTitle, IconButton, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';

const READER_ID = 'qr-scanner-reader-region';

/** Subconjunto da `Html5Qrcode` que este componente usa. */
interface ScannerInstance {
  start: (
    src: string | MediaTrackConstraints,
    config: { fps: number; qrbox?: { width: number; height: number } },
    onSuccess: (text: string) => void,
    onError: (err: unknown) => void,
  ) => Promise<null>;
  stop: () => Promise<void>;
  clear: () => void;
}

interface QrScannerDialogProps {
  open: boolean;
  onClose: () => void;
  /** Recebe o conteúdo lido do QR Code (já sem espaços nas pontas). */
  onScan: (value: string) => void;
  title?: string;
  /** Texto exibido enquanto a câmera inicializa. */
  hint?: string;
}

/**
 * Leitor de QR Code pela câmera.
 *
 * Usa a `html5-qrcode` carregada sob demanda (dynamic import) para não
 * pesar no bundle nem quebrar em ambiente de teste/SSR. A câmera é iniciada
 * ao abrir o diálogo e encerrada ao fechar, liberando o recurso.
 *
 * A região da câmera (`CameraRegion`) só é montada com o diálogo aberto, de
 * modo que o estado de carregamento/erro comece limpo a cada leitura.
 */
export default function QrScannerDialog({
  open,
  onClose,
  onScan,
  title = 'Ler QR Code',
  hint = 'Aponte a câmera para o QR Code da etiqueta.',
}: QrScannerDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          justifyContent: 'space-between',
          pb: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <QrCodeScannerIcon sx={{ color: '#1976D2' }} />
          <Typography variant="subtitle1" fontWeight={700}>
            {title}
          </Typography>
        </Box>
        <IconButton aria-label="fechar" onClick={onClose} size="small" sx={{ color: '#666', mr: -1 }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Typography variant="body2" sx={{ color: '#666' }}>
            {hint}
          </Typography>
          {open && <CameraRegion onScan={onScan} onClose={onClose} />}
          <Button
            onClick={onClose}
            variant="outlined"
            sx={{
              textTransform: 'none',
              borderRadius: 1.5,
              color: '#444',
              borderColor: '#e0e0e0',
              alignSelf: 'flex-end',
            }}
          >
            Fechar
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Inicia a câmera ao ser montada e a encerra ao desmontar. Fica vivo apenas
 * enquanto o diálogo está aberto.
 */
function CameraRegion({ onScan, onClose }: { onScan: (value: string) => void; onClose: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(true);
  const busyRef = useRef(false);
  // Callbacks em ref: o efeito da câmera não depende deles, senão a câmera
  // reiniciaria a cada renderização do componente pai.
  const onScanRef = useRef(onScan);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onScanRef.current = onScan;
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    let cancelled = false;
    let scanner: ScannerInstance | null = null;
    busyRef.current = false;

    const stopScanner = async () => {
      if (!scanner) return;
      try {
        await scanner.stop();
      } catch {
        // câmera já parada
      }
      try {
        scanner.clear();
      } catch {
        // região já removida
      }
      scanner = null;
    };

    const start = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        if (cancelled) return;
        if (!document.getElementById(READER_ID)) return;
        scanner = new Html5Qrcode(READER_ID, { verbose: false }) as unknown as ScannerInstance;

        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (text: string) => {
            if (cancelled || busyRef.current) return;
            busyRef.current = true;
            const value = String(text ?? '').trim();
            void stopScanner().finally(() => {
              if (cancelled) return;
              if (value) onScanRef.current(value);
              onCloseRef.current();
            });
          },
          () => {
            // falha de leitura quadro a quadro: ignora
          },
        );
        if (!cancelled) setStarting(false);
      } catch {
        if (cancelled) return;
        setStarting(false);
        setError(
          'Não foi possível acessar a câmera. Libere a permissão de câmera no navegador ou digite o código manualmente.',
        );
      }
    };

    void start();

    return () => {
      cancelled = true;
      void stopScanner();
    };
  }, []);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Box
        id={READER_ID}
        sx={{
          width: '100%',
          minHeight: 240,
          borderRadius: 2,
          overflow: 'hidden',
          bgcolor: '#000',
          '& video': { width: '100%' },
        }}
      />
      {starting && !error && (
        <Typography variant="caption" sx={{ color: '#666' }}>
          Iniciando a câmera…
        </Typography>
      )}
      {error && (
        <Typography variant="body2" sx={{ color: '#C62828', fontWeight: 600 }}>
          {error}
        </Typography>
      )}
    </Box>
  );
}
