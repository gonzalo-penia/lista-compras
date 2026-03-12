import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { UserEntity } from '../users/user.entity';

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
    const { accessToken, user } = this.authService.login(req.user as UserEntity);
    const webUrl = this.config.get('WEB_URL', 'http://localhost:3000');

    // Redirige al frontend con el token como query param
    // El frontend lo captura, lo guarda en Zustand y limpia la URL
    const redirectUrl = new URL('/auth/callback', webUrl);
    redirectUrl.searchParams.set('token', accessToken);
    redirectUrl.searchParams.set('name', user.name);
    redirectUrl.searchParams.set('email', user.email);
    if (user.picture) redirectUrl.searchParams.set('picture', user.picture);

    res.redirect(redirectUrl.toString());
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() req: Request) {
    return req.user;
  }
}
