import { RegisterInput, LoginInput, User } from '@trustlens/shared';
import { userService } from './user.service';
import { hashPassword, comparePassword } from '../utils/password';
import { signToken } from '../utils/jwt';

export class AuthConflictError extends Error {
  statusCode = 409;
  constructor(message = 'An account with this email address already exists.') {
    super(message);
    this.name = 'AuthConflictError';
  }
}

export class InvalidCredentialsError extends Error {
  statusCode = 401;
  constructor(message = 'Invalid email or password.') {
    super(message);
    this.name = 'InvalidCredentialsError';
  }
}

export interface AuthResult {
  user: User;
  token: string;
}

class AuthService {
  /**
   * Register a new user account
   */
  async register(input: RegisterInput): Promise<AuthResult> {
    const normalizedEmail = input.email.trim().toLowerCase();

    // Prevent duplicate email registrations
    const existing = await userService.findByEmail(normalizedEmail);
    if (existing) {
      throw new AuthConflictError('An account with this email already exists.');
    }

    // Securely hash password
    const passwordHash = await hashPassword(input.password);

    // Persist user record
    const user = await userService.create({
      name: input.name,
      email: normalizedEmail,
      passwordHash,
    });

    // Create session JWT
    const token = signToken({
      userId: user.id,
      email: user.email,
      name: user.name,
    });

    return { user, token };
  }

  /**
   * Authenticate an existing user with email and password
   */
  async login(input: LoginInput): Promise<AuthResult> {
    const normalizedEmail = input.email.trim().toLowerCase();

    // Look up user record including hash
    const rawUser = await userService.findRawByEmail(normalizedEmail);
    if (!rawUser) {
      // Intentionally uniform error message to prevent account enumeration
      throw new InvalidCredentialsError('Invalid email or password.');
    }

    // Verify password hash
    const isValid = await comparePassword(input.password, rawUser.passwordHash);
    if (!isValid) {
      throw new InvalidCredentialsError('Invalid email or password.');
    }

    const user: User = {
      id: rawUser.id,
      name: rawUser.name,
      email: rawUser.email,
      createdAt: rawUser.createdAt instanceof Date ? rawUser.createdAt.toISOString() : String(rawUser.createdAt),
      updatedAt: rawUser.updatedAt instanceof Date ? rawUser.updatedAt.toISOString() : String(rawUser.updatedAt),
    };

    // Create session JWT
    const token = signToken({
      userId: user.id,
      email: user.email,
      name: user.name,
    });

    return { user, token };
  }
}

export const authService = new AuthService();
