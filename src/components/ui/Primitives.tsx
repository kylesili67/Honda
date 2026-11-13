import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bike,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Upload,
  X,
} from 'lucide-react';
import { formatPKR } from '../../lib/format';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'outline-dark' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className = '',
  children,
  ...props
}: ButtonProps) {
  const variants: Record<NonNullable<ButtonProps['variant']>, string> = {
    primary: 'bg-[#D71920] text-white hover:bg-[#B01218] border border-transparent',
    secondary: 'bg-[#111214] text-white hover:bg-[#26282C] border border-transparent',
    outline: 'bg-white text-[#111214] border border-[#E3E4E7] hover:bg-[#F5F5F6]',
    'outline-dark': 'bg-white/10 text-white border border-white/40 hover:bg-white/20 hover:border-white/70',
    ghost: 'bg-transparent text-[#111214] border border-transparent hover:bg-[#F5F5F6]',
    destructive: 'bg-[#C0262D] text-white hover:bg-[#9E1C22] border border-transparent',
  };
  const sizes: Record<NonNullable<ButtonProps['size']>, string> = {
    sm: 'h-9 px-3.5 text-xs',
    md: 'h-11 px-5 text-sm',
    lg: 'h-12 px-6 text-sm',
  };

  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-semibold whitespace-nowrap shrink-0 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D71920] focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, id, className = '', ...props }, ref) => {
    const inputId = id || props.name;
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-[#111214] mb-1.5">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={Boolean(error)}
          className={`w-full h-11 rounded-lg border bg-white px-3.5 text-sm text-[#111214] placeholder:text-[#6B7078]/70 transition-colors focus:outline-none focus:ring-2 focus:ring-[#D71920]/30 focus:border-[#D71920] ${
            error ? 'border-[#C0262D]' : 'border-[#E3E4E7]'
          } ${className}`}
          {...props}
        />
        {hint && !error && <p className="mt-1 text-xs text-[#6B7078]">{hint}</p>}
        {error && <p className="mt-1 text-xs text-[#C0262D]">{error}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, id, className = '', children, ...props }, ref) => {
    const selectId = id || props.name;
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={selectId} className="block text-sm font-medium text-[#111214] mb-1.5">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          aria-invalid={Boolean(error)}
          className={`w-full h-11 rounded-lg border bg-white px-3 text-sm text-[#111214] transition-colors focus:outline-none focus:ring-2 focus:ring-[#D71920]/30 focus:border-[#D71920] ${
            error ? 'border-[#C0262D]' : 'border-[#E3E4E7]'
          } ${className}`}
          {...props}
        >
          {children}
        </select>
        {error && <p className="mt-1 text-xs text-[#C0262D]">{error}</p>}
      </div>
    );
  }
);
Select.displayName = 'Select';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, id, className = '', ...props }, ref) => {
    const fieldId = id || props.name;
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={fieldId} className="block text-sm font-medium text-[#111214] mb-1.5">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={fieldId}
          aria-invalid={Boolean(error)}
          className={`w-full rounded-lg border bg-white p-3.5 text-sm text-[#111214] placeholder:text-[#6B7078]/70 transition-colors focus:outline-none focus:ring-2 focus:ring-[#D71920]/30 focus:border-[#D71920] ${
            error ? 'border-[#C0262D]' : 'border-[#E3E4E7]'
          } ${className}`}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-[#C0262D]">{error}</p>}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';

export function Card({
  className = '',
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`rounded-xl border border-[#E3E4E7] bg-white ${className}`}>
      {children}
    </div>
  );
}

export function StatusChip({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const label = normalized.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  let tone = 'border-[#E3E4E7] bg-[#F5F5F6] text-[#111214]';
  if (
    ['confirmed', 'paid', 'completed', 'delivered', 'converted_to_sale', 'published', 'approved', 'accepted', 'closed_won'].includes(
      normalized
    )
  ) {
    tone = 'border-[#1E8E4E]/25 bg-[#1E8E4E]/10 text-[#1E8E4E]';
  } else if (
    ['pending', 'requested', 'in_progress', 'processing', 'shipped', 'valued', 'contacted', 'qualified', 'received'].includes(
      normalized
    )
  ) {
    tone = 'border-[#B7791F]/25 bg-[#B7791F]/10 text-[#B7791F]';
  } else if (
    ['cancelled', 'failed', 'rejected', 'expired', 'no_show', 'closed_lost', 'declined', 'archived'].includes(
      normalized
    )
  ) {
    tone = 'border-[#C0262D]/25 bg-[#C0262D]/10 text-[#C0262D]';
  } else if (['new', 'refunded', 'exchanged', 'returned'].includes(normalized)) {
    tone = 'border-[#2563EB]/25 bg-[#2563EB]/10 text-[#2563EB]';
  }

  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap ${tone}`}
    >
      {label}
    </span>
  );
}

export function PriceTag({
  amount,
  compareAt,
  size = 'md',
}: {
  amount: number;
  compareAt?: number | null;
  size?: 'sm' | 'md' | 'lg';
}) {
  const textSize =
    size === 'lg' ? 'text-2xl font-bold' : size === 'sm' ? 'text-sm font-semibold' : 'text-lg font-bold';
  return (
    <div className="flex items-baseline gap-2.5 tabular-nums">
      <span className={`${textSize} text-[#111214]`}>{formatPKR(amount)}</span>
      {compareAt && compareAt > amount && (
        <span className="text-xs text-[#6B7078] line-through">{formatPKR(compareAt)}</span>
      )}
    </div>
  );
}

export function SafeImage({
  src,
  alt,
  className = '',
  aspectClass = 'aspect-[4/3]',
}: {
  src?: string | null;
  alt: string;
  className?: string;
  aspectClass?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-[#F5F5F6] text-[#6B7078] ${aspectClass} ${className}`}
        role="img"
        aria-label={alt}
      >
        <Bike className="h-9 w-9 stroke-[1.5] text-[#6B7078]/60" />
        <span className="mt-2 px-3 text-center text-xs font-medium text-[#6B7078] line-clamp-1">
          {alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`object-cover ${className}`}
    />
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-[#E3E4E7]/70 ${className}`} />;
}

export function EmptyState({
  title,
  description,
  actionLabel,
  actionTo,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  actionTo?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#E3E4E7] bg-[#F5F5F6]/50 px-6 py-12 text-center">
      <Bike className="h-10 w-10 text-[#6B7078]/60 stroke-[1.5]" />
      <h3 className="mt-3 text-base font-semibold text-[#111214]">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-[#6B7078]">{description}</p>
      {actionLabel && actionTo && (
        <Link to={actionTo} className="mt-4">
          <Button size="sm">{actionLabel}</Button>
        </Link>
      )}
      {actionLabel && onAction && !actionTo && (
        <Button size="sm" onClick={onAction} className="mt-4">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export function Breadcrumb({ items }: { items: Array<{ label: string; to?: string }> }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-[#6B7078] overflow-x-auto">
      {items.map((item, idx) => (
        <React.Fragment key={item.label}>
          {idx > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[#6B7078]/60" />}
          {item.to ? (
            <Link to={item.to} className="hover:text-[#111214] whitespace-nowrap transition-colors">
              {item.label}
            </Link>
          ) : (
            <span className="text-[#111214] font-medium whitespace-nowrap truncate max-w-[200px]">
              {item.label}
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#111214]/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="w-full max-w-lg rounded-xl border border-[#E3E4E7] bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-[#E3E4E7]">
          <h3 id="modal-title" className="text-lg font-semibold text-[#111214]">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-lg p-1.5 text-[#6B7078] hover:bg-[#F5F5F6] hover:text-[#111214]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

export function Drawer({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[#111214]/50" role="dialog" aria-modal="true">
      <div className="h-full w-full max-w-md bg-white border-l border-[#E3E4E7] p-6 overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-[#E3E4E7]">
          <h3 className="text-lg font-semibold text-[#111214]">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close drawer"
            className="rounded-lg p-1.5 text-[#6B7078] hover:bg-[#F5F5F6] hover:text-[#111214]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

export function Tabs({
  tabs,
  activeKey,
  onChange,
}: {
  tabs: Array<{ key: string; label: string }>;
  activeKey: string;
  onChange: (key: string) => void;
}) {
  return (
    <div role="tablist" className="flex items-center gap-1 border-b border-[#E3E4E7] overflow-x-auto">
      {tabs.map((tab) => {
        const active = tab.key === activeKey;
        return (
          <button
            key={tab.key}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap shrink-0 border-b-2 transition-colors cursor-pointer ${
              active
                ? 'border-[#D71920] text-[#111214]'
                : 'border-transparent text-[#6B7078] hover:text-[#111214]'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export function Accordion({
  items,
}: {
  items: Array<{ id: string; title: string; content: string; category?: string }>;
}) {
  const [openId, setOpenId] = useState<string | null>(items[0]?.id ?? null);
  return (
    <div className="divide-y divide-[#E3E4E7] rounded-xl border border-[#E3E4E7] bg-white">
      {items.map((item) => {
        const isOpen = openId === item.id;
        return (
          <div key={item.id}>
            <button
              type="button"
              aria-expanded={isOpen}
              onClick={() => setOpenId(isOpen ? null : item.id)}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-[#F5F5F6]/60 transition-colors cursor-pointer"
            >
              <div>
                {item.category && (
                  <span className="block text-xs text-[#6B7078] mb-0.5">{item.category}</span>
                )}
                <span className="text-sm font-semibold text-[#111214]">{item.title}</span>
              </div>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-[#6B7078] transition-transform duration-150 ${
                  isOpen ? 'rotate-180' : ''
                }`}
              />
            </button>
            {isOpen && (
              <div className="px-5 pb-4 text-sm text-[#6B7078] leading-relaxed">{item.content}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function Stepper({
  steps,
  currentKey,
}: {
  steps: Array<{ key: string; label: string; description?: string; timestamp?: string }>;
  currentKey: string;
}) {
  const currentIndex = steps.findIndex((s) => s.key === currentKey);
  return (
    <ol className="space-y-4">
      {steps.map((step, idx) => {
        const done = idx <= currentIndex;
        const active = idx === currentIndex;
        return (
          <li key={step.key} className="flex items-start gap-3">
            <div
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-semibold border ${
                done
                  ? 'border-[#1E8E4E] bg-[#1E8E4E] text-white'
                  : 'border-[#E3E4E7] bg-[#F5F5F6] text-[#6B7078]'
              }`}
            >
              {done ? <Check className="h-4 w-4" /> : idx + 1}
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p
                  className={`text-sm font-semibold ${
                    active ? 'text-[#111214]' : done ? 'text-[#111214]' : 'text-[#6B7078]'
                  }`}
                >
                  {step.label}
                </p>
                {step.timestamp && (
                  <span className="text-xs text-[#6B7078] tabular-nums">{step.timestamp}</span>
                )}
              </div>
              {step.description && <p className="text-xs text-[#6B7078] mt-0.5">{step.description}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-4 pt-4">
      <Button
        variant="outline"
        size="sm"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        <ChevronLeft className="h-4 w-4" />
        Previous
      </Button>
      <span className="text-xs font-medium text-[#6B7078] tabular-nums">
        Page {page} of {totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Next
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function FileUploader({
  label,
  accept = 'image/jpeg,image/png,image/webp',
  multiple = false,
  maxFiles = 5,
  onFilesSelected,
  uploading = false,
  hint,
}: {
  label: string;
  accept?: string;
  multiple?: boolean;
  maxFiles?: number;
  onFilesSelected: (files: File[]) => void;
  uploading?: boolean;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-[#111214] mb-1.5">{label}</label>
      <label className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#E3E4E7] bg-[#F5F5F6]/50 px-4 py-6 text-center hover:bg-[#F5F5F6] transition-colors cursor-pointer">
        <Upload className="h-6 w-6 text-[#6B7078]" />
        <span className="mt-2 text-sm font-medium text-[#111214]">
          {uploading ? 'Uploading...' : 'Click to choose file'}
        </span>
        <span className="mt-1 text-xs text-[#6B7078]">
          {hint || `Max ${maxFiles} file(s), up to 5 MB each`}
        </span>
        <input
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={uploading}
          className="sr-only"
          onChange={(e) => {
            const list = Array.from(e.target.files ?? []).slice(0, maxFiles);
            if (list.length > 0) onFilesSelected(list);
            e.target.value = '';
          }}
        />
      </label>
    </div>
  );
}

export function MarkdownRenderer({ markdown }: { markdown: string }) {
  const lines = markdown.split('\n');
  return (
    <div className="space-y-3 text-sm leading-relaxed text-[#111214]">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={i} className="h-1" />;
        if (trimmed.startsWith('## ')) {
          return (
            <h2 key={i} className="font-display text-2xl font-bold text-[#111214] pt-2">
              {trimmed.slice(3)}
            </h2>
          );
        }
        if (trimmed.startsWith('### ')) {
          return (
            <h3 key={i} className="text-lg font-semibold text-[#111214] pt-1">
              {trimmed.slice(4)}
            </h3>
          );
        }
        if (trimmed.startsWith('- ')) {
          return (
            <li key={i} className="ml-5 list-disc text-[#26282C]">
              {trimmed.slice(2)}
            </li>
          );
        }
        return (
          <p key={i} className="text-[#26282C]">
            {trimmed.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1')}
          </p>
        );
      })}
    </div>
  );
}
