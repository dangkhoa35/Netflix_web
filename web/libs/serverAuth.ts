import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";

import { prisma } from './prismadb';
import { authOptions } from './authOptions';

const serverAuth = async (req: NextApiRequest, res: NextApiResponse) => {
  const session = await getServerSession(req, res, authOptions);

  if (!session?.user?.email) {
    res.status(401).json({ error: 'Not signed in' });
    return null;
  }

  const currentUser = await prisma.user.findUnique({
    where: {
      email: session.user.email,
    },
    select: {
      id: true,
      createdAt: true,
      email: true,
      emailVerified: true,
      favoriteIds: true,
      image: true,
      name: true,
      updatedAt: true
    }
  });
  
  if (!currentUser) {
    res.status(401).json({ error: 'Not signed in' });
    return null;
  }

  return { currentUser };
}

export default serverAuth;
