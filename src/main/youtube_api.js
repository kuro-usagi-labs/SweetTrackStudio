const { shell } = require('electron');
const http = require('http');
const url = require('url');

// We use native fetch available in Node 18+

let authServer = null;

export async function startOAuthFlow(customClientId, customClientSecret) {
  return new Promise((resolve, reject) => {
    // Built-in SweetTrack Studio Google Cloud OAuth Credentials
    const clientId = customClientId || '';
    const clientSecret = customClientSecret || '';

    if (!clientId || !clientSecret) {
      return reject(new Error('Missing Client ID or Secret'));
    }

    const redirectUri = 'http://localhost:31415/oauth2callback';
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${clientId}&` +
      `redirect_uri=${redirectUri}&` +
      `response_type=code&` +
      `scope=https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/yt-analytics.readonly&` +
      `access_type=offline&` +
      `prompt=consent`;

    // Open browser for authentication
    shell.openExternal(authUrl);

    // Create temporary local server to catch the callback
    if (authServer) {
      authServer.close();
    }

    authServer = http.createServer(async (req, res) => {
      try {
        const reqUrl = new URL(req.url, 'http://localhost:31415');
        if (reqUrl.pathname === '/oauth2callback') {
          const code = reqUrl.searchParams.get('code');
          if (code) {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`<html><body><h1>Authentication Successful!</h1><p>You can close this window and return to SweetTrack Studio.</p><script>window.close()</script></body></html>`);
            authServer.close();
            authServer = null;

            // Exchange code for tokens
            const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: new URLSearchParams({
                code: code,
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: redirectUri,
                grant_type: 'authorization_code'
              })
            });

            if (!tokenResponse.ok) {
              throw new Error('Failed to exchange token');
            }

            const tokenData = await tokenResponse.json();
            resolve(tokenData);
          } else {
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end('Authentication failed: No code returned');
            reject(new Error('Authentication failed: No code returned'));
            authServer.close();
          }
        }
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Server Error: ' + err.message);
        reject(err);
        authServer.close();
      }
    });

    authServer.listen(31415, () => {
      console.log('Listening on port 31415 for OAuth callback...');
    });
  });
}

export async function fetchYoutubeData(accessToken) {
  // Fetch latest 5 videos using Search & Videos API
  const searchRes = await fetch(`https://youtube.googleapis.com/youtube/v3/search?part=snippet&forMine=true&type=video&order=date&maxResults=5`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!searchRes.ok) throw new Error('Failed to fetch videos');
  const searchData = await searchRes.json();
  const videoIds = searchData.items.map(item => item.id.videoId).join(',');

  if (!videoIds) return [];

  // Fetch detailed public stats for those videos
  const videosRes = await fetch(`https://youtube.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoIds}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const videosData = await videosRes.json();

  const mappedData = videosData.items.map(v => ({
    id: v.id,
    title: v.snippet.title,
    publishedAt: v.snippet.publishedAt,
    views: parseInt(v.statistics.viewCount || '0'),
    likes: parseInt(v.statistics.likeCount || '0'),
    comments: parseInt(v.statistics.commentCount || '0'),
  }));

  return mappedData;
}

export async function fetchYoutubeAnalytics(accessToken, videoIds) {
  // We need the channel ID first
  const channelRes = await fetch('https://youtube.googleapis.com/youtube/v3/channels?part=id&mine=true', {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const channelData = await channelRes.json();
  const channelId = channelData.items?.[0]?.id;
  if (!channelId) throw new Error('No channel found');

  // Format YYYY-MM-DD
  const today = new Date().toISOString().split('T')[0];
  const lastYear = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Fetch Analytics for those videos
  // metrics: views, estimatedMinutesWatched, averageViewDuration, subscribersGained, annotationClickThroughRate, etc.
  // Note: True impressions & CTR are not natively fully supported by standard analytics dimensions for specific videos via API without specific scopes, but we can get averageViewDuration and views.
  const analyticsRes = await fetch(`https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==MINE&startDate=${lastYear}&endDate=${today}&metrics=views,averageViewDuration,subscribersGained&dimensions=video&filters=video==${videoIds}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  
  if (!analyticsRes.ok) throw new Error('Failed to fetch analytics');
  const analyticsData = await analyticsRes.json();

  const analyticsMap = {};
  if (analyticsData.rows) {
    analyticsData.rows.forEach(row => {
      analyticsMap[row[0]] = {
        views: row[1],
        avgViewDuration: row[2], // in seconds
        subscribers: row[3]
      };
    });
  }

  return analyticsMap;
}




export async function refreshYoutubeToken(customClientId, customClientSecret, refreshToken) {
  const clientId = customClientId || '';
  const clientSecret = customClientSecret || '';
  
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    })
  });
  
  if (!response.ok) {
    throw new Error('Failed to refresh YouTube token');
  }
  
  return await response.json();
}
