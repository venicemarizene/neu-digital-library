'use server';
import { supabase } from '@/lib/supabaseClient';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const file = body.file; // base64 string from frontend
    const fileName = body.name;

    if (!file || !fileName) {
        return NextResponse.json({ error: 'File and name are required.' }, { status: 400 });
    }

    // Convert base64 to Buffer
    const buffer = Buffer.from(file, 'base64');

    const { data, error } = await supabase.storage
      .from('documents')
      .upload(fileName, buffer, {
        contentType: 'application/pdf',
        cacheControl: '3600',
        upsert: true
      });

    if (error) {
        console.error('Supabase upload error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: urlData } = supabase.storage.from('documents').getPublicUrl(fileName);

    if (!urlData.publicUrl) {
         return NextResponse.json({ error: 'Could not get public URL.' }, { status: 500 });
    }

    return NextResponse.json({ message: 'File uploaded', url: urlData.publicUrl }, { status: 200 });
  } catch (e: any) {
    console.error('API route error:', e);
    return NextResponse.json({ error: e.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}
