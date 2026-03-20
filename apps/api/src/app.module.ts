import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { FamilyModule } from './families/family.module';
import { ListModule } from './lists/list.module';
import { UserEntity } from './users/user.entity';
import { FamilyEntity } from './families/family.entity';
import { ShoppingListEntity } from './lists/shopping-list.entity';
import { ShoppingItemEntity } from './lists/shopping-item.entity';
import { ExpenseEntity } from './lists/expense.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get('DB_USER', 'postgres'),
        password: config.get('DB_PASS', 'postgres'),
        database: config.get('DB_NAME', 'familycart'),
        entities: [UserEntity, FamilyEntity, ShoppingListEntity, ShoppingItemEntity, ExpenseEntity],
        synchronize: config.get('NODE_ENV') !== 'production',
      }),
    }),
    UsersModule,
    AuthModule,
    FamilyModule,
    ListModule,
  ],
})
export class AppModule {}
