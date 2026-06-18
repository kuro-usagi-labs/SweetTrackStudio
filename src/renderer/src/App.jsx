import React, { useState, useEffect, createContext, useContext } from 'react';
import { HashRouter as Router, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, ListTodo, Lightbulb, Calendar as CalendarIcon, Target, BarChart2, Wand2, Settings as SettingsIcon, Plus, X, Upload, ChevronUp, Video, Search, Bell, Moon, Sun, Menu, Download } from 'lucide-react';
import { DialogProvider, useDialog } from './components/DialogContext';
import { useAuth } from './components/AuthProvider';
import { syncLocalToCloud } from './lib/api';
import Login from './pages/Login';
import { Loader2 } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Pipeline from './pages/Pipeline';
import IdeaBank from './pages/IdeaBank';
import Calendar from './pages/Calendar';
import Targets from './pages/Targets';
import Analytics from './pages/Analytics';
import Prompts from './pages/Prompts';
import Settings from './pages/Settings';

export const GlobalContext = createContext();

function ProfileModal({ isOpen, onClose, initialData, isEdit, onDelete, preventClose }) {
  const [profileForm, setProfileForm] = useState({ id: '', name: '', avatar: '' });

  useEffect(() => {
    if (isOpen) {
      setProfileForm(initialData || { id: '', name: '', avatar: '' });
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (window.api) {
      if (isEdit) {
        await window.api.updateProfile(profileForm);
      } else {
        await window.api.addProfile({ name: profileForm.name, avatar: profileForm.avatar });
      }
      onClose(true); // true indicates a change was made
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setProfileForm({ ...profileForm, avatar: reader.result });
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 bg-ink-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface p-8 flex flex-col rounded-3xl shadow-2xl w-full max-w-sm">
        <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
          <h2 className="text-lg font-bold text-ink-900">{isEdit ? 'Edit Profile' : 'New Profile'}</h2>
          {!preventClose && (
            <button onClick={() => onClose()} className="text-ink-400 hover:text-ink-900 hover:bg-gray-100 p-1.5 rounded-lg transition-colors"><X size={20} /></button>
          )}
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-[11px] font-bold text-ink-500 uppercase tracking-wider mb-2">Profile Name</label>
            <input type="text" required value={profileForm.name} onChange={e => setProfileForm({ ...profileForm, name: e.target.value })} className="input-field bg-gray-50 border-gray-200" placeholder="e.g. Gaming Channel" />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-ink-500 uppercase tracking-wider mb-2">{isEdit ? 'Update Avatar' : 'Avatar Image'}</label>
            <div className="flex items-center space-x-4 mb-4">
              {profileForm.avatar ? (
                <img src={profileForm.avatar} alt="Profile avatar" className="w-12 h-12 rounded-full object-cover shadow-sm border border-gray-200" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center"><Upload size={16} className="text-gray-400"/></div>
              )}
              <label className="btn-secondary text-xs cursor-pointer flex-1 flex items-center justify-center space-x-2 bg-surface hover:bg-gray-50 border-gray-200 py-2 rounded-lg">
                <span>{profileForm.avatar ? 'Replace Image...' : 'Choose File...'}</span>
                <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              </label>
            </div>
          </div>
          <div className="pt-4 space-y-2">
            <button type="submit" className="w-full btn-primary bg-ink-900 hover:bg-ink-500 py-3 shadow-sm">{isEdit ? 'Save Changes' : 'Create Profile'}</button>
            {isEdit && onDelete && (
              <button 
                type="button" 
                onClick={() => onDelete(profileForm.id)} 
                className="w-full text-xs font-bold text-red-500 hover:text-white hover:bg-red-500 py-3 rounded-xl transition-colors"
              >
                Delete Profile
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

function Sidebar({ toggleTheme, isDarkMode, config, refreshConfig }) {
  const { showToast, showConfirm } = useDialog();
  const { user } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [modalState, setModalState] = useState({ isOpen: false, isEdit: false, data: null, preventClose: false });

  useEffect(() => {
    if (config && config.profiles && config.profiles.length === 0) {
      setModalState({ isOpen: true, isEdit: false, data: null, preventClose: true });
    }
  }, [config]);

  const handleSwitchProfile = async (id) => {
    if (id !== config.activeProfileId && window.api) {
      await window.api.switchProfile(id);
      refreshConfig();
      setIsDropdownOpen(false);
    }
  };

  const handleDeleteProfile = async (id) => {
    if (config.profiles.length <= 1) {
      showToast("You cannot delete the last remaining profile.", "error");
      return;
    }
    const confirmed = await showConfirm("Delete Profile?", "Are you sure you want to delete this profile? All videos and data inside it will be permanently lost!", true);
    if (confirmed && window.api) {
      try {
        await window.api.deleteProfile(id);
        setModalState({ isOpen: false });
        refreshConfig();
      } catch (err) {
        showToast("Error: " + err.message, "error");
      }
    }
  };

  const activeProfile = config?.profiles?.find(p => p.id === config.activeProfileId) || { name: 'Setup required', avatar: '' };

  const navItems = [
    { icon: <LayoutDashboard size={20} />, label: 'Dashboard', path: '/' },
    { icon: <ListTodo size={20} />, label: 'Pipeline', path: '/pipeline' },
    { icon: <Lightbulb size={20} />, label: 'Idea Bank', path: '/ideas' },
    { icon: <CalendarIcon size={20} />, label: 'Calendar', path: '/calendar' },
    { icon: <Target size={20} />, label: 'Targets', path: '/targets' },
    { icon: <BarChart2 size={20} />, label: 'Analytics', path: '/analytics' },
    { icon: <Wand2 size={20} />, label: 'Prompts', path: '/prompts' },
    { icon: <SettingsIcon size={20} />, label: 'Settings', path: '/settings' },
  ];

  return (
    <>
      <div className={`hidden md:flex inset-y-0 left-0 z-50 w-64 h-full bg-surface border-r border-gray-200 flex-col pt-4 pb-6 transition-transform duration-300`}>
        <div className="px-7 mb-8 flex items-center justify-between space-x-3 h-12" style={{ WebkitAppRegion: 'drag' }}>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-ink-900 text-white flex items-center justify-center shadow-sm" style={{ WebkitAppRegion: 'no-drag' }}>
              <Video size={18} className="stroke-[2.5]" />
            </div>
            <div className="text-left" style={{ WebkitAppRegion: 'no-drag' }}>
              <h1 className="text-xl font-extrabold text-ink-900 tracking-tight leading-tight">SweetTrack</h1>
              {user?.isLocal && (
                <span className="text-[9px] font-extrabold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 inline-block mt-0.5">Offline Mode</span>
              )}
            </div>
          </div>
        </div>
        
        <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto custom-scrollbar" style={{ WebkitAppRegion: 'no-drag' }}>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : 'inactive'}`}
            >
              {({ isActive }) => (
                <>
                  {React.cloneElement(item.icon, { size: 18, className: isActive ? 'stroke-[2.5]' : 'stroke-[2]' })}
                  <span className="text-sm">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="px-4 mt-auto space-y-2" style={{ WebkitAppRegion: 'no-drag' }}>
          {!window.electron && !window.Capacitor && (
            <a 
              href="/SweetTrack-Setup.exe" 
              download="SweetTrack-Setup.exe"
              className="w-full flex items-center space-x-3 p-3 hover:bg-gray-100 rounded-xl transition-colors text-ink-500 hover:text-ink-900 font-medium text-sm"
            >
              <Download size={18} />
              <span>Download App</span>
            </a>
          )}
          <button onClick={toggleTheme} className="w-full flex items-center space-x-3 p-3 hover:bg-gray-100 rounded-xl transition-colors text-ink-500 hover:text-ink-900 font-medium text-sm">
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
          </button>

          <div className="relative">
            <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="w-full flex items-center justify-between p-2 hover:bg-gray-100 rounded-xl transition-colors group">
              <div className="flex items-center space-x-3">
                 {activeProfile.avatar ? (
                    <img src={activeProfile.avatar} alt="Profile avatar" className="w-9 h-9 rounded-full object-cover shadow-sm border border-gray-200" />
                 ) : (
                    <div className="w-9 h-9 rounded-full bg-ink-900 text-white flex items-center justify-center text-sm font-bold shadow-sm">
                      {activeProfile.name.charAt(0).toUpperCase()}
                    </div>
                 )}
                 <div className="text-left">
                    <div className="text-sm font-bold text-ink-900 leading-tight truncate w-24">{activeProfile.name}</div>
                    <div className="text-[10px] font-medium text-ink-500 group-hover:text-ink-700 transition-colors">Workspace</div>
                 </div>
              </div>
              <ChevronUp size={16} className={`text-ink-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isDropdownOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-surface rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50">
                 <div className="max-h-60 overflow-y-auto custom-scrollbar p-2 space-y-1">
                   {config?.profiles?.map(p => (
                     <div key={p.id} onClick={() => handleSwitchProfile(p.id)} className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-colors ${config.activeProfileId === p.id ? 'bg-gray-50' : 'hover:bg-gray-50'}`}>
                        <div className="flex items-center space-x-3">
                          {p.avatar ? (
                             <img src={p.avatar} alt="Profile avatar" className="w-7 h-7 rounded-full object-cover" />
                          ) : (
                             <div className="w-7 h-7 rounded-full bg-gray-200 text-ink-900 flex items-center justify-center text-xs font-bold">{p.name.charAt(0).toUpperCase()}</div>
                          )}
                          <span className="text-sm font-medium text-ink-900 truncate w-20">{p.name}</span>
                        </div>
                        {config.activeProfileId === p.id && <SettingsIcon size={14} className="text-ink-400 hover:text-ink-900 cursor-pointer" onClick={(e) => { e.stopPropagation(); setModalState({ isOpen: true, isEdit: true, data: p }); setIsDropdownOpen(false); }} />}
                     </div>
                   ))}
                 </div>
                 <div className="p-2 border-t border-gray-100 bg-gray-50">
                    <button onClick={() => { setIsDropdownOpen(false); setModalState({ isOpen: true, isEdit: false, data: null }); }} className="w-full flex items-center space-x-2 p-2 rounded-xl text-sm font-medium text-ink-700 hover:text-ink-900 hover:bg-gray-200 transition-colors">
                      <Plus size={16} /><span>Add Profile</span>
                    </button>
                 </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <ProfileModal 
        isOpen={modalState.isOpen} 
        isEdit={modalState.isEdit} 
        initialData={modalState.data} 
        preventClose={modalState.preventClose}
        onClose={(changed) => {
          if (modalState.preventClose && !changed) return; // Disallow closing if required
          setModalState({ isOpen: false, preventClose: false });
          if (changed) refreshConfig();
        }} 
        onDelete={handleDeleteProfile} 
      />
    </>
  );
}

function BottomNav({ toggleTheme, isDarkMode, config, refreshConfig }) {
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const mainNav = [
    { icon: <LayoutDashboard />, label: 'Dashboard', path: '/' },
    { icon: <ListTodo />, label: 'Pipeline', path: '/pipeline' },
    { icon: <Target />, label: 'Targets', path: '/targets' },
    { icon: <BarChart2 />, label: 'Analytics', path: '/analytics' },
  ];

  const moreNav = [
    { icon: <Lightbulb />, label: 'Idea Bank', path: '/ideas' },
    { icon: <CalendarIcon />, label: 'Calendar', path: '/calendar' },
    { icon: <Wand2 />, label: 'Prompts', path: '/prompts' },
    { icon: <SettingsIcon />, label: 'Settings', path: '/settings' },
  ];

  return (
    <>
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/85 dark:bg-[#272625]/85 glass-nav border-t border-gray-200 pb-safe shadow-[0_-8px_30px_rgba(0,0,0,0.04)]">
        <div className="flex justify-around items-center h-[4.5rem] px-2">
          {mainNav.map(item => (
            <NavLink 
              key={item.path} 
              to={item.path}
              onClick={() => setIsMoreOpen(false)}
              className={({ isActive }) => `relative flex flex-col items-center justify-center w-16 h-full space-y-1.5 transition-all duration-300 ${isActive ? 'text-ink-900' : 'text-ink-400 hover:text-ink-600'}`}
            >
              {({ isActive }) => (
                <>
                  <div className={`transition-transform duration-300 ${isActive ? 'scale-110 -translate-y-1' : 'scale-100'}`}>
                    {React.cloneElement(item.icon, { size: 24, className: isActive ? 'stroke-[2.5]' : 'stroke-[2]' })}
                  </div>
                  {isActive && <span className="absolute bottom-1 text-[10px] font-bold tracking-tight animate-in fade-in zoom-in-90 duration-300">{(item.label).substring(0, 5)}</span>}
                </>
              )}
            </NavLink>
          ))}
          <button 
            onClick={() => setIsMoreOpen(!isMoreOpen)}
            className={`relative flex flex-col items-center justify-center w-16 h-full space-y-1.5 transition-all duration-300 ${isMoreOpen ? 'text-ink-900' : 'text-ink-400 hover:text-ink-600'}`}
          >
             <div className={`transition-transform duration-300 ${isMoreOpen ? 'scale-110 -translate-y-1' : 'scale-100'}`}>
               <Menu size={24} className={isMoreOpen ? 'stroke-[2.5]' : 'stroke-[2]'} />
             </div>
             {isMoreOpen && <span className="absolute bottom-1 text-[10px] font-bold tracking-tight animate-in fade-in zoom-in-90 duration-300">More</span>}
          </button>
        </div>
      </div>

      {isMoreOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-ink-900/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setIsMoreOpen(false)}>
          <div 
            className="absolute bottom-0 left-0 right-0 bg-surface rounded-t-[2rem] shadow-2xl p-6 pt-8 pb-32 animate-in slide-in-from-bottom duration-500"
            onClick={e => e.stopPropagation()}
          >
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-gray-200 rounded-full"></div>
            
            <h3 className="text-xs font-bold text-ink-500 uppercase tracking-wider mb-6 px-2">More Options</h3>
            <div className="grid grid-cols-4 gap-4 mb-8">
              {moreNav.map(item => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMoreOpen(false)}
                  className="flex flex-col items-center space-y-3 p-4 bg-gray-50 rounded-[1.25rem] active:scale-95 transition-transform"
                >
                  <div className="text-ink-900">{React.cloneElement(item.icon, { size: 26, className: 'stroke-[2]' })}</div>
                  <span className="text-[10px] font-bold text-ink-900 text-center leading-tight">{item.label}</span>
                </NavLink>
              ))}
            </div>

            <div className="border-t border-gray-100 pt-6 space-y-3">
              <button onClick={toggleTheme} className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-2xl active:scale-95 transition-transform">
                <div className="flex items-center space-x-3 text-ink-900 font-bold text-sm">
                  {isDarkMode ? <Sun size={20} className="stroke-[2.5]" /> : <Moon size={20} className="stroke-[2.5]" />}
                  <span>{isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}</span>
                </div>
              </button>

              {!window.electron && !window.Capacitor && (
                <a 
                  href="/SweetTrack-Setup.exe" 
                  download="SweetTrack-Setup.exe"
                  className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-2xl active:scale-95 transition-transform"
                >
                  <div className="flex items-center space-x-3 text-ink-900 font-bold text-sm">
                    <Download size={20} className="stroke-[2.5]" />
                    <span>Download Windows App</span>
                  </div>
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Topbar({ searchQuery, setSearchQuery }) {
  const location = useLocation();
  const showSearch = location.pathname === '/pipeline' || location.pathname === '/ideas';
  const { user } = useAuth();
  
  return (
    <div className="min-h-16 md:min-h-20 py-2 bg-white/85 dark:bg-[#272625]/85 glass-nav flex items-center justify-between px-4 md:px-8 border-b md:border-b-0 border-gray-200 md:bg-surface sticky top-0 z-30" style={{ WebkitAppRegion: 'drag', paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}>
      {/* Mobile Logo Presentation */}
      <div className="flex items-center space-x-3 md:hidden w-full" style={{ WebkitAppRegion: 'no-drag' }}>
        <div className="w-9 h-9 rounded-xl bg-ink-900 text-white flex items-center justify-center shadow-md">
          <Video size={20} className="stroke-[2.5]" />
        </div>
        <div className="text-left">
          <h1 className="text-xl font-extrabold text-ink-900 tracking-tight leading-tight">SweetTrack</h1>
          {user?.isLocal && (
            <span className="text-[9px] font-extrabold text-amber-600 bg-amber-50 px-1 py-0.5 rounded border border-amber-200 inline-block">Offline</span>
          )}
        </div>
        <div className="flex-1"></div>
        {/* Mobile Notification Bell */}
        <button className="relative p-2.5 text-ink-500 hover:text-ink-900 bg-gray-50 rounded-xl shadow-sm transition-colors">
          <Bell size={20} />
          <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 border-2 border-gray-50 rounded-full animate-pulse"></span>
        </button>
      </div>
      
      {/* Desktop Search & Bell */}
      <div className="flex-1 max-w-2xl hidden md:flex" style={{ WebkitAppRegion: 'no-drag' }}>
        {showSearch ? (
          <div className="relative w-full group">
            <Search size={18} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-ink-400 group-focus-within:text-ink-900 transition-colors" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search items... (Global Search)" 
              className="w-full bg-gray-50 border border-transparent hover:border-gray-200 focus:bg-surface focus:border-ink-900 focus:ring-4 focus:ring-ink-900/10 rounded-2xl py-3 pl-12 pr-4 text-[15px] text-ink-900 placeholder-ink-400 transition-all outline-none shadow-sm" 
            />
          </div>
        ) : (
          <div className="h-10"></div>
        )}
      </div>
      <div className="items-center space-x-4 hidden md:flex" style={{ WebkitAppRegion: 'no-drag' }}>
        <button className="relative p-2.5 text-ink-500 hover:text-ink-900 hover:bg-gray-100 rounded-xl transition-colors">
          <Bell size={20} />
          <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 border-2 border-surface rounded-full animate-pulse"></span>
        </button>
      </div>
    </div>
  );
}

function SyncManager() {
  const { showToast } = useDialog();
  const { setRefreshKey } = useContext(GlobalContext);

  useEffect(() => {
    const handleOnline = async () => {
      if (localStorage.getItem('needsOfflineSync') === 'true') {
        showToast("Connection restored. Syncing changes to cloud...", "info");
        await syncLocalToCloud();
        showToast("Offline data successfully synced to cloud!", "success");
        setRefreshKey(k => k + 1);
      }
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [showToast, setRefreshKey]);

  return null;
}

export default function App() {
  const { user, loading } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [config, setConfig] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadConfig = async () => {
    if (window.api && window.api.getProfiles) {
      const c = await window.api.getProfiles();
      setConfig(c);
    }
  };

  useEffect(() => {
    if (user && window.api && window.api.syncRemindersToNativeLocal) {
      window.api.syncRemindersToNativeLocal();
    }
  }, [user, refreshKey]);

  useEffect(() => {
    loadConfig();
  }, [refreshKey]);

  useEffect(() => {
    if (window.api && window.api.getAppSettings) {
      window.api.getAppSettings().then(settings => {
        if (settings && settings.is_dark_mode) {
          setIsDarkMode(true);
          document.documentElement.classList.add('dark');
        } else {
          setIsDarkMode(false);
          document.documentElement.classList.remove('dark');
        }
      });
    }

    // Global Reminder Polling
    const interval = setInterval(async () => {
      if (window.api && window.api.getReminders) {
        const reminders = await window.api.getReminders();
        const now = new Date();
        const localNow = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}T${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
        
        reminders.forEach(r => {
          if (r.due_time === localNow && !r.is_completed) {
            window.api.sendNotification('SweetTrack Reminder', r.title);
          }
        });
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [refreshKey]);

  const toggleTheme = async () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    if (newMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    
    if (window.api && window.api.updateAppSettings) {
      await window.api.updateAppSettings({ is_dark_mode: newMode ? 1 : 0 });
    }
  };

  return (
    <GlobalContext.Provider value={{ searchQuery, refreshKey, setRefreshKey }}>
      <DialogProvider>
        <Router>
          {loading ? (
            <div className="flex h-screen items-center justify-center bg-surface">
              <Loader2 className="animate-spin text-ink-900" size={32} />
            </div>
          ) : !user ? (
            <Login />
          ) : (
            <div className="flex h-screen bg-surface overflow-hidden">
              <SyncManager />
              <Sidebar 
                toggleTheme={toggleTheme} 
                isDarkMode={isDarkMode} 
                config={config}
                refreshConfig={() => setRefreshKey(k => k + 1)}
              />
              <div className="flex-1 flex flex-col min-w-0 bg-surface">
                <Topbar 
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                />

                <main key={refreshKey} className="flex-1 overflow-hidden bg-gray-50 md:rounded-tl-[2rem] md:border-l md:border-t border-gray-200 relative pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-0" style={{ WebkitAppRegion: 'no-drag' }}>
                  <div className="h-full overflow-y-auto custom-scrollbar p-4 md:p-8 lg:px-12 lg:py-10">
                    <div className="mx-auto max-w-7xl h-full pb-safe">
                      <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/pipeline" element={<Pipeline />} />
                        <Route path="/ideas" element={<IdeaBank />} />
                        <Route path="/calendar" element={<Calendar />} />
                        <Route path="/targets" element={<Targets />} />
                        <Route path="/analytics" element={<Analytics />} />
                        <Route path="/prompts" element={<Prompts />} />
                        <Route path="/settings" element={<Settings />} />
                      </Routes>
                    </div>
                  </div>
                </main>
              </div>
              <BottomNav 
                toggleTheme={toggleTheme} 
                isDarkMode={isDarkMode} 
                config={config}
                refreshConfig={() => setRefreshKey(k => k + 1)}
              />
            </div>
          )}
        </Router>
      </DialogProvider>
    </GlobalContext.Provider>
  );
}
