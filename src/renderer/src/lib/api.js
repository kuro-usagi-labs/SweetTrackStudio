import { supabase } from './supabase';

const getUserId = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error("Not authenticated");
  return session.user.id;
};

// Check if we should use Supabase (Online and logged in)
const isCloudMode = async () => {
  if (!window.nativeApi) return true; // Web browser always uses cloud mode
  if (!navigator.onLine) return false;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return !!session?.user;
  } catch (e) {
    return false;
  }
};

const markForSync = () => {
  localStorage.setItem('needsOfflineSync', 'true');
};

let pullTimeout = null;
const schedulePull = () => {
  if (!window.nativeApi) return;
  if (pullTimeout) clearTimeout(pullTimeout);
  pullTimeout = setTimeout(() => {
    pullCloudToLocal();
  }, 2000);
};

// Auto sync local SQLite data to Supabase
export const syncLocalToCloud = async () => {
  if (!window.nativeApi || !navigator.onLine) return;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return; // Not logged in
    
    if (localStorage.getItem('needsOfflineSync') !== 'true') {
      // If no offline changes, just pull latest cloud data to local SQLite
      await pullCloudToLocal();
      return;
    }

    console.log("Offline changes detected. Syncing SQLite to Supabase...");
    
    // Fetch all data from SQLite
    const targets = await window.nativeApi.getTargets();
    const custom_targets = await window.nativeApi.getCustomTargets();
    const pipeline = await window.nativeApi.getPipeline();
    const ideas = await window.nativeApi.getIdeas();
    const reminders = await window.nativeApi.getReminders();
    const scratchpad = await window.nativeApi.getScratchpad();
    const prompts = await window.nativeApi.getPrompts();
    const analytics = await window.nativeApi.getAnalytics();
    const appSettings = await window.nativeApi.getAppSettings();

    const localData = {
      targets,
      custom_targets,
      pipeline,
      ideas,
      reminders,
      scratchpad: { content: scratchpad || '' },
      prompts,
      analytics
    };

    // Upload everything to Supabase
    await api.importData(localData);
    
    // Sync app settings if present
    if (appSettings) {
      await api.updateAppSettings(appSettings);
    }
    
    console.log("Offline sync completed successfully!");
    localStorage.removeItem('needsOfflineSync');

    // Pull back to get consistent IDs (UUIDs mapped to fresh auto-increments)
    await pullCloudToLocal();
  } catch (err) {
    console.error("Failed to sync local data to cloud:", err);
  }
};

// Pull latest cloud data from Supabase to SQLite
export const pullCloudToLocal = async () => {
  if (!window.nativeApi || !navigator.onLine) return;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return; // Not logged in

    console.log("Pulling latest cloud data from Supabase to SQLite...");
    
    const targets = await api.getTargets();
    const custom_targets = await api.getCustomTargets();
    const pipeline = await api.getPipeline();
    const ideas = await api.getIdeas();
    const reminders = await api.getReminders();
    const scratchpadObj = await api.getScratchpad();
    const prompts = await api.getPrompts();
    const analytics = await api.getAnalytics();
    const appSettings = await api.getAppSettings();

    const cloudData = {
      targets,
      custom_targets,
      pipeline,
      ideas,
      reminders,
      scratchpad: scratchpadObj?.content || '',
      prompts,
      analytics
    };

    // Overwrite local SQLite tables
    await window.nativeApi.importData(cloudData);
    
    if (appSettings) {
      await window.nativeApi.updateAppSettings(appSettings);
    }
    
    console.log("Local SQLite database updated with cloud data.");
  } catch (err) {
    console.error("Failed to pull cloud data to SQLite:", err);
  }
};

// Setup online listener to trigger auto-sync
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    syncLocalToCloud();
  });
  // Trigger initial sync check on startup
  setTimeout(() => {
    syncLocalToCloud();
  }, 3000);
}

