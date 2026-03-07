/**
 * Table Component - Foundational Five
 * Pixel-perfect recreation from legacy CSS
 * 
 * Legacy CSS Reference:
 * - .dt: Data table with specific header and cell styles
 * - Headers: var(--fm), 7.5px, uppercase, tracking, t4 color
 * - Cells: 11.5px, t2 color, vertical-align middle
 * - Hover: background rgba(255,255,255,.015)
 * - Borders: 1px solid var(--border)
 */

import * as React from 'react';
import { cn } from '@/lib/utils';

// ========================================
// TABLE ROOT
// ========================================

const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <div className="w-full overflow-auto">
    <table
      ref={ref}
      className={cn(
        'w-full border-collapse',
        className
      )}
      {...props}
    />
  </div>
));
Table.displayName = 'Table';

// ========================================
// TABLE HEADER
// ========================================

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn('[&_tr]:border-b [&_tr]:border-border', className)} {...props} />
));
TableHeader.displayName = 'TableHeader';

// ========================================
// TABLE BODY
// ========================================

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody ref={ref} className={cn('[&_tr:last-child]:border-b-0', className)} {...props} />
));
TableBody.displayName = 'TableBody';

// ========================================
// TABLE FOOTER
// ========================================

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot ref={ref} className={cn('border-t border-border bg-bg-2', className)} {...props} />
));
TableFooter.displayName = 'TableFooter';

// ========================================
// TABLE ROW
// ========================================

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      'border-b border-border transition-colors duration-150 hover:bg-white/[0.015] data-[state=selected]:bg-white/[0.03]',
      className
    )}
    {...props}
  />
));
TableRow.displayName = 'TableRow';

// ========================================
// TABLE HEAD (.dt th)
// ========================================

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      'font-mono text-[7.5px] uppercase tracking-[0.13em] text-t4 text-left',
      'px-[11px] pb-[7px] border-b border-border',
      className
    )}
    {...props}
  />
));
TableHead.displayName = 'TableHead';

// ========================================
// TABLE CELL (.dt td)
// ========================================

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      'text-[11.5px] text-t2 align-middle px-[11px] py-[9px]',
      className
    )}
    {...props}
  />
));
TableCell.displayName = 'TableCell';

// ========================================
// TABLE CAPTION
// ========================================

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn('mt-4 text-xs text-t3', className)}
    {...props}
  />
));
TableCaption.displayName = 'TableCaption';

// ========================================
// DATA TABLE COMPONENT
// Convenience wrapper for common table patterns
// ========================================

interface DataTableProps<T> {
  data: T[];
  columns: {
    key: keyof T;
    header: string;
    render?: (value: T[keyof T], row: T) => React.ReactNode;
    className?: string;
  }[];
  keyExtractor: (row: T) => string;
  onRowClick?: (row: T) => void;
  className?: string;
  emptyState?: React.ReactNode;
}

function DataTable<T>({
  data,
  columns,
  keyExtractor,
  onRowClick,
  className,
  emptyState,
}: DataTableProps<T>) {
  if (data.length === 0 && emptyState) {
    return <div className="py-8 text-center text-t3">{emptyState}</div>;
  }

  return (
    <Table className={className}>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          {columns.map((column) => (
            <TableHead key={String(column.key)} className={column.className}>
              {column.header}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row) => (
          <TableRow
            key={keyExtractor(row)}
            onClick={() => onRowClick?.(row)}
            className={cn(onRowClick && 'cursor-pointer')}
          >
            {columns.map((column) => (
              <TableCell key={String(column.key)} className={column.className}>
                {column.render
                  ? column.render(row[column.key], row)
                  : String(row[column.key])}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// ========================================
// SPECIALIZED CELL RENDERERS
// ========================================

// Name cell with styling (.td-name)
const TableNameCell = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(({ className, children, ...props }, ref) => (
  <span
    ref={ref}
    className={cn(
      'font-semibold text-t1',
      className
    )}
    {...props}
  >
    {children}
  </span>
));
TableNameCell.displayName = 'TableNameCell';

// Mono text cell (.td-mono)
const TableMonoCell = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(({ className, children, ...props }, ref) => (
  <span
    ref={ref}
    className={cn(
      'font-mono text-[9.5px] text-t4',
      className
    )}
    {...props}
  >
    {children}
  </span>
));
TableMonoCell.displayName = 'TableMonoCell';

// Status cell with badge
interface StatusCellProps {
  status: string;
  variant?: 'neon' | 'danger' | 'amber' | 'blue' | 'grey';
}

const TableStatusCell = ({ status, variant = 'grey' }: StatusCellProps) => {
  const variantClass = {
    neon: 'text-neon',
    danger: 'text-danger',
    amber: 'text-amber',
    blue: 'text-blue',
    grey: 'text-t4',
  }[variant];

  return (
    <span className={cn('font-medium', variantClass)}>
      {status}
    </span>
  );
};

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
  DataTable,
  TableNameCell,
  TableMonoCell,
  TableStatusCell,
};
