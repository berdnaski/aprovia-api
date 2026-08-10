import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import { DEFAULT_CATEGORIES } from '../src/shared/constants/default-categories';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function seedCategories(): Promise<void> {
  const companies = await prisma.company.findMany({
    select: { id: true, legal_name: true },
  });

  if (companies.length === 0) {
    console.log('Nenhuma empresa cadastrada — nada a semear.');
    return;
  }

  for (const company of companies) {
    const result = await prisma.category.createMany({
      data: DEFAULT_CATEGORIES.map((category) => ({
        company_id: company.id,
        name: category.name,
        description: category.description,
      })),
      skipDuplicates: true,
    });

    console.log(
      `${company.legal_name}: ${result.count} categoria(s) criada(s), ` +
        `${DEFAULT_CATEGORIES.length - result.count} já existia(m).`,
    );
  }
}

async function main(): Promise<void> {
  console.log('Executando seed...');
  await seedCategories();
  console.log('Seed concluído.');
}

main()
  .catch((error: unknown) => {
    console.error('Falha no seed:', error);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