export const api = {
  getProfiles: async () => {
    if (await isCloudMode()) {
      const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: true });
      if (error) throw error;
      return {
        profiles: data || [],
        activeProfileId: data && data.length > 0 ? data[0].id : null
      };
    } else {
      return await window.nativeApi.getProfiles();
    }
  },
  addProfile: async (data) => {
    if (await isCloudMode()) {
      const userId = await getUserId();
      const { data: res, error } = await supabase.from('profiles').insert([{ ...data, user_id: userId }]).select();
      if (error) throw error;
      if (window.nativeApi) {
        await window.nativeApi.addProfile(res[0]);
      }
      return res[0];
    } else {
      markForSync();
      return await window.nativeApi.addProfile(data);
    }
  },
  switchProfile: async (id) => {
    if (await isCloudMode()) {
      return { success: true };
    } else {
      return await window.nativeApi.switchProfile(id);
    }
  },
  updateProfile: async (data) => {
    if (await isCloudMode()) {
      const { id, ...updateData } = data;
      const { data: res, error } = await supabase.from('profiles').update(updateData).eq('id', id).select();
      if (error) throw error;
      if (window.nativeApi) {
        await window.nativeApi.updateProfile(data);
      }
      return res[0];
    } else {
      markForSync();
      return await window.nativeApi.updateProfile(data);
    }
  },
  deleteProfile: async (id) => {
    if (await isCloudMode()) {
      const { error } = await supabase.from('profiles').delete().eq('id', id);
      if (error) throw error;
      if (window.nativeApi) {
        await window.nativeApi.deleteProfile(id);
      }
      return { success: true };
    } else {
      markForSync();
      return await window.nativeApi.deleteProfile(id);
    }
  },

  getTargets: async () => {
    if (await isCloudMode()) {
      const { data, error } = await supabase.from('targets').select('*').limit(1).single();
      if (error && error.code !== 'PGRST116') throw error;
      return data || {
        long_form: 36,
        shorts: 70,
        subscribers: 1000,
        watch_hours: 4000,
        ctr: 5.0,
        retention_30s: 55.0,
        avg_view_duration: 35.0,
        completed_targets: '[]'
      };
    } else {
      return await window.nativeApi.getTargets();
    }
  },

  getCustomTargets: async () => {
    if (await isCloudMode()) {
      const { data, error } = await supabase.from('custom_targets').select('*').order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    } else {
      return await window.nativeApi.getCustomTargets();
    }
  },
  addCustomTarget: async (data) => {
    if (await isCloudMode()) {
      const userId = await getUserId();
      const { data: res, error } = await supabase.from('custom_targets').insert([{ ...data, user_id: userId }]).select();
      if (error) throw error;
      schedulePull();
      return res[0];
    } else {
      markForSync();
      return await window.nativeApi.addCustomTarget(data);
    }
  },
  updateCustomTarget: async (data) => {
    if (await isCloudMode()) {
      const { id, ...updateData } = data;
      const { data: res, error } = await supabase.from('custom_targets').update(updateData).eq('id', id).select();
      if (error) throw error;
      schedulePull();
      return res[0];
    } else {
      markForSync();
      return await window.nativeApi.updateCustomTarget(data);
    }
  },
  deleteCustomTarget: async (id) => {
    if (await isCloudMode()) {
      const { error } = await supabase.from('custom_targets').delete().eq('id', id);
      if (error) throw error;
      schedulePull();
      return { success: true };
    } else {
      markForSync();
      return await window.nativeApi.deleteCustomTarget(id);
    }
  },

  getPipeline: async () => {
    if (await isCloudMode()) {
      const { data, error } = await supabase.from('pipeline').select('*').order('order_index', { ascending: true }).order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    } else {
      return await window.nativeApi.getPipeline();
    }
  },
  addPipelineItem: async (data) => {
    if (await isCloudMode()) {
      const userId = await getUserId();
      const { data: res, error } = await supabase.from('pipeline').insert([{ ...data, user_id: userId }]).select();
      if (error) throw error;
      schedulePull();
      return res[0];
    } else {
      markForSync();
      return await window.nativeApi.addPipelineItem(data);
    }
  },
  updatePipelineStatus: async (data) => {
    if (await isCloudMode()) {
      const { id, status } = data;
      const { error } = await supabase.from('pipeline').update({ status }).eq('id', id);
      if (error) throw error;
      schedulePull();
      return { success: true };
    } else {
      markForSync();
      return await window.nativeApi.updatePipelineStatus(data);
    }
  },
  updatePipelineItem: async (data) => {
    if (await isCloudMode()) {
      const { id, ...updateData } = data;
      const { data: res, error } = await supabase.from('pipeline').update(updateData).eq('id', id).select();
      if (error) throw error;
      schedulePull();
      return res[0];
    } else {
      markForSync();
      return await window.nativeApi.updatePipelineItem(data);
    }
  },
  deletePipelineItem: async (id) => {
    if (await isCloudMode()) {
      const { error } = await supabase.from('pipeline').delete().eq('id', id);
      if (error) throw error;
      schedulePull();
      return { success: true };
    } else {
      markForSync();
      return await window.nativeApi.deletePipelineItem(id);
    }
  },
  reorderPipeline: async (orderedIds) => {
    if (await isCloudMode()) {
      const promises = orderedIds.map((id, index) => 
        supabase.from('pipeline').update({ order_index: index }).eq('id', id)
      );
      await Promise.all(promises);
      schedulePull();
      return { success: true };
    } else {
      markForSync();
      return await window.nativeApi.reorderPipeline(orderedIds);
    }
  },

  openFile: async (filePath) => {
    if (window.nativeApi) {
      return await window.nativeApi.openFile(filePath);
    }
    if (filePath.startsWith('http')) {
      window.open(filePath, '_blank');
      return { success: true };
    }
    console.warn("openFile is only supported for URLs in web mode");
    return { error: 'Not supported in Web mode' };
  },

  getIdeas: async () => {
    if (await isCloudMode()) {
      const { data, error } = await supabase.from('ideas').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    } else {
      return await window.nativeApi.getIdeas();
    }
  },
  addIdea: async (data) => {
    if (await isCloudMode()) {
      const userId = await getUserId();
      const { data: res, error } = await supabase.from('ideas').insert([{ ...data, user_id: userId }]).select();
      if (error) throw error;
      schedulePull();
      return res[0];
    } else {
      markForSync();
      return await window.nativeApi.addIdea(data);
    }
  },
  deleteIdea: async (id) => {
    if (await isCloudMode()) {
      const { error } = await supabase.from('ideas').delete().eq('id', id);
      if (error) throw error;
      schedulePull();
      return { success: true };
    } else {
      markForSync();
      return await window.nativeApi.deleteIdea(id);
    }
  },

  getReminders: async () => {
    if (await isCloudMode()) {
      const { data, error } = await supabase.from('reminders').select('*').order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    } else {
      return await window.nativeApi.getReminders();
    }
  },
  addReminder: async (data) => {
    if (await isCloudMode()) {
      const userId = await getUserId();
      const { data: res, error } = await supabase.from('reminders').insert([{ ...data, user_id: userId }]).select();
      if (error) throw error;
      schedulePull();
      return res[0];
    } else {
      markForSync();
      return await window.nativeApi.addReminder(data);
    }
  },
  deleteReminder: async (id) => {
    if (await isCloudMode()) {
      const { error } = await supabase.from('reminders').delete().eq('id', id);
      if (error) throw error;
      schedulePull();
      return { success: true };
    } else {
      markForSync();
      return await window.nativeApi.deleteReminder(id);
    }
  },

  getScratchpad: async () => {
    if (await isCloudMode()) {
      const { data, error } = await supabase.from('scratchpad').select('content').limit(1).single();
      if (error && error.code !== 'PGRST116') throw error;
      return data || { content: '' };
    } else {
      const text = await window.nativeApi.getScratchpad();
      return { content: text || '' };
    }
  },
  updateScratchpad: async (content) => {
    if (await isCloudMode()) {
      const userId = await getUserId();
      const { data } = await supabase.from('scratchpad').select('id').limit(1).single();
      if (data) {
        await supabase.from('scratchpad').update({ content }).eq('id', data.id);
      } else {
        await supabase.from('scratchpad').insert([{ content, user_id: userId }]);
      }
      schedulePull();
      return { success: true };
    } else {
      markForSync();
      return await window.nativeApi.updateScratchpad(content);
    }
  },

  getPrompts: async () => {
    if (await isCloudMode()) {
      const { data, error } = await supabase.from('prompts').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    } else {
      return await window.nativeApi.getPrompts();
    }
  },
  addPrompt: async (data) => {
    if (await isCloudMode()) {
      const userId = await getUserId();
      const { data: res, error } = await supabase.from('prompts').insert([{ ...data, user_id: userId }]).select();
      if (error) throw error;
      schedulePull();
      return res[0];
    } else {
      markForSync();
      return await window.nativeApi.addPrompt(data);
    }
  },
  deletePrompt: async (id) => {
    if (await isCloudMode()) {
      const { error } = await supabase.from('prompts').delete().eq('id', id);
      if (error) throw error;
      schedulePull();
      return { success: true };
    } else {
      markForSync();
      return await window.nativeApi.deletePrompt(id);
    }
  },

  getAnalytics: async () => {
    if (await isCloudMode()) {
      const { data, error } = await supabase.from('analytics').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    } else {
      return await window.nativeApi.getAnalytics();
    }
  },
  addAnalytics: async (data) => {
    if (await isCloudMode()) {
      const userId = await getUserId();
      const { data: res, error } = await supabase.from('analytics').insert([{ ...data, user_id: userId }]).select();
      if (error) throw error;
      schedulePull();
      return res[0];
    } else {
      markForSync();
      return await window.nativeApi.addAnalytics(data);
    }
  },
  deleteAnalytics: async (id) => {
    if (await isCloudMode()) {
      const { error } = await supabase.from('analytics').delete().eq('id', id);
      if (error) throw error;
      schedulePull();
      return { success: true };
    } else {
      markForSync();
      return await window.nativeApi.deleteAnalytics(id);
    }
  },
  clearAnalytics: async () => {
    if (await isCloudMode()) {
      const userId = await getUserId();
      const { error } = await supabase.from('analytics').delete().eq('user_id', userId);
      if (error) throw error;
      schedulePull();
      return { success: true };
    } else {
      markForSync();
      return await window.nativeApi.clearAnalytics();
    }
  },

  importData: async (data) => {
    const userId = await getUserId();
    const arrayTables = ['pipeline', 'ideas', 'reminders', 'prompts', 'analytics'];
    
    // Process array-based tables
    for (const t of arrayTables) {
      await supabase.from(t).delete().eq('user_id', userId);
      if (data[t] && Array.isArray(data[t]) && data[t].length > 0) {
        const rows = data[t].map(({ id, user_id, ...rest }) => ({ ...rest, user_id: userId }));
        await supabase.from(t).insert(rows);
      }
    }

    // Process single-row tables (targets, scratchpad)
    if (data.targets) {
      const { id, user_id, ...rest } = data.targets;
      const { data: existing } = await supabase.from('targets').select('id').eq('user_id', userId).limit(1).single();
      if (existing) {
        await supabase.from('targets').update(rest).eq('id', existing.id);
      } else {
        await supabase.from('targets').insert([{ ...rest, user_id: userId }]);
      }
    }

    if (data.scratchpad) {
      const { id, user_id, ...rest } = data.scratchpad;
      // Handle scratchpad content (normalize string/object format)
      const contentText = typeof data.scratchpad === 'string' ? data.scratchpad : (data.scratchpad.content || '');
      const { data: existing } = await supabase.from('scratchpad').select('id').eq('user_id', userId).limit(1).single();
      if (existing) {
        await supabase.from('scratchpad').update({ content: contentText }).eq('id', existing.id);
      } else {
        await supabase.from('scratchpad').insert([{ content: contentText, user_id: userId }]);
      }
    }

    if (data.custom_targets && Array.isArray(data.custom_targets)) {
      await supabase.from('custom_targets').delete().eq('user_id', userId);
      if (data.custom_targets.length > 0) {
        const rows = data.custom_targets.map(({ id, user_id, ...rest }) => ({ ...rest, user_id: userId }));
        await supabase.from('custom_targets').insert(rows);
      }
    }

    return { success: true };
  },
  
  getAppVersion: async () => {
    if (window.nativeApi) {
      return await window.nativeApi.getAppVersion();
    }
    return "V2.0.0 (Cloud)";
  },

  getAppSettings: async () => {
    if (await isCloudMode()) {
      const { data, error } = await supabase.from('app_settings').select('*').limit(1).single();
      if (error && error.code !== 'PGRST116') throw error;
      return data || {};
    } else {
      return await window.nativeApi.getAppSettings();
    }
  },
  updateAppSettings: async (data) => {
    if (await isCloudMode()) {
      const userId = await getUserId();
      const { data: existing } = await supabase.from('app_settings').select('id').limit(1).single();
      if (existing) {
        await supabase.from('app_settings').update(data).eq('id', existing.id);
      } else {
        await supabase.from('app_settings').insert([{ ...data, user_id: userId }]);
      }
      schedulePull();
      return { success: true };
    } else {
      markForSync();
      return await window.nativeApi.updateAppSettings(data);
    }
  },

  sendNotification: (title, body) => {
    if (window.nativeApi) {
      window.nativeApi.sendNotification(title, body);
      return;
    }
    if ("Notification" in window) {
      if (Notification.permission === "granted") {
        new Notification(title, { body });
      } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then(permission => {
          if (permission === "granted") {
            new Notification(title, { body });
          }
        });
      }
    }
  },

  startYoutubeOauth: async (keys) => {
    if (window.nativeApi) {
      return await window.nativeApi.startYoutubeOauth(keys);
    }
    // Web OAuth flow
    return new Promise((resolve, reject) => {
      const client_id = keys.clientId;
      if (!client_id) {
        return reject(new Error("VITE_GOOGLE_CLIENT_ID is missing"));
      }

      if (window.google) {
        initOAuth();
      } else {
        const script = document.createElement("script");
        script.src = "https://accounts.google.com/gsi/client";
        script.onload = initOAuth;
        script.onerror = () => reject(new Error("Failed to load Google Identity Services SDK"));
        document.head.appendChild(script);
      }

      function initOAuth() {
        try {
          const client = window.google.accounts.oauth2.initTokenClient({
            client_id: client_id,
            scope: 'https://www.googleapis.com/auth/youtube.readonly',
            callback: (response) => {
              if (response.error) {
                reject(new Error(response.error));
              } else {
                resolve({ access_token: response.access_token, refresh_token: '' });
              }
            },
          });
          client.requestAccessToken();
        } catch (e) {
          reject(e);
        }
      }
    });
  },

  fetchYoutubeData: async (token) => {
    if (window.nativeApi) {
      return await window.nativeApi.fetchYoutubeData(token);
    }
    const res = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&forMine=true&type=video&maxResults=50`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Failed to fetch YouTube data");
    const data = await res.json();
    return data.items.map(item => ({
      id: item.id.videoId,
      title: item.snippet.title,
      publishedAt: item.snippet.publishedAt.split('T')[0],
      views: 0
    }));
  },

  fetchYoutubeAnalytics: async (token, videoIds) => {
    if (window.nativeApi) {
      return await window.nativeApi.fetchYoutubeAnalytics(token, videoIds);
    }
    if (!videoIds) return {};
    const today = new Date().toISOString().split('T')[0];
    const past = new Date(Date.now() - 365*24*60*60*1000).toISOString().split('T')[0];
    const res = await fetch(`https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==MINE&startDate=${past}&endDate=${today}&metrics=views,averageViewDuration,subscribersGained&dimensions=video&filters=video==${videoIds}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Failed to fetch YouTube analytics");
    const data = await res.json();
    const stats = {};
    if (data.rows) {
      data.rows.forEach(row => {
        stats[row[0]] = { views: row[1], avgViewDuration: row[2], subscribers: row[3] };
      });
    }
    return stats;
  },

  syncYoutubeVideo: async (data) => {
    if (window.nativeApi) {
      return await window.nativeApi.syncYoutubeVideo(data);
    }
    return { error: 'Sync requires backend access to save videos directly' };
  }
};
