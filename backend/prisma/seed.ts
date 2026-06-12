import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

// Example category tree from the blueprint Appendix C.
const categoryTree: Record<string, string[]> = {
  'IT-Network': ['Firewall', 'Wifi', 'Load Balancing', 'DNS / DHCP'],
  'IT-Infra': ['Server', 'Storage', 'Backup', 'SQL'],
  'IT-Security': ['Endpoint / EDR', 'Identity / IAM', 'Certificates'],
  'IT-Cloud': ['Azure', 'Microsoft 365', 'Other SaaS'],
  'IT-Monitoring': ['Dashboards', 'Alerting'],
};

// Subcategories of "Server" (an extra-deep level).
const serverChildren = ['VMware', 'Hyper-V', 'Physical / iLO-iDRAC'];

async function main() {
  console.log('Seeding LinkPortal...');

  // 1. Admin user
  const username = process.env.SEED_ADMIN_USERNAME || 'admin';
  // Dev convenience: fixed password, no forced change. Override via env in prod.
  const password = process.env.SEED_ADMIN_PASSWORD || 'Emiliesk12!';
  const displayName = process.env.SEED_ADMIN_DISPLAYNAME || 'IT-Operations Admin';

  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.user.upsert({
    where: { username },
    // Always reset admin to a known state on seed (idempotent).
    update: {
      passwordHash,
      displayName,
      role: 'ADMIN',
      isActive: true,
      mustChangePassword: false,
    },
    create: {
      username,
      passwordHash,
      displayName,
      role: 'ADMIN',
      mustChangePassword: false,
    },
  });
  console.log(`Admin user ready: ${admin.username}`);

  // 2. Category tree
  for (const [parentName, children] of Object.entries(categoryTree)) {
    const parent = await prisma.category.upsert({
      where: { parentId_name: { parentId: null as unknown as number, name: parentName } },
      update: {},
      create: { name: parentName },
    }).catch(async () => {
      // Fallback if the unique upsert with a null parentId misbehaves.
      const existing = await prisma.category.findFirst({ where: { name: parentName, parentId: null } });
      if (existing) return existing;
      return prisma.category.create({ data: { name: parentName } });
    });

    for (const childName of children) {
      const child = await prisma.category.findFirst({ where: { name: childName, parentId: parent.id } });
      const created = child ?? (await prisma.category.create({ data: { name: childName, parentId: parent.id } }));

      // Add a deeper level under "Server"
      if (childName === 'Server') {
        for (const grandChildName of serverChildren) {
          const existingGc = await prisma.category.findFirst({ where: { name: grandChildName, parentId: created.id } });
          if (!existingGc) {
            await prisma.category.create({ data: { name: grandChildName, parentId: created.id } });
          }
        }
      }
    }
  }
  console.log('Category tree ready.');

  // 3. A couple of example links
  const vmware = await prisma.category.findFirst({ where: { name: 'VMware' } });
  const firewall = await prisma.category.findFirst({ where: { name: 'Firewall' } });

  if (vmware) {
    const exists = await prisma.link.findFirst({ where: { name: 'vCenter', categoryId: vmware.id } });
    const vcenter =
      exists ??
      (await prisma.link.create({
        data: {
          name: 'vCenter',
          url: 'https://vcenter.example.local',
          manageSoftware: 'VMware vSphere Client',
          description: 'Management of VMware clusters and virtual machines.',
          environment: 'PROD',
          owningTeam: 'IT-Infra',
          categoryId: vmware.id,
          addedById: admin.id,
        },
      }));
    // Example: mark vCenter as a personal favorite for admin (idempotent).
    await prisma.userFavorite.upsert({
      where: { userId_linkId: { userId: admin.id, linkId: vcenter.id } },
      update: {},
      create: { userId: admin.id, linkId: vcenter.id },
    });
  }

  if (firewall) {
    const exists = await prisma.link.findFirst({ where: { name: 'FortiManager', categoryId: firewall.id } });
    if (!exists) {
      await prisma.link.create({
        data: {
          name: 'FortiManager',
          url: 'https://fortimanager.example.local',
          manageSoftware: 'Fortinet FortiManager',
          description: 'Central management of firewalls.',
          environment: 'PROD',
          owningTeam: 'IT-Network',
          categoryId: firewall.id,
          addedById: admin.id,
        },
      });
    }
  }

  console.log('Example links ready.');
  console.log('Seed complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
