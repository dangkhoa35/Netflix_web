import { prisma } from './prismadb';

type AdminUserDelegate = {
  findUnique: (args: any) => Promise<any>;
  create: (args: any) => Promise<any>;
  update: (args: any) => Promise<any>;
};

export const getAdminUserModel = (): AdminUserDelegate => {
  const adminUser = (prisma as any)?.adminUser;

  if (!adminUser) {
    throw new Error('Prisma client is missing AdminUser model. Run `prisma generate` in web/.');
  }

  return adminUser as AdminUserDelegate;
};
