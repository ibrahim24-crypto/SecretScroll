# Secret Scroll: A Secure & Anonymous Content Platform

Secret Scroll is a sophisticated, multi-lingual, anonymous and pseudonymous content-sharing platform. It's designed with a modern, social media-inspired interface and features a robust, multi-layered moderation system to ensure a safe and engaging community experience.

## Core Features

### 1. Dual & Secure Authentication

*   **Disclaimer Gate**: New users are greeted with a clear disclaimer. They must explicitly type "I agree" before proceeding, ensuring they understand the platform's terms. This is tracked via local storage to only appear on the first visit.
*   **Google Sign-In**: Provides a standard, persistent account linked to a user's Google identity, with a robust redirect fallback to handle browser popup blockers.
*   **Unique Anonymous Sign-In**: Allows users to participate without a Google account by providing a temporary display name. The system checks a dedicated Firestore collection (`userDisplayNames`) to ensure this name is unique, preventing impersonation among anonymous users. The name is visible only to administrators for moderation, guaranteeing public anonymity.

### 2. Dynamic Content Experience

*   **Reels-Style Mobile Feed**: On mobile devices, posts are presented in an immersive, full-screen, vertical scrolling feed, mimicking popular video apps for a modern, engaging experience.
*   **Masonry Desktop Feed**: On larger screens, posts are arranged in a responsive, multi-column masonry grid that elegantly showcases more content at once.
*   **Rich Post Creation**: Users can create detailed posts with:
    *   A main title (Person Name).
    *   A multi-line description.
    *   An optional category (e.g., Funny, Deep, Advice).
    *   An optional birth date via a simple date input.
    *   Multiple image uploads, powered by Cloudinary.
*   **Smart Social Fields**: A flexible "Custom Details" section allows authors to add any key-value pairs. It intelligently recognizes social media keywords (Instagram, X, Facebook, etc.), displaying the correct icon and prompting only for a username. It can parse full URLs to extract usernames cleanly.

### 3. User Interaction & Engagement

*   **Voting System**: Logged-in users can upvote or downvote posts. The UI updates instantly to reflect their vote.
*   **Real-time Comments**: Each post has a sleek, slide-out comment sheet. Users can add comments (submitting with the Enter key) and see new comments appear in real-time without needing to refresh the page.

### 4. Advanced Content Moderation (Multi-Layered)

This is the core of the platform's safety mechanism.

*   **Layer 1: Protected Names (Immediate Rejection)**
    *   Admins manage a list of "Protected Names" in the dashboard.
    *   The system uses an advanced fuzzy-matching algorithm (`fast-levenshtein`) to detect variations in post titles.
    *   It catches **typos**, **reversed word order**, and **individually reversed words** (e.g., "miharbi enizze" for "ibrahim ezzine").
    *   If a match is found, the post is **immediately rejected** and is never created in the database.
*   **Layer 2: Admin-Managed Word Filter (Pending Review)**
    *   Admins manage a central list of "Forbidden Words."
    *   If a post's content contains a word from this list, its status is set to `pending`.
*   **Layer 3: Image Approval Queue**
    *   All user-uploaded images are held in a `pending` state by default.
    *   They are not visible to the public until an administrator manually approves them in a dedicated dashboard queue.
*   **Public Feed Rules**: The main public feed is strictly filtered to only show posts with `status: 'approved'`.

### 5. Granular Administration & Permissions

*   **Comprehensive Admin Dashboard**: A secure, tabbed interface at `/admin`, accessible only to users with the 'admin' role. The dashboard UI is responsive and optimized for mobile.
*   **Super Admin Role**: The user `ibrahimezzine09@gmail.com` is designated as the Super Admin with ultimate control.
*   **Role-Based Permissions**: The Super Admin can grant or revoke specific permissions for other admins, including:
    *   `approve_pictures`: Access the image approval queue.
    *   `delete_posts`: Delete any post.
    *   `delete_comments`: Delete any comment.
    *   `manage_admins`: Promote/demote other admins and manage their permissions.
    *   `delete_users`: Delete user accounts.
    *   `manage_forbidden_words`: Manage the forbidden words list.
    *   `manage_protected_names`: Manage the protected names list.
*   **Dynamic UI**: The admin dashboard is permission-aware. Admins only see the tabs and controls for which they have been granted access.

### 6. Internationalization (i18n)

*   **Multi-language Support**: The entire application interface supports **English, French, and Arabic**.
*   **Easy Language Switching**: A language toggle in the header allows users to switch their preferred language at any time, with the choice saved in local storage.
*   **Automatic RTL Layout**: The app's layout automatically adapts to Right-to-Left (RTL) for Arabic, ensuring a native-like experience.

### 7. Modern Tech Stack & Design

*   **Framework**: Built with **Next.js 14** and the App Router for a fast, modern web experience.
*   **UI/Styling**: Uses **ShadCN UI** components and is styled with **Tailwind CSS**. It features a customizable color theme system (**Slate**, **Green**, **Purple**) and a light/dark mode toggle.
*   **Backend & Database**: **Firebase** powers the application's user authentication (Firebase Auth) and data storage (Firestore), secured with detailed, function-based rules.
*   **Image Hosting**: **Cloudinary** is integrated for reliable and scalable image uploading, storage, and delivery.
*   **Legal & Info Pages**: The app includes standard "About," "Terms of Use," "Copyright," and detailed "Patch Notes" pages, accessible from the user menu.

This combination of features makes Secret Scroll a robust, secure, and highly engaging platform for anonymous sharing, with powerful tools for community management.
