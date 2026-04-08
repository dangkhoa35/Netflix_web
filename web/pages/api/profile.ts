import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../libs/prismadb";
import serverAuth from "../../libs/serverAuth";
import { isAdminEmail } from "../../libs/adminAuth";

const ALLOWED_ORIGINS = new Set(["http://localhost:3000", "http://localhost:3002"]);

// CORS configuration
const setCors = (req: NextApiRequest, res: NextApiResponse) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Apply CORS
    setCors(req, res);

    // Handle OPTIONS request
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }

    // Only allow GET and PATCH
    if (req.method !== "GET" && req.method !== "PATCH") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const authResult = await serverAuth(req, res);
    if (!authResult) {
      // serverAuth already sent response
      return;
    }
    
    const currentUser = authResult.currentUser;

    // Validate current user
    if (!currentUser || !currentUser.id) {
      console.error('Invalid currentUser:', currentUser);
      return res.status(401).json({ error: "Invalid user session" });
    }

    // GET: Fetch current user profile
    if (req.method === "GET") {
      try {
        const user = await prisma.user.findUnique({
          where: { id: currentUser.id },
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            createdAt: true,
          },
        });

        if (!user) {
          console.error('User not found in DB:', currentUser.id);
          return res.status(404).json({ error: "User not found in database" });
        }

        // Ensure all required fields exist
        if (!user.name || !user.email) {
          console.warn('User missing name or email:', user);
          return res.status(500).json({ 
            error: "User profile incomplete - missing name or email",
            user: user 
          });
        }

        return res.status(200).json(user);
      } catch (dbError) {
        console.error('Database error in GET /api/profile:', dbError);
        return res.status(500).json({ 
          error: "Database error fetching profile",
          message: dbError instanceof Error ? dbError.message : 'Unknown error'
        });
      }
    }

    // PATCH: Update user profile (admin only)
    if (req.method === "PATCH") {
      // Verify admin
      if (!isAdminEmail(currentUser.email)) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { name, image } = req.body;
      const updateData: any = {};

      // Validate and update name if provided
      if (name !== undefined) {
        if (!name || typeof name !== "string") {
          return res.status(400).json({ error: "Name is required" });
        }

        const trimmedName = name.trim();
        if (trimmedName.length < 2) {
          return res.status(400).json({ error: "Name must be at least 2 characters" });
        }

        if (trimmedName.length > 100) {
          return res.status(400).json({ error: "Name must not exceed 100 characters" });
        }

        updateData.name = trimmedName;
      }

      // Validate and update image if provided
      if (image !== undefined) {
        if (typeof image !== "string") {
          return res.status(400).json({ error: "Invalid image format" });
        }

        // Basic validation: should be a data URL or URL
        if (!image.startsWith("data:") && !image.startsWith("http")) {
          return res.status(400).json({ error: "Invalid image URL" });
        }

        // Check file size (base64 rough estimate: 4/3 * length ≈ bytes)
        const estimatedSizeInMB = (image.length * 3) / 4 / 1024 / 1024;
        if (estimatedSizeInMB > 5) {
          return res.status(400).json({ error: "Image must be less than 5MB" });
        }

        updateData.image = image;
      }

      // Ensure at least one field is being updated
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: "No fields to update" });
      }

      // Update user
      const updatedUser = await prisma.user.update({
        where: { id: currentUser.id },
        data: updateData,
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          createdAt: true,
        },
      });

      return res.status(200).json({
        ...updatedUser,
        message: "Profile updated successfully",
      });
    }
  } catch (error) {
    console.error("Profile API error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
