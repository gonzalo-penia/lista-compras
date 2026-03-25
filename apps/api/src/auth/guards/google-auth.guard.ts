import { ExecutionContext, Injectable, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

const ALLOWED_REDIRECT_SCHEMES = ['familycart', 'http', 'https'];
const MOBILE_DEEP_LINK_PATH = 'auth/callback';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  constructor(private readonly config: ConfigService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    this.validateRedirectUri(req);
    return super.canActivate(context) as Promise<boolean>;
  }

  private validateRedirectUri(req: Request): void {
    const redirectUri = req.query.redirect_uri as string | undefined;
    if (!redirectUri) return;

    try {
      const url = new URL(redirectUri);
      if (!ALLOWED_REDIRECT_SCHEMES.includes(url.protocol.replace(/:$/, ''))) {
        throw new BadRequestException('Scheme de redirect_uri no permitido');
      }
      if (url.protocol === 'familycart:') {
        if (url.pathname !== `/${MOBILE_DEEP_LINK_PATH}` && url.pathname !== `//${MOBILE_DEEP_LINK_PATH}`) {
          throw new BadRequestException('Path de redirect_uri no permitido');
        }
      } else {
        const allowedDomains = [
          this.config.get('WEB_URL', 'http://localhost:3000'),
          this.config.get('API_URL', 'http://localhost:3001'),
        ].map((u) => {
          try { return new URL(u).hostname; } catch { return u; }
        });
        if (!allowedDomains.includes(url.hostname)) {
          throw new BadRequestException('Dominio de redirect_uri no permitido');
        }
      }
    } catch (e) {
      if (e instanceof BadRequestException) throw e;
      throw new BadRequestException('redirect_uri inválido');
    }
  }

  getAuthenticateOptions(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<Request>();
    if (req.query.mobile === '1') {
      return { state: 'mobile' };
    }
    return {};
  }
}
