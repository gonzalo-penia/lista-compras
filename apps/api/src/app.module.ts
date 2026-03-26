import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { RedisModule } from './redis/redis.module';
import { UsersModule } from './users/users.module';
import { FamilyModule } from './families/family.module';
import { ListModule } from './lists/list.module';
import { UserEntity } from './users/user.entity';
import { FamilyEntity } from './families/family.entity';
import { ShoppingListEntity } from './lists/shopping-list.entity';
import { ShoppingItemEntity } from './lists/shopping-item.entity';
import { ExpenseEntity } from './lists/expense.entity';
import { RefreshTokenEntity } from './auth/refresh-token.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    RedisModule,
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000,  // ventana de 1 minuto
        limit: 60,    // 60 requests por minuto por IP
      },
      {
        name: 'strict',
        ttl: 60_000,  // ventana de 1 minuto
        limit: 5,     // 5 intentos por minuto (para join de familia)
      },
    ]),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get('DB_USER', 'postgres'),
        password: config.get('DB_PASS', 'postgres'),
        database: config.get('DB_NAME', 'familycart'),
        entities: [UserEntity, FamilyEntity, ShoppingListEntity, ShoppingItemEntity, ExpenseEntity, RefreshTokenEntity],
        synchronize: config.get('NODE_ENV') !== 'production',
      }),
    }),
    UsersModule,
    AuthModule,
    FamilyModule,
    ListModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
