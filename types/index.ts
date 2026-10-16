export interface User {
  _id: string;
  name: string;
  username: string;
  role?: 'admin' | 'user';
  isEmployee?: boolean;
  imagePath?: string;
  company?: {
    name?: string;
    cnpj?: string;
    address?: string;
    phone?: string;
  };
}

export interface AgendaItem {
  _id: string;
  name: string;
  datePerformed: string;
  expiryDate: string;
  observations?: string;
  /** Status controlado pelo usuário (o "Vencido" é derivado da data). */
  status?: AgendaStatus;
  createdAt: string;
}

export type AgendaStatus = 'no_prazo' | 'em_andamento' | 'pendente' | 'finalizado';

export interface Employee {
  _id: string;
  name: string;
  username: string;
  role: 'employee' | 'admin';
  active: boolean;
  createdAt: string;
}

export interface Supplier {
  _id: string;
  name: string;
  active: boolean;
  createdAt: string;
}

export interface MovementDestination {
  _id: string;
  name: string;
  type?: 'move' | 'writeoff';
  active: boolean;
  createdAt: string;
}

export interface Product {
  _id: string;
  name: string;
  group: string;
  category?: 'Materia Prima' | 'Porcionado';
  storageMethod: string;
  shelfLifeDays: number;
  minQuantity: number;
  minPortionedQuantity: number;
  consumeAfterOpeningDays: number;
  createdAt: string;
}

export interface PortioningOutput {
  productId: string;
  productName: string;
  portionsCount: number;
  portionWeightGrams?: number;
}

export interface Portioning {
  _id: string;
  product: {
    productId: string;
    productName: string;
  };
  outputs?: PortioningOutput[];
  rawWeightGrams: number;
  cleanWeightGrams: number;
  lossGrams: number;
  lossPercentage: number;
  /** Ganho de peso quando o peso limpo é maior que o bruto (ingrediente sem etiqueta). */
  gainGrams?: number;
  /** Fornecedor de quem veio a matéria-prima porcionada. */
  supplier?: string;
  portionsCount: number;
  portionWeightGrams: number;
  /**
   * Matéria-prima porcionada (produto comprado). Diferente de `product`, que
   * passa a apontar para o produto final/porcionado quando há outputs — o
   * relatório de Perdas usa `rawProduct` para mostrar de qual matéria-prima
   * (e de qual fornecedor) vieram as perdas.
   */
  rawProduct?: {
    productId: string;
    productName: string;
  };
  date: string;
  lote?: string;
  employeeName?: string;
  createdAt: string;
}

export interface StockItem {
  _id: string;
  product: {
    productId: string;
    productName: string;
    productGroup?: string;
    productStorage?: string;
  };
  type: 'raw' | 'portioned';
  weightGrams: number;
  manipulationDate: string;
  expiryDate: string;
  originalExpiryDate?: string;
  qrCode: string;
  status: 'in_stock' | 'used' | 'discarded' | 'expired';
  batchId?: string;
  destination?: string;
  lote?: string;
  nf?: string;
  /** Fornecedor de quem a mercadoria foi recebida. */
  supplier?: string;
  employeeName?: string;
  createdAt: string;
}

export interface StockMovement {
  _id: string;
  product: {
    productId: string;
    productName: string;
  };
  movementType: 'entry' | 'exit' | 'move';
  quantity: number;
  weightGrams?: number;
  itemType?: 'raw' | 'portioned';
  reason?: string;
  destination?: string;
  /** Usuário que realizou a movimentação. */
  userName?: string;
  date: string;
  createdAt: string;
}

/**
 * Resposta da API (HTTP 410) quando um QR consultado pertence a uma etiqueta
 * que JÁ foi baixada/usada: informa para onde foi, por quem e quando — em vez
 * de um 404 sem contexto.
 */
export interface UsedLabelInfo {
  used: true;
  message?: string;
  qrCode?: string;
  productName?: string;
  type?: 'raw' | 'portioned';
  weightGrams?: number;
  destination?: string;
  /** Usuário que deu baixa na etiqueta. */
  userName?: string;
  removedAt?: string;
  reason?: string;
}
