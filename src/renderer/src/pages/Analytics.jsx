import React, { useState, useEffect } from 'react';
import { BarChart2, CheckCircle, AlertTriangle, Info, History, } from 'lucide-react';
import { format } from 'date-fns';
import { useDialog } from '../components/DialogContext';

export default function Analytics() {
  const { showToast } = useDialog();
  const [metrics, setMetrics] = useState({
    video_title: '', impressions: '', views: '', ctr: '', retention_30s: '', avg_view_duration: '', subscribers: ''
  });
  
  const [history, setHistory] = useState([]);
  const [currentSuggestions, setCurrentSuggestions] = useState([]);

  const loadHistory = () => {
    if (window.api) {
      window.api.getAnalytics().then(setHistory).catch(() => {});
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleAnalyze = async () => {
    if (!metrics.video_title) {
       showToast('Please enter a video title', 'warning');
       return;
    }
    const { ctr, retention_30s, avg_view_duration, impressions, views, subscribers, video_title } = metrics;
    let newSuggestions = [];
    const c = parseFloat(ctr) || 0;
    const r30 = parseFloat(retention_30s) || 0;
    const avd = parseFloat(avg_view_duration) || 0;
    const imp = parseInt(impressions) || 0;

    if (c < 5) newSuggestions.push({ type: 'warning', text: 'CTR is below 5%. Suggestion: Change the title or test a new thumbnail to improve click-through rate.' });
    if (r30 < 55) newSuggestions.push({ type: 'warning', text: '30-second retention is below 55%. Suggestion: Improve the hook and get to the point faster in your next video.' });
    if (avd < 35) newSuggestions.push({ type: 'warning', text: 'Average view duration is below 35%. Suggestion: Improve pacing and add more pattern interrupts (B-roll, zoom cuts).' });
    if (c >= 5 && (r30 < 55 || avd < 35)) newSuggestions.push({ type: 'info', text: 'High CTR but low retention detected. Suggestion: Make sure your intro perfectly matches the expectation set by your thumbnail.' });
    if ((r30 >= 55 && avd >= 35) && imp < 1000) newSuggestions.push({ type: 'info', text: 'Great retention but low impressions. Suggestion: The topic might be too niche. Try making a broader, related topic next time.' });
    if (newSuggestions.length === 0 && c > 0 && r30 > 0) newSuggestions.push({ type: 'success', text: 'Your metrics look fantastic! Keep up the great work and maintain this format.' });

    setCurrentSuggestions(newSuggestions);

    if (window.api) {
      await window.api.addAnalytics({
         video_title,
         impressions: imp,
         views: parseInt(views) || 0,
         ctr: c,
         retention_30s: r30,
         avg_view_duration: avd,
         subscribers: parseInt(subscribers) || 0,
         date_added: new Date().toISOString(),
         suggestions: JSON.stringify(newSuggestions)
      });
      loadHistory();
      setMetrics({video_title: '', impressions: '', views: '', ctr: '', retention_30s: '', avg_view_duration: '', subscribers: ''});
    }
  };

  const handleChange = (e) => setMetrics({ ...metrics, [e.target.name]: e.target.value });

  return (
    <div className="max-w-[1200px] mx-auto flex flex-col pb-10">
      <div className="flex justify-between items-end mb-8 px-2">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 mb-1 tracking-tight">Performance Analytics</h1>
          <p className="text-sm text-ink-500">Input recent video metrics for actionable AI feedback.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Input Form */}
        <div className="card p-8 bg-surface">
          <h2 className="text-sm font-bold text-ink-900 uppercase tracking-wider mb-6 border-b border-gray-100 pb-4">Metric Entry</h2>
          <div className="mb-4">
             <label className="block text-[11px] font-bold text-ink-500 uppercase tracking-wider mb-2">Video Title</label>
             <input type="text" name="video_title" value={metrics.video_title} onChange={handleChange} className="input-field bg-gray-50 border-gray-200" placeholder="e.g. How to Budget on $50k" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              {name: 'impressions', label: 'Impressions', placeholder: '15000'},
              {name: 'views', label: 'Views', placeholder: '1200'},
              {name: 'ctr', label: 'CTR (%)', placeholder: '6.5'},
              {name: 'retention_30s', label: '30s Retention (%)', placeholder: '60'},
              {name: 'avg_view_duration', label: 'Avg View Duration (min)', placeholder: '40'},
              {name: 'subscribers', label: 'Subs Gained', placeholder: '15'}
            ].map(f => (
               <div key={f.name}>
                <label className="block text-[11px] font-bold text-ink-500 uppercase tracking-wider mb-2">{f.label}</label>
                <input type="number" name={f.name} value={metrics[f.name]} onChange={handleChange} className="input-field bg-gray-50 border-gray-200" placeholder={f.placeholder} />
              </div>
            ))}
          </div>
          <div className="flex mt-6">
            <button onClick={handleAnalyze} className="w-full btn-primary bg-ink-900 hover:bg-ink-500 text-white shadow-md flex items-center justify-center space-x-2 py-3 rounded-xl transition-colors">
              <CheckCircle size={16} /><span>Analyze & Save</span>
            </button>
          </div>
        </div>

        {/* Current Suggestions Panel */}
        <div className="card p-8 bg-surface flex flex-col">
          <h2 className="text-sm font-bold text-ink-900 uppercase tracking-wider mb-6 border-b border-gray-100 pb-4">Action Plan</h2>
          
          <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {currentSuggestions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-ink-300">
                <BarChart2 size={32} className="mb-3 opacity-50" />
                <p className="text-sm">Awaiting metrics analysis.</p>
              </div>
            ) : (
              currentSuggestions.map((s, i) => (
                <div key={i} className={`p-4 rounded-xl border flex items-start space-x-3 ${
                  s.type === 'warning' ? 'bg-orange-50 border-orange-200 text-orange-900' :
                  s.type === 'info' ? 'bg-blue-50 border-blue-200 text-blue-900' :
                  'bg-green-50 border-green-200 text-green-900'
                }`}>
                  {s.type === 'warning' && <AlertTriangle className="shrink-0 mt-0.5 text-orange-500" size={18} />}
                  {s.type === 'info' && <Info className="shrink-0 mt-0.5 text-blue-500" size={18} />}
                  {s.type === 'success' && <CheckCircle className="shrink-0 mt-0.5 text-green-500" size={18} />}
                  <p className="text-sm font-medium leading-relaxed">{s.text}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* History Panel */}
      <div className="card border-0 md:border flex flex-col bg-transparent md:bg-surface relative overflow-hidden">
         <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
            <h2 className="text-sm font-bold text-ink-900 uppercase tracking-wider flex items-center">
              <History size={16} className="mr-2 text-ink-500" /> Analysis History
            </h2>
         </div>
         {/* Mobile View: History Cards */}
         <div className="md:hidden divide-y divide-gray-100 bg-surface dark:divide-gray-800">
           {history.length === 0 ? (
             <div className="py-12 text-center text-ink-500 text-sm">
               No videos analyzed yet. Fill in the metrics form above to start.
             </div>
           ) : (
             history.map(h => (
               <div key={h.id} className="p-5 flex flex-col space-y-3">
                 <div className="flex justify-between items-start">
                   <div className="space-y-0.5 text-left">
                     <h3 className="font-bold text-sm text-ink-900 dark:text-white leading-snug">{h.video_title}</h3>
                     <span className="text-[10px] text-ink-400 font-bold">
                       {format(new Date(h.date_added), 'MMM d, yyyy')}
                     </span>
                   </div>
                 </div>

                 <div className="grid grid-cols-4 gap-2 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-xl border border-gray-100 dark:border-gray-800 text-center">
                   <div>
                     <div className="text-[9px] font-bold text-ink-400 uppercase tracking-wide">Views</div>
                     <div className="text-xs font-bold text-ink-900 dark:text-white mt-0.5">{h.views?.toLocaleString() || '0'}</div>
                   </div>
                   <div>
                     <div className="text-[9px] font-bold text-ink-400 uppercase tracking-wide">CTR</div>
                     <div className="text-xs font-bold text-ink-900 dark:text-white mt-0.5">
                       {h.ctr === 0 || h.ctr === null ? 'N/A' : `${h.ctr}%`}
                     </div>
                   </div>
                   <div>
                     <div className="text-[9px] font-bold text-ink-400 uppercase tracking-wide">30s Ret.</div>
                     <div className="text-xs font-bold text-ink-900 dark:text-white mt-0.5">
                       {h.retention_30s === 0 || h.retention_30s === null ? 'N/A' : `${h.retention_30s}%`}
                     </div>
                   </div>
                   <div>
                     <div className="text-[9px] font-bold text-ink-400 uppercase tracking-wide">AVD</div>
                     <div className="text-xs font-bold text-ink-900 dark:text-white mt-0.5">{h.avg_view_duration}m</div>
                   </div>
                 </div>
               </div>
             ))
           )}
         </div>

         {/* Desktop View: Table Layout */}
         <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-surface sticky top-0 z-10 border-b border-gray-200 shadow-sm">
                <tr>
                  <th className="py-3 px-6 text-[10px] font-bold text-ink-500 uppercase tracking-wider">Date</th>
                  <th className="py-3 px-6 text-[10px] font-bold text-ink-500 uppercase tracking-wider">Video</th>
                  <th className="py-3 px-6 text-[10px] font-bold text-ink-500 uppercase tracking-wider text-right">Views</th>
                  <th className="py-3 px-6 text-[10px] font-bold text-ink-500 uppercase tracking-wider text-right">CTR</th>
                  <th className="py-3 px-6 text-[10px] font-bold text-ink-500 uppercase tracking-wider text-right">30s Ret.</th>
                  <th className="py-3 px-6 text-[10px] font-bold text-ink-500 uppercase tracking-wider text-right">AVD</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-surface">
                {history.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-12 text-center">
                       <div className="flex flex-col items-center justify-center text-ink-400">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10 mb-3 opacity-50"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" /></svg>
                          <p className="text-sm font-medium text-ink-600">No Videos Yet</p>
                          <p className="text-xs mt-1">Connect your channel or upload a video to see analytics.</p>
                       </div>
                    </td>
                  </tr>
                ) : history.map(h => (
                  <tr key={h.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-6 text-xs text-ink-500 whitespace-nowrap">{format(new Date(h.date_added), 'MMM d, yyyy')}</td>
                    <td className="py-3 px-6 text-sm font-semibold text-ink-900">{h.video_title}</td>
                    <td className="py-3 px-6 text-sm text-ink-500 text-right">{h.views?.toLocaleString()}</td>
                    <td className="py-3 px-6 text-sm text-ink-500 text-right font-medium">
                      {h.ctr === 0 || h.ctr === null ? <span className="text-gray-300 font-normal">N/A</span> : `${h.ctr}%`}
                    </td>
                    <td className="py-3 px-6 text-sm text-ink-500 text-right font-medium">
                      {h.retention_30s === 0 || h.retention_30s === null ? <span className="text-gray-300 font-normal">N/A</span> : `${h.retention_30s}%`}
                    </td>
                    <td className="py-3 px-6 text-sm text-ink-500 text-right font-medium">{h.avg_view_duration}min</td>
                  </tr>
                ))}
              </tbody>
            </table>
         </div>
      </div>
    </div>
  );
}
