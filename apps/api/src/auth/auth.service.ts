import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'crypto';
import { UserEntity } from '../users/user.entity';
import { UsersService } from '../users/users.service';

interface AuthCode {
  userId: string;
  expiresAt: number;
  used: boolean;
}

export interface AuthResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    picture?: string;
  };
}

@Injectable()
export class AuthService {
  private readonly authCodes = new Map<string, AuthCode>();
  private readonly CODE_TTL_MS = 5 * 60 * 1000; // 5 minutos

  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  login(user: UserEntity): AuthResponse {
    const payload = { sub: user.id, email: user.email };
    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
      },
    };
  }

  createAuthCode(userId: string): string {
    const code = randomBytes(24).toString('base64url');
    this.authCodes.set(code, {
      userId,
      expiresAt: Date.now() + this.CODE_TTL_MS,
      used: false,
    });
    this.cleanupExpiredCodes();
    return code;
  }

  async exchangeAuthCode(code: string): Promise<{ accessToken: string; user: AuthResponse['user'] } | null> {
    const authCode = this.authCodes.get(code);
    if (!authCode) return null;
    if (authCode.used) return null;
    if (Date.now() > authCode.expiresAt) {
      this.authCodes.delete(code);
      return null;
    }

    // Invalidar el código antes de cualquier await para evitar race conditions
    authCode.used = true;
    this.cleanupExpiredCodes();

    const user = await this.usersService.findById(authCode.userId);
    if (!user) return null;

    return this.login(user);
  }

  private cleanupExpiredCodes(): void {
    const now = Date.now();
    for (const [code, data] of this.authCodes.entries()) {
      if (data.expiresAt < now || data.used) {
        this.authCodes.delete(code);
      }
    }
  }
}
