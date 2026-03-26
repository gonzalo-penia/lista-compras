import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { UserEntity } from '../users/user.entity';

const ACCESS_COOKIE = 'access_token';
const REFRESH_COOKIE = 'refresh_token';
const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/',
};
const ACCESS_TOKEN_MAX_AGE = 2 * 60 * 60 * 1000;        // 2h
const REFRESH_TOKEN_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30d

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
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const user = req.user as UserEntity;
    const isMobile = req.query.state === 'mobile';

    if (isMobile) {
      const authCode = this.authService.createAuthCode(user.id);
      return res.redirect(
        `familycart://auth/callback?code=${encodeURIComponent(authCode)}`,
      );
    }

    // Flujo web: cookie de acceso + cookie de refresh
    const { accessToken, refreshToken } = await this.authService.login(user);
    const webUrl = this.config.get('WEB_URL', 'http://localhost:3000');
    const isProduction = this.config.get('NODE_ENV') === 'production';
    const secureCookieOpts = { ...COOKIE_OPTIONS, secure: isProduction };

    res.cookie(ACCESS_COOKIE, accessToken, {
      ...secureCookieOpts,
      maxAge: ACCESS_TOKEN_MAX_AGE,
    });
    res.cookie(REFRESH_COOKIE, refreshToken, {
      ...secureCookieOpts,
      maxAge: REFRESH_TOKEN_MAX_AGE,
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

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ strict: { ttl: 60_000, limit: 10 } })
  async refresh(
    @Body() body: { refreshToken?: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const rawToken = body.refreshToken ?? req.cookies?.[REFRESH_COOKIE];
    if (!rawToken || typeof rawToken !== 'string') {
      throw new UnauthorizedException();
    }

    const result = await this.authService.refreshAccessToken(rawToken);
    if (!result) {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }

    // Flujo web (sin refreshToken en body): responder con cookies
    if (!body.refreshToken) {
      const isProduction = this.config.get('NODE_ENV') === 'production';
      res.cookie(ACCESS_COOKIE, result.accessToken, {
        ...COOKIE_OPTIONS,
        secure: isProduction,
        maxAge: ACCESS_TOKEN_MAX_AGE,
      });
      return { user: result.user };
    }

    // Flujo mobile: devolver tokens en el body
    return result;
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() req: Request) {
    return req.user;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async logout(
    @Body() body: { refreshToken?: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const rawToken = body.refreshToken ?? req.cookies?.[REFRESH_COOKIE];
    if (rawToken) {
      await this.authService.revokeRefreshToken(rawToken);
    }
    res.clearCookie(ACCESS_COOKIE, COOKIE_OPTIONS);
    res.clearCookie(REFRESH_COOKIE, COOKIE_OPTIONS);
    return { ok: true };
  }
}
