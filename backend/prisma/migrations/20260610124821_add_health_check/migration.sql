-- CreateTable
CREATE TABLE "HealthCheck" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "linkId" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "statusCode" INTEGER,
    "latencyMs" INTEGER,
    "checkedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HealthCheck_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "Link" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "healthCheckEnabled" BOOLEAN NOT NULL DEFAULT true,
    "healthCheckIntervalHours" INTEGER NOT NULL DEFAULT 4,
    "healthCheckTimeoutSec" INTEGER NOT NULL DEFAULT 5,
    "healthRetentionDays" INTEGER NOT NULL DEFAULT 30,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Link" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "manageSoftware" TEXT,
    "description" TEXT,
    "imageUrl" TEXT,
    "environment" TEXT NOT NULL DEFAULT 'NA',
    "owningTeam" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "categoryId" INTEGER NOT NULL,
    "healthStatus" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "lastCheckedAt" DATETIME,
    "lastStatusCode" INTEGER,
    "lastLatencyMs" INTEGER,
    "extraMonitor" BOOLEAN NOT NULL DEFAULT false,
    "extraMonitorMinutes" INTEGER,
    "dateAdded" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "addedById" INTEGER NOT NULL,
    "dateModified" DATETIME NOT NULL,
    "modifiedById" INTEGER,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" DATETIME,
    CONSTRAINT "Link_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Link_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Link_modifiedById_fkey" FOREIGN KEY ("modifiedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Link" ("addedById", "categoryId", "dateAdded", "dateModified", "deletedAt", "description", "environment", "id", "imageUrl", "isDeleted", "manageSoftware", "modifiedById", "name", "owningTeam", "status", "url") SELECT "addedById", "categoryId", "dateAdded", "dateModified", "deletedAt", "description", "environment", "id", "imageUrl", "isDeleted", "manageSoftware", "modifiedById", "name", "owningTeam", "status", "url" FROM "Link";
DROP TABLE "Link";
ALTER TABLE "new_Link" RENAME TO "Link";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "HealthCheck_linkId_checkedAt_idx" ON "HealthCheck"("linkId", "checkedAt");
