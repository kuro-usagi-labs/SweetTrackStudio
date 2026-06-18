import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Bell, Plus, X, Clock, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay } from 'date-fns';

export default function Calendar() {
  const [reminders, setReminders] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newReminder, setNewReminder] = useState({ title: '', type: 'Script Reminder', due_time: '' });
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [filterMode, setFilterMode] = useState('selected'); // 'selected' or 'all'

  const loadReminders = () => {
    if (window.api) {
      window.api.getReminders().then(setReminders).catch(() => {});
    }
  };

  useEffect(() => {
    loadReminders();
  }, []);

  const handleAddReminder = async (e) => {
    e.preventDefault();
    if (window.api) {
      await window.api.addReminder(newReminder);
      setIsAdding(false);
      setNewReminder({ title: '', type: 'Script Reminder', due_time: '' });
      loadReminders();
      window.api.sendNotification('Reminder Set!', `"${newReminder.title}" scheduled for ${newReminder.due_time}`);
    }
  };

  const deleteReminder = async (id) => {
    if (window.api) {
      await window.api.deleteReminder(id);
      loadReminders();
    }
  };

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const filteredReminders = reminders.filter(r => {
    if (filterMode === 'all') return true;
    return r.due_time && r.due_time.startsWith(format(selectedDate, 'yyyy-MM-dd'));
  });

  const rows = [];
  let days = [];
  let day = startDate;

  while (day <= endDate) {
    for (let i = 0; i < 7; i++) {
      const cloneDay = day;
      const formattedDate = format(cloneDay, 'd');
      const isToday = isSameDay(cloneDay, new Date());
      const isCurrentMonth = isSameMonth(cloneDay, monthStart);
      const isSelected = isSameDay(cloneDay, selectedDate);
      const dayReminders = reminders.filter(r => r.due_time && r.due_time.startsWith(format(cloneDay, 'yyyy-MM-dd')));

      days.push(
        <div
          key={cloneDay.toISOString()}
          onClick={() => {
            setSelectedDate(cloneDay);
            setFilterMode('selected');
          }}
          className={`min-h-[60px] md:min-h-[100px] p-1.5 md:p-3 border-r border-b border-gray-100 transition-all cursor-pointer flex flex-col justify-between select-none active:opacity-85
            ${!isCurrentMonth ? 'bg-gray-50/30 dark:bg-gray-900/10 text-ink-300' : 'bg-surface hover:bg-surface-hover'}
            ${isToday ? 'bg-ink-50/50 dark:bg-ink-50/10' : ''}
            ${isSelected ? 'ring-2 ring-ink-900 ring-inset z-10 relative' : ''}
          `}
        >
          <div className="flex justify-between items-start">
            <span className={`text-xs md:text-sm font-medium w-6 h-6 md:w-8 md:h-8 flex items-center justify-center rounded-full transition-colors
              ${isToday && !isSelected ? 'bg-red-500 text-white font-extrabold' : ''}
              ${isSelected ? 'bg-ink-900 text-white dark:bg-primary dark:text-gray-900 font-extrabold shadow-sm' : 'text-ink-900'}
            `}>
              {formattedDate}
            </span>
          </div>
          
          {/* Desktop Event List */}
          <div className="hidden md:block flex-1 mt-2 space-y-1 overflow-y-auto custom-scrollbar">
            {dayReminders.slice(0, 3).map(r => (
              <div key={r.id} className="w-full text-left truncate bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-ink-900 dark:text-gray-100 text-[10px] px-2 py-1 rounded-md font-medium">
                {r.due_time.split('T')[1]} - {r.title}
              </div>
            ))}
            {dayReminders.length > 3 && (
              <div className="text-[9px] font-bold text-ink-400 pl-1">
                + {dayReminders.length - 3} more
              </div>
            )}
          </div>

          {/* Mobile Event Dots */}
          {dayReminders.length > 0 && (
            <div className="md:hidden flex justify-center space-x-1 mt-1 pb-1">
              {dayReminders.slice(0, 3).map(r => (
                <div key={r.id} className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
              ))}
            </div>
          )}
        </div>
      );
      day = addDays(day, 1);
    }
    rows.push(
      <div className="grid grid-cols-7" key={day.toISOString()}>
        {days}
      </div>
    );
    days = [];
  }

  const weekDayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="max-w-[1200px] mx-auto h-full flex flex-col">
      <div className="flex justify-between items-end mb-6 px-2">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 mb-1 tracking-tight">Calendar</h1>
          <p className="text-sm text-ink-500">Plan your month and set production alerts.</p>
        </div>
        <button 
          onClick={() => {
            setIsAdding(!isAdding);
            if (!isAdding) {
              setNewReminder({
                title: '',
                type: 'Script Reminder',
                due_time: format(selectedDate, "yyyy-MM-dd'T'12:00")
              });
            }
          }} 
          className="btn-primary flex items-center space-x-2"
        >
          <Plus size={16} />
          <span>Add Reminder</span>
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 flex-1 min-h-0">
        
        {/* Full Month Calendar View */}
        <div className="xl:col-span-3 card flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-surface">
            <h2 className="text-lg font-bold text-ink-900 tracking-tight">
              {format(currentDate, 'MMMM yyyy')}
            </h2>
            <div className="flex space-x-2">
              <button onClick={prevMonth} className="p-2 border border-gray-200 rounded-lg text-ink-500 hover:text-ink-900 hover:bg-surface-hover transition-colors">
                <ChevronLeft size={18} />
              </button>
              <button 
                onClick={() => {
                  setCurrentDate(new Date());
                  setSelectedDate(new Date());
                }} 
                className="px-4 py-2 border border-gray-200 rounded-lg text-ink-900 text-sm font-medium hover:bg-surface-hover transition-colors"
              >
                Today
              </button>
              <button onClick={nextMonth} className="p-2 border border-gray-200 rounded-lg text-ink-500 hover:text-ink-900 hover:bg-surface-hover transition-colors">
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          <div className="flex-1 flex flex-col overflow-y-auto">
            <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50 dark:bg-gray-900/50 sticky top-0 z-20">
              {weekDayNames.map(dayName => (
                <div key={dayName} className="p-3 text-center text-xs font-bold text-ink-500 uppercase tracking-wider border-r border-gray-200 last:border-r-0 dark:border-gray-800">
                  {dayName}
                </div>
              ))}
            </div>
            <div className="flex-1 flex flex-col">
              {rows}
            </div>
          </div>
        </div>

        {/* Reminders Sidebar */}
        <div className="card p-6 flex flex-col h-full">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
            <div className="flex flex-col text-left">
              <h2 className="text-sm font-bold text-ink-900 uppercase tracking-wider">
                {filterMode === 'selected' ? `Alerts: ${format(selectedDate, 'MMM d')}` : 'All Alerts'}
              </h2>
              <span className="text-[10px] text-ink-400 font-bold mt-0.5">
                {filteredReminders.length} items found
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button 
                type="button"
                onClick={() => setFilterMode(filterMode === 'selected' ? 'all' : 'selected')}
                className="text-[10px] font-bold text-ink-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 px-2.5 py-1.5 rounded-lg transition-colors border border-gray-200 dark:border-gray-700"
              >
                {filterMode === 'selected' ? 'Show All' : 'Show Day'}
              </button>
              <Bell className="text-ink-500 shrink-0" size={16} />
            </div>
          </div>

          {isAdding && (
            <form onSubmit={handleAddReminder} className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-200 dark:border-gray-800 mb-6 relative overflow-hidden">
              <input 
                type="text" 
                placeholder="What needs to be done?" 
                required
                className="input-field mb-3 bg-surface"
                value={newReminder.title}
                onChange={e => setNewReminder({...newReminder, title: e.target.value})}
              />
              <select 
                className="input-field mb-3 bg-surface"
                value={newReminder.type}
                onChange={e => setNewReminder({...newReminder, type: e.target.value})}
              >
                <option>Script Reminder</option>
                <option>Voice Over Reminder</option>
                <option>Editing Reminder</option>
                <option>Upload Reminder</option>
                <option>Analytics Review</option>
              </select>
              <input 
                type="datetime-local" 
                required
                className="input-field mb-4 bg-surface text-ink-500"
                value={newReminder.due_time}
                onChange={e => setNewReminder({...newReminder, due_time: e.target.value})}
              />
              <div className="flex space-x-2">
                <button type="submit" className="flex-1 btn-primary bg-ink-900 hover:bg-ink-500 text-white text-xs font-semibold py-2 px-3 rounded-lg shadow-sm">Save</button>
                <button type="button" onClick={() => setIsAdding(false)} className="px-3 bg-surface border border-gray-200 hover:bg-gray-50 text-ink-500 text-xs font-semibold rounded-lg">Cancel</button>
              </div>
            </form>
          )}

          <div className="space-y-3 overflow-y-auto custom-scrollbar flex-1 pr-2">
            {filteredReminders.length === 0 && !isAdding ? (
              <div className="flex flex-col items-center justify-center h-40 text-ink-300">
                <Check size={24} className="mb-2 opacity-50" />
                <p className="text-xs font-medium">No alerts for this view.</p>
              </div>
            ) : (
              filteredReminders.map(r => (
                <div key={r.id} className="group relative flex flex-col bg-surface p-4 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-gray-300 transition-all shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="text-sm font-bold text-ink-900 dark:text-white leading-tight pr-6">{r.title}</h4>
                    <button 
                      onClick={() => deleteReminder(r.id)}
                      className="absolute top-2 right-2 w-6 h-6 rounded flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 md:opacity-0 md:group-hover:opacity-100 transition-all"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-[10px] font-medium text-ink-500 space-x-1.5">
                      <Clock size={12} />
                      <span>{format(new Date(r.due_time), 'MMM d, HH:mm')}</span>
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-600 bg-gray-100 dark:bg-gray-800 dark:text-gray-300 px-2 py-0.5 rounded">{r.type}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
