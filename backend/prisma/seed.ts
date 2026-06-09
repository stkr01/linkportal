import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

// Exempel-kategoriträd från blueprintens Appendix C.
const categoryTree: Record<string, string[]> = {
  'IT-Network': ['Firewall', 'Wifi', 'Load Balancing', 'DNS / DHCP'],
  'IT-Infra': ['Server', 'Storage', 'Backup', 'SQL'],
  'IT-Security': ['Endpoint / EDR', 'Identity / IAM', 'Certifikat'],
  'IT-Cloud': ['Azure', 'Microsoft 365', 'Övriga SaaS'],
  'IT-Monitoring': ['Dashboards', 'Alerting'],
};

// Underkategorier till "Server" (extra djup nivå).
const serverChildren = ['VMware', 'Hyper-V', 'Physical / iLO-iDRAC'];

async function main() {
  console.log('Seeding LinkPortal...');

  // 1. Admin-användare
  const username = process.env.SEED_ADMIN_USERNAME || 'admin';
  const password = process.env.SEED_ADMIN_PASSWORD || 'ChangeMe123!';
  const displayName = process.env.SEED_ADMIN_DISPLAYNAME || 'IT-Operations Admin';

  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.user.upsert({
    where: { username },
    // Återställ alltid admin till känt läge vid seed (idempotent).
    update: {
      passwordHash,
      displayName,
      role: 'ADMIN',
      isActive: true,
      mustChangePassword: true,
    },
    create: {
      username,
      passwordHash,
      displayName,
      role: 'ADMIN',
      mustChangePassword: true,
    },
  });
  console.log(`Admin-användare klar: ${admin.username}`);

  // 2. Kategoriträd
  for (const [parentName, children] of Object.entries(categoryTree)) {
    const parent = await prisma.category.upsert({
      where: { parentId_name: { parentId: null as unknown as number, name: parentName } },
      update: {},
      create: { name: parentName },
    }).catch(async () => {
      // Fallback om unique-upsert med null parentId krånglar
      const existing = await prisma.category.findFirst({ where: { name: parentName, parentId: null } });
      if (existing) return existing;
      return prisma.category.create({ data: { name: parentName } });
    });

    for (const childName of children) {
      const child = await prisma.category.findFirst({ where: { name: childName, parentId: parent.id } });
      const created = child ?? (await prisma.category.create({ data: { name: childName, parentId: parent.id } }));

      // Lägg till djupare nivå under "Server"
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
  console.log('Kategoriträd klart.');

  // 3. Ett par exempel-länkar
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
          description: 'Hantering av VMware-kluster och virtuella maskiner.',
          environment: 'PROD',
          owningTeam: 'IT-Infra',
          categoryId: vmware.id,
          addedById: admin.id,
        },
      }));
    // Exempel: markera vCenter som personlig favorit för admin (idempotent).
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
          description: 'Central hantering av brandväggar.',
          environment: 'PROD',
          owningTeam: 'IT-Network',
          categoryId: firewall.id,
          addedById: admin.id,
        },
      });
    }
  }

  console.log('Exempel-länkar klara.');
  console.log('Seed färdig!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
