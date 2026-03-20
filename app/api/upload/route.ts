import { requireAuth } from "@/lib/auth/auth";
import { successResponse, errorResponse } from "@/lib/api/utils";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

// POST /api/upload - Upload a file
export async function POST(request: Request) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return errorResponse(auth.error, auth.status);

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const type = formData.get("type") as string || "general";

    if (!file) {
      return errorResponse("No file provided", 400);
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return errorResponse("File size exceeds 10MB limit", 400);
    }

    // Validate file type
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!allowedTypes.includes(file.type)) {
      return errorResponse("Invalid file type", 400);
    }

    // Generate unique filename
    const ext = path.extname(file.name);
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const filename = `${timestamp}-${random}${ext}`;

    // Determine upload directory based on type
    const uploadDir = path.join(process.cwd(), "public", "uploads", type);

    // Create directory if it doesn't exist
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch {
      // Directory might already exist
    }

    // Save file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filePath = path.join(uploadDir, filename);

    await writeFile(filePath, buffer);

    // Return public URL
    const publicUrl = `/uploads/${type}/${filename}`;

    return successResponse({
      url: publicUrl,
      filename: file.name,
      size: file.size,
      type: file.type,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return errorResponse("Failed to upload file", 500);
  }
}
