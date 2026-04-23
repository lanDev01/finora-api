import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AnalyticsModule } from './analytics/analytics.module';
import { AuthModule } from './auth/auth.module';
import { CategoriesModule } from './categories/categories.module';
import { ExpensesModule } from './expenses/expenses.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    // Carrega o .env globalmente em todos os módulos
    ConfigModule.forRoot({ isGlobal: true }),

    PrismaModule,
    AuthModule,
    UsersModule,
    CategoriesModule,
    ExpensesModule,
    AnalyticsModule,
  ],
})
export class AppModule {}
