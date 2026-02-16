import { NextResponse } from 'next/server';

// This is a public API from APILayer that checks for bad words.
// You can sign up for a free key at https://apilayer.com/marketplace/bad_words-api
const API_URL = 'https://api.apilayer.com/bad_words';
const API_KEY = process.env.BAD_WORDS_API_KEY;

export async function POST(request: Request) {
  const { text } = await request.json();

  if (!API_KEY) {
    console.error('Bad words API key is not configured in .env file.');
    // Fail open: If the check is not configured, we don't flag.
    return NextResponse.json({ flagged: false, badWords: [] });
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
        console.error('Bad words API request failed:', response.status, response.statusText);
        // API failed. We will flag for review but not block the user.
        return NextResponse.json({ flagged: true, badWords: [] });
    }

    const result = await response.json();
    
    const flagged = result.bad_words_total > 0;
    const badWords = result.bad_words_list || [];

    return NextResponse.json({ flagged, badWords });
  } catch (error) {
    console.error('Error calling bad words API:', error);
    // API request failed. We will flag for review but not block the user.
    return NextResponse.json({ flagged: true, badWords: [] });
  }
}
