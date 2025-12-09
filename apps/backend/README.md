# Gmail Application Backend

A NestJS-based backend for Gmail application with dual-token architecture.

## Architecture

This application uses a **dual-token architecture**:

### Two Token Systems:

1. **App Tokens** (Frontend ↔ Backend)
   - App Access Token: 15 minutes, in-memory on frontend
   - App Refresh Token: 7 days, HttpOnly cookie
   
2. **Google Tokens** (Backend ↔ Google API)
   - Google Access Token: refreshed automatically
   - Google Refresh Token: encrypted in database

## Setup

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env`:

```bash
cp apps/backend/.env.example apps/backend/.env
```

Update the following values in `.env`:

```env
# Database - Update with your PostgreSQL credentials
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=your_password
DATABASE_NAME=inbox_mind

# Google OAuth - Get from Google Cloud Console
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback

# JWT Secret - Generate a secure random string
JWT_SECRET=your_secure_jwt_secret

# Encryption Key - Must be exactly 32 characters
ENCRYPTION_KEY=your32characterencryptionkey12
```

### 3. Set Up Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Gmail API
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:3000/api/auth/google/callback`
5. Copy Client ID and Client Secret to `.env`

### 4. Set Up PostgreSQL Database

```bash
# Create database
createdb inbox_mind

# Or using psql
psql -U postgres
CREATE DATABASE inbox_mind;
\q
```

### 5. Generate Secure Keys

```bash
# Generate JWT Secret (Node.js)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate Encryption Key (exactly 32 characters)
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

### 6. Run the Application

```bash
# Development
pnpm be:run

# Production build
pnpm be:build
```

## API Endpoints

### Authentication Endpoints

- `GET /api/auth/google` - Initiate Google OAuth
- `GET /api/auth/google/callback` - OAuth callback
- `POST /api/auth/refresh` - Refresh app access token
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user

### Gmail Endpoints (Protected)

- `GET /api/mailboxes` - List labels/mailboxes
- `GET /api/mailboxes/:id/emails` - List emails in mailbox
- `GET /api/emails/:id` - Get email details
- `POST /api/emails/send` - Send email
- `PUT /api/emails/:id/read` - Mark email as read/unread
- `POST /api/emails/:id/labels` - Add/remove labels
- `DELETE /api/emails/:id` - Delete email

## Database Schema

### Users Table

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR UNIQUE NOT NULL,
  googleId VARCHAR UNIQUE NOT NULL,
  name VARCHAR NOT NULL,
  googleRefreshToken TEXT NOT NULL,
  googleRefreshTokenIV VARCHAR NOT NULL,
  appRefreshToken TEXT,
  appRefreshTokenVersion INTEGER DEFAULT 0,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);
```

## Security Features

- Google refresh tokens encrypted at rest (AES-256-CBC)
- App refresh tokens stored as HttpOnly cookies
- CSRF protection via state parameter
- Token version invalidation for logout
- Automatic Google token refresh

## Testing

```bash
# Unit tests
pnpm be:test

# Lint
pnpm be:lint
```

## Troubleshooting

### Common Issues

1. **Invalid encryption key**: Ensure `ENCRYPTION_KEY` is exactly 32 characters
2. **Database connection error**: Check PostgreSQL is running and credentials are correct
3. **Google OAuth error**: Verify redirect URI matches exactly in Google Console
4. **CORS error**: Check `FRONTEND_URL` in `.env` matches your frontend URL

## Production Deployment

1. Set `NODE_ENV=production`
2. Use strong, random values for `JWT_SECRET` and `ENCRYPTION_KEY`
3. Enable SSL/HTTPS
4. Set `synchronize: false` in TypeORM config
5. Run database migrations
6. Use environment variables instead of `.env` file

## License

MIT
