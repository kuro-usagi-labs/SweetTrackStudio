import { supabase } from './supabase';

// Helper to get current user ID
const getUserId = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error("Not authenticated");
  return session.user.id;
};

export const api = {
  getProfiles: async () => {
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: true });
    if (error) throw error;
    // App expects an object with activeProfileId and profiles array
    return {
      profiles: data || [],
      activeProfileId: data && data.length > 0 ? data[0].id : null
    };
  },
  addProfile: async (data) => {
    const userId = await getUserId();
    const { data: res, error } = await supabase.from('profiles').insert([{ ...data, user_id: userId }]).select();
    if (error) throw error;
    return res[0];
  },
  switchProfile: async (id) => {
    // In cloud version, switching profile just updates app state, no DB lock needed
    return { success: true };
  },
  updateProfile: async (data) => {
    const { id, ...updateData } = data;
    const { data: res, error } = await supabase.from('profiles').update(updateData).eq('id', id).select();
    if (error) throw error;
    return res[0];
  },
  deleteProfile: async (id) => {
    const { error } = await supabase.from('profiles').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  },

  getTargets: async () => {
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
  },

  getCustomTargets: async () => {
    const { data, error } = await supabase.from('custom_targets').select('*').order('created_at', { ascending: true });
    if (error) throw error;
    return data;
  },
  addCustomTarget: async (data) => {
    const userId = await getUserId();
    const { data: res, error } = await supabase.from('custom_targets').insert([{ ...data, user_id: userId }]).select();
    if (error) throw error;
    return res[0];
  },
  updateCustomTarget: async (data) => {
    const { id, ...updateData } = data;
    const { data: res, error } = await supabase.from('custom_targets').update(updateData).eq('id', id).select();
    if (error) throw error;
    return res[0];
  },
  deleteCustomTarget: async (id) => {
    const { error } = await supabase.from('custom_targets').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  },

  getPipeline: async () => {
    const { data, error } = await supabase.from('pipeline').select('*').order('order_index', { ascending: true }).order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },
  addPipelineItem: async (data) => {
    const userId = await getUserId();
    const { data: res, error } = await supabase.from('pipeline').insert([{ ...data, user_id: userId }]).select();
    if (error) throw error;
    return res[0];
  },
  updatePipelineStatus: async (data) => {
    const { id, status } = data;
    const { error } = await supabase.from('pipeline').update({ status }).eq('id', id);
    if (error) throw error;
    return { success: true };
  },
  updatePipelineItem: async (data) => {
    const { id, ...updateData } = data;
    const { data: res, error } = await supabase.from('pipeline').update(updateData).eq('id', id).select();
    if (error) throw error;
    return res[0];
  },
  deletePipelineItem: async (id) => {
    const { error } = await supabase.from('pipeline').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  },
  reorderPipeline: async (orderedIds) => {
    // Supabase doesn't easily support bulk updating multiple different rows with different values in one query
    // We will do it in parallel
    const promises = orderedIds.map((id, index) => 
      supabase.from('pipeline').update({ order_index: index }).eq('id', id)
    );
    await Promise.all(promises);
    return { success: true };
  },

  openFile: async (filePath) => {
    // In Web, opening local files is not possible securely without File System Access API
    // We'll stub this or open in new tab if it's a URL
    if (filePath.startsWith('http')) {
      window.open(filePath, '_blank');
      return { success: true };
    }
    console.warn("openFile is only supported for URLs in web mode");
    return { error: 'Not supported in Web mode' };
  },

  getIdeas: async () => {
    const { data, error } = await supabase.from('ideas').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },
  addIdea: async (data) => {
    const userId = await getUserId();
    const { data: res, error } = await supabase.from('ideas').insert([{ ...data, user_id: userId }]).select();
    if (error) throw error;
    return res[0];
  },
  deleteIdea: async (id) => {
    const { error } = await supabase.from('ideas').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  },

  getReminders: async () => {
    const { data, error } = await supabase.from('reminders').select('*').order('created_at', { ascending: true });
    if (error) throw error;
    return data;
  },
  addReminder: async (data) => {
    const userId = await getUserId();
    const { data: res, error } = await supabase.from('reminders').insert([{ ...data, user_id: userId }]).select();
    if (error) throw error;
    return res[0];
  },
  deleteReminder: async (id) => {
    const { error } = await supabase.from('reminders').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  },

  getScratchpad: async () => {
    const { data, error } = await supabase.from('scratchpad').select('content').limit(1).single();
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 is no rows returned
    return data || { content: '' };
  },
  updateScratchpad: async (content) => {
    const userId = await getUserId();
    // Check if exists
    const { data, error } = await supabase.from('scratchpad').select('id').limit(1).single();
    if (data) {
      await supabase.from('scratchpad').update({ content }).eq('id', data.id);
    } else {
      await supabase.from('scratchpad').insert([{ content, user_id: userId }]);
    }
    return { success: true };
  },

  getPrompts: async () => {
    const { data, error } = await supabase.from('prompts').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },
  addPrompt: async (data) => {
    const userId = await getUserId();
    const { data: res, error } = await supabase.from('prompts').insert([{ ...data, user_id: userId }]).select();
    if (error) throw error;
    return res[0];
  },
  deletePrompt: async (id) => {
    const { error } = await supabase.from('prompts').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  },

  getAnalytics: async () => {
    const { data, error } = await supabase.from('analytics').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },
  addAnalytics: async (data) => {
    const userId = await getUserId();
    const { data: res, error } = await supabase.from('analytics').insert([{ ...data, user_id: userId }]).select();
    if (error) throw error;
    return res[0];
  },
  deleteAnalytics: async (id) => {
    const { error } = await supabase.from('analytics').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  },
  clearAnalytics: async () => {
    const userId = await getUserId();
    const { error } = await supabase.from('analytics').delete().eq('user_id', userId);
    if (error) throw error;
    return { success: true };
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
      const { data: existing } = await supabase.from('scratchpad').select('id').eq('user_id', userId).limit(1).single();
      if (existing) {
        await supabase.from('scratchpad').update(rest).eq('id', existing.id);
      } else {
        await supabase.from('scratchpad').insert([{ ...rest, user_id: userId }]);
      }
    }

    return { success: true };
  },
  
  getAppVersion: async () => {
    return "V2.0.0 (Cloud)";
  },

  getAppSettings: async () => {
    const { data, error } = await supabase.from('app_settings').select('*').limit(1).single();
    if (error && error.code !== 'PGRST116') throw error;
    return data || {};
  },
  updateAppSettings: async (data) => {
    const userId = await getUserId();
    const { data: existing } = await supabase.from('app_settings').select('id').limit(1).single();
    if (existing) {
      await supabase.from('app_settings').update(data).eq('id', existing.id);
    } else {
      await supabase.from('app_settings').insert([{ ...data, user_id: userId }]);
    }
    return { success: true };
  },

  sendNotification: (title, body) => {
    // Use Web Notifications API
    if ("Notification" in window) {
      if (Notification.permission === "granted") {
        new Notification(title, { body });
      } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then(permission => {
          if (permission === "granted") new Notification(title, { body });
        });
      }
    }
  },

  // Web-compatible YouTube OAuth using Google Identity Services
  startYoutubeOauth: async ({ client_id }) => {
    return new Promise((resolve, reject) => {
      if (!window.google || !window.google.accounts) {
        const script = document.createElement('script');
        script.src = "https://accounts.google.com/gsi/client";
        script.onload = () => initOAuth();
        script.onerror = () => reject(new Error("Failed to load Google Identity Services"));
        document.body.appendChild(script);
      } else {
        initOAuth();
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
    return { error: 'Sync requires backend access to save videos directly' };
  }
};
