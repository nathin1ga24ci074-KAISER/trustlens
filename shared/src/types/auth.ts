import { User } from './user';

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user: User;
  token?: string;
}

export interface AuthSessionResponse {
  authenticated: boolean;
  user: User | null;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  errors?: Array<{ field?: string; message: string }>;
}
