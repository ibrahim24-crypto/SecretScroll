import { NextResponse } from 'next/server';
import cloudinary from '@/lib/cloudinary';

export async function POST(request: Request) {
  const { image } = await request.json();

  if (!image) {
    return NextResponse.json({ error: 'No image provided.' }, { status: 400 });
  }

  try {
    const result = await cloudinary.uploader.upload(image, {
      folder: 'secretscroll_uploads',
    });
    return NextResponse.json({ url: result.secure_url });
  } catch (error) {
    console.error('Cloudinary Upload Error:', error);
    return NextResponse.json({ error: 'Upload failed.' }, { status: 500 });
  }
}
