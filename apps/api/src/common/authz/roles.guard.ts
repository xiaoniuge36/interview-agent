import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Role } from '@interview-agent/contracts';
import type { ProductRequest } from '../context/product-request';
import { PUBLIC_METADATA_KEY } from './public.decorator';
import { ROLES_METADATA_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    if (this.isPublic(context)) return true;

    const allowed = this.reflector.getAllAndOverride<Role[]>(ROLES_METADATA_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!allowed?.length) throw roleDenied('ROUTE_ROLE_POLICY_MISSING');

    const request = context.switchToHttp().getRequest<ProductRequest>();
    if (request.context && allowed.includes(request.context.actor.role)) return true;
    throw roleDenied('ROLE_NOT_ALLOWED');
  }

  private isPublic(context: ExecutionContext): boolean {
    return Boolean(
      this.reflector.getAllAndOverride<boolean>(PUBLIC_METADATA_KEY, [
        context.getHandler(),
        context.getClass(),
      ]),
    );
  }
}

function roleDenied(code: string) {
  return new ForbiddenException({
    code,
    message: '当前身份无权访问该资源。',
  });
}
