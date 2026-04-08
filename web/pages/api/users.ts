import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../libs/prismadb";
import { verifyAdminAccess } from "@/libs/adminVerify";

const BACKEND_API_URL = process.env.BACKEND_API_URL || "http://localhost:5000";

const setCors = (req: NextApiRequest, res: NextApiResponse) => {
  const origin = req.headers.origin;
  res.setHeader("Access-Control-Allow-Origin", origin || "*");
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
};

const buildQueryString = (query: NextApiRequest["query"]) => {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((v) => params.append(key, String(v)));
      return;
    }
    if (value !== undefined && value !== null) {
      params.append(key, String(value));
    }
  });
  return params.toString();
};

const fetchFromLocalDb = async (req: NextApiRequest) => {
  const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? "20"), 10) || 20));
  const skip = (page - 1) * limit;
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";

  const where: Record<string, any> = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        createdAt: true,
        favoriteIds: true,
      },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    data: users.map((user) => ({
      ...user,
      favoriteIds: Array.isArray(user.favoriteIds) ? user.favoriteIds : [],
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  setCors(req, res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const admin = await verifyAdminAccess(req, res);
  if (!admin) return;

  try {
    const queryString = buildQueryString(req.query);
    const url = `${BACKEND_API_URL}/api/users${queryString ? `?${queryString}` : ""}`;
    const response = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status}`);
    }

    const payload = await response.json();
    return res.status(200).json(payload);
  } catch (backendError) {
    try {
      const fallback = await fetchFromLocalDb(req);
      res.setHeader("x-data-source", "web-prisma-fallback");
      return res.status(200).json(fallback);
    } catch (fallbackError) {
      console.error("Error fetching users (backend + fallback):", backendError, fallbackError);
      return res.status(500).json({
        error: "Failed to fetch users",
        message:
          fallbackError instanceof Error
            ? fallbackError.message
            : backendError instanceof Error
              ? backendError.message
              : "Unknown error",
      });
    }
  }
}
