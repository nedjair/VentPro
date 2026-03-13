import { PrismaClient, User } from '@prisma/client';

export enum AuditAction {
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  CREATE_USER = 'CREATE_USER',
  UPDATE_USER = 'UPDATE_USER',
  DELETE_USER = 'DELETE_USER',
  RESET_PASSWORD = 'RESET_PASSWORD',
  // Add other actions as needed
}

export class AuditLogService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async logAction(
    actor: User,
    action: AuditAction,
    targetId?: string,
    details?: object
  ) {
    await this.prisma.auditLog.create({
      data: {
        actorId: actor.id,
        action,
        targetId,
        details,
      },
    });
  }
}