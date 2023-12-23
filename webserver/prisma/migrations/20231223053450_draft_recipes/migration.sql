-- CreateTable
CREATE TABLE "DraftRecipe" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" UUID NOT NULL,
    "data" JSONB NOT NULL,

    CONSTRAINT "DraftRecipe_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DraftRecipe_userId_idx" ON "DraftRecipe"("userId");

-- AddForeignKey
ALTER TABLE "DraftRecipe" ADD CONSTRAINT "DraftRecipe_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
