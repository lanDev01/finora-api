import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_CATEGORIES = [
  { name: 'Alimentação', color: '#f97316', icon: 'utensils' },
  { name: 'Transporte', color: '#3b82f6', icon: 'car' },
  { name: 'Moradia', color: '#8b5cf6', icon: 'home' },
  { name: 'Lazer', color: '#ec4899', icon: 'gamepad-2' },
  { name: 'Saúde', color: '#22c55e', icon: 'heart-pulse' },
  { name: 'Educação', color: '#06b6d4', icon: 'graduation-cap' },
  { name: 'Assinaturas', color: '#6366f1', icon: 'credit-card' },
];

async function main() {
  console.log('🌱 Seeding default categories...');

  // Get all users to assign default categories
  const users = await prisma.user.findMany();

  for (const user of users) {
    const existingCategories = await prisma.category.count({
      where: { userId: user.id },
    });

    // Only seed if user has no categories yet
    if (existingCategories === 0) {
      await prisma.category.createMany({
        data: DEFAULT_CATEGORIES.map((cat) => ({
          ...cat,
          userId: user.id,
        })),
      });
      console.log(`  ✅ Created ${DEFAULT_CATEGORIES.length} categories for user: ${user.email}`);
    } else {
      console.log(`  ⏭️  User ${user.email} already has categories, skipping.`);
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
