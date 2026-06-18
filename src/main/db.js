import Database from 'better-sqlite3'
import { app, ipcMain, shell } from 'electron'
import path from 'path'
import fs from 'fs'
import { fetchYoutubeAnalytics, refreshYoutubeToken } from './youtube_api'

let db;
let currentConfig = null;
let userDataPath = '';

function loadConfig() {
  const configPath = path.join(userDataPath, 'config.json');
  if (fs.existsSync(configPath)) {
    try {
      currentConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch(e) {
      currentConfig = null;
    }
  }
  
  if (!currentConfig || !currentConfig.profiles) {
    currentConfig = {
      activeProfileId: '1',
      profiles: [
        {
          id: '1',
          name: 'Main Profile',
          avatar: '',
          dbFilename: 'sweettrack.sqlite'
        }
      ]
    };
    saveConfig();
  }
}

function saveConfig() {
  const configPath = path.join(userDataPath, 'config.json');
  fs.writeFileSync(configPath, JSON.stringify(currentConfig, null, 2));
}

function initDb(dbFilename) {
  if (db) {
    db.close();
  }
  const dbPath = path.join(userDataPath, dbFilename);
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  // Run migrations / create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS targets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      long_form INTEGER DEFAULT 36,
      shorts INTEGER DEFAULT 70,
      subscribers INTEGER DEFAULT 1000,
      watch_hours INTEGER DEFAULT 4000,
      ctr REAL DEFAULT 5.0,
      retention_30s REAL DEFAULT 55.0,
      avg_view_duration REAL DEFAULT 35.0,
      completed_targets TEXT DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS custom_targets (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      has_number INTEGER DEFAULT 1,
      target_value REAL,
      suffix TEXT,
      is_completed INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS pipeline (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      type TEXT NOT NULL,
      topic_cluster TEXT,
      priority TEXT DEFAULT 'Medium',
      status TEXT DEFAULT 'Ideas',
      due_date TEXT,
      upload_date TEXT,
      notes TEXT,
      thumbnail_text TEXT,
      hook TEXT,
      kpi_views INTEGER DEFAULT 0,
      kpi_ctr REAL DEFAULT 0.0,
      kpi_retention REAL DEFAULT 0.0,
      order_index INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS ideas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      topic_cluster TEXT,
      content_pillar TEXT,
      search_score INTEGER DEFAULT 0,
      browse_score INTEGER DEFAULT 0,
      cpm_score INTEGER DEFAULT 0,
      difficulty_score INTEGER DEFAULT 0,
      series_score INTEGER DEFAULT 0,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      type TEXT NOT NULL,
      due_time TEXT NOT NULL,
      is_completed INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS prompts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      content TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS analytics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      video_title TEXT,
      impressions INTEGER,
      views INTEGER,
      ctr REAL,
      retention_30s REAL,
      avg_view_duration REAL,
      subscribers INTEGER,
      date_added TEXT,
      suggestions TEXT
    );

    CREATE TABLE IF NOT EXISTS scratchpad (
      id INTEGER PRIMARY KEY,
      content TEXT DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS app_settings (
      id INTEGER PRIMARY KEY,
      youtube_client_id TEXT DEFAULT '',
      youtube_client_secret TEXT DEFAULT '',
      youtube_access_token TEXT DEFAULT '',
      youtube_refresh_token TEXT DEFAULT ''
    );
  `);

  try {
    db.exec("ALTER TABLE pipeline ADD COLUMN order_index INTEGER DEFAULT 0;");
  } catch (e) {
    // Column already exists
  }

  // Migration from old targets to custom_targets
  try {
    const customCount = db.prepare('SELECT count(*) as c FROM custom_targets').get().c;
    if (customCount === 0) {
      const oldTargets = db.prepare('SELECT * FROM targets LIMIT 1').get();
      if (oldTargets) {
        const completed = (() => { try { return JSON.parse(oldTargets.completed_targets || '[]'); } catch(e) { return []; } })();
        
        const insert = db.prepare('INSERT INTO custom_targets (id, title, has_number, target_value, suffix, is_completed) VALUES (@id, @title, @has_number, @target_value, @suffix, @is_completed)');
        
        const oldFields = [
          { id: 'long_form', title: 'Long-form Videos', target_value: oldTargets.long_form, suffix: 'vids' },
          { id: 'shorts', title: 'Shorts', target_value: oldTargets.shorts, suffix: 'vids' },
          { id: 'subscribers', title: 'Subscribers Gained', target_value: oldTargets.subscribers, suffix: 'subs' },
          { id: 'watch_hours', title: 'Watch Hours', target_value: oldTargets.watch_hours, suffix: 'hrs' },
          { id: 'ctr', title: 'Click-Through Rate', target_value: oldTargets.ctr, suffix: '%' },
          { id: 'retention_30s', title: '30-Sec Retention', target_value: oldTargets.retention_30s, suffix: '%' },
          { id: 'avg_view_duration', title: 'Avg View Duration', target_value: oldTargets.avg_view_duration, suffix: '%' },
        ];

        for (const field of oldFields) {
          insert.run({
            id: field.id,
            title: field.title,
            has_number: 1,
            target_value: field.target_value,
            suffix: field.suffix,
            is_completed: completed.includes(field.id) ? 1 : 0
          });
        }
      }
    }
  } catch (e) {
    console.error("Migration failed:", e);
  }

  // Insert default settings row if empty
  db.prepare(`INSERT OR IGNORE INTO app_settings (id) VALUES (1)`).run();



  try {
    db.exec(`ALTER TABLE app_settings ADD COLUMN youtube_access_token TEXT DEFAULT ''`);
  } catch(e) {}

  try {
    db.exec(`ALTER TABLE app_settings ADD COLUMN youtube_refresh_token TEXT DEFAULT ''`);
  } catch(e) {}

  try {
    db.exec(`ALTER TABLE pipeline ADD COLUMN youtube_id TEXT DEFAULT ''`);
  } catch(e) {}

  try {
    db.exec(`ALTER TABLE app_settings ADD COLUMN is_dark_mode INTEGER DEFAULT 0`);
  } catch(e) {}

  // Initialize Scratchpad if empty
  const spRow = db.prepare('SELECT id FROM scratchpad LIMIT 1').get();
  if (!spRow) {
    db.prepare("INSERT INTO scratchpad (id, content) VALUES (1, 'Write A-roll script for next video\n- Draft outline\n- Write 5 hooks')").run();
  }
}


function handleSafe(channel, handler) {
  ipcMain.handle(channel, async (event, ...args) => {
    try {
      return await handler(event, ...args);
    } catch (e) {
      console.error(`Error in IPC ${channel}:`, e);
      throw e;
    }
  });
}

export function setupDb() {
  userDataPath = app.getPath('userData');
  loadConfig();
  
  const activeProfile = currentConfig.profiles.find(p => p.id === currentConfig.activeProfileId) || currentConfig.profiles[0];
  initDb(activeProfile.dbFilename);

  // Profile IPC Handlers
  handleSafe('get-profiles', () => {
    return currentConfig;
  });

  handleSafe('add-profile', (_, { name, avatar }) => {
    const newId = Date.now().toString();
    const dbFilename = `profile_${newId}.sqlite`;
    
    let avatarBase64 = '';
    if (avatar) {
      if (avatar.startsWith('data:')) {
        avatarBase64 = avatar;
      } else if (fs.existsSync(avatar)) {
        const ext = path.extname(avatar).toLowerCase();
        let mime = 'image/png';
        if (ext === '.jpg' || ext === '.jpeg') mime = 'image/jpeg';
        if (ext === '.webp') mime = 'image/webp';
        const buffer = fs.readFileSync(avatar);
        avatarBase64 = `data:${mime};base64,${buffer.toString('base64')}`;
      }
    }

    currentConfig.profiles.push({
      id: newId,
      name,
      avatar: avatarBase64,
      dbFilename
    });
    currentConfig.activeProfileId = newId;
    saveConfig();
    
    initDb(dbFilename);
    return currentConfig;
  });

  handleSafe('switch-profile', (_, id) => {
    const profile = currentConfig.profiles.find(p => p.id === id);
    if (profile) {
      currentConfig.activeProfileId = id;
      saveConfig();
      initDb(profile.dbFilename);
    }
    return currentConfig;
  });

  handleSafe('update-profile', (_, { id, name, avatar }) => {
    const profile = currentConfig.profiles.find(p => p.id === id);
    if (profile) {
      profile.name = name;
      if (avatar && avatar !== profile.avatar) {
        if (avatar.startsWith('data:')) {
          profile.avatar = avatar;
        } else if (fs.existsSync(avatar)) {
          const ext = path.extname(avatar).toLowerCase();
          let mime = 'image/png';
          if (ext === '.jpg' || ext === '.jpeg') mime = 'image/jpeg';
          if (ext === '.webp') mime = 'image/webp';
          const buffer = fs.readFileSync(avatar);
          profile.avatar = `data:${mime};base64,${buffer.toString('base64')}`;
        } else {
          profile.avatar = avatar;
        }
      }
      saveConfig();
    }
    return currentConfig;
  });

  handleSafe('delete-profile', (_, id) => {
    if (currentConfig.profiles.length <= 1) {
      throw new Error("Cannot delete the last remaining profile.");
    }
    
    const profileIndex = currentConfig.profiles.findIndex(p => p.id === id);
    if (profileIndex !== -1) {
      const profile = currentConfig.profiles[profileIndex];
      
      // Attempt to delete DB files to free space
      const dbPath = path.join(userDataPath, profile.dbFilename);
      if (fs.existsSync(dbPath)) {
        try { fs.unlinkSync(dbPath); } catch(e) {}
        try { fs.unlinkSync(dbPath + '-wal'); } catch(e) {}
        try { fs.unlinkSync(dbPath + '-shm'); } catch(e) {}
      }
      
      currentConfig.profiles.splice(profileIndex, 1);
      
      // If we deleted the active profile, switch to the first available one
      if (currentConfig.activeProfileId === id) {
        currentConfig.activeProfileId = currentConfig.profiles[0].id;
        initDb(currentConfig.profiles[0].dbFilename);
      }
      saveConfig();
    }
    return currentConfig;
  });

  // Data IPC Handlers for Active DB
  handleSafe('get-custom-targets', () => {
    return db.prepare('SELECT * FROM custom_targets').all();
  });

  handleSafe('get-targets', () => {
    return db.prepare('SELECT * FROM targets WHERE id = 1').get() || {
      long_form: 36,
      shorts: 70,
      subscribers: 1000,
      watch_hours: 4000,
      ctr: 5.0,
      retention_30s: 55.0,
      avg_view_duration: 35.0,
      completed_targets: '[]'
    };
  });

  handleSafe('add-custom-target', (_, data) => {
    const stmt = db.prepare(`
      INSERT INTO custom_targets (id, title, has_number, target_value, suffix, is_completed)
      VALUES (@id, @title, @has_number, @target_value, @suffix, @is_completed)
    `);
    return stmt.run(data).changes;
  });

  handleSafe('update-custom-target', (_, data) => {
    const stmt = db.prepare(`
      UPDATE custom_targets 
      SET title = @title,
          has_number = @has_number,
          target_value = @target_value,
          suffix = @suffix,
          is_completed = @is_completed
      WHERE id = @id
    `);
    return stmt.run(data).changes;
  });

  handleSafe('delete-custom-target', (_, id) => {
    return db.prepare('DELETE FROM custom_targets WHERE id = ?').run(id).changes;
  });

  handleSafe('get-pipeline', () => {
    return db.prepare('SELECT * FROM pipeline ORDER BY order_index ASC, id DESC').all();
  });

  handleSafe('add-pipeline', (_, data) => {
    const stmt = db.prepare(`
      INSERT INTO pipeline (title, type, status, priority, topic_cluster)
      VALUES (@title, @type, @status, @priority, @topic_cluster)
    `);
    return stmt.run(data).lastInsertRowid;
  });

  handleSafe('update-pipeline-status', (_, { id, status }) => {
    const stmt = db.prepare('UPDATE pipeline SET status = ? WHERE id = ?');
    return stmt.run(status, id).changes;
  });

  handleSafe('update-pipeline-item', (_, data) => {
    try {
      const stmt = db.prepare(`
        UPDATE pipeline 
        SET title = @title, 
            type = @type, 
            topic_cluster = @topic_cluster, 
            priority = @priority, 
            status = @status, 
            due_date = @due_date, 
            upload_date = @upload_date, 
            notes = @notes, 
            thumbnail_text = @thumbnail_text, 
            hook = @hook, 
            kpi_views = @kpi_views, 
            kpi_ctr = @kpi_ctr, 
            kpi_retention = @kpi_retention,
            attachments = @attachments,
            script_blocks = @script_blocks
        WHERE id = @id
      `);
      return stmt.run({
        id: data.id,
        title: data.title || '',
        type: data.type || '',
        topic_cluster: data.topic_cluster || '',
        priority: data.priority || 'Medium',
        status: data.status || 'Ideas',
        due_date: data.due_date || null,
        upload_date: data.upload_date || null,
        notes: data.notes || null,
        thumbnail_text: data.thumbnail_text || null,
        hook: data.hook || null,
        kpi_views: data.kpi_views || 0,
        kpi_ctr: data.kpi_ctr || 0,
        kpi_retention: data.kpi_retention || 0,
        attachments: typeof data.attachments === 'string' ? data.attachments : JSON.stringify(data.attachments || []),
        script_blocks: typeof data.script_blocks === 'string' ? data.script_blocks : JSON.stringify(data.script_blocks || [])
      }).changes;
    } catch (e) {
      console.error('Failed to update pipeline item:', e);
      throw e;
    }
  });
  handleSafe('reorder-pipeline', (_, orderedIds) => {
    const updateOrder = db.transaction((ids) => {
      const stmt = db.prepare('UPDATE pipeline SET order_index = ? WHERE id = ?');
      ids.forEach((id, index) => stmt.run(index, id));
    });
    updateOrder(orderedIds);
  });
  handleSafe('delete-pipeline', (_, id) => {
    const stmt = db.prepare('DELETE FROM pipeline WHERE id = ?');
    return stmt.run(id).changes;
  });

  handleSafe('open-file', async (_, filePath) => {
    const error = await shell.openPath(filePath);
    if (error) throw new Error(error);
    return true;
  });

  handleSafe('get-ideas', () => {
    return db.prepare('SELECT * FROM ideas ORDER BY search_score + browse_score + cpm_score DESC').all();
  });

  handleSafe('add-idea', (_, data) => {
    const stmt = db.prepare(`
      INSERT INTO ideas (title, topic_cluster, content_pillar, search_score, browse_score, cpm_score)
      VALUES (@title, @topic_cluster, @content_pillar, @search_score, @browse_score, @cpm_score)
    `);
    return stmt.run(data).lastInsertRowid;
  });

  handleSafe('delete-idea', (_, id) => {
    const stmt = db.prepare('DELETE FROM ideas WHERE id = ?');
    return stmt.run(id).changes;
  });

  handleSafe('get-reminders', () => {
    return db.prepare('SELECT * FROM reminders ORDER BY due_time ASC').all();
  });

  handleSafe('add-reminder', (_, data) => {
    const stmt = db.prepare(`
      INSERT INTO reminders (title, type, due_time)
      VALUES (@title, @type, @due_time)
    `);
    return stmt.run(data).lastInsertRowid;
  });

  handleSafe('delete-reminder', (_, id) => {
    const stmt = db.prepare('DELETE FROM reminders WHERE id = ?');
    return stmt.run(id).changes;
  });

  // Scratchpad
  handleSafe('get-scratchpad', () => {
    return db.prepare('SELECT content FROM scratchpad WHERE id = 1').get()?.content || '';
  });
  handleSafe('update-scratchpad', (_, content) => {
    const stmt = db.prepare('UPDATE scratchpad SET content = ? WHERE id = 1');
    return stmt.run(content).changes;
  });

  // Prompts
  handleSafe('get-prompts', () => {
    return db.prepare('SELECT * FROM prompts ORDER BY id DESC').all();
  });
  handleSafe('add-prompt', (_, data) => {
    const stmt = db.prepare('INSERT INTO prompts (title, category, content) VALUES (@title, @category, @content)');
    return stmt.run(data).lastInsertRowid;
  });
  handleSafe('delete-prompt', (_, id) => {
    const stmt = db.prepare('DELETE FROM prompts WHERE id = ?');
    return stmt.run(id).changes;
  });
  handleSafe('delete-analytics', (_, id) => {
    const stmt = db.prepare('DELETE FROM analytics WHERE id = ?');
    return stmt.run(id).changes;
  });

  handleSafe('clear-analytics', () => {
    const stmt = db.prepare('DELETE FROM analytics');
    return stmt.run().changes;
  });

  // Analytics
  handleSafe('get-analytics', () => {
    return db.prepare('SELECT * FROM analytics ORDER BY id DESC').all();
  });
  handleSafe('add-analytics', (_, data) => {
    const stmt = db.prepare(`
      INSERT INTO analytics (video_title, impressions, views, ctr, retention_30s, avg_view_duration, subscribers, date_added, suggestions)
      VALUES (@video_title, @impressions, @views, @ctr, @retention_30s, @avg_view_duration, @subscribers, @date_added, @suggestions)
    `);
    return stmt.run(data).lastInsertRowid;
  });

  // Import Data
  handleSafe('import-data', (_, parsedData) => {
    const importTx = db.transaction((data) => {
      // Clear tables
      db.prepare('DELETE FROM pipeline').run();
      db.prepare('DELETE FROM ideas').run();
      db.prepare('DELETE FROM reminders').run();
      db.prepare('DELETE FROM prompts').run();
      db.prepare('DELETE FROM analytics').run();
      
      if (data.targets) {
         db.prepare(`UPDATE targets SET long_form=?, shorts=?, subscribers=?, watch_hours=?, ctr=?, retention_30s=?, avg_view_duration=?, completed_targets=? WHERE id=1`).run(
           data.targets.long_form, data.targets.shorts, data.targets.subscribers, data.targets.watch_hours, data.targets.ctr, data.targets.retention_30s, data.targets.avg_view_duration, data.targets.completed_targets
         );
      }
      if (data.custom_targets) {
         db.prepare('DELETE FROM custom_targets').run();
         const insertCT = db.prepare('INSERT INTO custom_targets (id, title, has_number, target_value, suffix, is_completed) VALUES (?,?,?,?,?,?)');
         data.custom_targets.forEach(t => insertCT.run(t.id, t.title, t.has_number, t.target_value, t.suffix, t.is_completed));
      }
      if (data.scratchpad) {
         db.prepare('UPDATE scratchpad SET content=? WHERE id=1').run(data.scratchpad);
      }

      const insertPipeline = db.prepare('INSERT INTO pipeline (id, title, type, topic_cluster, priority, status, due_date, upload_date, notes, thumbnail_text, hook, kpi_views, kpi_ctr, kpi_retention) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
      (data.pipeline || []).forEach(r => insertPipeline.run(r.id, r.title, r.type, r.topic_cluster, r.priority, r.status, r.due_date, r.upload_date, r.notes, r.thumbnail_text, r.hook, r.kpi_views, r.kpi_ctr, r.kpi_retention));

      const insertIdeas = db.prepare('INSERT INTO ideas (id, title, topic_cluster, content_pillar, search_score, browse_score, cpm_score, difficulty_score, series_score, notes) VALUES (?,?,?,?,?,?,?,?,?,?)');
      (data.ideas || []).forEach(r => insertIdeas.run(r.id, r.title, r.topic_cluster, r.content_pillar, r.search_score, r.browse_score, r.cpm_score, r.difficulty_score, r.series_score, r.notes));

      const insertReminders = db.prepare('INSERT INTO reminders (id, title, type, due_time, is_completed) VALUES (?,?,?,?,?)');
      (data.reminders || []).forEach(r => insertReminders.run(r.id, r.title, r.type, r.due_time, r.is_completed));

      const insertPrompts = db.prepare('INSERT INTO prompts (id, title, category, content) VALUES (?,?,?,?)');
      (data.prompts || []).forEach(r => insertPrompts.run(r.id, r.title, r.category, r.content));

      const insertAnalytics = db.prepare('INSERT INTO analytics (id, video_title, impressions, views, ctr, retention_30s, avg_view_duration, subscribers, date_added, suggestions) VALUES (?,?,?,?,?,?,?,?,?,?)');
      (data.analytics || []).forEach(r => insertAnalytics.run(r.id, r.video_title, r.impressions, r.views, r.ctr, r.retention_30s, r.avg_view_duration, r.subscribers, r.date_added, r.suggestions));
    });

    importTx(parsedData);
    return true;
  });

  // App Settings
  handleSafe('get-app-version', () => {
    return app.getVersion();
  });
  handleSafe('get-app-settings', () => {
    return db.prepare('SELECT * FROM app_settings WHERE id = 1').get();
  });

  handleSafe('update-app-settings', (_, data) => {
    const stmt = db.prepare(`
      UPDATE app_settings 
      SET youtube_client_id = COALESCE(@youtube_client_id, youtube_client_id), 
          youtube_client_secret = COALESCE(@youtube_client_secret, youtube_client_secret),
          youtube_access_token = COALESCE(@youtube_access_token, youtube_access_token),
          youtube_refresh_token = COALESCE(@youtube_refresh_token, youtube_refresh_token),
          is_dark_mode = COALESCE(@is_dark_mode, is_dark_mode)
      WHERE id = 1
    `);
    const queryData = {
      youtube_client_id: data.youtube_client_id !== undefined ? data.youtube_client_id : null,
      youtube_client_secret: data.youtube_client_secret !== undefined ? data.youtube_client_secret : null,
      youtube_access_token: data.youtube_access_token !== undefined ? data.youtube_access_token : null,
      youtube_refresh_token: data.youtube_refresh_token !== undefined ? data.youtube_refresh_token : null,
      is_dark_mode: data.is_dark_mode !== undefined ? data.is_dark_mode : null,
    };
    return stmt.run(queryData).changes;
  });

  handleSafe('sync-youtube-video', async (_, { id, youtube_id }) => {
    const settings = db.prepare('SELECT * FROM app_settings WHERE id = 1').get();
    let accessToken = settings.youtube_access_token;
    const refreshToken = settings.youtube_refresh_token;

    if (!accessToken) {
      throw new Error('Not connected to YouTube');
    }

    try {
      // Test the token
      const testReq = await fetch('https://youtube.googleapis.com/youtube/v3/channels?part=id&mine=true', { headers: { Authorization: 'Bearer ' + accessToken } });
      if (testReq.status === 401 && refreshToken) {
        // Refresh token
        const newTokens = await refreshYoutubeToken(settings.youtube_client_id, settings.youtube_client_secret, refreshToken);
        if (newTokens.access_token) {
          accessToken = newTokens.access_token;
          db.prepare('UPDATE app_settings SET youtube_access_token = ? WHERE id = 1').run(accessToken);
        }
      }
      
      const analytics = await fetchYoutubeAnalytics(accessToken, youtube_id);
      const data = analytics[youtube_id] || { views: 0, averageViewDuration: 0 };
      
      // Since CTR is not natively provided easily without complex dimensions, we'll keep 0 or dummy for CTR and Retention
      // Wait, let's keep what we got
      const kpi_views = data.views || 0;
      // Convert avg view duration (seconds) to roughly retention if we assume 600s total length? 
      // We will just store averageViewDuration directly in kpi_retention since analytics uses it
      const kpi_retention = Math.round((data.averageViewDuration || 0) / 60); 

      const stmt = db.prepare(`
        UPDATE pipeline 
        SET youtube_id = @youtube_id,
            kpi_views = @kpi_views,
            kpi_retention = @kpi_retention
        WHERE id = @id
      `);
      
      stmt.run({
        id,
        youtube_id,
        kpi_views,
        kpi_retention
      });
      
      return {
        kpi_views,
        kpi_ctr: 0,
        kpi_retention
      };
    } catch (e) {
      console.error('YouTube Sync Error:', e);
      throw new Error('Failed to sync with YouTube API');
    }
  });
}
