import { NextResponse } from 'next/server';

// This is a public API from APILayer that checks for bad words.
// You can sign up for a free key at https://apilayer.com/marketplace/bad_words-api
const API_URL = 'https://api.apilayer.com/bad_words';
const API_KEY = process.env.BAD_WORDS_API_KEY;

export async function POST(request: Request) {
  const { text } = await request.json();

  if (!API_KEY) {
    console.error('Bad words API key is not configured in .env file.');
    // Fail open: If the check is not configured, we allow the post but log an error.
    // This prevents blocking all posts if the key is missing or invalid.
    return NextResponse.json({ flagged: false });
  }

  if (!text) {
    return NextResponse.json({ error: 'No text provided.' }, { status: 400 });
  }

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'apikey': API_KEY
      },
      body: text
    });

    if (!response.ok) {
        // This can happen for various reasons, like an invalid API key or service downtime.
        console.error('Bad words API request failed:', response.status, response.statusText);
        // Fail open if the API itself fails, but flag the post for manual review.
        return NextResponse.json({ flagged: true });
    }

    const result = await response.json();
    
    // The API response contains a `bad_words_total` field.
    // If it's greater than 0, we consider the content flagged.
    const flagged = result.bad_words_total > 0;

    return NextResponse.json({ flagged });
  } catch (error) {
    console.error('Error calling bad words API:', error);
    // If the request to the API fails entirely (e.g., network issue),
    // we flag the post for manual review as a safety measure.
    return NextResponse.json({ flagged: true });
  }
}
