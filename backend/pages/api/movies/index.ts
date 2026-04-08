import type { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (req.method === 'GET') {
      const movies = await prisma.movie.findMany({
        include: {
          genre: true,
        },
      })
      res.status(200).json(movies)
    } else if (req.method === 'POST') {
      const { title, description, videoUrl, thumbnailUrl, genreId } = req.body

      const movie = await prisma.movie.create({
        data: {
          title,
          description,
          videoUrl,
          thumbnailUrl,
          genreId,
        },
        include: {
          genre: true,
        },
      })
      res.status(201).json(movie)
    } else {
      res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' })
  }
}
