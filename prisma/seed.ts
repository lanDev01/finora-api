import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_EXPENSE_CATEGORIES = [
  { name: 'Alimentação', color: '#f97316', icon: 'utensils', type: 'EXPENSE' as const },
  { name: 'Transporte', color: '#3b82f6', icon: 'car', type: 'EXPENSE' as const },
  { name: 'Moradia', color: '#8b5cf6', icon: 'home', type: 'EXPENSE' as const },
  { name: 'Lazer', color: '#ec4899', icon: 'gamepad-2', type: 'EXPENSE' as const },
  { name: 'Saúde', color: '#22c55e', icon: 'heart-pulse', type: 'EXPENSE' as const },
  { name: 'Educação', color: '#06b6d4', icon: 'graduation-cap', type: 'EXPENSE' as const },
  { name: 'Assinaturas', color: '#6366f1', icon: 'credit-card', type: 'EXPENSE' as const },
];

const DEFAULT_INCOME_CATEGORIES = [
  { name: 'Salário', color: '#22c55e', icon: 'wallet', type: 'INCOME' as const },
  { name: 'Freelance', color: '#3b82f6', icon: 'briefcase', type: 'INCOME' as const },
  { name: 'Investimentos', color: '#eab308', icon: 'piggy-bank', type: 'INCOME' as const },
];

async function main() {
  console.log('🌱 Seeding default categories...');

  const users = await prisma.user.findMany();

  for (const user of users) {
    const existingCategories = await prisma.category.count({
      where: { userId: user.id },
    });

    if (existingCategories === 0) {
      const allCategories = [...DEFAULT_EXPENSE_CATEGORIES, ...DEFAULT_INCOME_CATEGORIES];
      await prisma.category.createMany({
        data: allCategories.map((cat) => ({
          ...cat,
          userId: user.id,
        })),
      });
      console.log(`  ✅ Created ${allCategories.length} categories for user: ${user.email}`);
    } else {
      const incomeCount = await prisma.category.count({
        where: { userId: user.id, type: 'INCOME' },
      });

      if (incomeCount === 0) {
        await prisma.category.createMany({
          data: DEFAULT_INCOME_CATEGORIES.map((cat) => ({
            ...cat,
            userId: user.id,
          })),
        });
        console.log(`  ✅ Added ${DEFAULT_INCOME_CATEGORIES.length} income categories for user: ${user.email}`);
      } else {
        console.log(`  ⏭️  User ${user.email} already has categories, skipping.`);
      }
    }
  }

  console.log('🌱 Seed complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
