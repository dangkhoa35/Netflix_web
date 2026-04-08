import { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminJWT } from './adminJwt';

export interface AdminRequest extends NextApiRequest {
  admin?: {
    id: string;
    email: string;
    name?: string;
  };
}

/**
 * Middleware to verify admin JWT token from Authorization header
 * Set req.admin with admin data if token is valid
 */
export const adminAuth = async (req: AdminRequest, res: NextApiResponse): Promise<boolean> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      res.status(401).json({ error: 'No admin token provided' });
      return false;
    }

    const payload = verifyAdminJWT(token);
    if (!payload) {
      res.status(401).json({ error: 'Invalid or expired admin token' });
      return false;
    }

    req.admin = payload;
    return true;
  } catch (error) {
    console.error('Admin auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
    return false;
  }
};
