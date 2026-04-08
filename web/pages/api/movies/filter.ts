// import {NextApiRequest, NextApiResponse} from "next";
// import {prisma} from "../../../libs/prismadb";
// import serverAuth from "../../../libs/serverAuth";


// export default async function handler(req: NextApiRequest, res: NextApiResponse){
//     if(req.method !== "GET"){
//         return res.status(405).end();
//     }
//     try {
//         await serverAuth(req, res);
        
//         const { type, category, page = 1, limit = 20 } = req.query;
//         const pageNum = parseInt(page as string) || 1;
//         const limitNum = parseInt(limit as string) || 20;
//         const skip = (pageNum - 1) * limitNum;

//         let where: any = { status: "published" };

//         // Filter by type
//         if (type === 'series') {
//             // Series: movies with categories containing certain keywords
//             where.OR = [
//                 { categories: { has: "Series" } },
//                 { categories: { has: "Hành động" } },
//                 { categories: { has: "Tâm lý" } },
//                 { categories: { has: "Tình cảm" } },
//             ];
//         } else if (type === 'films') {
//             // Films: movies that are not series
//             where.categories = { hasNot: "Series" };
//         } else if (type === 'new') {
//             // New & Popular: recently created (last 30 days)
//             const thirtyDaysAgo = new Date();
//             thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
//             where.createdAt = { gte: thirtyDaysAgo };
//         } else if (type === 'favorites') {
//             // This will be handled separately with user favorites
//             return res.status(400).json({ error: 'Use /api/favorites for favorites' });
//         }

//         // Filter by category if provided
//         if (category && typeof category === 'string') {
//             where.categories = { has: category };
//         }

//         const [movies, total] = await Promise.all([
//             prisma.movie.findMany({
//                 where,
//                 orderBy: { createdAt: 'desc' },
//                 skip: skip,
//                 take: limitNum
//             }),
//             prisma.movie.count({ where })
//         ]);

//         // Normalize movies
//         const normalizedMovies = movies.map(movie => ({
//             ...movie,
//             genre: movie?.categories?.join(', ') || '',
//             thumbnailUrl: movie?.imageUrl || (movie as any)?.thumbnailUrl,
//             posterUrl: movie?.imageUrl || (movie as any)?.posterUrl,
//             backdropUrl: movie?.imageUrl || (movie as any)?.backdropUrl,
//         }));

//         return res.status(200).json({
//             data: normalizedMovies,
//             pagination: {
//                 total,
//                 page: pageNum,
//                 limit: limitNum,
//                 totalPages: Math.ceil(total / limitNum)
//             }
//         });

//     } catch (error) {
//         console.log(error);
//         return res.status(400).json([]);
//     }
// }
