import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  ManyToMany,
  JoinTable,
  JoinColumn,
} from 'typeorm';
import { UserEntity } from '../users/user.entity';

@Entity('families')
export class FamilyEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ unique: true, name: 'invite_code' })
  inviteCode!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'owner_id' })
  owner!: UserEntity;

  @Column({ name: 'owner_id' })
  ownerId!: string;

  @ManyToMany(() => UserEntity)
  @JoinTable({
    name: 'family_members',
    joinColumn: { name: 'family_id' },
    inverseJoinColumn: { name: 'user_id' },
  })
  members!: UserEntity[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
