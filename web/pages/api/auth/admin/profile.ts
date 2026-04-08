import { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminJWT } from '@/libs/adminJwt';
import { getAdminUserModel } from '@/libs/adminUserModel';

const setCors = (req: NextApiRequest, res: NextApiResponse) => {
  const origin = req.headers.origin;
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Vary', 'Origin');
};

const getAdminId = (req: NextApiRequest) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return null;

  const payload = verifyAdminJWT(token);
  return payload?.id || null;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  setCors(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET' && req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const adminUsers = getAdminUserModel();
    const adminId = getAdminId(req);
    if (!adminId) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    if (req.method === 'GET') {
      const adminUser = await adminUsers.findUnique({
        where: { id: adminId },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
          lastLogin: true,
        },
      });

      if (!adminUser) {
        return res.status(404).json({ error: 'Admin not found' });
      }

      return res.status(200).json({
        ...adminUser,
        name: adminUser.name || adminUser.email.split('@')[0],
      });
    }

    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    if (name.length < 2) {
      return res.status(400).json({ error: 'Name must be at least 2 characters' });
    }
    if (name.length > 100) {
      return res.status(400).json({ error: 'Name must not exceed 100 characters' });
    }

    const adminUser = await adminUsers.update({
      where: { id: adminId },
      data: { name },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        lastLogin: true,
      },
    });

    return res.status(200).json(adminUser);
  } catch (error) {
    console.error('[Admin Profile]', error);
    return res.status(500).json({ error: 'Failed to handle admin profile' });
  }
}
