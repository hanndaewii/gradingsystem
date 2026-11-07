'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from './Popover';
import { Button } from './Button';
import { Input } from './Input';

interface DatePickerProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value?: Date | string | null;
  onChange?: (date: Date | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  min?: string;
  max?: string;
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Select date',
  disabled = false,
  className,
  min,
  max,
  ...props
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(
    value ? new Date(value) : null
  );

  const handleChange = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      onChange?.(date);
    } else {
      setSelectedDate(null);
      onChange?.(null);
    }
    setOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value ? new Date(e.target.value) : null;
    if (date && !isNaN(date.getTime())) {
      setSelectedDate(date);
      onChange?.(date);
    } else if (!e.target.value) {
      setSelectedDate(null);
      onChange?.(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const displayValue = selectedDate
    ? selectedDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    : '';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative">
          <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-semantic-text-tertiary pointer-events-none" aria-hidden="true" />
          <Input
            placeholder={placeholder}
            value={displayValue}
            onChange={handleInputChange}
            onClick={() => !disabled && setOpen(true)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            className="pl-10"
            readOnly
            {...props}
          />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" side="bottom" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleChange}
          initialFocus={true}
          disabled={disabled}
          min={min ? new Date(min) : undefined}
          max={max ? new Date(max) : undefined}
          className="rounded-lg border border-semantic-border-primary"
        />
      </PopoverContent>
    </Popover>
  );
}

interface CalendarProps {
  mode: 'single' | 'multiple' | 'range';
  selected: Date | Date[] | { from: Date | undefined; to: Date | undefined } | null;
  onSelect: (date: Date | Date[] | { from: Date | undefined; to: Date | undefined } | undefined) => void;
  initialFocus?: boolean;
  disabled?: boolean;
  min?: Date;
  max?: Date;
  className?: string;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}

function Calendar({
  mode,
  selected,
  onSelect,
  initialFocus = false,
  disabled = false,
  min,
  max,
  className,
  onKeyDown,
}: CalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState(new Date());
  const monthRef = React.useRef(currentMonth);

  React.useEffect(() => {
    monthRef.current = currentMonth;
  }, [currentMonth]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isSelected = (date: Date) => {
    if (!selected) return false;
    if (mode === 'single') return date.toDateString() === (selected as Date).toDateString();
    if (mode === 'multiple') return (selected as Date[]).some(d => d.toDateString() === date.toDateString());
    if (mode === 'range') {
      const range = selected as { from: Date | undefined; to: Date | undefined };
      return range.from && range.to && date >= range.from && date <= range.to;
    }
    return false;
  };

  const isInRange = (date: Date) => {
    if (mode !== 'range') return false;
    const range = selected as { from: Date | undefined; to: Date | undefined };
    return range.from && !range.to && date.toDateString() === range.from.toDateString();
  };

  const isDisabled = (date: Date) => {
    if (min && date < min) return true;
    if (max && date > max) return true;
    return false;
  };

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  const prevMonthDays = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 0).getDate();

  const weeks = [];
  let day = 1;
  for (let i = 0; i < 6; i++) {
    const week = [];
    for (let j = 0; j < 7; j++) {
      if (i === 0 && j < firstDayOfMonth) {
        week.push({ day: prevMonthDays - firstDayOfMonth + j + 1, currentMonth: false, disabled: true });
      } else if (day > daysInMonth) {
        week.push({ day: day - daysInMonth, currentMonth: false, disabled: true });
        day++;
      } else {
        const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        week.push({
          day,
          currentMonth: true,
          disabled: isDisabled(date),
          selected: isSelected(date),
          inRange: isInRange(date),
          today: date.toDateString() === today.toDateString(),
        });
        day++;
      }
    }
    weeks.push(week);
    if (day > daysInMonth && i > 0) break;
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const goToPrevMonth = () => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  const goToNextMonth = () => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));

  return (
    <div className={cn('p-3', className)} role="grid" aria-label="Calendar">
      <div className="flex items-center justify-between mb-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={goToPrevMonth}
          disabled={disabled}
          aria-label="Previous month"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        </Button>
        <span className="font-medium text-body-sm text-semantic-text-primary">
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={goToNextMonth}
          disabled={disabled}
          aria-label="Next month"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-0.5 mb-1" role="row">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day, i) => (
          <div key={day} className="text-center text-caption text-semantic-text-tertiary py-1" role="columnheader">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5" role="rowgroup">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="contents" role="row">
            {week.map((dayInfo, dayIndex) => {
              if (!dayInfo.currentMonth) {
                return (
                  <button
                    key={dayIndex}
                    type="button"
                    disabled={true}
                    className="h-9 w-9 text-caption text-semantic-text-tertiary/50"
                    tabIndex={-1}
                  >
                    {dayInfo.day}
                  </button>
                );
              }

              const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), dayInfo.day);
              const isToday = dayInfo.today;
              const isSel = dayInfo.selected;
              const isRng = dayInfo.inRange;
              const isDis = dayInfo.disabled;

              return (
                <button
                  key={dayIndex}
                  type="button"
                  disabled={isDis || disabled}
                  onClick={() => !isDis && !disabled && onSelect(date)}
                  className={cn(
                    'h-9 w-9 rounded-full text-body-sm font-medium transition-colors relative',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-semantic-brand-primary',
                    isDis && 'text-semantic-text-tertiary/50 cursor-not-allowed',
                    isSel && 'bg-semantic-brand-primary text-semantic-text-inverse',
                    isRng && 'bg-semantic-brand-primary/20 text-semantic-brand-primary',
                    isToday && !isSel && 'ring-2 ring-semantic-brand-primary',
                    !isSel && !isRng && !isToday && 'hover:bg-semantic-bg-tertiary text-semantic-text-primary',
                    isSel && 'text-semantic-text-inverse'
                  )}
                  tabIndex={initialFocus && weekIndex === 0 && dayIndex === firstDayOfMonth ? 0 : -1}
                  role="gridcell"
                  aria-selected={isSel}
                  aria-disabled={isDis}
                  aria-current={isToday ? 'date' : undefined}
                >
                  {dayInfo.day}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div className="mt-3 pt-3 border-t border-semantic-border-primary">
        <Button
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={() => onSelect(today)}
          disabled={disabled}
        >
          Today
        </Button>
      </div>
    </div>
  );
}