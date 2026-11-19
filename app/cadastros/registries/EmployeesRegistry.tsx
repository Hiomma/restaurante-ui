'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Chip,
  Switch,
  Tab,
  Checkbox,
  InputAdornment,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PeopleIcon from '@mui/icons-material/People';
import CloseIcon from '@mui/icons-material/Close';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSnackbar } from 'notistack';
import { employeeSchema } from '@/lib/validation';
import {
  useEmployees,
  useCreateEmployee,
  useUpdateEmployee,
  useDeleteEmployee,
  usePermissionProfile,
  useUpdatePermissionProfile,
} from '@/lib/queries';
import { EMPLOYEE_PERMISSION_DEFAULTS } from '@/lib/permissions';
import type { Employee } from '@/types';
import ConfirmDialog from '@/app/components/ConfirmDialog/ConfirmDialog';
import ResponsiveTable from '@/app/components/ResponsiveTable/ResponsiveTable';
import ResponsiveTabs from '@/app/components/ResponsiveTabs/ResponsiveTabs';
import { colors } from '@/lib/design-system';

type EmployeeFormValues = z.infer<typeof employeeSchema>;

const thSx = { fontWeight: 700, color: colors.gray[800] };

/**
 * Permissões da matriz por perfil — mesma chave da API (`/permission-profiles`)
 * e de `useAccess`. Admin é sempre acesso total (coluna fixa).
 */
const PERMISSION_DEFS: { key: string; label: string; hint: string }[] = [
  { key: 'dashboard', label: 'Dashboard', hint: 'Visão geral do sistema' },
  { key: 'recebimento', label: 'Recebimento', hint: 'Registrar entradas de mercadoria' },
  { key: 'movimentacoes', label: 'Movimentações', hint: 'Mover etiquetas e fazer a contagem' },
  { key: 'historico', label: 'Histórico', hint: 'Ver movimentações e reimprimir etiquetas' },
  {
    key: 'porcionamentoCreate',
    label: 'Porcionamento — criar',
    hint: 'Gerar porcionamentos e etiquetas avulsas',
  },
  {
    key: 'porcionamentoDelete',
    label: 'Porcionamento — excluir',
    hint: 'Excluir registros do histórico de porcionamento',
  },
  { key: 'estoqueView', label: 'Estoque', hint: 'Visualizar o estoque por local' },
  { key: 'estoqueExport', label: 'Estoque — exportar', hint: 'Exportar planilhas e conferência' },
  { key: 'estoqueDelete', label: 'Estoque — baixar', hint: 'Dar baixa/excluir etiquetas' },
  { key: 'agendaView', label: 'Agenda', hint: 'Visualizar a agenda' },
  { key: 'agendaEdit', label: 'Agenda — alterar', hint: 'Criar, editar e excluir itens' },
  { key: 'cadastros', label: 'Cadastros', hint: 'Produtos, fornecedores, destinos e grupos' },
  {
    key: 'funcionarios',
    label: 'Funcionários',
    hint: 'Gerenciar a equipe (sem promover a Admin)',
  },
  { key: 'relatorios', label: 'Relatórios', hint: 'Acessar todas as abas de relatórios' },
  { key: 'changePassword', label: 'Alterar senha', hint: 'Trocar a própria senha' },
];

const containedSx = {
  textTransform: 'none',
  borderRadius: 1.5,
  bgcolor: colors.brand.navy,
  px: 2.5,
  boxShadow: 'none',
  '&:hover': { bgcolor: colors.brand.navyDark, boxShadow: 'none' },
} as const;

const outlinedCancelSx = {
  textTransform: 'none',
  color: colors.gray[700],
  borderColor: colors.border.default,
  bgcolor: colors.common.white,
  borderRadius: 1.5,
  px: 2.5,
  '&:hover': { borderColor: colors.border.strong, bgcolor: colors.surface.muted },
} as const;

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <Typography variant="body2" fontWeight={600} sx={{ mb: 0.75 }}>
      {children}
      {required && ' *'}
    </Typography>
  );
}

/**
 * Registro de funcionários (guia "Funcionários" da página Cadastros).
 * Renderizado sem o layout: quem monta é a página que o utiliza.
 */
