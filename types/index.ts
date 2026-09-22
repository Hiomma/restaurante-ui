export interface User {
  _id: string;
  name: string;
  username: string;
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
  createdAt: string;
}

export interface Employee {
  _id: string;
  name: string;
  username: string;
  role: 'employee' | 'admin';
  active: boolean;
  createdAt: string;
}

export interface MovementDestination {
  _id: string;
  name: string;
  active: boolean;
  createdAt: string;
}

export interface Product {
  _id: string;
  name: string;
  group: string;
  storageMethod: string;
  shelfLifeDays: number;
  minQuantity: number;
  minPortionedQuantity: number;
  consumeAfterOpeningDays: number;
  createdAt: string;
}

export interface Portioning {
  _id: string;
  product: {
    productId: string;
    productName: string;
  };
  rawWeightGrams: number;
  cleanWeightGrams: number;
  lossGrams: number;
  lossPercentage: number;
  portionsCount: number;
  portionWeightGrams: number;
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
  lote?: string;
  nf?: string;
  employeeName?: string;
  createdAt: string;
}

export interface StockMovement {
  _id: string;
  product: {
    productId: string;
    productName: string;
  };
  movementType: 'entry' | 'exit';
  quantity: number;
  weightGrams?: number;
  itemType?: 'raw' | 'portioned';
  reason?: string;
  date: string;
  createdAt: string;
}
