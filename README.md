# InboxMind

InboxMind is a modern, intelligent email client PoC designed to streamline your workflow. It features a responsive interface, a mock backend, and a robust authentication system. This project was built using the Gemini CLI.

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

The application is hosted at: **[https://example.com](https://example.com)** (_Note: This is a placeholder URL._)

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

- **Google OAuth:** Authentication is supported via Google Sign-In. A Google Cloud project is required to generate your own OAuth 2.0 Client ID.
- **Dicebear:** User avatars are generated dynamically using the [Dicebear Avatar API](https://www.dicebear.com/).
- **Hosting Provider:** _(Placeholder: e.g., Vercel, Netlify, AWS Amplify)_
