// @ts-check
import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  transactionOptions: { isolationLevel: "Serializable" },
});

const months = new Map([
  ["janv", 1],
  ["janvier", 1],
  ["feb", 2],
  ["fev", 2],
  ["mars", 3],
  ["avril", 4],
  ["mai", 5],
  ["juin", 6],
  ["juillet", 7],
  ["aout", 8],
  ["sept", 9],
  ["septembre", 9],
  ["oct", 10],
  ["nov", 11],
  ["dec", 12],
]);

async function main() {
  await prisma.$transaction(async (tx) => {
    const categories = await tx.category.findMany({
      include: { Recipes: { select: { id: true, authorId: true } } },
      orderBy: { name: "asc" },
    });
    /** @type {number[]} */
    const toDelete = [];
    /** @type {Prisma.CookingHistoryCreateManyInput[]} */
    const cookingHistory = [];
    for (const category of categories) {
      const match =
        /^(?<month>janv|janvier|feb|fev|mars|avril|mai|juin|juillet|aout|sept|septembre|oct|nov|dec)\.?\s+(?<year>\d{2,4})$/i.exec(
          category.name
        );
      if (match) {
        toDelete.push(category.id);
        const month = months.get(match.groups?.month?.toLowerCase() ?? "");
        if (month === undefined) {
          throw new Error(`Bad category ${category.name}`);
        }
        let year = parseInt(match.groups?.year ?? "nan");
        if (isNaN(year)) throw new Error(`Bad category ${category.name}`);
        if (year < 30) year += 2000;
        else if (year < 100) year += 1900;
        for (const recipe of category.Recipes) {
          cookingHistory.push({
            recipeId: recipe.id,
            cookId: recipe.authorId,
            cookedAtYear: year,
            cookedAtMonth: month,
          });
        }
      }
    }
    await Promise.all([
      tx.cookingHistory.createMany({ data: cookingHistory }),
      tx.category.deleteMany({ where: { id: { in: toDelete } } }),
    ]);
    console.log(
      `Converted ${toDelete.length} categories into ${cookingHistory.length} cooking history entries.`
    );
  });
}

main()
  .catch(async (e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => await prisma.$disconnect());
