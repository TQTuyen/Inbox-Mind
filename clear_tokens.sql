-- Clear all Google tokens from users table to force re-login
UPDATE "users" SET "googleRefreshToken" = NULL, "googleRefreshTokenIV" = NULL;
