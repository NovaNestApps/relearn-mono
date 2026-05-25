ALTER TABLE "users"
ADD COLUMN "spacedRepetitionEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "notificationEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "notificationTime" TEXT;
