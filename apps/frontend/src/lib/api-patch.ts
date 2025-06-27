// Patch temporaire pour ajouter les méthodes HTTP manquantes à l'API
import { api } from './api'
import { AxiosRequestConfig, AxiosResponse } from 'axios'

// Étendre l'instance API avec les méthodes HTTP manquantes
const originalApi = api as any

// Ajouter les méthodes HTTP si elles n'existent pas
if (!originalApi.get) {
  originalApi.get = function<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.get<T>(url, config)
  }
}

if (!originalApi.post) {
  originalApi.post = function<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.post<T>(url, data, config)
  }
}

if (!originalApi.put) {
  originalApi.put = function<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.put<T>(url, data, config)
  }
}

if (!originalApi.delete) {
  originalApi.delete = function<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.delete<T>(url, config)
  }
}

if (!originalApi.patch) {
  originalApi.patch = function<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.patch<T>(url, data, config)
  }
}

export { originalApi as api }
