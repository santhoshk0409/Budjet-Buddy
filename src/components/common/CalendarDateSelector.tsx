import React, { useState, useMemo } from 'react';
import type { QuickFilter } from '../../types';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  RotateCcw
} from 'lucide-react';
import {
  format,
  parseISO,
  subMonths,
  addMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  differenceInCalendarDays
} from 'date-fns';

interface CalendarDateSelectorProps {
  quickFilter: QuickFilter;
  onSelectQuickFilter: (filter: QuickFilter) => void;
  selectedDate: string | null;
  onSelectDate: (dateStr: string | null) => void;
  customStartDate?: string;
  customEndDate?: string;
  onSelectCustomRange?: (start: string, end: string) => void;
  datesWithExpenses?: Set<string>;
}

export const CalendarDateSelector: React.FC<CalendarDateSelectorProps> = ({
  quickFilter,
  onSelectQuickFilter,
  selectedDate,
  onSelectDate,
  customStartDate,
  customEndDate,
  onSelectCustomRange,
  datesWithExpenses = new Set()
}) => {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Range Selection States
  const [rangeStart, setRangeStart] = useState<string | null>(customStartDate || selectedDate || null);
  const [rangeEnd, setRangeEnd] = useState<string | null>(customEndDate || (selectedDate ? selectedDate : null));
  const [hoverDate, setHoverDate] = useState<string | null>(null);

  // Calendar days grid
  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  // Display label for active selection
  const activeLabel = useMemo(() => {
    if (quickFilter === 'custom' && customStartDate && customEndDate) {
      if (customStartDate === customEndDate) {
        return `📅 Single Day (${format(parseISO(customStartDate), 'dd MMM yyyy')})`;
      }
      return `📅 ${format(parseISO(customStartDate), 'dd MMM')} → ${format(parseISO(customEndDate), 'dd MMM yyyy')}`;
    }
    if (selectedDate) return `📅 ${format(parseISO(selectedDate), 'dd MMM yyyy')}`;
    if (quickFilter === 'today') return `Today (${format(new Date(), 'dd MMM')})`;
    if (quickFilter === 'this_week') return 'This Week';
    if (quickFilter === 'this_month') return format(currentMonth, 'MMMM yyyy');
    return format(currentMonth, 'MMMM yyyy');
  }, [selectedDate, quickFilter, currentMonth, customStartDate, customEndDate]);

  // Date Click Handler for Single Date & Range Drag/Point Selection
  const handleDateClick = (dayISO: string) => {
    // If no start date or both start and end are already set -> Start new selection
    if (!rangeStart || (rangeStart && rangeEnd)) {
      setRangeStart(dayISO);
      setRangeEnd(null);
    } else if (rangeStart && !rangeEnd) {
      // Second click: set end date
      if (dayISO === rangeStart) {
        // Double click same day = Single Day selection!
        setRangeEnd(dayISO);
        onSelectDate(dayISO);
        onSelectQuickFilter('custom');
        if (onSelectCustomRange) onSelectCustomRange(dayISO, dayISO);
      } else if (dayISO > rangeStart) {
        setRangeEnd(dayISO);
        onSelectDate(null);
        onSelectQuickFilter('custom');
        if (onSelectCustomRange) onSelectCustomRange(rangeStart, dayISO);
      } else {
        // Clicked date is earlier -> swap start and end
        setRangeEnd(rangeStart);
        setRangeStart(dayISO);
        onSelectDate(null);
        onSelectQuickFilter('custom');
        if (onSelectCustomRange) onSelectCustomRange(dayISO, rangeStart);
      }
    }
  };

  const applyRangeSelection = () => {
    if (rangeStart && rangeEnd) {
      if (rangeStart === rangeEnd) {
        onSelectDate(rangeStart);
      } else {
        onSelectDate(null);
        if (onSelectCustomRange) onSelectCustomRange(rangeStart, rangeEnd);
      }
      onSelectQuickFilter('custom');
      setIsModalOpen(false);
    } else if (rangeStart && !rangeEnd) {
      // Default single date if only 1 click made and user clicks apply
      onSelectDate(rangeStart);
      if (onSelectCustomRange) onSelectCustomRange(rangeStart, rangeStart);
      onSelectQuickFilter('custom');
      setIsModalOpen(false);
    }
  };

  const resetSelection = () => {
    setRangeStart(null);
    setRangeEnd(null);
    setHoverDate(null);
    onSelectDate(null);
    onSelectQuickFilter('this_month');
  };

  return (
    <div className="space-y-2">
      {/* Segmented Tab Bar */}
      <div className="bg-slate-200/70 dark:bg-slate-800/80 p-1 rounded-2xl flex items-center justify-between text-xs border border-slate-300/60 dark:border-slate-700/60 shadow-inner">
        {[
          { id: 'today' as QuickFilter, label: 'Today' },
          { id: 'this_week' as QuickFilter, label: 'Week' },
          { id: 'this_month' as QuickFilter, label: 'Month' }
        ].map(tab => {
          const isActive = quickFilter === tab.id && !selectedDate;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                onSelectQuickFilter(tab.id);
                onSelectDate(null);
                setRangeStart(null);
                setRangeEnd(null);
              }}
              className={`flex-1 py-2 text-center font-bold rounded-xl transition-all cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          );
        })}

        {/* Calendar Modal Trigger Button */}
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className={`flex-1 py-2 px-2.5 font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            selectedDate || quickFilter === 'custom'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 shadow-sm border border-slate-200 dark:border-slate-700'
          }`}
        >
          <CalendarIcon className="w-3.5 h-3.5" />
          <span className="truncate max-w-[75px]">Calendar</span>
        </button>
      </div>

      {/* Active Period Indicator */}
      <div className="flex items-center justify-between px-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
        <span>Active: <strong className="text-slate-900 dark:text-white">{activeLabel}</strong></span>
        {(selectedDate || quickFilter === 'custom') && (
          <button
            type="button"
            onClick={resetSelection}
            className="text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-0.5"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Calendar Modal Popup */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex flex-col justify-end max-w-md mx-auto animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 rounded-t-[32px] p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <span>Select Date / Date Range</span>
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Tap 1 date for single day, or tap start & end date to pick range
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Selection Banner Summary */}
            <div className="p-3 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/80 rounded-2xl flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Selected Period</span>
                <span className="font-extrabold text-blue-700 dark:text-blue-300">
                  {rangeStart && rangeEnd
                    ? rangeStart === rangeEnd
                      ? `${format(parseISO(rangeStart), 'dd MMM yyyy')} (Single Day)`
                      : `${format(parseISO(rangeStart), 'dd MMM')} → ${format(parseISO(rangeEnd), 'dd MMM yyyy')} (${differenceInCalendarDays(parseISO(rangeEnd), parseISO(rangeStart)) + 1} Days)`
                    : rangeStart
                    ? `Start: ${format(parseISO(rangeStart), 'dd MMM')} (Tap end date)`
                    : 'Tap any date on calendar'}
                </span>
              </div>
              {rangeStart && (
                <button
                  type="button"
                  onClick={() => {
                    setRangeStart(null);
                    setRangeEnd(null);
                  }}
                  className="text-[10px] font-bold text-red-500 hover:underline"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Month Navigator */}
            <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/80 p-2 rounded-2xl">
              <button
                type="button"
                onClick={() => setCurrentMonth(prev => subMonths(prev, 1))}
                className="p-1.5 rounded-xl bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-sm cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-black text-slate-900 dark:text-white">
                {format(currentMonth, 'MMMM yyyy')}
              </span>
              <button
                type="button"
                onClick={() => setCurrentMonth(prev => addMonths(prev, 1))}
                className="p-1.5 rounded-xl bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-sm cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Calendar Day Headers */}
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400">
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
              <span>Sun</span>
            </div>

            {/* Monthly Interactive Calendar Grid with Drag/Range Highlight */}
            <div className="grid grid-cols-7 gap-y-1 text-center text-xs">
              {calendarDays.map((day, idx) => {
                const dayISO = format(day, 'yyyy-MM-dd');
                const hasExpenses = datesWithExpenses.has(dayISO);
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isTodayDay = isSameDay(day, new Date());

                // Range calculations
                const isStart = rangeStart === dayISO;
                const isEnd = rangeEnd === dayISO;
                const isSingle = isStart && isEnd;

                // Active range or hover range comparison
                const effectiveEnd = rangeEnd || (rangeStart ? hoverDate : null);
                let isInRange = false;

                if (rangeStart && effectiveEnd) {
                  const min = rangeStart < effectiveEnd ? rangeStart : effectiveEnd;
                  const max = rangeStart < effectiveEnd ? effectiveEnd : rangeStart;
                  isInRange = dayISO >= min && dayISO <= max;
                }

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleDateClick(dayISO)}
                    onMouseEnter={() => setHoverDate(dayISO)}
                    className={`h-9 relative flex flex-col items-center justify-center font-bold text-xs transition-all cursor-pointer ${
                      !isCurrentMonth ? 'opacity-25' : ''
                    } ${
                      isSingle
                        ? 'bg-blue-600 text-white rounded-xl shadow-md z-10'
                        : isStart
                        ? 'bg-blue-600 text-white rounded-l-xl z-10 shadow-sm'
                        : isEnd
                        ? 'bg-blue-600 text-white rounded-r-xl z-10 shadow-sm'
                        : isInRange
                        ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-900 dark:text-blue-100 font-semibold'
                        : isTodayDay
                        ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-300 dark:border-blue-700 rounded-xl'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl'
                    }`}
                  >
                    <span>{format(day, 'd')}</span>
                    {hasExpenses && (
                      <span
                        className={`w-1.5 h-1.5 rounded-full absolute bottom-1 ${
                          isStart || isEnd ? 'bg-white' : 'bg-emerald-500'
                        }`}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Action Button */}
            <button
              type="button"
              onClick={applyRangeSelection}
              disabled={!rangeStart}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 active:scale-[0.98] cursor-pointer disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>
                {rangeStart && rangeEnd
                  ? rangeStart === rangeEnd
                    ? 'Apply Single Date'
                    : 'Apply Selected Date Range'
                  : 'Apply Selection'}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
