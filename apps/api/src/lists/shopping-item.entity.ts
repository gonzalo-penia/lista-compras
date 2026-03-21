import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ShoppingListEntity } from './shopping-list.entity';

@Index('idx_shopping_items_list_checked', ['listId', 'checked'])
@Entity('shopping_items')
export class ShoppingItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ nullable: true, type: 'numeric' })
  quantity!: number | null;

  @Column({ type: 'varchar', nullable: true })
  unit!: string | null;

  @Column({ default: false })
  checked!: boolean;

  @Column({ name: 'checked_by', type: 'varchar', nullable: true })
  checkedBy!: string | null;

  @Index('idx_shopping_items_created_by')
  @Column({ name: 'created_by' })
  createdBy!: string;

  @ManyToOne(() => ShoppingListEntity, (list) => list.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'list_id' })
  list!: ShoppingListEntity;

  @Index('idx_shopping_items_list_id')
  @Column({ name: 'list_id' })
  listId!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
