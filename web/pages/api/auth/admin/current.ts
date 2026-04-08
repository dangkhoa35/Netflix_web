import { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminJWT } from '@/libs/adminJwt';
import { getAdminUserModel } from '@/libs/adminUserModel';

const setCors = (req: NextApiRequest, res: NextApiResponse) => {
  const origin = req.headers.origin;
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  setCors(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const adminUsers = getAdminUserModel();
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(401).json({ error: 'No token' });
    }

    const payload = verifyAdminJWT(token);
    if (!payload) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const adminUser = await adminUsers.findUnique({
      where: { id: payload.id },
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

    return res.status(200).json({ success: true, admin: adminUser });
  } catch (error) {
    console.error('[Admin Current]', error);
    return res.status(500).json({ error: 'Error' });
  }
}