export default function EmployeesRegistry() {
  const { enqueueSnackbar } = useSnackbar();
  const { data: employees, isLoading, isError } = useEmployees();
  const createEmp = useCreateEmployee();
  const updateEmp = useUpdateEmployee();
  const deleteEmp = useDeleteEmployee();

  // ===== Aba "Permissões" (matriz por perfil) =====
  const [subTab, setSubTab] = useState<'list' | 'permissions'>('list');
  const { data: permissionProfile, isLoading: loadingProfile } = usePermissionProfile();
  const updateProfile = useUpdatePermissionProfile();
  const [matrix, setMatrix] = useState<Record<string, boolean> | null>(null);

  // Espelho da matriz salva (ou dos padrões enquanto não há matriz).
  const savedMatrix: Record<string, boolean> = {
    ...EMPLOYEE_PERMISSION_DEFAULTS,
    ...(permissionProfile?.employee ?? {}),
  };
  const effectiveMatrix = matrix ?? savedMatrix;
  const matrixDirty = !!matrix && JSON.stringify(matrix) !== JSON.stringify(savedMatrix);

  // Troca de aba recarrega a matriz salva (ponto de partida da edição).
  const changeSubTab = (next: 'list' | 'permissions') => {
    if (next === 'permissions') setMatrix(null);
    setSubTab(next);
  };

  const togglePermission = (key: string) => {
    setMatrix({ ...effectiveMatrix, [key]: !effectiveMatrix[key] });
  };

  const handleSavePermissions = async () => {
    try {
      await updateProfile.mutateAsync(effectiveMatrix);
      setMatrix(null);
      enqueueSnackbar('Permissões por perfil salvas!', { variant: 'success' });
    } catch {
      enqueueSnackbar('Erro ao salvar as permissões.', { variant: 'error' });
    }
  };

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: { name: '', username: '', password: '', role: 'employee' },
  });

  const openCreate = () => {
    setEditing(null);
    setShowPassword(false);
    form.reset({ name: '', username: '', password: '', role: 'employee' });
    setDialogOpen(true);
  };

  const openEdit = (emp: Employee) => {
    setEditing(emp);
    setShowPassword(false);
    form.reset({ name: emp.name, username: emp.username, password: '', role: emp.role });
    setDialogOpen(true);
  };

  const onSubmit = async (data: EmployeeFormValues) => {
    try {
      if (!editing) {
        if (!data.password) {
          form.setError('password', { message: 'Senha é obrigatória' });
          return;
        }
        if ((data.password ?? '').length < 6) {
          form.setError('password', { message: 'Senha deve ter pelo menos 6 caracteres' });
          return;
        }
        await createEmp.mutateAsync({
          name: data.name,
          username: data.username,
          password: data.password,
          role: data.role ?? 'employee',
        });
        enqueueSnackbar('Funcionário cadastrado com sucesso!', { variant: 'success' });
      } else {
        const payload: Partial<EmployeeFormValues> = {
          name: data.name,
          username: data.username,
          role: data.role ?? 'employee',
        };
        if (data.password) payload.password = data.password;
        await updateEmp.mutateAsync({ id: editing._id, data: payload });
        enqueueSnackbar('Funcionário atualizado com sucesso!', { variant: 'success' });
      }
      setDialogOpen(false);
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response
        ?.data?.message;
      enqueueSnackbar(
        Array.isArray(msg)
          ? msg.filter(Boolean).join(' — ') || 'Erro ao salvar funcionário.'
          : typeof msg === 'string' && msg.trim()
            ? msg
            : 'Erro ao salvar funcionário.',
        { variant: 'error' },
      );
    }
  };

  const toggleActive = (emp: Employee) => {
    updateEmp.mutate({ id: emp._id, data: { active: !emp.active } });
  };

  const handleDelete = async () => {
    if (deleteTarget) {
      try {
        await deleteEmp.mutateAsync(deleteTarget);
        enqueueSnackbar('Funcionário removido.', { variant: 'success' });
      } catch {
        enqueueSnackbar('Erro ao excluir funcionário.', { variant: 'error' });
      }
      setDeleteTarget(null);
    }
  };

  // Sem permissão (`funcionarios` negada) a lista nem carrega: em vez de
  // uma tabela vazia, mostre o motivo.
  if (isError) {
    return (
      <Box
        sx={{
          bgcolor: colors.status.warningTint,
          border: `1px solid ${colors.status.warningBorder}`,
          borderRadius: 2,
          p: 2.5,
        }}
      >
        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>
          Acesso restrito
        </Typography>
        <Typography variant="body2" sx={{ color: colors.gray[600] }}>
          Seu perfil não tem permissão para gerenciar funcionários. Peça ao administrador para
          liberar a permissão &quot;Funcionários&quot; na aba Cadastros → Funcionários →
          Permissões.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box
        sx={{
          mb: 3,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 2,
          flexWrap: 'wrap',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 0 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              bgcolor: colors.brand.navyTint,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <PeopleIcon sx={{ color: colors.brand.navy, fontSize: 22 }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight="bold">
              Funcionários
            </Typography>
            <Typography variant="body2" sx={{ color: colors.gray[500] }}>
              Gerencie os usuários do sistema e as permissões por perfil
            </Typography>
          </Box>
        </Box>
        {subTab === 'list' && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate} sx={containedSx}>
            Novo Funcionário
          </Button>
        )}
      </Box>

      {/* Abas do registro: equipe + matriz de permissões por perfil. */}
      <ResponsiveTabs
        value={subTab}
        onChange={(_, v: 'list' | 'permissions') => changeSubTab(v)}
        scrollButtons="auto"
        allowScrollButtonsMobile
        sx={{
          bgcolor: colors.status.neutralTint,
          borderRadius: 2,
          p: 0.5,
          mb: 2,
          minHeight: 44,
          width: 'fit-content',
          maxWidth: '100%',
          '& .MuiTabs-indicator': { display: 'none' },
          '& .MuiTab-root': {
            textTransform: 'none',
            borderRadius: 1.5,
            minHeight: 40,
            minWidth: 120,
            fontWeight: 600,
            color: colors.gray[600],
            whiteSpace: 'nowrap',
            justifyContent: 'center',
            '&.Mui-selected': { bgcolor: colors.common.white, color: colors.brand.navy },
          },
        }}
      >
        <Tab label="Funcionários" value="list" />
        <Tab label="Permissões" value="permissions" />
      </ResponsiveTabs>

      {subTab === 'permissions' && (
        <Box>
          <Box
            sx={{
              bgcolor: colors.info.tint,
              border: `1px solid ${colors.info.border}`,
              borderRadius: 2,
              p: 2,
              mb: 2,
            }}
          >
            <Typography variant="body2" sx={{ color: colors.gray[800], lineHeight: 1.6 }}>
              <Box component="span" sx={{ fontWeight: 700 }}>
                Permissões por perfil:{' '}
              </Box>
              marque o que o perfil <b>Funcionário</b> pode fazer no sistema. O perfil{' '}
              <b>Admin</b> sempre tem acesso total. As alterações valem para todos os
              funcionários com perfil Funcionário e são aplicadas também na API.
            </Typography>
          </Box>

          <ResponsiveTable
            containerSx={{ border: `1px solid ${colors.border.subtle}` }}
            headerCellSx={thSx}
            rows={PERMISSION_DEFS}
            rowKey={(p) => p.key}
            emptyMessage="Nenhuma permissão"
            actionsLabel="Ações"
            columns={[
              {
                id: 'permissao',
                header: 'Permissão',
                primary: true,
                cell: (p) => (
                  <Box>
                    <Typography variant="body2" fontWeight={600}>
                      {p.label}
                    </Typography>
                    <Typography variant="caption" sx={{ color: colors.gray[400] }}>
                      {p.hint}
                    </Typography>
                  </Box>
                ),
              },
              {
                id: 'admin',
                header: 'Admin',
                cell: () => (
                  <Checkbox size="small" checked disabled sx={{ p: 0 }} />
                ),
              },
              {
                id: 'funcionario',
                header: 'Funcionário',
                fullWidthOnMobile: true,
                cell: (p) => (
                  <Checkbox
                    size="small"
                    checked={!!effectiveMatrix[p.key]}
                    onChange={() => togglePermission(p.key)}
                    inputProps={{ 'aria-label': `permissão ${p.label}` }}
                  />
                ),
              },
            ]}
          />

          <Box
            className="no-print"
            sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1.5 }}
          >
            <Button
              variant="outlined"
              disabled={!matrixDirty || updateProfile.isPending}
              onClick={() => setMatrix(null)}
              sx={{
                textTransform: 'none',
                color: colors.gray[700],
                borderColor: colors.border.default,
                bgcolor: colors.common.white,
                borderRadius: 1.5,
                px: 2.5,
              }}
            >
              Descartar alterações
            </Button>
            <Button
              variant="contained"
              disabled={!matrixDirty || updateProfile.isPending || loadingProfile}
              onClick={handleSavePermissions}
              sx={containedSx}
            >
              Salvar permissões
            </Button>
          </Box>
        </Box>
      )}

      {subTab === 'list' && (
        <>
      <Box
        sx={{
          bgcolor: colors.info.tint,
          border: `1px solid ${colors.info.border}`,
          borderRadius: 2,
          p: 2,
          mb: 3,
        }}
      >
        <Typography variant="body2" sx={{ color: colors.gray[800], lineHeight: 1.6 }}>
          <Box component="span" sx={{ fontWeight: 700 }}>
            Como funciona:{' '}
          </Box>
          Funcionários acessam o sistema pela tela de login usando nome de usuário e senha. O ADM
          (acesso pelo e-mail) pode criar e excluir funcionários. As etiquetas geradas sairão com o
          nome do funcionário logado.
        </Typography>
      </Box>

      <ResponsiveTable
        loading={isLoading}
        rows={employees}
        rowKey={(emp) => emp._id}
        emptyMessage="Nenhum funcionário encontrado"
        columns={[
          {
            id: 'nome',
            header: 'Nome',
            primary: true,
            cell: (emp) => <Typography fontWeight={500}>{emp.name}</Typography>,
          },
          {
            id: 'usuario',
            header: 'Usuário',
            cell: (emp) => (
              <Typography variant="body2" sx={{ color: colors.gray[500] }}>
                {emp.username}
              </Typography>
            ),
          },
          {
            id: 'perfil',
            header: 'Perfil',
            cell: (emp) =>
              emp.role === 'admin' ? (
                <Chip
                  label="Admin"
                  size="small"
                  sx={{
                    bgcolor: colors.movement.portioningTint,
                    color: colors.movement.portioning,
                    fontWeight: 600,
                    borderRadius: 1,
                  }}
                />
              ) : (
                <Chip
                  label="Funcionário"
                  size="small"
                  sx={{
                    bgcolor: colors.brand.navyTint,
                    color: colors.brand.navyDark,
                    fontWeight: 600,
                    borderRadius: 1,
                  }}
                />
              ),
          },
          {
            id: 'status',
            header: 'Status',
            cell: (emp) => (
              <Switch
                checked={emp.active}
                color="primary"
                size="small"
                onChange={() => toggleActive(emp)}
              />
            ),
          },
        ]}
        actions={(emp) => (
          <>
            <IconButton size="small" onClick={() => openEdit(emp)} sx={{ color: colors.gray[500] }}>
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => setDeleteTarget(emp._id)}
              sx={{ color: colors.status.dangerStrong }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </>
        )}
      />
        </>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            pb: 1,
          }}
        >
          {editing ? 'Editar Funcionário' : 'Novo Funcionário'}
          <IconButton
            aria-label="fechar"
            onClick={() => setDialogOpen(false)}
            size="small"
            sx={{ color: colors.gray[500], mr: -1 }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
            <Box>
              <FieldLabel required>Nome Completo</FieldLabel>
              <TextField
                placeholder="Ex: João Silva"
                {...form.register('name')}
                error={!!form.formState.errors.name}
                helperText={form.formState.errors.name?.message}
                fullWidth
                size="small"
                sx={{ '& .MuiOutlinedInput-root': { height: 44 } }}
              />
            </Box>
            <Box>
              <FieldLabel required>Nome de Usuário</FieldLabel>
              <TextField
                placeholder="Ex: joao.silva"
                {...form.register('username')}
                error={!!form.formState.errors.username}
                helperText={form.formState.errors.username?.message}
                fullWidth
                size="small"
                sx={{ '& .MuiOutlinedInput-root': { height: 44 } }}
              />
            </Box>
            <Box>
              <FieldLabel required>Senha</FieldLabel>
              <TextField
                type={showPassword ? 'text' : 'password'}
                placeholder={editing ? 'Deixe vazio para manter' : undefined}
                {...form.register('password')}
                error={!!form.formState.errors.password}
                helperText={form.formState.errors.password?.message}
                fullWidth
                size="small"
                sx={{ '& .MuiOutlinedInput-root': { height: 44 } }}
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          edge="end"
                          onClick={() => setShowPassword((v) => !v)}
                          aria-label="mostrar senha"
                        >
                          {showPassword ? (
                            <VisibilityOffIcon fontSize="small" />
                          ) : (
                            <VisibilityIcon fontSize="small" />
                          )}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />
            </Box>
            <Box>
              <FieldLabel>Perfil</FieldLabel>
              <TextField select value={form.watch('role') || ''} {...form.register('role')} fullWidth size="small" sx={{ '& .MuiOutlinedInput-root': { height: 44 } }}>
                <MenuItem value="employee">Funcionário</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
              </TextField>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1.5 }}>
          <Button onClick={() => setDialogOpen(false)} variant="outlined" sx={outlinedCancelSx}>
            Cancelar
          </Button>
          <Button onClick={form.handleSubmit(onSubmit)} variant="contained" sx={containedSx}>
            {editing ? 'Salvar' : 'Cadastrar'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Excluir Funcionário"
        message="Tem certeza?"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
}
