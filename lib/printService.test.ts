import { describe, expect, it } from 'vitest';
import { toEtiquetaPayload } from './printService';
import type { LabelData } from '@/app/components/LabelPreview/LabelPreview';

function label(overrides: Partial<LabelData> = {}): LabelData {
  return {
    key: 'k1',
    companyName: 'Restaurante Sabor',
    productName: 'Queijo',
    storage: 'Refrigerado',
    weightGrams: 1000,
    recebimentoDate: '2026-10-15',
    expiryDate: '2026-10-20',
    qrCode: 'ABC123',
    ...overrides,
  };
}

// Contrato POST /print/etiqueta do printer-service: o serviço imprime em
// ml quando recebe `unidade: "l"` e continua imprimindo "g" sem o campo.
describe('contrato da etiqueta nativa (printer-service)', () => {
  it('manda a unidade do produto junto do peso', () => {
    expect(toEtiquetaPayload(label({ unit: 'l', weightGrams: 1500 }))).toMatchObject({
      pesoGramas: 1500,
      unidade: 'l',
      quantidade: 1,
    });
  });

  it('unidade ausente ou kg mantém o comportamento antigo (só gramas)', () => {
    expect(toEtiquetaPayload(label()).unidade).toBeUndefined();
    expect(toEtiquetaPayload(label({ unit: 'kg' })).unidade).toBe('kg');
  });
});
