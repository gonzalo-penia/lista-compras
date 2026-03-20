import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ShoppingListEntity } from './shopping-list.entity';

@Entity('shopping_items')
export class ShoppingItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ nullable: true, type: 'numeric' })
  quantity!: number | null;

  @Column({ nullable: true })
  unit!: string | null;

  @Column({ default: false })
  checked!: boolean;

  @Column({ name: 'checked_by', nullable: true })
  checkedBy!: string | null;

  @Column({ name: 'created_by' })
  createdBy!: string;

  @ManyToOne(() => ShoppingListEntity, (list) => list.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'list_id' })
  list!: ShoppingListEntity;

  @Column({ name: 'list_id' })
  listId!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
