## Features

- Responsive 3-column layout for desktop
- Mobile-first design with sheet-based navigation
- Mock email and mailbox data
- Google OAuth and standard email/password authentication
- Secure token-based authentication with automatic refresh
- Bulk email actions (Mark as Read/Unread, Delete)

## Getting Started

Follow these instructions to get the project running on your local machine.

## Video demo

- [Inbox Mind](https://youtu.be/mvU-hdmmzw4)

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later recommended)
- [pnpm](https://pnpm.io/installation)

### Setup

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/TQTuyen/Inbox-Mind.git
    cd inbox-mind
    ```

2.  **Install dependencies:**
    ```bash
    pnpm install
    ```

### Running the Application

To run both the frontend and backend servers in parallel for development, use the `start` script:

```bash
pnpm start
```

- Frontend will be available at `http://localhost:4200/`
- Backend will be available at `http://localhost:3000/`

You can also run them separately:

- **Frontend only:** `pnpm fe:run`
- **Backend only:** `pnpm be:run`

### Other Scripts

- **Build for production:** `pnpm build`
- **Run tests:** `pnpm test`
- **Lint code:** `pnpm lint`

## Deployment

### Public URL

The application is hosted at: **[Inbox Mind](https://inbox-mind-rosy.vercel.app/)**

### Reproducing Deployment Locally

1.  **Build the applications:**

    ```bash
    pnpm build
    ```

    This command compiles the frontend and backend applications into the `dist/` directory.

2.  **Run the production backend:**

    ```bash
    node dist/apps/backend/main.js
    ```

3.  **Serve the production frontend:**
    The frontend is a standard static site. You can use any static file server. For example, using `serve`:

    ```bash
    # Install serve globally if you haven't already
    npm install -g serve

    # Serve the frontend build output
    serve -s dist/apps/frontend
    ```

## Security & Token Management

Authentication is handled via a robust token-based system designed with security in mind.

### Token Storage Strategy

- **Access Token (JWT):** A short-lived (e.g., 15 minutes) JSON Web Token is stored in memory using a `Zustand` state management store. It is **not** accessible to `localStorage` or `sessionStorage`, which mitigates the risk of XSS attacks stealing the token. It is sent in the `Authorization` header for API requests.

- **Refresh Token:** A long-lived, single-use refresh token is stored in a secure, `HttpOnly` cookie. This is the primary credential for maintaining a user's session.
  - The `HttpOnly` flag prevents any client-side JavaScript from accessing the cookie, providing a strong defense against XSS.
  - The `withCredentials: true` flag in the `axios` configuration ensures this cookie is automatically sent with requests to the backend authentication endpoints.

### Token Refresh Flow

1.  When the access token expires, the backend API returns a `401 Unauthorized` status.
2.  An `axios` response interceptor on the frontend catches this status.
3.  It makes a "silent" request to the `/api/v1/auth/refresh` endpoint. This request automatically includes the `HttpOnly` refresh token cookie.
4.  If the refresh token is valid, the backend issues a new access token.
5.  The frontend updates the in-memory `Zustand` store with the new access token and automatically retries the original failed request.
6.  The application also uses a proactive refresh mechanism, where it refreshes the token shortly _before_ it expires to improve user experience.
7.  A `BroadcastChannel` is used to sync token updates and logout events across multiple browser tabs.

This architecture ensures that the highly sensitive refresh token is never exposed to the client-side application code, providing a secure session management experience.

## Third-Party Services

- **Google OAuth:** Authentication is supported via Google Sign-In. To enable Google OAuth, you need to obtain a Google Client ID from the Google Cloud Console. Follow these steps:

    1.  **Go to the Google Cloud Console:** Navigate to [https://console.cloud.google.com/](https://console.cloud.google.com/).
    2.  **Create a New Project:**
        *   Click on the project selector in the header (usually next to "Google Cloud").
        *   Click "New Project."
        *   Give your project a name (e.g., "InboxMind OAuth") and click "Create."
    3.  **Enable the Google People API:**
        *   In the search bar at the top, search for "Google People API" and select it.
        *   Click "Enable."
    4.  **Configure the OAuth Consent Screen:**
        *   In the left navigation menu, go to "APIs & Services" > "OAuth consent screen."
        *   Choose "External" as the User type and click "CREATE."
        *   Fill in the required fields on the "OAuth consent screen" (App name, User support email, Developer contact information). For testing, you can use placeholder values.
        *   Add your test user accounts (email addresses) to the "Test users" section.
        *   Click "SAVE AND CONTINUE."
        *   On the "Scopes" page, you don't necessarily need to add any scopes for basic login if you are only getting basic profile info. Click "SAVE AND CONTINUE."
        *   Review the summary and click "BACK TO DASHBOARD."
    5.  **Create OAuth 2.0 Client ID Credentials:**
        *   In the left navigation menu, go to "APIs & Services" > "Credentials."
        *   Click "+ CREATE CREDENTIALS" and select "OAuth client ID."
        *   For "Application type," select "Web application."
        *   Give your OAuth client a name (e.g., "InboxMind Web Client").
        *   **Authorized JavaScript origins:** Add `http://localhost:4200` (your frontend development URL). If deploying, also add your production frontend URL (e.g., `https://inbox-mind-rosy.vercel.app`).
        *   **Authorized redirect URIs:** This field is often not strictly needed for client-side Google Sign-In using `@react-oauth/google` as it handles the redirects internally. However, if your backend also handles Google authentication, you might need to add `http://localhost:3000/api/v1/auth/google/callback` (or your backend's production URL).
        *   Click "CREATE."
    6.  **Copy your Client ID:** Your Client ID will be displayed. Copy this string.
    7.  **Set Environment Variable:** In your frontend project, create a `.env` file (if it doesn't exist) and add your Google Client ID:
        ```dotenv
        VITE_GOOGLE_CLIENT_ID="YOUR_GOOGLE_CLIENT_ID"
        ```
        Replace `"YOUR_GOOGLE_CLIENT_ID"` with the actual Client ID you copied. Restart your frontend development server for the changes to take effect.

- **Dicebear:** User avatars are generated dynamically using the [Dicebear Avatar API](https://www.dicebear.com/).
- **Hosting Provider:** Vercel
