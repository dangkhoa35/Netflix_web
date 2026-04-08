import { NextApiRequest, NextApiResponse } from 'next';
import { adminAuth } from './adminAuthMiddleware';
import serverAuth from './serverAuth';
import { isAdminEmail } from './adminAuth';

/**
 * Verify request as admin - accepts either admin JWT or user session with admin email
 */
export const verifyAdminAccess = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    // Try admin JWT token first
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const { verifyAdminJWT } = require('./adminJwt');
      const payload = verifyAdminJWT(token);
      if (payload) {
        return payload; // Admin verified
      }
    }

    // Fall back to user session with admin email
    const userSession = await serverAuth(req, res);
    if (!userSession) {
      return null;
    }

    if (isAdminEmail(userSession.currentUser.email)) {
      return {
        id: userSession.currentUser.id,
        email: userSession.currentUser.email,
        name: userSession.currentUser.name,
      };
    }

    return null;
  } catch (error) {
    console.error('Admin verify error:', error);
    return null;
  }
};
