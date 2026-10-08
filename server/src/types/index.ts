import { Request } from 'express';
import { User } from '@trustlens/shared';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}
