import '../popup/css/dateRangeCalendar.css';
import { useState, useEffect } from 'react';
import type { DateRangeSelection } from '../types/data.types';
import { TimeFormatter } from '../utils/timeFormatter';

interface DateRangeCalendarProps {
  onConfirm: (start: string, end: string) => void;
  onCancel: () => void;
  initialRange?: DateRangeSelection | null;
}

const DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

const DateRangeCalendar = ({ onConfirm, onCancel, initialRange }: DateRangeCalendarProps) => {
  const today = new Date();
  const todayStr = TimeFormatter.getLocalDateString();

  const [viewYear, setViewYear] = useState(
    initialRange ? parseInt(initialRange.end.split('-')[0]) : today.getFullYear()
  );
  const [viewMonth, setViewMonth] = useState(
    initialRange ? parseInt(initialRange.end.split('-')[1]) - 1 : today.getMonth()
  );
  const [selectionStart, setSelectionStart] = useState<string | null>(
    initialRange?.start ?? null
  );
  const [selectionEnd, setSelectionEnd] = useState<string | null>(
    initialRange?.end ?? null
  );
  const [isDragging, setIsDragging] = useState(false);
  const [hoverDate, setHoverDate] = useState<string | null>(null);

  // True when start is pinned but end hasn't been chosen yet
  const awaitingEnd = selectionStart !== null && selectionEnd === null && !isDragging;

  // Commit drag if mouseup fires outside the calendar grid
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        if (hoverDate && selectionStart && hoverDate !== selectionStart) {
          const [s, e] = [selectionStart, hoverDate].sort();
          setSelectionStart(s);
          setSelectionEnd(e);
        }
        // If same date as start: plain click outside grid — stay in awaiting-end mode
        setHoverDate(null);
      }
    };
    document.addEventListener('mouseup', handleGlobalMouseUp);
    return () => document.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isDragging, hoverDate, selectionStart]);

  const goToPrevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };

  const goToNextMonth = () => {
    setViewMonth(m => {
      if (m === 11) { setViewYear(y => y + 1); return 0; }
      return m + 1;
    });
  };

  const isNextMonthDisabled = viewYear === today.getFullYear() && viewMonth === today.getMonth();

  // Build 42-cell grid (6 rows × 7 cols)
  const firstDayOffset = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDayOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ...Array(42 - firstDayOffset - daysInMonth).fill(null),
  ];

  const getEffectiveRange = (): [string | null, string | null] => {
    if ((isDragging || awaitingEnd) && selectionStart && hoverDate) {
      const sorted = [selectionStart, hoverDate].sort();
      return [sorted[0], sorted[1]];
    }
    return [selectionStart, selectionEnd];
  };

  const getDayClasses = (dateStr: string): string => {
    const classes = ['cal-day'];
    const [rangeStart, rangeEnd] = getEffectiveRange();

    if (dateStr > todayStr) classes.push('cal-disabled');
    if (dateStr === todayStr) classes.push('cal-today');

    if (rangeStart && rangeEnd) {
      if (dateStr === rangeStart && dateStr === rangeEnd) {
        classes.push('cal-range-start', 'cal-range-end');
      } else if (dateStr === rangeStart) {
        classes.push('cal-range-start');
      } else if (dateStr === rangeEnd) {
        classes.push('cal-range-end');
      } else if (dateStr > rangeStart && dateStr < rangeEnd) {
        classes.push('cal-in-range');
      }
    } else if (rangeStart && !rangeEnd && dateStr === rangeStart) {
      classes.push('cal-range-start', 'cal-range-end');
    }

    return classes.join(' ');
  };

  const handleDayMouseDown = (dateStr: string) => {
    if (dateStr > todayStr) return;
    // Second click — commit end date
    if (awaitingEnd) {
      const [s, e] = [selectionStart!, dateStr].sort();
      setSelectionStart(s);
      setSelectionEnd(e);
      return;
    }
    // Fresh selection
    setIsDragging(true);
    setSelectionStart(dateStr);
    setSelectionEnd(null);
    setHoverDate(dateStr);
  };

  const handleDayMouseEnter = (dateStr: string) => {
    if ((isDragging || awaitingEnd) && dateStr <= todayStr) {
      setHoverDate(dateStr);
    }
  };

  const handleDayMouseUp = (dateStr: string) => {
    if (!isDragging) return;
    setIsDragging(false);
    if (selectionStart && dateStr !== selectionStart) {
      // Real drag — commit range immediately
      const [s, e] = [selectionStart, dateStr].sort();
      setSelectionStart(s);
      setSelectionEnd(e);
    }
    // Plain click (same date): selectionEnd stays null → awaiting-end mode
    setHoverDate(null);
  };

  const [rangeStart, rangeEnd] = getEffectiveRange();
  const canConfirm = !isDragging && rangeStart !== null;

  const handleConfirm = () => {
    if (!rangeStart) return;
    onConfirm(rangeStart, rangeEnd ?? rangeStart);
  };

  return (
    <div className="cal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="cal-modal">
        <div className="cal-header">
          <button className="cal-nav-btn" onClick={goToPrevMonth}>
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <span className="cal-month-label">{MONTHS[viewMonth]} {viewYear}</span>
          <button className="cal-nav-btn" onClick={goToNextMonth} disabled={isNextMonthDisabled}>
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {awaitingEnd && <span className="cal-hint">Select end date</span>}

        <div className="cal-dow">
          {DAYS_OF_WEEK.map(d => <div key={d} className="cal-dow-cell">{d}</div>)}
        </div>

        <div
          className="cal-grid"
          onMouseLeave={() => { if (isDragging || awaitingEnd) setHoverDate(null); }}
        >
          {cells.map((day, idx) => {
            if (day === null) {
              return <div key={idx} className="cal-day cal-empty" />;
            }
            const dateStr = toDateStr(viewYear, viewMonth, day);
            return (
              <div
                key={idx}
                className={getDayClasses(dateStr)}
                onMouseDown={() => handleDayMouseDown(dateStr)}
                onMouseEnter={() => handleDayMouseEnter(dateStr)}
                onMouseUp={() => handleDayMouseUp(dateStr)}
              >
                {day}
              </div>
            );
          })}
        </div>

        <div className="cal-footer">
          <button className="cal-btn cal-btn-cancel" onClick={onCancel}>Cancel</button>
          <button className="cal-btn cal-btn-apply" onClick={handleConfirm} disabled={!canConfirm}>
            Apply
          </button>
        </div>
      </div>
    </div>
  );
};

export default DateRangeCalendar;
