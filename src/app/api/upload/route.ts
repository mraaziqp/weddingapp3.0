import { handleUpload } from '@vercel/blob/client';
import { type PutBlobResult } from '@vercel/blob';
import { NextResponse } from 'next/server';

// In a real application, you would import your database client and schema.
// import { db } from '@/lib/db';
// import { mediaTable } from '@/lib/db/schema';

export async function POST(request: Request): Promise<NextResponse> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      {
        error: 'Vercel Blob is not configured. Please set BLOB_READ_WRITE_TOKEN in project environment variables.',
      },
      { status: 500 }
    );
  }

  const body = await request.json();

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname: string, clientPayload: string | null) => {
        // This is where you would add your security checks.
        // For example, checking if the user is authenticated.
        const { guestId, visibility, questTag } = JSON.parse(clientPayload ?? '{}');
        if (!guestId) {
          throw new Error('Guest ID is required for upload.');
        }

        return {
          allowedContentTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/quicktime'],
          tokenPayload: JSON.stringify({ guestId, visibility, questTag }), // Pass entire payload to onUploadCompleted
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }: { blob: PutBlobResult; tokenPayload?: string | null }) => {
        const { guestId, visibility, questTag } = JSON.parse(tokenPayload ?? '{}');
        console.log('Blob upload completed for guest', guestId, blob, { visibility, questTag });

        // This is where you would save the blob metadata to your database.
        // The Vercel Blob SDK returns a blob object that contains the URL, pathname, contentType, and contentDisposition.
        // You can use this information to create a new record in your database.
        
        // Example with a hypothetical Neon/Drizzle setup:
        // await db.insert(mediaTable).values({
        //   id: crypto.randomUUID(),
        //   guest_id: guestId,
        //   media_url: blob.url,
        //   media_type: blob.contentType.startsWith('image') ? 'image' : 'video',
        //   visibility: visibility || 'public', // Default to public if not provided
        //   quest_tag: questTag,
        //   created_at: new Date(),
        // });
        
        // IMPORTANT: The `onUploadCompleted` callback runs on a serverless function.
        // If you want to notify the client of the successful DB write,
        // you would typically use a separate mechanism like web sockets or have the client poll for updates.
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 },
    );
  }
}
