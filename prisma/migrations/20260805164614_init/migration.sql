-- CreateTable
CREATE TABLE "days" (
    "date" DATE NOT NULL,
    "label" TEXT,
    "entryId" INTEGER,

    CONSTRAINT "days_pkey" PRIMARY KEY ("date")
);

-- CreateTable
CREATE TABLE "entries" (
    "id" SERIAL NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commentary" (
    "id" SERIAL NOT NULL,
    "anchor" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "source" TEXT,
    "position" INTEGER NOT NULL,
    "entryId" INTEGER NOT NULL,

    CONSTRAINT "commentary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "days_entryId_idx" ON "days"("entryId");

-- CreateIndex
CREATE INDEX "commentary_entryId_idx" ON "commentary"("entryId");

-- CreateIndex
CREATE UNIQUE INDEX "commentary_entryId_position_key" ON "commentary"("entryId", "position");

-- AddForeignKey
ALTER TABLE "days" ADD CONSTRAINT "days_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commentary" ADD CONSTRAINT "commentary_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
