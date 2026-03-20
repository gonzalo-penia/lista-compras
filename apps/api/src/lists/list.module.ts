import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShoppingListEntity } from './shopping-list.entity';
import { ShoppingItemEntity } from './shopping-item.entity';
import { ExpenseEntity } from './expense.entity';
import { ListService } from './list.service';
import { ListGateway } from './list.gateway';
import { ListController } from './list.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ShoppingListEntity, ShoppingItemEntity, ExpenseEntity]),
    AuthModule, // provee JwtModule exportado
  ],
  controllers: [ListController],
  providers: [ListService, ListGateway],
})
export class ListModule {}
