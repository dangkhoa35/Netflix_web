import type { NextApiRequest, NextApiResponse } from "next";
import { syncCanonicalFavoriteIds } from "../../libs/canonicalFavorites";
import serverAuth from "../../libs/serverAuth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "GET") return res.status(405).end();

    const authResult = await serverAuth(req, res);
    if (!authResult) return;
    const { currentUser } = authResult;

    const { favoriteIds } = await syncCanonicalFavoriteIds({
      email: currentUser.email,
      favoriteIds: currentUser.favoriteIds ?? [],
    });

    return res.status(200).json({
      ...currentUser,
      favoriteIds,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
