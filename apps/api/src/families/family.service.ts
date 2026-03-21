import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { FamilyEntity } from './family.entity';
import { UserEntity } from '../users/user.entity';

@Injectable()
export class FamilyService {
  constructor(
    @InjectRepository(FamilyEntity)
    private readonly familyRepo: Repository<FamilyEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
  ) {}

  private async generateUniqueInviteCode(): Promise<string> {
    let code: string;
    let exists: FamilyEntity | null;
    do {
      code = randomBytes(4).toString('hex').toUpperCase(); // e.g. "A3F9B2C1"
      exists = await this.familyRepo.findOneBy({ inviteCode: code });
    } while (exists);
    return code;
  }

  async create(ownerId: string, name: string): Promise<FamilyEntity> {
    const owner = await this.userRepo.findOneBy({ id: ownerId });
    if (!owner) throw new NotFoundException('User not found');

    const inviteCode = await this.generateUniqueInviteCode();

    const family = this.familyRepo.create({
      name,
      inviteCode,
      ownerId,
      members: [owner],
    });

    return this.familyRepo.save(family);
  }

  async join(userId: string, inviteCode: string): Promise<FamilyEntity> {
    const family = await this.familyRepo.findOne({
      where: { inviteCode },
      relations: ['members'],
    });
    if (!family) throw new NotFoundException('Invalid invite code');

    if (family.members.some((m) => m.id === userId)) {
      throw new ConflictException('Already a member of this family');
    }

    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('User not found');

    family.members.push(user);
    return this.familyRepo.save(family);
  }

  async findByMember(userId: string): Promise<FamilyEntity[]> {
    return this.familyRepo
      .createQueryBuilder('family')
      .innerJoin('family.members', 'filterMember', 'filterMember.id = :userId', { userId })
      .leftJoinAndSelect('family.members', 'members')
      .orderBy('family.createdAt', 'DESC')
      .getMany();
  }

  async findById(familyId: string): Promise<FamilyEntity> {
    const family = await this.familyRepo.findOne({
      where: { id: familyId },
      relations: ['members'],
    });
    if (!family) throw new NotFoundException('Family not found');
    return family;
  }

  async isMember(userId: string, familyId: string): Promise<boolean> {
    const count = await this.familyRepo
      .createQueryBuilder('family')
      .innerJoin('family.members', 'member', 'member.id = :userId', { userId })
      .where('family.id = :familyId', { familyId })
      .getCount();
    return count > 0;
  }
}
