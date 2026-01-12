-- Make Google tokens nullable to allow logout/login flow
ALTER TABLE "users" ALTER COLUMN "googleRefreshToken" DROP NOT NULL;
ALTER TABLE "users" ALTER COLUMN "googleRefreshTokenIV" DROP NOT NULL;

-- Update existing users with null tokens to be safe
UPDATE "users" SET "googleRefreshToken" = NULL, "googleRefreshTokenIV" = NULL 
WHERE "googleRefreshToken" IS NOT NULL;
