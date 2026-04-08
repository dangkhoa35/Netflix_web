import jwt, { type SignOptions } from 'jsonwebtoken';

const JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'admin-secret-key-change-in-production';

export interface AdminJWTPayload {
  id: string;
  email: string;
  name?: string;
}

export const signAdminJWT = (
  payload: AdminJWTPayload,
  expiresIn: SignOptions['expiresIn'] = '7d',
): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
};

export const verifyAdminJWT = (token: string): AdminJWTPayload | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AdminJWTPayload;
    return decoded;
  } catch (error) {
    return null;
  }
};

export const decodeAdminJWT = (token: string): AdminJWTPayload | null => {
  try {
    const decoded = jwt.decode(token) as AdminJWTPayload | null;
    return decoded;
  } catch (error) {
    return null;
  }
};
