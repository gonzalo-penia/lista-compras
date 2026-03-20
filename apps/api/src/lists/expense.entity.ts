import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UserEntity } from '../users/user.entity';
import { ShoppingListEntity } from './shopping-list.entity';

@Entity('expenses')
export class ExpenseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: { to: (v: number) => v, from: (v: string) => Number(v) },
  })
  amount!: number;

  @Column({ type: 'varchar', nullable: true })
  description!: string | null;

  @ManyToOne(() => UserEntity, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Column({ name: 'user_id' })
  userId!: string;

  @ManyToOne(() => ShoppingListEntity, (list) => list.expenses, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'list_id' })
  list!: ShoppingListEntity;

  @Column({ name: 'list_id' })
  listId!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
