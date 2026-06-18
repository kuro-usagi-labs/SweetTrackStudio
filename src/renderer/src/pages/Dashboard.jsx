import React, { useState, useEffect } from 'react';
import { Target, TrendingUp, AlertCircle, ArrowRight, ArrowUpRight } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

export default function Dashboard() {
  const [targets, setTargets] = useState({
    long_form: 36, shorts: 70, subscribers: 1000, watch_hours: 4000, completed_targets: '[]'
  });
  const [pipeline, setPipeline] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [focusData, setFocusData] = useState({
    title: 'Write A-roll script for next video',
    items: [
      { id: 1, text: 'Draft outline', done: false },
      { id: 2, text: 'Write 5 hooks', done: false },
      { id: 3, text: 'Flesh out body paragraphs', done: false }
    ]
  });
  const [newItemText, setNewItemText] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  const [analytics, setAnalytics] = useState([]);

  useEffect(() => {
    if (window.api) {
      window.api.getTargets().then(data => { if (data) setTargets(data); }).catch(() => {});
      window.api.getPipeline().then(setPipeline).catch(() => {});
      window.api.getReminders().then(setReminders).catch(() => {});
      window.api.getAnalytics().then(setAnalytics).catch(() => {});
      window.api.getScratchpad().then(data => {
         try {
            const parsed = JSON.parse(data);
            if (parsed && parsed.items) setFocusData(parsed);
         } catch(e) {
            saveFocusData(focusData);
         }
      }).catch(() => {});
    }
  }, []);

  // ... (saveFocusData, toggleFocusItem, addFocusItem, deleteFocusItem omitted for brevity)

  const saveFocusData = async (newData) => {
    setFocusData(newData);
    if (window.api) await window.api.updateScratchpad(JSON.stringify(newData));
  };

  const toggleFocusItem = (id) => {
    const newData = {
      ...focusData,
      items: focusData.items.map(item => item.id === id ? { ...item, done: !item.done } : item)
    };
    saveFocusData(newData);
  };

  const addFocusItem = (e) => {
    if (e.key === 'Enter' && newItemText.trim()) {
      const newData = {
        ...focusData,
        items: [...focusData.items, { id: Date.now(), text: newItemText.trim(), done: false }]
      };
      saveFocusData(newData);
      setNewItemText('');
    }
  };

  const deleteFocusItem = (id) => {
    const newData = {
      ...focusData,
      items: focusData.items.filter(item => item.id !== id)
    };
    saveFocusData(newData);
  };

  // Calculations
  const completedTargetsArr = (() => {
    try { return JSON.parse(targets.completed_targets || '[]'); } catch(e) { return []; }
  })();
  
  // Progress is (completed / total_fields) * 100
  const progressPercent = Math.round((completedTargetsArr.length / 7) * 100);

  const readyVideos = pipeline.filter(i => i.status === 'Ready').length;
  const productionVideos = pipeline.filter(i => i.status === 'Production').length;

  const streakDays = Math.max(1, (analytics.length * 2) + pipeline.length);

  const nextDeadline = reminders.length > 0 ? reminders[0] : null;
  let deadlineText = "No deadlines";
  let deadlineDays = "-";
  if (nextDeadline) {
    deadlineText = nextDeadline.title;
    const diff = differenceInDays(new Date(nextDeadline.due_time), new Date());
    if (diff === 0) deadlineDays = "Today";
    else if (diff === 1) deadlineDays = "1 Day";
    else if (diff > 1) deadlineDays = `${diff} Days`;
    else deadlineDays = "Overdue";
  }

  return (
    <div className="flex flex-col space-y-8 max-w-[1200px] pb-10">
      
      {/* Top BizLink style Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="col-span-2 bg-paper p-8 rounded-2xl flex justify-between items-center relative border border-gray-200 shadow-sm">
           <div>
             <h2 className="text-sm font-medium text-ink-500 mb-1">Consistency Streak</h2>
             <div className="text-5xl font-sans text-ink-900 font-bold mb-4 tracking-tight">{streakDays} Days</div>
             <p className="text-sm text-ink-500 max-w-[200px]">Keep the momentum going. You're doing great!</p>
           </div>
           
           <div className="flex flex-col items-end">
             <span className="text-xs font-bold text-ink-400 mb-2 uppercase tracking-widest">{analytics.length > 0 ? 'Recent Views' : 'Sample Data'}</span>
             <div className="flex items-end space-x-3 h-24">
               {(function() {
                 const recent = [...analytics].sort((a,b) => new Date(a.date_added) - new Date(b.date_added)).slice(-5);
                 const maxViews = Math.max(1, ...recent.map(a => a.views || 0));
                 const bars = recent.length > 0 
                   ? recent.map((a, i) => ({ id: a.id, height: Math.max(5, ((a.views || 0) / maxViews) * 100), views: a.views, label: a.video_title, isEven: i % 2 === 0 }))
                   : [
                       { id: 'f1', height: 40, views: 0, label: 'No data', isEven: true },
                       { id: 'f2', height: 70, views: 0, label: 'No data', isEven: false },
                       { id: 'f3', height: 50, views: 0, label: 'No data', isEven: true },
                       { id: 'f4', height: 90, views: 0, label: 'No data', isEven: false },
                       { id: 'f5', height: 30, views: 0, label: 'No data', isEven: true }
                     ];
                 
                 return bars.map(bar => (
                    <div 
                      key={bar.id} 
                      className={`w-6 rounded-t-sm transition-all duration-500 hover:opacity-80 cursor-help relative group ${bar.isEven ? 'bg-ink-900' : 'bg-gray-300'}`} 
                      style={{ height: `${bar.height}%` }}
                    >
                      {/* Custom Tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[200px] bg-ink-900 text-white text-xs p-2.5 rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20 shadow-xl pointer-events-none text-center">
                         <div className="font-semibold truncate mb-0.5">{bar.label}</div>
                         <div className="text-ink-300 font-medium">{bar.views ? bar.views.toLocaleString() + ' views' : '0 views'}</div>
                         <div className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-ink-900"></div>
                      </div>
                    </div>
                  ));
               })()}
             </div>
           </div>
        </div>

        <div className="card p-8 flex flex-col justify-center">
           <h2 className="text-sm font-medium text-ink-500 mb-2">Next Deadline</h2>
           <div className="text-3xl font-bold text-ink-900 mb-4 tracking-tight">{deadlineDays}</div>
           <div className="flex justify-between items-center text-sm font-medium">
             <span className="truncate max-w-[150px]">{deadlineText}</span>
             <ArrowRight size={16} className="text-ink-500 shrink-0" />
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Mission / Scratchpad */}
        <div className="lg:col-span-1 space-y-6 flex flex-col">
          <div className="card-inverted p-8 flex-1 flex flex-col min-h-[300px]">
            <h3 className="text-sm text-gray-400 font-medium mb-1">Today's Focus</h3>
            
            {isEditingTitle ? (
              <input 
                autoFocus
                type="text"
                value={focusData.title}
                onChange={(e) => saveFocusData({...focusData, title: e.target.value})}
                onBlur={() => setIsEditingTitle(false)}
                onKeyDown={(e) => e.key === 'Enter' && setIsEditingTitle(false)}
                className="text-2xl font-bold mb-6 bg-transparent text-white focus:outline-none border-b border-gray-600 pb-1"
              />
            ) : (
              <h2 onClick={() => setIsEditingTitle(true)} className="text-2xl font-bold mb-6 cursor-pointer hover:text-gray-300 transition-colors">
                {focusData.title || 'Set your focus...'}
              </h2>
            )}
            
            <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-2">
              {focusData.items.map((item) => (
                <div 
                  key={item.id} 
                  className="flex items-center group py-1 bg-white/5 hover:bg-white/10 px-3 rounded-xl transition-all active:scale-[0.99] cursor-pointer mb-2"
                  onClick={() => toggleFocusItem(item.id)}
                >
                  <div className="w-5.5 h-5.5 shrink-0 rounded-lg border border-gray-500 flex items-center justify-center mr-3 hover:border-gray-300 transition-colors">
                    {item.done && <div className="w-3.5 h-3.5 bg-gray-300 rounded-[3px]"></div>}
                  </div>
                  <span className={`text-sm flex-1 py-1.5 ${item.done ? 'text-gray-500 line-through' : 'text-gray-300'}`}>{item.text}</span>
                  <button 
                    onClick={(e) => { e.stopPropagation(); deleteFocusItem(item.id); }} 
                    className="text-gray-500 hover:text-red-400 p-1.5 text-lg font-bold opacity-80 group-hover:opacity-100 transition-opacity"
                  >
                    ×
                  </button>
                </div>
              ))}
              
              <div className="flex items-center mt-2">
                 <div className="w-5 h-5 shrink-0 rounded border border-gray-700 border-dashed flex items-center justify-center mr-3"></div>
                 <input 
                   type="text" 
                   value={newItemText}
                   onChange={(e) => setNewItemText(e.target.value)}
                   onKeyDown={addFocusItem}
                   placeholder="Add task... (Press Enter)"
                   className="bg-transparent text-sm text-gray-300 placeholder-gray-600 focus:outline-none w-full"
                 />
              </div>
            </div>
            
            <div className="mt-6 pt-4 border-t border-gray-800 flex items-center justify-between text-xs text-gray-400">
              <div className="flex items-center space-x-2">
                <AlertCircle size={14} />
                <span>Auto-saves to database</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: 90-Day Trajectory */}
        <div className="lg:col-span-2 card p-8">
          <div className="flex justify-between items-center mb-8 border-b border-gray-100 pb-4">
            <h3 className="text-lg font-bold text-ink-900 flex items-center">
              <Target className="mr-2 text-ink-500" size={20} />
              Quarterly Trajectory
            </h3>
            <span className="text-xs font-medium text-ink-500 uppercase tracking-wider">Set the benchmark</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <p className="text-xs font-medium text-ink-500 mb-1">Long-form Target</p>
              <div className={`text-3xl font-bold ${completedTargetsArr.includes('long_form') ? 'text-green-600' : 'text-ink-900'}`}>{targets.long_form}</div>
              <div className="text-xs text-green-600 font-medium flex items-center mt-2">
                <ArrowUpRight size={12} className="mr-1" /> {productionVideos} in prod
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-ink-500 mb-1">Shorts Target</p>
              <div className={`text-3xl font-bold ${completedTargetsArr.includes('shorts') ? 'text-green-600' : 'text-ink-900'}`}>{targets.shorts}</div>
              <div className="text-xs text-green-600 font-medium flex items-center mt-2">
                <ArrowUpRight size={12} className="mr-1" /> {readyVideos} ready
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-ink-500 mb-1">Subscribers Goal</p>
              <div className={`text-3xl font-bold ${completedTargetsArr.includes('subscribers') ? 'text-green-600' : 'text-ink-900'}`}>{(targets.subscribers / 1000).toFixed(1)}k</div>
              <div className="text-xs text-ink-500 mt-2">Tracking</div>
            </div>
            <div>
              <p className="text-xs font-medium text-ink-500 mb-1">Watch Hours</p>
              <div className={`text-3xl font-bold ${completedTargetsArr.includes('watch_hours') ? 'text-green-600' : 'text-ink-900'}`}>{(targets.watch_hours / 1000).toFixed(1)}k</div>
              <div className="text-xs text-ink-500 mt-2">Tracking</div>
            </div>
          </div>
          
          {/* Progress Bar Mockup */}
          <div className="mt-10">
             <div className="flex justify-between text-xs font-medium text-ink-500 mb-2">
               <span>Quarterly Progress ({completedTargetsArr.length}/7 targets hit)</span>
               <span>{progressPercent}%</span>
             </div>
             <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
               <div className="h-full bg-ink-900 rounded-full transition-all duration-1000" style={{ width: `${progressPercent}%` }}></div>
             </div>
          </div>
        </div>
      </div>

    </div>
  );
}
