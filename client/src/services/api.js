import axios from 'axios';

// Generate or retrieve unique device ID for guest users
const getDeviceId = () => {
  let deviceId = localStorage.getItem('ican_device_id');
  if (!deviceId) {
    deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('ican_device_id', deviceId);
  }
  return deviceId;
};

// Get auth token if exists
const getAuthToken = () => {
  return localStorage.getItem('ican_auth_token');
};

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 60000 // 60 seconds default timeout
});

// Add auth token and device ID to every request
api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  config.headers['X-Device-ID'] = getDeviceId();
  return config;
});

// Auth APIs
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  changePassword: (data) => api.post('/auth/change-password', data),

  // Token management
  setToken: (token) => localStorage.setItem('ican_auth_token', token),
  getToken: () => localStorage.getItem('ican_auth_token'),
  removeToken: () => localStorage.removeItem('ican_auth_token'),
  isAuthenticated: () => !!localStorage.getItem('ican_auth_token')
};

// Student APIs
export const studentAPI = {
  getCurrent: () => api.get('/students/current'),
  create: (data) => api.post('/students', data),
  update: (id, data) => api.put(`/students/${id}`, data),
  getHistory: (id) => api.get(`/students/${id}/history`),
  getProgress: (id) => api.get(`/students/${id}/progress`),
  analyze: (id) => api.post(`/students/${id}/analyze`)
};

// Simulation APIs
export const simulationAPI = {
  start: (data) => api.post('/simulations/start', data),
  get: (id) => api.get(`/simulations/${id}`),
  submitAnswer: (id, data) => api.post(`/simulations/${id}/answer`, data),
  completeSection: (id, data) => api.post(`/simulations/${id}/complete-section`, data),
  submitWriting: (id, data) => api.post(`/simulations/${id}/writing`, data),
  submitSpeaking: (id, data) => api.post(`/simulations/${id}/speaking`, data),
  complete: (id) => api.post(`/simulations/${id}/complete`),
  getResults: (id) => api.get(`/simulations/${id}/results`)
};

// AI APIs
export const aiAPI = {
  generateReading: (data) => api.post('/ai/generate/reading', data),
  generateFullReading: (data) => api.post('/ai/generate/reading/full', data, { timeout: 180000 }), // 3 min for full test
  generateListening: (data) => api.post('/ai/generate/listening', data, { timeout: 90000 }), // 90 sec for questions
  generateAudio: (data) => api.post('/ai/generate/audio', data, {
    responseType: 'blob',
    timeout: 120000 // 2 minutes for audio generation (Part 3/4 can be longer)
  }),
  generateWriting: (data) => api.post('/ai/generate/writing', data),
  evaluateWriting: (data) => api.post('/ai/evaluate/writing', data),
  generateSpeaking: (data) => api.post('/ai/generate/speaking', data),
  evaluateSpeaking: (data) => api.post('/ai/evaluate/speaking', data),
  explain: (data) => api.post('/ai/explain', data),
  generatePractice: (data) => api.post('/ai/generate/practice', data)
};

// Config APIs
export const configAPI = {
  setOpenAIKey: (apiKey) => api.post('/config/openai', { apiKey })
};

// TTS APIs (Edge TTS - free neural voices)
export const ttsAPI = {
  // Generate speech audio
  speak: (text, voice = 'en-GB-SoniaNeural', rate = '-5%') => api.post('/tts/speak', { text, voice, rate }, {
    responseType: 'blob',
    timeout: 120000 // 2 minutes for longer texts
  }),

  // Get available voices
  getVoices: () => api.get('/tts/voices'),

  // Test voice
  testVoice: (voice) => api.post('/tts/test', { voice }, {
    responseType: 'blob',
    timeout: 30000
  })
};

export default api;
