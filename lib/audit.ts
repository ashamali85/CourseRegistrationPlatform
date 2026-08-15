import { prisma } from '@/lib/db';

export async function recordAudit(params: {
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  entityName?: string | null;
  details?: string | null;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        actorUserId: params.actorUserId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId ?? null,
        entityName: params.entityName ?? null,
        details: params.details ?? null
      }
    });
  } catch (error) {
    // Never let audit logging break the mutation the user asked for.
    console.error('audit log failed', error);
  }
}
