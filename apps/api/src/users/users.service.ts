import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from './user.entity';

export interface GoogleProfile {
  googleId: string;
  email: string;
  name: string;
  picture?: string;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly repo: Repository<UserEntity>,
  ) {}

  async findOrCreate(profile: GoogleProfile): Promise<UserEntity> {
    let user = await this.repo.findOneBy({ googleId: profile.googleId });
    if (!user) {
      user = this.repo.create(profile);
      await this.repo.save(user);
    }
    return user;
  }

  async findById(id: string): Promise<UserEntity | null> {
    return this.repo.findOneBy({ id });
  }
}
