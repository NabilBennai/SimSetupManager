-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "TagLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "setupId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    CONSTRAINT "TagLink_setupId_fkey" FOREIGN KEY ("setupId") REFERENCES "Setup" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TagLink_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE INDEX "TagLink_tagId_idx" ON "TagLink"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "TagLink_setupId_tagId_key" ON "TagLink"("setupId", "tagId");

-- CreateIndex
CREATE INDEX "Setup_ownerId_gameId_idx" ON "Setup"("ownerId", "gameId");

-- CreateIndex
CREATE INDEX "Setup_ownerId_carId_idx" ON "Setup"("ownerId", "carId");

-- CreateIndex
CREATE INDEX "Setup_ownerId_trackId_idx" ON "Setup"("ownerId", "trackId");
