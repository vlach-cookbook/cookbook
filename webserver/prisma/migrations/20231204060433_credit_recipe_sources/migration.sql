-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('BY_PERSON', 'FROM_WEBPAGE', 'BASED_ON_PERSON', 'BASED_ON_WEBPAGE');

-- CreateTable
CREATE TABLE "RecipeSource" (
    "id" SERIAL NOT NULL,
    "recipeId" INTEGER NOT NULL,
    "type" "SourceType" NOT NULL,
    "name" TEXT,
    "url" TEXT,

    CONSTRAINT "RecipeSource_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RecipeSource_recipeId_type_idx" ON "RecipeSource"("recipeId", "type");

-- AddForeignKey
ALTER TABLE "RecipeSource" ADD CONSTRAINT "RecipeSource_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
