import { NextRequest, NextResponse } from "next/server";
import {
  ListObjectsV2Command,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client } from "@/app/lib/s3";

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME!;

// GET: List files and generate download URLs
export async function GET() {
  try {
    const command = new ListObjectsV2Command({ Bucket: BUCKET_NAME });
    const response = await s3Client.send(command);

    // Always return an array, even if bucket is empty
    if (!response.Contents || response.Contents.length === 0) {
      return NextResponse.json({ success: true, files: [] });
    }

    const files = await Promise.all(
      response.Contents.map(async (file) => {
        const getCommand = new GetObjectCommand({
          Bucket: BUCKET_NAME,
          Key: file.Key,
        });
        const url = await getSignedUrl(s3Client, getCommand, {
          expiresIn: 3600,
        });
        return {
          key: file.Key ?? "",
          url,
          size: file.Size ?? 0,
          lastModified: file.LastModified?.toISOString() ?? "",
        };
      })
    );

    return NextResponse.json({ success: true, files });
  } catch (error) {
    console.error("Error listing files:", error);
    return NextResponse.json(
      { success: false, files: [], error: "Error fetching files" },
      { status: 500 }
    );
  }
}

// POST: Upload a file
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "File is required." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = `${Date.now()}-${file.name}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName,
      Body: buffer,
      ContentType: file.type,
    });

    await s3Client.send(command);

    return NextResponse.json({ success: true, fileName });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { success: false, error: "Error uploading file" },
      { status: 500 }
    );
  }
}

// DELETE: Delete a file
export async function DELETE(request: NextRequest) {
  try {
    const { key } = await request.json();

    if (!key) {
      return NextResponse.json(
        { success: false, error: "File key is required." },
        { status: 400 }
      );
    }

    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(command);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting file:", error);
    return NextResponse.json(
      { success: false, error: "Error deleting file" },
      { status: 500 }
    );
  }
}