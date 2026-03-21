import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { FamilyEntity } from '../families/family.entity';
import { ShoppingItemEntity } from './shopping-item.entity';
import { ExpenseEntity } from './expense.entity';

@Entity('shopping_lists')
export class ShoppingListEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @ManyToOne(() => FamilyEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'family_id' })
  family!: FamilyEntity;

  @Index('idx_shopping_lists_family_id')
  @Column({ name: 'family_id' })
  familyId!: string;

  @Column({ name: 'track_expenses', default: false })
  trackExpenses!: boolean;

  @Column({ default: false })
  settled!: boolean;

  @OneToMany(() => ShoppingItemEntity, (item) => item.list, { cascade: true })
  items!: ShoppingItemEntity[];

  @OneToMany(() => ExpenseEntity, (expense) => expense.list, { cascade: true })
  expenses!: ExpenseEntity[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
