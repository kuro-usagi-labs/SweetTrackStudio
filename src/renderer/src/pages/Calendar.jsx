import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Bell, Plus, X, Clock, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay } from 'date-fns';

export default function Calendar() {
  const [reminders, setReminders] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newReminder, setNewReminder] = useState({ title: '', type: 'Script Reminder', due_time: '' });
  const [currentDate, setCurrentDate] = useState(new Date());

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

  const rows = [];
  let days = [];
  let day = startDate;

  while (day <= endDate) {
    for (let i = 0; i < 7; i++) {
      const cloneDay = day;
      const formattedDate = format(cloneDay, 'd');
      const isToday = isSameDay(cloneDay, new Date());
      const isCurrentMonth = isSameMonth(cloneDay, monthStart);

      days.push(
        <div
          key={cloneDay.toISOString()}
          className={`min-h-[100px] p-3 border-r border-b border-gray-100 transition-all group flex flex-col
            ${!isCurrentMonth ? 'bg-gray-50/50' : 'bg-surface hover:bg-surface-hover'}
            ${isToday ? 'shadow-[inset_0_0_0_2px_rgba(17,17,17,1)] z-10 relative' : ''}
          `}
        >
          <div className="flex justify-between items-start mb-2">
            <span className={`text-sm font-medium ${isToday ? 'text-white font-bold bg-ink-900 w-7 h-7 flex items-center justify-center rounded-full' : 'text-ink-500'}`}>
              {formattedDate}
            </span>
          </div>
          
          <div className="flex-1 space-y-1 overflow-y-auto custom-scrollbar">
            {reminders.filter(r => r.due_time.startsWith(format(cloneDay, 'yyyy-MM-dd'))).map(r => (
              <div key={r.id} className="w-full text-left truncate bg-gray-100 border border-gray-200 text-ink-900 text-[10px] px-2 py-1 rounded-md font-medium">
                {r.due_time.split('T')[1]} - {r.title}
              </div>
            ))}
          </div>
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
        <button onClick={() => setIsAdding(!isAdding)} className="btn-primary flex items-center space-x-2">
          <Plus size={16} />
          <span>Add Reminder</span>
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 flex-1 min-h-0">
        
        {/* Full Month Calendar View */}
        <div className="xl:col-span-3 card flex flex-col">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-surface">
            <h2 className="text-lg font-bold text-ink-900 tracking-tight">
              {format(currentDate, 'MMMM yyyy')}
            </h2>
            <div className="flex space-x-2">
              <button onClick={prevMonth} className="p-2 border border-gray-200 rounded-lg text-ink-500 hover:text-ink-900 hover:bg-surface-hover transition-colors">
                <ChevronLeft size={18} />
              </button>
              <button onClick={() => setCurrentDate(new Date())} className="px-4 py-2 border border-gray-200 rounded-lg text-ink-900 text-sm font-medium hover:bg-surface-hover transition-colors">
                Today
              </button>
              <button onClick={nextMonth} className="p-2 border border-gray-200 rounded-lg text-ink-500 hover:text-ink-900 hover:bg-surface-hover transition-colors">
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          <div className="flex-1 flex flex-col overflow-y-auto">
            <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50 sticky top-0 z-20">
              {weekDayNames.map(dayName => (
                <div key={dayName} className="p-3 text-center text-xs font-bold text-ink-500 uppercase tracking-wider border-r border-gray-200 last:border-r-0">
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
            <h2 className="text-sm font-bold text-ink-900 uppercase tracking-wider">Alerts</h2>
            <Bell className="text-ink-500" size={16} />
          </div>

          {isAdding && (
            <form onSubmit={handleAddReminder} className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6 relative overflow-hidden">
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
                <button type="submit" className="flex-1 bg-ink-900 hover:bg-ink-500 text-white text-sm font-medium py-2 rounded-lg transition-colors">Save</button>
                <button type="button" onClick={() => setIsAdding(false)} className="px-4 bg-surface border border-gray-200 hover:bg-gray-50 text-ink-500 text-sm font-medium rounded-lg transition-colors">Cancel</button>
              </div>
            </form>
          )}

          <div className="space-y-2 overflow-y-auto custom-scrollbar flex-1 pr-2">
            {reminders.length === 0 && !isAdding ? (
              <div className="flex flex-col items-center justify-center h-40 text-ink-300">
                <Check size={24} className="mb-2 opacity-50" />
                <p className="text-xs font-medium">No upcoming alerts.</p>
              </div>
            ) : (
              reminders.map(r => (
                <div key={r.id} className="group relative flex flex-col bg-surface p-3 rounded-xl border border-gray-200 hover:border-gray-300 transition-all shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="text-sm font-semibold text-ink-900 leading-tight pr-6">{r.title}</h4>
                    <button 
                      onClick={() => deleteReminder(r.id)}
                      className="absolute top-2 right-2 w-6 h-6 rounded flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-[10px] font-medium text-ink-500 space-x-1.5">
                      <Clock size={12} />
                      <span>{format(new Date(r.due_time), 'MMM d, HH:mm')}</span>
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-500 bg-gray-100 px-2 py-0.5 rounded">{r.type}</span>
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
