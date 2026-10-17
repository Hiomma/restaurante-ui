import type { LabelData } from '@/app/components/LabelPreview/LabelPreview';

/**
 * Serviço de impressão local compartilhado (Brinquedoteca + Restaurante).
 *
 * O endpoint `POST /print/etiqueta` imprime a etiqueta NATIVAMENTE na Zebra
 * ZD220 (ZPL) com o MESMO conteúdo que aparece no navegador. A UI usa o
 * resultado apenas como sinal:
 *
 * - `true`  → TODAS as etiquetas foram confirmadas pelo serviço; pula o
 *   `window.print()` do navegador (já saíram na Zebra).
 * - `false` → serviço fora do ar, resposta inesperada ou erro; a chamada cai
 *   no fallback do navegador, inalterado.
 */
export const PRINTER_SERVICE_BASE_URL = 'http://127.0.0.1:17421';

/** Health rápido: não segura o clique do usuário por muito tempo. */
const HEALTH_TIMEOUT_MS = 800;
/** Imprimir na Zebra (montar ZPL + enviar) é mais lenta que um health check. */
const PRINT_TIMEOUT_MS = 10000;

/** Corpo aceito por POST /print/etiqueta — datas em ISO (o serviço formata). */
interface EtiquetaPayload {
  empresa: string;
  produto: string;
  conservacao: string;
  pesoGramas: number;
  recebimento: string;
  validade: string;
  lote?: string;
  responsavel?: string;
  consumoDias?: number;
  qrCode: string;
  quantidade: number;
}

/** Mapeia o `LabelData` da tela para o contrato do serviço. */
function toEtiquetaPayload(label: LabelData): EtiquetaPayload {
  return {
    empresa: label.companyName,
    produto: label.productName,
    conservacao: label.storage,
    pesoGramas: label.weightGrams,
    recebimento: label.recebimentoDate,
    validade: label.expiryDate,
    lote: label.lote,
    responsavel: label.responsavel,
    consumoDias: label.consumeAfterOpeningDays,
    qrCode: label.qrCode,
    quantidade: 1,
  };
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    // Serviço loopback que aceita qualquer origem: fetch simples, `mode: cors`
    // e sem credentials (nenhum cookie/token local é enviado para ele).
    return await fetch(url, { ...init, mode: 'cors', signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Health primeiro: só seguimos se responder for o serviço da brinquedoteca. */
async function isServiceAvailable(): Promise<boolean> {
  try {
    const resp = await fetchWithTimeout(
      `${PRINTER_SERVICE_BASE_URL}/health`,
      { method: 'GET' },
      HEALTH_TIMEOUT_MS,
    );
    if (!resp.ok) return false;
    const data = (await resp.json()) as { status?: string; service?: string };
    return data.service === 'brinquedoteca-printer';
  } catch {
    return false;
  }
}

/**
 * Imprime as etiquetas no serviço nativo (Zebra ZD220), uma requisição por
 * etiqueta (`quantidade: 1`).
 *
 * Retorna `true` SOMENTE quando todas as respostas forem `{ ok: true }`;
 * qualquer exceção, timeout ou resultado não-ok retorna `false` para que a
 * chamada siga o fallback do navegador (`window.print()`).
 */
export async function printEtiquetasNativas(labels: LabelData[]): Promise<boolean> {
  // Em teste nunca falamos com a rede: o comportamento do app (fallback para
  // window.print()) fica idêntico ao de antes.
  if (process.env.NODE_ENV === 'test') return false;
  if (typeof fetch === 'undefined') return false;
  if (!labels || labels.length === 0) return false;

  try {
    if (!(await isServiceAvailable())) return false;

    for (const label of labels) {
      const resp = await fetchWithTimeout(
        `${PRINTER_SERVICE_BASE_URL}/print/etiqueta`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(toEtiquetaPayload(label)),
        },
        PRINT_TIMEOUT_MS,
      );
      // 400 (payload inválido) ou qualquer outro erro → fallback.
      if (!resp.ok) return false;
      const result = (await resp.json()) as { ok?: boolean };
      if (!result.ok) return false;
    }
    return true;
  } catch {
    return false;
  }
}
