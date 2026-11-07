'use client';

import * as React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  group?: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  placeholder?: string;
  options: SelectOption[];
  multi?: boolean;
  searchable?: boolean;
  size?: 'sm' | 'md' | 'lg';
  maxSelected?: number;
}

const Select = React.forwardRef<HTMLButtonElement, SelectProps>(
  (
    {
      className,
      label,
      error,
      hint,
      placeholder,
      options,
      multi = false,
      searchable = false,
      size = 'md',
      maxSelected,
      id,
      value,
      onValueChange,
      required,
      disabled,
      'aria-describedby': ariaDescribedBy,
      ...props
    },
    ref
  ) => {
    const [open, setOpen] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState('');
    const triggerRef = React.useRef<HTMLButtonElement>(null);
    const contentRef = React.useRef<HTMLDivElement>(null);
    const searchInputRef = React.useRef<HTMLInputElement>(null);

    const selectedValues = Array.isArray(value) ? value : value ? [value] : [];
    const isSelected = (optionValue: string) => selectedValues.includes(optionValue);

    const filteredOptions = React.useMemo(() => {
      if (!searchQuery) return options;
      return options.filter(
        (opt) =>
          opt.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          opt.value.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }, [options, searchQuery]);

    const groupedOptions = React.useMemo(() => {
      const groups: Record<string, SelectOption[]> = {};
      const ungrouped: SelectOption[] = [];

      filteredOptions.forEach((opt) => {
        if (opt.group) {
          if (!groups[opt.group]) groups[opt.group] = [];
          groups[opt.group].push(opt);
        } else {
          ungrouped.push(opt);
        }
      });

      return { groups, ungrouped };
    }, [filteredOptions]);

    const handleSelect = (optionValue: string) => {
      if (multi) {
        const newValues = isSelected(optionValue)
          ? selectedValues.filter((v) => v !== optionValue)
          : maxSelected && selectedValues.length >= maxSelected
            ? selectedValues
            : [...selectedValues, optionValue];
        onValueChange?.(newValues);
      } else {
        onValueChange?.(optionValue);
        setOpen(false);
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
      if (e.key === 'Enter' && searchable && searchQuery) {
        const firstMatch = filteredOptions.find((o) => !o.disabled);
        if (firstMatch) handleSelect(firstMatch.value);
      }
    };

    React.useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (triggerRef.current?.contains(e.target as Node)) return;
        if (contentRef.current?.contains(e.target as Node)) return;
        setOpen(false);
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    React.useEffect(() => {
      if (open && searchable) {
        searchInputRef.current?.focus();
      }
    }, [open, searchable]);

    const errorId = `${id}-error`;
    const hintId = `${id}-hint`;
    const describedBy = [error && errorId, hint && hintId, ariaDescribedBy].filter(Boolean).join(' ') || undefined;

    const displayValue = multi
      ? selectedValues.map((v) => options.find((o) => o.value === v)?.label).filter(Boolean).join(', ')
      : options.find((o) => o.value === value)?.label;

    return (
      <div className="w-full" role="combobox" aria-expanded={open} aria-haspopup="listbox" aria-controls={open ? `${id}-listbox` : undefined}>
        {label && (
          <label htmlFor={id} className="block text-body-sm font-medium text-semantic-text-primary mb-2">
            {label}
            {required && <span className="text-semantic-status-error ml-1" aria-hidden="true">*</span>}
          </label>
        )}
        <button
          ref={triggerRef}
          id={id}
          type="button"
          className={cn(
            'w-full border rounded-soft bg-semantic-input-bg border-semantic-input-border transition-all duration-fast ease-out text-left',
            'focus:outline-none focus:ring-2 focus:ring-semantic-brand-primary focus:ring-offset-2 focus:border-semantic-input-focus',
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-semantic-bg-tertiary',
            'aria-invalid:border-semantic-input-error aria-invalid:focus:ring-semantic-status-error',
            {
              'py-2 px-3 text-caption rounded-md pr-10': size === 'sm',
              'py-2.5 px-4 text-body-sm pr-10': size === 'md',
              'py-3 px-4 text-body pr-10': size === 'lg',
            },
            error && 'border-semantic-input-error focus:ring-semantic-status-error',
            className
          )}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          aria-autocomplete={searchable ? 'list' : 'none'}
          onClick={() => !disabled && setOpen(!open)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
              e.preventDefault();
              setOpen(true);
            }
            if (e.key === 'Escape') setOpen(false);
          }}
          disabled={disabled}
        >
          <span className={cn('flex-1 truncate', !displayValue && 'text-semantic-input-placeholder')}>
            {displayValue || placeholder}
          </span>
          {open ? <ChevronUp className="h-4 w-4 text-semantic-text-tertiary" /> : <ChevronDown className="h-4 w-4 text-semantic-text-tertiary" />}
        </button>

        {open && (
          <div
            ref={contentRef}
            id={`${id}-listbox`}
            role="listbox"
            aria-multiselectable={multi}
            className={cn(
              'absolute z-[var(--z-dropdown)] w-full mt-1 bg-semantic-bg-primary border border-semantic-border-primary rounded-lg shadow-lg overflow-hidden',
              'animate-slide-in-from-top'
            )}
            style={{ maxHeight: '280px' }}
          >
            {searchable && (
              <div className="p-2 border-b border-semantic-border-primary">
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full px-3 py-2 text-body-sm bg-semantic-input-bg border border-semantic-input-border rounded-md focus:outline-none focus:ring-2 focus:ring-semantic-brand-primary"
                  aria-label="Search options"
                />
              </div>
            )}

            <div className="max-h-[240px] overflow-y-auto">
              {Object.entries(groupedOptions.groups).length > 0 && (
                <>
                  {Object.entries(groupedOptions.groups).map(([groupName, groupOptions]) => (
                    <div key={groupName}>
                      <div className="px-3 py-1.5 text-caption font-medium text-semantic-text-tertiary uppercase tracking-wider bg-semantic-bg-secondary">
                        {groupName}
                      </div>
                      {groupOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          role="option"
                          aria-selected={isSelected(option.value)}
                          aria-disabled={option.disabled}
                          disabled={option.disabled}
                          onClick={() => !option.disabled && handleSelect(option.value)}
                          className={cn(
                            'w-full px-3 py-2 text-body-sm text-left transition-colors duration-fast',
                            'hover:bg-semantic-bg-secondary focus:bg-semantic-bg-secondary focus:outline-none',
                            isSelected(option.value)
                              ? 'bg-semantic-brand-primary/10 text-semantic-brand-primary'
                              : 'text-semantic-text-primary',
                            option.disabled && 'opacity-50 cursor-not-allowed'
                          )}
                        >
                          <div className="flex items-center gap-2">
                            {multi && (
                              <span className={cn('flex items-center justify-center h-4 w-4 border rounded-sm', isSelected(option.value) && 'bg-semantic-brand-primary border-semantic-brand-primary')}>
                                {isSelected(option.value) && <Check className="h-3 w-3 text-semantic-text-inverse" />}
                              </span>
                            )}
                            <span className="flex-1 truncate">{option.label}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  ))}
                  {groupedOptions.ungrouped.length > 0 && <div className="border-t border-semantic-border-primary my-1" />}
                </>
              )}

              {groupedOptions.ungrouped.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected(option.value)}
                  aria-disabled={option.disabled}
                  disabled={option.disabled}
                  onClick={() => !option.disabled && handleSelect(option.value)}
                  className={cn(
                    'w-full px-3 py-2 text-body-sm text-left transition-colors duration-fast',
                    'hover:bg-semantic-bg-secondary focus:bg-semantic-bg-secondary focus:outline-none',
                    isSelected(option.value)
                      ? 'bg-semantic-brand-primary/10 text-semantic-brand-primary'
                      : 'text-semantic-text-primary',
                    option.disabled && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <div className="flex items-center gap-2">
                    {multi && (
                      <span className={cn('flex items-center justify-center h-4 w-4 border rounded-sm', isSelected(option.value) && 'bg-semantic-brand-primary border-semantic-brand-primary')}>
                        {isSelected(option.value) && <Check className="h-3 w-3 text-semantic-text-inverse" />}
                      </span>
                    )}
                    <span className="flex-1 truncate">{option.label}</span>
                  </div>
                </button>
              ))}

              {filteredOptions.length === 0 && (
                <div className="px-3 py-4 text-center text-body-sm text-semantic-text-tertiary">
                  No options found
                </div>
              )}
            </div>
          </div>
        )}

        {error && (
          <p id={errorId} className="mt-1.5 text-caption text-semantic-status-error" role="alert">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={hintId} className="mt-1.5 text-caption text-semantic-text-tertiary">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

export { Select };