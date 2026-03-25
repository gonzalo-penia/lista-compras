import { Controller, Get, Post, Body, Req, Res, UseGuards, HttpCode, HttpStatus, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { UserEntity } from '../users/user.entity';

const COOKIE_NAME = 'access_token';
const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/',
};

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  googleLogin() {
    // Passport redirige a Google automáticamente
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  googleCallback(@Req() req: Request, @Res() res: Response) {
    const user = req.user as UserEntity;
    const isMobile = req.query.state === 'mobile';

    if (isMobile) {
      // Flujo mobile: generar un auth code temporal (no el JWT)
      // La app intercambia el code por el JWT real vía POST /auth/exchange
      const authCode = this.authService.createAuthCode(user.id);
      return res.redirect(
        `familycart://auth/callback?code=${encodeURIComponent(authCode)}`,
      );
    }

    // Flujo web: comportamiento original (cookie + redirect)
    const { accessToken } = this.authService.login(user);
    const webUrl = this.config.get('WEB_URL', 'http://localhost:3000');
    const isProduction = this.config.get('NODE_ENV') === 'production';

    res.cookie(COOKIE_NAME, accessToken, {
      ...COOKIE_OPTIONS,
      secure: isProduction,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
    });

    res.redirect(`${webUrl}/auth/callback`);
  }

  @Post('exchange')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  async exchange(@Body() body: { code: string }) {
    if (!body.code || typeof body.code !== 'string') {
      throw new UnauthorizedException('Code requerido');
    }
    const result = await this.authService.exchangeAuthCode(body.code);
    if (!result) {
      throw new UnauthorizedException('Código inválido o expirado');
    }
    return result;
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() req: Request) {
    return req.user;
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(COOKIE_NAME, COOKIE_OPTIONS);
    return { ok: true };
  }
}
