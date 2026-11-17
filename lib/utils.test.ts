import { describe, expect, it } from 'vitest';
import { formatQuantity, formatUnitTotal, unitSuffix } from './utils';

// A base numérica do sistema é sempre gramas; para produtos cadastrados em
// LITRO o mesmo número é exibido em ml/L (1g = 1ml).
describe('unidade do produto (kg | l)', () => {
  it('usa g quando o produto não tem unidade ou é kg', () => {
    expect(unitSuffix(undefined)).toBe('g');
    expect(unitSuffix(null)).toBe('g');
    expect(unitSuffix('kg')).toBe('g');
    expect(unitSuffix('l')).toBe('ml');
  });

  it('formata quantidades de peso em g/kg', () => {
    expect(formatQuantity(800)).toBe('800g');
    expect(formatQuantity(800, 'kg')).toBe('800g');
    expect(formatQuantity(1500, 'kg')).toBe('1500g / 1.50kg');
    expect(formatQuantity(undefined)).toBe('—');
  });

  it('formata quantidades de volume em ml/L', () => {
    expect(formatQuantity(800, 'l')).toBe('800ml');
    expect(formatQuantity(1500, 'l')).toBe('1500ml / 1.50L');
    expect(formatQuantity(null, 'l')).toBe('—');
  });

  it('formata o total na grandeza principal do produto', () => {
    expect(formatUnitTotal(1500)).toBe('1.50kg');
    expect(formatUnitTotal(1500, 'kg')).toBe('1.50kg');
    expect(formatUnitTotal(1500, 'l')).toBe('1.50L');
    expect(formatUnitTotal(null)).toBe('—');
  });
});
