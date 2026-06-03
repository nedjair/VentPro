// Patch temporaire pour ajouter les méthodes HTTP manquantes à l'API
import { api } from './api'
import { AxiosRequestConfig, AxiosResponse } from 'axios'

// Étendre l'instance API avec les méthodes HTTP manquantes
const originalApi = api as any

// Ajouter les méthodes HTTP si elles n'existent pas
if (!originalApi.get) {
  originalApi.get = function<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.get(url, config) as Promise<AxiosResponse<T>>
  }
}

if (!originalApi.post) {
  originalApi.post = function<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.post(url, data, config) as Promise<AxiosResponse<T>>
  }
}

if (!originalApi.put) {
  originalApi.put = function<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.put(url, data, config) as Promise<AxiosResponse<T>>
  }
}

if (!originalApi.delete) {
  originalApi.delete = function<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.delete(url, config) as Promise<AxiosResponse<T>>
  }
}

if (!originalApi.patch) {
  originalApi.patch = function<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.patch(url, data, config) as Promise<AxiosResponse<T>>
  }
}

export { originalApi as api }
