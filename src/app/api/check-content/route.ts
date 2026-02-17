import { NextResponse } from 'next/server';

// This is a public API from APILayer that checks for bad words.
// You can sign up for a free key at https://apilayer.com/marketplace/bad_words-api
const API_URL = 'https://api.apilayer.com/bad_words';
const API_KEY = process.env.BAD_WORDS_API_KEY;

export async function POST(request: Request) {
  const { text } = await request.json();

  if (!API_KEY) {
    console.error('Bad words API key is not configured in .env file.');
    // If the key is missing, we can't check, so we must block.
    return NextResponse.json({ error: "Content moderation is not configured." }, { status: 500 });
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
        const errorText = await response.text();
        console.error('Bad words API request failed:', response.status, response.statusText, errorText);
        // The external API failed. Return a server error so the client knows something went wrong.
        return NextResponse.json({ error: "Content moderation service failed." }, { status: 500 });
    }

    const result = await response.json();
    
    const flagged = result.bad_words_total > 0;
    const badWords = result.bad_words_list || [];

    return NextResponse.json({ flagged, badWords });
  } catch (error) {
    console.error('Error calling bad words API:', error);
    // The fetch itself failed (e.g., network error). Return a server error.
    return NextResponse.json({ error: "Could not connect to content moderation service." }, { status: 500 });
  }
}
