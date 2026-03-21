import axios from 'axios';
import { ENV } from './env';
import { supabase } from './supabase';
import { useAuthStore } from '../store/authStore';

export const api = axios.create({
  baseURL: ENV.API_BASE_URL,
  timeout: 20_000,
});

api.interceptors.request.use(async (config) => {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err?.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(err);
  },
);

