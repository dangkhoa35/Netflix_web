import { NextApiRequest, NextApiResponse } from 'next';
import { comparePassword, hashPassword } from '@/libs/adminPassword';
import { signAdminJWT } from '@/libs/adminJwt';
import { isAdminEmail } from '@/libs/adminAuth';
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

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const adminUsers = getAdminUserModel();
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    if (!isAdminEmail(email)) {
      return res.status(403).json({ error: 'Not authorized as admin' });
    }

    let adminUser = await adminUsers.findUnique({
      where: { email },
    });

    if (!adminUser) {
      // First login - create admin account
      const hashedPassword = await hashPassword(password);
      adminUser = await adminUsers.create({
        data: {
          email,
          hashedPassword,
          name: email.split('@')[0],
        },
      });
    } else {
      // Verify password
      const valid = await comparePassword(password, adminUser.hashedPassword);
      if (!valid) {
        return res.status(401).json({ error: 'Invalid password' });
      }
    }

    // Update last login
    await adminUsers.update({
      where: { id: adminUser.id },
      data: { lastLogin: new Date() },
    });

    const token = signAdminJWT({
      id: adminUser.id,
      email: adminUser.email,
      name: adminUser.name ?? undefined,
    });

    return res.status(200).json({
      success: true,
      token,
      admin: {
        id: adminUser.id,
        email: adminUser.email,
        name: adminUser.name,
      },
    });
  } catch (error) {
    console.error('[Admin Login]', error);
    return res.status(500).json({ error: 'Login failed' });
  }
}
