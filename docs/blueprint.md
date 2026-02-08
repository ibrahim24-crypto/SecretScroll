# **App Name**: SecretReels

## Core Features:

- Google Sign-In: Authenticate users via Firebase Auth with Google Sign-In.
- User Profile: Store and manage user data (email, username, avatar, role) in Firestore.
- Secret Submission: Users can submit secrets, marked with a status of 'pending'.
- Vote on Secrets: Allow users to upvote/downvote secrets.
- Scrollable Reel: Implement an Instagram Reels-style UI for viewing secrets in an infinitely scrolling feed.
- Admin Moderation: Admin users can access a moderation queue to approve/reject submitted secrets and user reports.
- AI powered category selection: Suggest the most appropriate category when submitting new person using a LLM tool.

## Style Guidelines:

- Primary color: Deep blue (#3F51B5), for trust and focus on content.
- Background color: Very light blue (#E8EAF6), for a clean, uncluttered feel.
- Accent color: Light purple (#9575CD), to provide visual interest without overwhelming.
- Headline font: 'Space Grotesk', sans-serif, with 'Inter', sans-serif, as the body font.
- Use clean, modern icons from a set like Material Icons or Font Awesome.
- Mobile-first design with a vertical infinite scroll. Desktop version utilizes a masonry grid.
- Use subtle animations via Framer Motion for smooth transitions when loading new content.