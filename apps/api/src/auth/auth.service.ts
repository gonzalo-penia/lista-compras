import { Injectable, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes, createHash } from 'crypto';
import type { Redis } from 'ioredis';
import { UserEntity } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { RefreshTokenEntity } from './refresh-token.entity';
import { REDIS_CLIENT } from '../redis/redis.module';

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    picture?: string;
  };
}

const AUTH_CODE_TTL_S = 300;           // 5 minutos
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 días

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    @InjectRepository(RefreshTokenEntity)
    private readonly refreshTokenRepo: Repository<RefreshTokenEntity>,
    @Inject(REDIS_CLIENT)
    private readonly redis: Redis,
  ) {}

  async login(user: UserEntity): Promise<AuthResponse> {
    const payload = { sub: user.id, email: user.email };
    const refreshToken = await this.createRefreshToken(user.id);
    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
      },
    };
  }

  async refreshAccessToken(rawToken: string): Promise<Omit<AuthResponse, 'refreshToken'> | null> {
    const tokenHash = this.hashToken(rawToken);
    const entity = await this.refreshTokenRepo.findOne({
      where: { tokenHash },
      relations: ['user'],
    });

    if (!entity) return null;
    if (entity.revokedAt) return null;
    if (entity.expiresAt < new Date()) {
      await this.refreshTokenRepo.remove(entity);
      return null;
    }

    const payload = { sub: entity.user.id, email: entity.user.email };
    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: entity.user.id,
        email: entity.user.email,
        name: entity.user.name,
        picture: entity.user.picture,
      },
    };
  }

  async revokeRefreshToken(rawToken: string): Promise<void> {
    const tokenHash = this.hashToken(rawToken);
    await this.refreshTokenRepo.update({ tokenHash }, { revokedAt: new Date() });
  }

  createAuthCode(userId: string): string {
    const code = randomBytes(24).toString('base64url');
    // Almacenado en Redis con TTL nativo — no se pierde en reinicios
    void this.redis.set(`auth:code:${code}`, userId, 'EX', AUTH_CODE_TTL_S);
    return code;
  }

  async exchangeAuthCode(code: string): Promise<AuthResponse | null> {
    const key = `auth:code:${code}`;

    // GET + DEL: si dos requests llegan con el mismo code, solo una obtiene el userId
    const userId = await this.redis.get(key);
    if (!userId) return null;
    await this.redis.del(key);

    const user = await this.usersService.findById(userId);
    if (!user) return null;

    return this.login(user);
  }

  private async createRefreshToken(userId: string): Promise<string> {
    const raw = randomBytes(32).toString('base64url');
    const tokenHash = this.hashToken(raw);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
    const entity = this.refreshTokenRepo.create({ tokenHash, userId, expiresAt, revokedAt: null });
    await this.refreshTokenRepo.save(entity);
    return raw;
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
