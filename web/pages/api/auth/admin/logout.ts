import { NextApiRequest, NextApiResponse } from 'next';

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
    res.setHeader('Set-Cookie', 'adminToken=; Path=/; Max-Age=0; SameSite=Lax');
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('[Admin Logout]', error);
    return res.status(500).json({ error: 'Logout failed' });
  }
}
