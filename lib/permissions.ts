'use client';

import { useMe, usePermissionProfile } from './queries';

/**
 * Permissões de acesso por perfil.
 *
 * - Conta dono (sem `isEmployee`) e funcionário com papel "admin": acesso
 *   completo (ADM) — a matriz não se aplica.
 * - Funcionário com papel "employee": acesso definido pela MATRIZ por
 *   perfil salva em `/permission-profiles` (aba "Permissões" do cadastro
 *   de Funcionários). A API aplica as mesmas travas no backend (guard de
 *   funcionário), aqui só escondemos/bloqueamos a interface.
 *
 * Enquanto nenhuma matriz foi salva, valem os padrões históricos
 * (`EMPLOYEE_DEFAULTS` espelhado abaixo): Dashboard ✓, Recebimento ✓,
 * Movimentações ✓, Histórico ✓, Porcionamento criar ✓ / excluir ✗,
 * Estoque ver ✓ / excluir ✗ / exportar ✗, Agenda ver ✓ / alterar ✗,
 * Cadastros ✗, Funcionários ✗, Relatórios ✗, Alterar senha ✗.
 */

/** Padrões do perfil "Funcionário" — espelho de `EMPLOYEE_DEFAULTS` da API. */
export const EMPLOYEE_PERMISSION_DEFAULTS: Record<string, boolean> = {
  dashboard: true,
  recebimento: true,
  movimentacoes: true,
  historico: true,
  porcionamentoCreate: true,
  porcionamentoDelete: false,
  estoqueView: true,
  estoqueExport: false,
  estoqueDelete: false,
  agendaView: true,
  agendaEdit: false,
  cadastros: false,
  funcionarios: false,
  relatorios: false,
  changePassword: false,
};

export interface Access {
  /** Usuário carregado (null enquanto carrega). */
  loading: boolean;
  /** Funcionário com papel "employee" (restrito). false para dono e ADM. */
  restricted: boolean;
  /** Navegação/visualização. */
  dashboard: boolean;
  recebimento: boolean;
  movimentacoes: boolean;
  historico: boolean;
  porcionamentoCreate: boolean;
  estoqueView: boolean;
  agendaView: boolean;
  /** Ações restritas. */
  cadastros: boolean;
  funcionarios: boolean;
  relatorios: boolean;
  porcionamentoDelete: boolean;
  estoqueDelete: boolean;
  estoqueExport: boolean;
  agendaEdit: boolean;
  changePassword: boolean;
}

export function useAccess(): Access {
  const { data: me, isLoading } = useMe();
  // Matriz salva pelo dono — só relevante para o funcionário restrito.
  const { data: profile } = usePermissionProfile();
  const restricted = !!me?.isEmployee && me?.role !== 'admin';

  const flag = (key: keyof typeof EMPLOYEE_PERMISSION_DEFAULTS): boolean => {
    if (!restricted) return true;
    const saved = profile?.employee?.[key];
    if (typeof saved === 'boolean') return saved;
    return EMPLOYEE_PERMISSION_DEFAULTS[key];
  };

  return {
    loading: isLoading,
    restricted,
    dashboard: flag('dashboard'),
    recebimento: flag('recebimento'),
    movimentacoes: flag('movimentacoes'),
    historico: flag('historico'),
    porcionamentoCreate: flag('porcionamentoCreate'),
    estoqueView: flag('estoqueView'),
    agendaView: flag('agendaView'),
    cadastros: flag('cadastros'),
    funcionarios: flag('funcionarios'),
    relatorios: flag('relatorios'),
    porcionamentoDelete: flag('porcionamentoDelete'),
    estoqueDelete: flag('estoqueDelete'),
    estoqueExport: flag('estoqueExport'),
    agendaEdit: flag('agendaEdit'),
    changePassword: flag('changePassword'),
  };
}
