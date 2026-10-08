import { RegisterInput, LoginInput, AuthResponse, User } from '@trustlens/shared';

const API_BASE = '/api';

class ApiService {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('trustlens_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('trustlens_token', token);
    } else {
      localStorage.removeItem('trustlens_token');
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include', // Support HTTP-only cookies
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message = data.message || `Request failed with status ${response.status}`;
      const error: any = new Error(message);
      error.status = response.status;
      error.errors = data.errors;
      throw error;
    }

    return data as T;
  }

  // Auth Methods
  async register(input: RegisterInput): Promise<AuthResponse> {
    const data = await this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    if (data.token) {
      this.setToken(data.token);
    }
    return data;
  }

  async login(input: LoginInput): Promise<AuthResponse> {
    const data = await this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    if (data.token) {
      this.setToken(data.token);
    }
    return data;
  }

  async logout(): Promise<void> {
    try {
      await this.request<{ success: boolean }>('/auth/logout', {
        method: 'POST',
      });
    } finally {
      this.setToken(null);
    }
  }

  async getMe(): Promise<{ success: boolean; user: User }> {
    return this.request<{ success: boolean; user: User }>('/auth/me', {
      method: 'GET',
    });
  }

  async checkHealth(): Promise<{ status: string }> {
    return this.request<{ status: string }>('/health', {
      method: 'GET',
    });
  }
}

export const api = new ApiService();
