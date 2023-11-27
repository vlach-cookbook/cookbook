/*
  Warnings:

  - The primary key for the `RecipeIngredient` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `RecipeIngredient` table. All the data in the column will be lost.
  - Made the column `order` on table `RecipeIngredient` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "RecipeIngredient_recipeId_order_key";

-- AlterTable
ALTER TABLE "RecipeIngredient" DROP CONSTRAINT "RecipeIngredient_pkey",
DROP COLUMN "id",
ALTER COLUMN "order" SET NOT NULL,
ADD CONSTRAINT "RecipeIngredient_pkey" PRIMARY KEY ("recipeId", "order");
