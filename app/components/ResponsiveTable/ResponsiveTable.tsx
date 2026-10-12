'use client';

import { Fragment, type ReactNode } from 'react';
import {
  Box,
  CircularProgress,
  List,
  ListItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import type { SxProps, TableCellProps, Theme } from '@mui/material';

/**
 * One column of a `ResponsiveTable`.
 *
 * The very same definition drives both layouts, so nothing can be lost when
 * the page switches to mobile: every column is rendered either as a table
 * cell (desktop) or as a labelled field of the mobile card, and the action
 * buttons live in a dedicated `actions` slot rendered in both layouts.
 */
export interface ResponsiveTableColumn<T> {
  /** Stable identifier, also used as the React key. */
  id: string;
  /** Column header (desktop) and default label (mobile). */
  header: ReactNode;
  /** Cell content. Receives the row. */
  cell: (row: T) => ReactNode;
  /** Horizontal alignment of the desktop cell. */
  align?: TableCellProps['align'];
  /** padding variant of the desktop cell. */
  padding?: TableCellProps['padding'];
  /** sx applied to the desktop body cell. */
  sx?: SxProps<Theme>;
  /** sx applied to the desktop header cell (merged on top of `headerCellSx`). */
  headerSx?: SxProps<Theme>;
  /**
   * Marks this column as the card title on mobile.
   * Defaults to the first column that is visible on mobile.
   */
  primary?: boolean;
  /**
   * Hides the column on mobile only. Never use this for a column that holds
   * an action or unique data.
   */
  hideOnMobile?: boolean;
  /** Hides the small label above the value inside the mobile card. */
  hideMobileLabel?: boolean;
  /**
   * Label rendered above the value on mobile. Pass `null` to hide the label
   * entirely, or omit it to reuse `header`.
   */
  mobileLabel?: ReactNode | null;
  /** Lets the value occupy the whole card width on mobile. */
  fullWidthOnMobile?: boolean;
}

export interface ResponsiveTableProps<T> {
  /** Columns, in display order. */
  columns: ResponsiveTableColumn<T>[];
  /** Rows. `undefined` renders the loading state. */
  rows: T[] | undefined;
  /** Row identity. */
  rowKey: (row: T) => string;
  /**
   * Content of the trailing "Ações" column. Rendered as the last desktop
   * column and as the top-right action area of every mobile card, so no
   * action is ever dropped on small screens.
   */
  actions?: (row: T) => ReactNode;
  /** Header of the actions column. */
  actionsLabel?: string;
  /** Extra leading cell (selection checkboxes, expanders, ...). */
  leading?: (row: T) => ReactNode;
  /** Header of the leading cell. */
  leadingHeader?: ReactNode;
  /** `padding` used by the leading cells (MUI `padding="checkbox"` etc.). */
  leadingPadding?: TableCellProps['padding'];
  /** sx for the leading cell. */
  leadingSx?: SxProps<Theme>;
  /** Row level sx (also applied to the mobile card). */
  rowSx?: (row: T) => SxProps<Theme> | undefined;
  /**
   * Extra content revealed for a row: rendered as a spanning table row on
   * desktop and as a collapsible block inside the card on mobile.
   * Return `null`/`undefined` to keep the row collapsed.
   */
  expandedRow?: (row: T) => ReactNode;
  /**
   * Note rendered after the last row: a spanning table row on desktop and a
   * trailing card on mobile. Use it for table footers / hints that are not
   * tied to a single row.
   */
  footerNote?: ReactNode;
  /**
   * Content rendered above the mobile card list only. Use it for controls
   * that live in the desktop header row (e.g. a "select all" checkbox) so
   * they are not lost on small screens.
   */
  mobileListHeader?: ReactNode;
  /** Message shown when there are no rows. */
  emptyMessage?: string;
  /** Forces the loading state. */
  loading?: boolean;
  /** Node rendered while loading. */
  loadingNode?: ReactNode;
  /** MUI table density. */
  size?: 'small' | 'medium';
  /** Renders the desktop table without the surrounding paper. */
  paper?: boolean;
  /** sx for the desktop TableContainer. */
  containerSx?: SxProps<Theme>;
  /** sx for the desktop <Table>. */
  tableSx?: SxProps<Theme>;
  /** sx applied to every desktop header cell. */
  headerCellSx?: SxProps<Theme>;
}

const headerDefaults: SxProps<Theme> = { fontWeight: 700, color: '#333' };

function mergeSx(...parts: (SxProps<Theme> | undefined)[]): SxProps<Theme> | undefined {
  const defined = parts.filter((p): p is SxProps<Theme> => Boolean(p));
  if (defined.length === 0) return undefined;
  if (defined.length === 1) return defined[0];
  // A flat array of style objects is a valid `sx` value.
  return defined as unknown as SxProps<Theme>;
}

export default function ResponsiveTable<T>({
  columns,
  rows,
  rowKey,
  actions,
  actionsLabel = 'Ações',
  leading,
  leadingHeader,
  leadingPadding = 'none',
  leadingSx,
  rowSx,
  expandedRow,
  footerNote,
  mobileListHeader,
  emptyMessage = 'Nenhum registro encontrado',
  loading,
  loadingNode,
  size = 'medium',
  paper = true,
  containerSx,
  tableSx,
  headerCellSx,
}: ResponsiveTableProps<T>) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const isLoading = loading ?? rows === undefined;

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        {loadingNode ?? <CircularProgress />}
      </Box>
    );
  }

  const list = rows ?? [];
  const primaryColumn = columns.find((c) => c.primary) ?? columns.find((c) => !c.hideOnMobile);
  const cardColumns = columns.filter((c) => c !== primaryColumn && !c.hideOnMobile);
  const colSpan =
    columns.length + (leadingHeader !== undefined || leading ? 1 : 0) + (actions ? 1 : 0);
  const headerSx = mergeSx(headerDefaults, headerCellSx);

  if (isMobile) {
    return (
      <List
        disablePadding
        sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, alignItems: 'stretch' }}
      >
        {mobileListHeader && (
          <ListItem disablePadding sx={{ display: 'block', px: 0.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>{mobileListHeader}</Box>
          </ListItem>
        )}
        {list.map((row) => {
          const expandedContent = expandedRow?.(row) ?? null;
          return (
            <ListItem key={rowKey(row)} disablePadding sx={{ display: 'block' }}>
              <Paper
                elevation={0}
                sx={{
                  width: '100%',
                  boxSizing: 'border-box',
                  border: '1px solid #e8ecf1',
                  borderRadius: 2,
                  p: 1.5,
                  overflow: 'hidden',
                  ...((rowSx?.(row) as Record<string, unknown>) ?? {}),
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                  {leading && (
                    <Box sx={{ flexShrink: 0, mt: -0.25, ...((leadingSx as object) ?? {}) }}>
                      {leading(row)}
                    </Box>
                  )}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    {primaryColumn && (
                      <Box
                        sx={{
                          fontWeight: 600,
                          fontSize: '1rem',
                          lineHeight: 1.4,
                          wordBreak: 'break-word',
                        }}
                      >
                        {primaryColumn.cell(row)}
                      </Box>
                    )}
                  </Box>
                  {actions && (
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        flexShrink: 0,
                        ml: 'auto',
                        mt: -0.5,
                        mr: -0.5,
                      }}
                    >
                      {actions(row)}
                    </Box>
                  )}
                </Box>

                {cardColumns.length > 0 && (
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(125px, 1fr))',
                      gap: 1,
                      mt: 1.25,
                      pt: 1.25,
                      borderTop: '1px solid #f1f3f5',
                    }}
                  >
                    {cardColumns.map((column) => (
                      <Box
                        key={column.id}
                        sx={{
                          minWidth: 0,
                          gridColumn: column.fullWidthOnMobile ? '1 / -1' : undefined,
                        }}
                      >
                        {!column.hideMobileLabel && column.mobileLabel !== null && (
                          <Typography
                            variant="caption"
                            sx={{ display: 'block', color: '#666', fontWeight: 600 }}
                          >
                            {column.mobileLabel ?? column.header}
                          </Typography>
                        )}
                        <Box sx={{ fontSize: '0.875rem', wordBreak: 'break-word' }}>
                          {column.cell(row)}
                        </Box>
                      </Box>
                    ))}
                  </Box>
                )}

                {expandedContent && (
                  <Box
                    sx={{
                      mt: 1.25,
                      pt: 1.25,
                      borderTop: '1px solid #f1f3f5',
                      bgcolor: '#F8F9FA',
                      mx: -1.5,
                      px: 1.5,
                      pb: 1.5,
                      boxSizing: 'border-box',
                    }}
                  >
                    {expandedContent}
                  </Box>
                )}
              </Paper>
            </ListItem>
          );
        })}

        {list.length === 0 && (
          <ListItem disablePadding sx={{ display: 'block' }}>
            <Paper
              elevation={0}
              sx={{
                width: '100%',
                boxSizing: 'border-box',
                border: '1px solid #e8ecf1',
                borderRadius: 2,
                py: 4,
                px: 2,
                textAlign: 'center',
              }}
            >
              <Typography color="text.secondary">{emptyMessage}</Typography>
            </Paper>
          </ListItem>
        )}

        {footerNote && (
          <ListItem disablePadding sx={{ display: 'block' }}>
            <Paper
              elevation={0}
              sx={{
                width: '100%',
                boxSizing: 'border-box',
                border: '1px solid #e8ecf1',
                borderRadius: 2,
                py: 2,
                px: 2,
                textAlign: 'center',
              }}
            >
              {footerNote}
            </Paper>
          </ListItem>
        )}
      </List>
    );
  }

  return (
    <TableContainer
      component={paper ? Paper : 'div'}
      sx={{ borderRadius: 2, ...((containerSx as object) ?? {}) }}
    >
      <Table size={size} sx={tableSx}>
        <TableHead>
          <TableRow sx={{ bgcolor: '#f5f7fa' }}>
            {(leadingHeader !== undefined || leading) && (
              <TableCell
                sx={mergeSx(headerSx, leadingSx)}
                padding={leading ? leadingPadding : undefined}
              >
                {leadingHeader}
              </TableCell>
            )}
            {columns.map((column) => (
              <TableCell
                key={column.id}
                align={column.align}
                padding={column.padding}
                sx={mergeSx(headerSx, column.headerSx)}
              >
                {column.header}
              </TableCell>
            ))}
            {actions && (
              <TableCell sx={headerSx} align="center">
                {actionsLabel}
              </TableCell>
            )}
          </TableRow>
        </TableHead>
        <TableBody>
          {list.map((row) => {
            const expandedContent = expandedRow?.(row) ?? null;
            return (
              <Fragment key={rowKey(row)}>
                <TableRow hover sx={rowSx?.(row)}>
                  {leading && (
                    <TableCell padding={leadingPadding} sx={leadingSx}>
                      {leading(row)}
                    </TableCell>
                  )}
                  {columns.map((column) => (
                    <TableCell
                      key={column.id}
                      align={column.align}
                      padding={column.padding}
                      sx={column.sx}
                    >
                      {column.cell(row)}
                    </TableCell>
                  ))}
                  {actions && <TableCell align="center">{actions(row)}</TableCell>}
                </TableRow>
                {expandedContent && (
                  <TableRow>
                    <TableCell colSpan={colSpan} sx={{ py: 2, bgcolor: '#F8F9FA', borderTop: 'none' }}>
                      {expandedContent}
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            );
          })}
          {list.length === 0 && (
            <TableRow>
              <TableCell colSpan={colSpan} align="center" sx={{ py: 4 }}>
                <Typography color="text.secondary">{emptyMessage}</Typography>
              </TableCell>
            </TableRow>
          )}
          {footerNote && (
            <TableRow>
              <TableCell colSpan={colSpan} align="center" sx={{ py: 4 }}>
                {footerNote}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
