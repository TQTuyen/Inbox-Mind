## Features

- Responsive 3-column layout for desktop
- Mobile-first design with sheet-based navigation
- **Real Google OAuth2 authentication** with automatic token refresh
- Toggleable mock/real API modes for development
- Secure token-based authentication with automatic refresh
- Bulk email actions (Mark as Read/Unread, Delete)
- Cross-tab authentication synchronization
- Encrypted Google token storage

## Getting Started

Follow these instructions to get the project running on your local machine.

## Video demo

- [Inbox Mind](https://youtu.be/mvU-hdmmzw4)

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later recommended)
- [pnpm](https://pnpm.io/installation)
- [PostgreSQL](https://www.postgresql.org/) (v12 or later)
- Google Cloud Project with Gmail API enabled (see setup below)

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

3.  **Database Setup:**

    ```bash
    createdb inbox_mind
    ```

4.  **Backend Environment Configuration:**

    Copy the example environment file and configure it:

    ```bash
    cp apps/backend/.env.example apps/backend/.env
    ```

    Edit `apps/backend/.env` and set:

    - Database credentials
    - Google OAuth credentials (see Google Cloud Setup below)
    - JWT secret (generate with: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`)
    - Encryption key (generate with: `node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"`)

5.  **Frontend Environment Configuration:**

    Create `apps/frontend/.env`:

    ```bash
    echo "VITE_USE_MOCK=false" > apps/frontend/.env
    ```

    Set `VITE_USE_MOCK=true` to use mock data for frontend-only development.

### Google Cloud Setup

1.  **Go to the Google Cloud Console:** Navigate to [https://console.cloud.google.com/](https://console.cloud.google.com/).
2.  **Create a New Project** or select an existing one
3.  **Enable the Gmail API:**
    - In the search bar, search for "Gmail API" and select it
    - Click "Enable"
4.  **Configure the OAuth Consent Screen:**
    - Go to "APIs & Services" > "OAuth consent screen"
    - Choose "External" as the User type and click "CREATE"
    - Fill in required fields (App name, User support email, Developer contact)
    - Add test users (your email addresses)
    - Click "SAVE AND CONTINUE"
5.  **Create OAuth 2.0 Client ID Credentials:**
    - Go to "APIs & Services" > "Credentials"
    - Click "+ CREATE CREDENTIALS" and select "OAuth client ID"
    - Application type: "Web application"
    - **Authorized JavaScript origins:**
      - `http://localhost:4200`
      - `http://localhost:3000`
    - **Authorized redirect URIs:**
      - `http://localhost:3000/api/auth/google/callback`
    - Click "CREATE"
6.  **Copy credentials** to `apps/backend/.env`:
    ```env
    GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
    GOOGLE_CLIENT_SECRET=your_client_secret_here
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

**Quick Start:** See `QUICK_START_OAUTH.md` for a 5-minute setup guide.

**Full Documentation:** See `OAUTH_INTEGRATION_GUIDE.md` for detailed OAuth integration docs.

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

## Development Modes

### Mock API Mode (Frontend Development)

For frontend-only development without running the backend:

```env
# apps/frontend/.env
VITE_USE_MOCK=true
```

Use credentials: `demo@example.com` / `password123`

### Real API Mode (Full Stack)

For testing with real Google OAuth and Gmail API:

```env
# apps/frontend/.env
VITE_USE_MOCK=false
```

Requires backend running with proper Google OAuth configuration.

## Third-Party Services

- **Google OAuth & Gmail API:** Full integration with Google accounts for authentication and email access
- **Dicebear:** User avatars are generated dynamically using the [Dicebear Avatar API](https://www.dicebear.com/)
- **Hosting Provider:** Vercel
