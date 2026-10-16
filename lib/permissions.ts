'use client';

import { useMe } from './queries';

/**
 * Permissões de acesso por perfil.
 *
 * - Conta dono (sem `isEmployee`) e funcionário com papel "admin": acesso
 *   completo (ADM).
 * - Funcionário com papel "employee": acesso restrito ao que a matriz de
 *   permissões permite — a API aplica as mesmas travas no backend (guard de
 *   funcionário), aqui só escondemos/bloqueamos a interface.
 *
 * Matriz (funcionário): Dashboard ✓, Recebimento ✓, Movimentações ✓,
 * Histórico ✓, Porcionamento criar ✓ / excluir histórico ✗, Estoque ver ✓ /
 * excluir ✗ / exportar ✗, Agenda ver ✓ / alterar ✗, Cadastros ✗,
 * Relatórios ✗, Alterar senha ✗.
 */
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
  relatorios: boolean;
  porcionamentoDelete: boolean;
  estoqueDelete: boolean;
  estoqueExport: boolean;
  agendaEdit: boolean;
  changePassword: boolean;
}

export function useAccess(): Access {
  const { data: me, isLoading } = useMe();
  const restricted = !!me?.isEmployee && me?.role !== 'admin';

  return {
    loading: isLoading,
    restricted,
    dashboard: true,
    recebimento: true,
    movimentacoes: true,
    historico: true,
    porcionamentoCreate: true,
    estoqueView: true,
    agendaView: true,
    cadastros: !restricted,
    relatorios: !restricted,
    porcionamentoDelete: !restricted,
    estoqueDelete: !restricted,
    estoqueExport: !restricted,
    agendaEdit: !restricted,
    changePassword: !restricted,
  };
}
