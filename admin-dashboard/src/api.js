import axios from 'axios';

const API_BASE = '/api';

const api = axios.create({
  baseURL: API_BASE,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('admin_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const login = (username, password) =>
  api.post('/auth/login', { username, password });

export const verifyToken = () =>
  api.get('/auth/verify');

// Puzzles
export const getAllPuzzles = () =>
  api.get('/puzzles/admin/all');

export const getPuzzle = (id) =>
  api.get(`/puzzles/admin/${id}`);

export const generatePreview = (words, gridSize = 15) =>
  api.post('/puzzles/admin/generate', { words, gridSize });

export const createPuzzle = (data) =>
  api.post('/puzzles/admin/create', data);

export const updatePuzzle = (id, data) =>
  api.put(`/puzzles/admin/${id}`, data);

export const publishPuzzle = (id) =>
  api.post(`/puzzles/admin/${id}/publish`);

export const unpublishPuzzle = (id) =>
  api.post(`/puzzles/admin/${id}/unpublish`);

export const deletePuzzle = (id) =>
  api.delete(`/puzzles/admin/${id}`);

export default api;
