import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from './api';
import type {
  User,
  AgendaItem,
  Employee,
  MovementDestination,
  Product,
  Portioning,
  StockItem,
  StockMovement,
} from '../types';

export function useLogin() {
  return useMutation({
    mutationFn: (data: { username: string; password: string }) =>
      api.post('/auth/login', data).then((res) => res.data),
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: (data: { name: string; username: string; password: string }) =>
      api.post('/auth/register', data).then((res) => res.data),
  });
}

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: () => api.get('/users/me').then((res) => res.data as User),
  });
}

export function useUpdateMe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<User>) =>
      api.put('/users/me', data).then((res) => res.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['me'] }),
  });
}

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then((res) => res.data as User[]),
  });
}

// Agenda Items
export function useAgendaItems() {
  return useQuery({
    queryKey: ['agenda-items'],
    queryFn: () => api.get('/agenda-items').then((res) => res.data as AgendaItem[]),
  });
}

export function useAgendaItem(id: string) {
  return useQuery({
    queryKey: ['agenda-items', id],
    queryFn: () => api.get(`/agenda-items/${id}`).then((res) => res.data as AgendaItem),
    enabled: !!id,
  });
}

export function useCreateAgendaItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post('/agenda-items', data).then((res) => res.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agenda-items'] }),
  });
}

export function useUpdateAgendaItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.put(`/agenda-items/${id}`, data).then((res) => res.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agenda-items'] }),
  });
}

export function useDeleteAgendaItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/agenda-items/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agenda-items'] }),
  });
}

// Employees
export function useEmployees() {
  return useQuery({
    queryKey: ['employees'],
    queryFn: () => api.get('/employees').then((res) => res.data as Employee[]),
  });
}

export function useEmployee(id: string) {
  return useQuery({
    queryKey: ['employees', id],
    queryFn: () => api.get(`/employees/${id}`).then((res) => res.data as Employee),
    enabled: !!id,
  });
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post('/employees', data).then((res) => res.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['employees'] }),
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.put(`/employees/${id}`, data).then((res) => res.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['employees'] }),
  });
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/employees/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['employees'] }),
  });
}

// Movement Destinations
export function useMovementDestinations() {
  return useQuery({
    queryKey: ['movement-destinations'],
    queryFn: () => api.get('/movement-destinations').then((res) => res.data as MovementDestination[]),
  });
}

export function useCreateMovementDestination() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post('/movement-destinations', data).then((res) => res.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['movement-destinations'] }),
  });
}

export function useDeleteMovementDestination() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/movement-destinations/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['movement-destinations'] }),
  });
}

// Products
export function useProducts(search?: string) {
  return useQuery({
    queryKey: ['products', search],
    queryFn: () =>
      api.get('/products', { params: { search } }).then((res) => res.data as Product[]),
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ['products', id],
    queryFn: () => api.get(`/products/${id}`).then((res) => res.data as Product),
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post('/products', data).then((res) => res.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.put(`/products/${id}`, data).then((res) => res.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/products/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
  });
}

// Portionings
export function usePortionings() {
  return useQuery({
    queryKey: ['portionings'],
    queryFn: () => api.get('/portionings').then((res) => res.data as Portioning[]),
  });
}

export function useCreatePortioning() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post('/portionings', data).then((res) => res.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['portionings'] }),
  });
}

export function useDeletePortioning() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/portionings/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['portionings'] }),
  });
}

// Stock Items
export function useStockItems(query?: { status?: string; productId?: string; type?: string }) {
  return useQuery({
    queryKey: ['stock-items', query],
    queryFn: () =>
      api.get('/stock-items', { params: query }).then((res) => res.data as StockItem[]),
  });
}

export function useStockItem(id: string) {
  return useQuery({
    queryKey: ['stock-items', id],
    queryFn: () => api.get(`/stock-items/${id}`).then((res) => res.data as StockItem),
    enabled: !!id,
  });
}

export function useCreateStockItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post('/stock-items', data).then((res) => res.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['stock-items'] }),
  });
}

export function useUpdateStockItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.put(`/stock-items/${id}`, data).then((res) => res.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['stock-items'] }),
  });
}

export function useDeleteStockItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/stock-items/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['stock-items'] }),
  });
}

export function useStockItemByQr(qrCode: string) {
  return useQuery({
    queryKey: ['stock-items', 'qr', qrCode],
    queryFn: () => api.get(`/stock-items/qr/${qrCode}`).then((res) => res.data as StockItem),
    enabled: !!qrCode,
  });
}

export function useLowStock() {
  return useQuery({
    queryKey: ['stock-items', 'low-stock'],
    queryFn: () => api.get('/stock-items/low-stock').then((res) => res.data as StockItem[]),
  });
}

// Stock Movements
export function useStockMovements() {
  return useQuery({
    queryKey: ['stock-movements'],
    queryFn: () => api.get('/stock-movements').then((res) => res.data as StockMovement[]),
  });
}

export function useCreateStockMovement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post('/stock-movements', data).then((res) => res.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['stock-movements'] }),
  });
}

export function useDeleteStockMovement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/stock-movements/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['stock-movements'] }),
  });
}
