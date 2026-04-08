import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../libs/prismadb';

const BACKEND_API_URL = process.env.BACKEND_API_URL || 'http://localhost:5000';
const ALLOWED_ORIGINS = new Set(['http://localhost:3000', 'http://localhost:3002']);

const setCors = (req: NextApiRequest, res: NextApiResponse) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  setCors(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { q } = req.query;
    if (!q || typeof q !== 'string' || q.trim().length === 0) {
      return res.status(400).json({ error: 'Query parameter required' });
    }

    try {
      const searchUrl = `${BACKEND_API_URL}/api/movies?search=${encodeURIComponent(q)}&limit=10`;
      const response = await fetch(searchUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Backend API error: ${response.status}`);
      }

      const data = await response.json();
      const movies = Array.isArray(data) ? data : (data.data || []);
      return res.status(200).json(movies);
    } catch (_backendError) {
      const movies = await prisma.movie.findMany({
        where: {
          status: 'published',
          title: { contains: q, mode: 'insensitive' },
        },
        take: 10,
        orderBy: { title: 'asc' },
      });

      return res.status(200).json(movies);
    }
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ 
      error: 'Search failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
