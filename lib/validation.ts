import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const agendaItemSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  datePerformed: z.string().min(1, 'Date performed is required'),
  expiryDate: z.string().min(1, 'Expiry date is required'),
  observations: z.string().optional(),
});

export const employeeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(6, 'Password must be at least 6 characters').optional().or(z.literal('')),
  role: z.enum(['employee', 'admin']).optional(),
});

export const movementDestinationSchema = z.object({
  name: z.string().min(1, 'Name is required'),
});

const emptyToUndefined = (v: unknown) =>
  v === '' || v === null || v === undefined || (typeof v === 'number' && Number.isNaN(v))
    ? undefined
    : v;

export const productSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  group: z.string().min(1, 'Group is required'),
  storageMethod: z.string().min(1, 'Storage method is required'),
  shelfLifeDays: z.preprocess(emptyToUndefined, z.number({ message: 'Shelf life is required' }).min(0)),
  minQuantity: z.preprocess(emptyToUndefined, z.number().min(0).optional()),
  minPortionedQuantity: z.preprocess(emptyToUndefined, z.number().min(0).optional()),
  consumeAfterOpeningDays: z.preprocess(emptyToUndefined, z.number().min(0).optional()),
});

export const portioningSchema = z.object({
  productId: z.string().min(1),
  productName: z.string().min(1),
  rawWeightGrams: z.number().min(0),
  cleanWeightGrams: z.number().min(0),
  lossGrams: z.number().min(0),
  portionsCount: z.number().optional(),
  date: z.string().min(1),
  lote: z.string().optional(),
  employeeName: z.string().optional(),
});

export const stockItemSchema = z.object({
  productId: z.string().min(1),
  productName: z.string().min(1),
  type: z.enum(['raw', 'portioned']),
  weightGrams: z.number().min(0),
  manipulationDate: z.string().min(1),
  expiryDate: z.string().min(1),
  lote: z.string().optional(),
  nf: z.string().optional(),
  employeeName: z.string().optional(),
  productGroup: z.string().optional(),
  productStorage: z.string().optional(),
});

export const stockMovementSchema = z.object({
  productId: z.string().min(1),
  productName: z.string().min(1),
  movementType: z.enum(['entry', 'exit']),
  quantity: z.number().min(0),
  weightGrams: z.number().optional(),
  itemType: z.enum(['raw', 'portioned']).optional(),
  reason: z.string().optional(),
  date: z.string().min(1),
});
