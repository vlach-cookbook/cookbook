-- AlterTable
ALTER TABLE "_CategoryToRecipe" ADD CONSTRAINT "_CategoryToRecipe_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_CategoryToRecipe_AB_unique";
