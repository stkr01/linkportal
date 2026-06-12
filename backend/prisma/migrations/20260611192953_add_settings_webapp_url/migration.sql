-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "healthCheckEnabled" BOOLEAN NOT NULL DEFAULT true,
    "healthCheckIntervalHours" INTEGER NOT NULL DEFAULT 4,
    "healthCheckTimeoutSec" INTEGER NOT NULL DEFAULT 5,
    "healthRetentionDays" INTEGER NOT NULL DEFAULT 30,
    "webAppUrl" TEXT NOT NULL DEFAULT '',
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Settings" ("healthCheckEnabled", "healthCheckIntervalHours", "healthCheckTimeoutSec", "healthRetentionDays", "id", "updatedAt") SELECT "healthCheckEnabled", "healthCheckIntervalHours", "healthCheckTimeoutSec", "healthRetentionDays", "id", "updatedAt" FROM "Settings";
DROP TABLE "Settings";
ALTER TABLE "new_Settings" RENAME TO "Settings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
