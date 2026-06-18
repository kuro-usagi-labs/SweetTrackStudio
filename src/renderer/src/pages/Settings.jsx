import React, { useState } from 'react';
import { Settings as SettingsIcon, Save, Download, Upload, Trash2, Key, Database, CheckCircle } from 'lucide-react';
import { useDialog } from '../components/DialogContext';

export default function Settings() {
  const { showToast, showConfirm } = useDialog();
  const [activeTab, setActiveTab] = useState('general');
  const [isExporting, setIsExporting] = useState(false);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);

  const handleExportBackup = async () => {
    if (!window.api) return;
    setIsExporting(true);
    try {
      // Fetch all data
      const targets = await window.api.getTargets();
      const pipeline = await window.api.getPipeline();
      const ideas = await window.api.getIdeas();
      const reminders = await window.api.getReminders();
      const prompts = await window.api.getPrompts();
      const analytics = await window.api.getAnalytics();
      const scratchpad = await window.api.getScratchpad();

      const backupData = {
        timestamp: new Date().toISOString(),
        version: "1.0",
        data: { targets, pipeline, ideas, reminders, prompts, analytics, scratchpad }
      };

      const jsonString = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sweettrack_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      showToast('Backup exported successfully! Check your downloads folder.', 'success');
    } catch (err) {
      
      showToast('Failed to export backup: ' + err.message, 'error');
    }
    setIsExporting(false);
  };

  const handleImportBackup = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const confirmed = await showConfirm(
      'Import Backup?', 
      'WARNING: Importing this backup will DELETE and overwrite all your current data. Are you sure you want to proceed?', 
      true
    );

    if (!confirmed) {
      e.target.value = ''; // reset input
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target.result);
        if (!json.data) throw new Error("Invalid backup format");
        
        await window.api.importData(json.data);
        showToast('Backup imported successfully! Please restart the application or refresh to see the changes.', 'success');
        window.location.reload();
      } catch (err) {
        
        showToast('Failed to import backup: ' + err.message, 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // reset input
  };

  const handleExportCsv = async () => {
    if (!window.api) return;
    try {
      const analytics = await window.api.getAnalytics();
      if (!analytics || analytics.length === 0) {
        showToast('No analytics data to export.', 'warning');
        return;
      }
      
      const headers = ['Date', 'Video Title', 'Impressions', 'Views', 'CTR (%)', 'Retention 30s (%)', 'Avg View Duration (%)', 'Subscribers Gained', 'Suggestions'];
      const rows = analytics.map(a => [
        a.date_added,
        `"${(a.video_title || '').replace(/"/g, '""')}"`,
        a.impressions,
        a.views,
        a.ctr,
        a.retention_30s,
        a.avg_view_duration,
        a.subscribers,
        `"${(a.suggestions || '').replace(/"/g, '""')}"`
      ]);
      
      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sweettrack_analytics_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      
      showToast('Failed to export CSV: ' + err.message, 'error');
    }
  };

  const [apiKeys, setApiKeys] = useState({ youtube_client_id: '', youtube_client_secret: '' });

  React.useEffect(() => {
    if (window.api) {
      window.api.getAppSettings().then(data => {
        if (data) {
          setApiKeys({
            youtube_client_id: data.youtube_client_id || '',
            youtube_client_secret: data.youtube_client_secret || '',
            youtube_access_token: data.youtube_access_token || ''
          });
        }
      });
    }
  }, []);

  const handleSaveApiKeys = async (e) => {
    e.preventDefault();
    if (window.api) {
      await window.api.updateAppSettings(apiKeys);
      showToast('API Keys saved successfully!', 'success');
    }
  };

  const handleDisconnect = async () => {
    const confirmed = await showConfirm('Disconnect YouTube?', 'Are you sure you want to disconnect your Google Account? This will disable automatic analytics sync.', true);
    if (!confirmed) return;
    try {
      await window.api.updateAppSettings({
        youtube_access_token: "",
        youtube_refresh_token: ""
      });
      setApiKeys({...apiKeys, youtube_access_token: '', youtube_refresh_token: ''});
      setShowDisconnectConfirm(false);
    } catch (e) {
      showToast('Failed to disconnect: ' + e.message, 'error');
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto flex flex-col pb-10">
      <div className="mb-6 px-2">
        <h1 className="text-2xl font-bold text-ink-900 mb-1 tracking-tight">Settings</h1>
        <p className="text-sm text-ink-500 mb-8">Manage your studio preferences and data.</p>
        
        {/* Horizontal Tabs */}
        <div className="flex space-x-6 border-b border-gray-200">
          {[
            { id: 'general', label: 'General', icon: SettingsIcon },
            { id: 'api', label: 'API Integrations', icon: Key },
            { id: 'data', label: 'Data & Backup', icon: Database },
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 pb-3 border-b-2 transition-colors font-medium text-sm ${
                activeTab === tab.id ? 'border-ink-900 text-ink-900' : 'border-transparent text-ink-500 hover:text-ink-900 hover:border-gray-300'
              }`}
            >
              <tab.icon size={16} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="px-2">
        <div className="card p-8 bg-surface">
          {activeTab === 'general' && (
            <div className="space-y-8">
              <h2 className="text-lg font-bold text-ink-900 mb-6 border-b border-gray-100 pb-4">General Preferences</h2>
              
              <div className="space-y-6 max-w-lg">
                <div>
                  <label className="block text-sm font-semibold text-ink-900 mb-2">App Version</label>
                  <div className="text-sm text-ink-900 bg-gray-50 p-3 rounded-xl border border-gray-200">
                    SweetTrack Studio V2.0.0 (Cloud Edition)
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-ink-900 mb-2">Cloud Database</label>
                  <div className="text-sm text-ink-900 bg-gray-50 p-3 rounded-xl border border-gray-200 flex items-center space-x-2">
                    <Database size={16} className="text-ink-500" />
                    <span>Supabase Live Sync Enabled</span>
                  </div>
                  <p className="text-xs text-ink-500 mt-2">All data is securely backed up and synced to your cloud account.</p>
                </div>

                {!window.electron && (
                  <div className="pt-4 border-t border-gray-100 mt-6">
                    <label className="block text-sm font-semibold text-ink-900 mb-2">Get Desktop Version</label>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border border-gray-200 bg-gray-50/50 gap-4">
                      <div className="space-y-1">
                        <span className="text-sm font-bold text-ink-900">SweetTrack for Windows</span>
                        <p className="text-xs text-ink-500">Run SweetTrack locally as a native Windows desktop app using SQLite.</p>
                      </div>
                      <a 
                        href="https://github.com/kuro-usagi-labs/SweetTrackStudio/releases/latest" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="btn-primary bg-ink-900 hover:bg-ink-500 px-4 py-2 text-xs flex items-center space-x-2"
                      >
                        <Download size={14} className="stroke-[2.5]" />
                        <span>Download (.exe)</span>
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'api' && (
            <div className="space-y-8">
              <h2 className="text-lg font-bold text-ink-900 mb-6 border-b border-gray-100 pb-4 flex items-center">
                <Key className="mr-2 text-ink-500" size={20} /> API Integrations
              </h2>
              
              <div className="p-6 rounded-2xl border border-gray-200 bg-gray-50 max-w-4xl">
                 <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-base font-bold text-ink-900 flex items-center mb-1">
                        YouTube Data API
                        <span className="ml-3 px-2 py-0.5 bg-green-100 text-green-800 text-[10px] uppercase tracking-wider font-bold rounded">Active</span>
                      </h3>
                      <p className="text-xs text-ink-500 leading-relaxed max-w-md">Connect your Google Cloud OAuth credentials to enable automatic syncing of video analytics directly from YouTube.</p>
                    </div>
                    <div className="p-3 bg-surface border border-gray-200 rounded-xl text-red-500 shadow-sm">
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                    </div>
                 </div>

                 <div className="space-y-4">
                    <p className="text-sm text-ink-700 mb-4 font-medium">To use the YouTube Analytics API directly from your browser, you need to provide your Google OAuth Client ID (Web Application type).</p>
                    
                    <form onSubmit={handleSaveApiKeys} className="space-y-3 mb-6">
                      <div>
                        <label className="block text-[11px] font-bold text-ink-500 uppercase tracking-wider mb-2">Google Client ID</label>
                        <div className="flex items-center space-x-2">
                          <input 
                            type="text" 
                            value={apiKeys.youtube_client_id}
                            onChange={(e) => setApiKeys({...apiKeys, youtube_client_id: e.target.value})}
                            placeholder="e.g. 123456789-abc.apps.googleusercontent.com"
                            className="input-field flex-1"
                          />
                          <button type="submit" className="btn-secondary py-2">
                            <Save size={16} className="mr-2" /> Save
                          </button>
                        </div>
                      </div>
                    </form>
                     <div className="pt-2 flex items-center space-x-3">
                      {apiKeys.youtube_access_token ? (
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-2 text-green-700 bg-green-50 border border-green-200 py-3 px-6 rounded-xl font-medium shadow-sm">
                             <CheckCircle size={20} />
                             <span>Connected to YouTube</span>
                          </div>
                          <button 
                            type="button"
                            onClick={() => setShowDisconnectConfirm(true)}
                            className="p-3 text-red-500 hover:bg-red-50 hover:text-red-600 rounded-xl transition-colors border border-transparent hover:border-red-100 flex items-center justify-center relative group"
                          >
                            <Trash2 size={20} />
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max bg-ink-900 text-white text-[10px] font-medium py-1 px-2 rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all shadow-md pointer-events-none z-10">
                               Disconnect
                               <div className="absolute top-full left-1/2 -translate-x-1/2 border-[3px] border-transparent border-t-ink-900"></div>
                            </div>
                          </button>
                        </div>
                      ) : (
                        <button 
                          type="button" 
                          onClick={async () => {
                            if (!apiKeys.youtube_client_id) {
                              showToast("Please save your Google Client ID first!", "error");
                              return;
                            }
                            try {
                              const authData = await window.api.startYoutubeOauth({ client_id: apiKeys.youtube_client_id });
                              if (authData.access_token) {
                                await window.api.updateAppSettings({
                                  youtube_access_token: authData.access_token,
                                  youtube_refresh_token: authData.refresh_token
                                });
                                setApiKeys({...apiKeys, youtube_access_token: authData.access_token});
                                
                                // Auto load analysis and overwrite previous
                                try {
                                  await window.api.clearAnalytics();
                                  const videos = await window.api.fetchYoutubeData(authData.access_token);
                                  if (videos.length > 0) {
                                    const videoIds = videos.map(v => v.id).join(',');
                                    const stats = await window.api.fetchYoutubeAnalytics(authData.access_token, videoIds);
                                    for (const v of videos) {
                                       const stat = stats[v.id] || { views: v.views, avgViewDuration: 0, subscribers: 0 };
                                       await window.api.addAnalytics({
                                          video_title: v.title,
                                          impressions: 0,
                                          views: stat.views,
                                          ctr: 0,
                                          retention_30s: 0,
                                          avg_view_duration: Math.round(stat.avgViewDuration || 0),
                                          subscribers: stat.subscribers || 0,
                                          date_added: v.publishedAt,
                                          suggestions: '[]'
                                       });
                                    }
                                  }
                                } catch(e) {
                                  
                                }
                                
                                showToast('Successfully connected and automatically loaded your latest analytics!', 'success');
                              }
                            } catch (e) {
                              showToast('Failed to connect: ' + e.message, 'error');
                            }
                          }} 
                          className="btn-primary bg-ink-900 hover:bg-ink-500 flex items-center space-x-2 py-3 px-6 shadow-md"
                        >
                          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 mr-2"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                          <span>Connect to YouTube</span>
                        </button>
                      )}
                    </div>
                 </div>
               </div>
            </div>
          )}

          {activeTab === 'data' && (
            <div className="space-y-8 max-w-4xl">
              <h2 className="text-lg font-bold text-ink-900 mb-6 border-b border-gray-100 pb-4">Data Management</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="p-6 rounded-2xl border border-gray-200 flex flex-col items-start bg-gray-50 hover:bg-surface transition-colors group">
                   <div className="p-2.5 bg-surface border border-gray-200 rounded-xl mb-4 text-ink-900 shadow-sm group-hover:scale-105 transition-transform">
                     <Download size={20} />
                   </div>
                   <h3 className="text-sm font-bold text-ink-900 mb-2">Export JSON Backup</h3>
                   <p className="text-xs text-ink-500 mb-6 leading-relaxed flex-1">Download a complete backup of your Studio's Pipeline, Analytics, and settings.</p>
                   <button onClick={handleExportBackup} disabled={isExporting} className="w-full btn-primary bg-ink-900 hover:bg-ink-500 flex items-center justify-center space-x-2 py-2.5">
                     <Download size={16} /><span>{isExporting ? 'Exporting...' : 'Export Backup'}</span>
                   </button>
                </div>

                <div className="p-6 rounded-2xl border border-gray-200 flex flex-col items-start bg-gray-50 hover:bg-surface transition-colors group">
                   <div className="p-2.5 bg-surface border border-gray-200 rounded-xl mb-4 text-ink-900 shadow-sm group-hover:scale-105 transition-transform">
                     <Upload size={20} />
                   </div>
                   <h3 className="text-sm font-bold text-ink-900 mb-2">Import JSON Backup</h3>
                   <p className="text-xs text-ink-500 mb-6 leading-relaxed flex-1">Restore your studio data from a previously exported JSON backup file.</p>
                   <label className="w-full btn-secondary cursor-pointer flex items-center justify-center space-x-2 bg-surface hover:bg-gray-50 border-gray-200 py-2.5">
                     <Upload size={16} /><span>Import Backup</span>
                     <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
                   </label>
                </div>

                <div className="p-6 rounded-2xl border border-gray-200 flex flex-col items-start bg-gray-50 hover:bg-surface transition-colors group">
                   <div className="p-2.5 bg-surface border border-gray-200 rounded-xl mb-4 text-ink-900 shadow-sm group-hover:scale-105 transition-transform">
                     <Database size={20} />
                   </div>
                   <h3 className="text-sm font-bold text-ink-900 mb-2">Export Analytics (CSV)</h3>
                   <p className="text-xs text-ink-500 mb-6 leading-relaxed flex-1">Export your video performance history as a CSV file for Excel/Sheets.</p>
                   <button onClick={handleExportCsv} className="w-full btn-secondary flex items-center justify-center space-x-2 bg-surface hover:bg-gray-50 border-gray-200 py-2.5">
                     <Download size={16} /><span>Export CSV</span>
                   </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Disconnect Confirmation Modal */}
      {showDisconnectConfirm && (
        <div className="fixed inset-0 bg-ink-900/50 backdrop-blur-[2px] flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-surface rounded-2xl max-w-sm w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-ink-900 mb-2">Disconnect YouTube?</h3>
            <p className="text-sm text-ink-500 mb-6 leading-relaxed">
              Are you sure you want to disconnect your YouTube account? You will need to re-authorize again to sync analytics.
            </p>
            <div className="flex items-center space-x-3 justify-end">
              <button 
                onClick={() => setShowDisconnectConfirm(false)}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-ink-600 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleDisconnect}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-red-500 text-white hover:bg-red-600 transition-colors shadow-sm"
              >
                Disconnect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}