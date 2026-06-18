import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  getProfiles: () => ipcRenderer.invoke('get-profiles'),
  addProfile: (data) => ipcRenderer.invoke('add-profile', data),
  switchProfile: (id) => ipcRenderer.invoke('switch-profile', id),
  updateProfile: (data) => ipcRenderer.invoke('update-profile', data),
  deleteProfile: (id) => ipcRenderer.invoke('delete-profile', id),

  getTargets: () => ipcRenderer.invoke('get-targets'),
  getCustomTargets: () => ipcRenderer.invoke('get-custom-targets'),
  addCustomTarget: (data) => ipcRenderer.invoke('add-custom-target', data),
  updateCustomTarget: (data) => ipcRenderer.invoke('update-custom-target', data),
  deleteCustomTarget: (id) => ipcRenderer.invoke('delete-custom-target', id),
  getPipeline: () => ipcRenderer.invoke('get-pipeline'),
  addPipelineItem: (data) => ipcRenderer.invoke('add-pipeline', data),
  updatePipelineStatus: (data) => ipcRenderer.invoke('update-pipeline-status', data),
  updatePipelineItem: (data) => ipcRenderer.invoke('update-pipeline-item', data),
  deletePipelineItem: (id) => ipcRenderer.invoke('delete-pipeline', id),
  reorderPipeline: (orderedIds) => ipcRenderer.invoke('reorder-pipeline', orderedIds),
  openFile: (filePath) => ipcRenderer.invoke('open-file', filePath),
  getIdeas: () => ipcRenderer.invoke('get-ideas'),
  addIdea: (data) => ipcRenderer.invoke('add-idea', data),
  deleteIdea: (id) => ipcRenderer.invoke('delete-idea', id),
  getReminders: () => ipcRenderer.invoke('get-reminders'),
  addReminder: (data) => ipcRenderer.invoke('add-reminder', data),
  deleteReminder: (id) => ipcRenderer.invoke('delete-reminder', id),
  getScratchpad: () => ipcRenderer.invoke('get-scratchpad'),
  updateScratchpad: (content) => ipcRenderer.invoke('update-scratchpad', content),
  getPrompts: () => ipcRenderer.invoke('get-prompts'),
  addPrompt: (data) => ipcRenderer.invoke('add-prompt', data),
  deletePrompt: (id) => ipcRenderer.invoke('delete-prompt', id),
  getAnalytics: () => ipcRenderer.invoke('get-analytics'),
  addAnalytics: (data) => ipcRenderer.invoke('add-analytics', data),
  deleteAnalytics: (id) => ipcRenderer.invoke('delete-analytics', id),
  importData: (data) => ipcRenderer.invoke('import-data', data),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getAppSettings: () => ipcRenderer.invoke('get-app-settings'),
  updateAppSettings: (data) => ipcRenderer.invoke('update-app-settings', data),
  sendNotification: (title, body) => ipcRenderer.send('send-notification', { title, body }),
  startYoutubeOauth: (keys) => ipcRenderer.invoke('start-youtube-oauth', keys),
  fetchYoutubeData: (token) => ipcRenderer.invoke('fetch-youtube-data', token),
  fetchYoutubeAnalytics: (token, videoIds) => ipcRenderer.invoke('fetch-youtube-analytics', { accessToken: token, videoIds }),
  syncYoutubeVideo: (data) => ipcRenderer.invoke('sync-youtube-video', data),
  clearAnalytics: () => ipcRenderer.invoke('clear-analytics')
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    // contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  window.electron = electronAPI
  // window.api = api
}
