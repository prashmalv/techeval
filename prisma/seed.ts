import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@rightleft.ai";
  const adminPassword = process.env.ADMIN_PASSWORD || "RLAdmin@2024";

  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (!existing) {
    const hashed = await hash(adminPassword, 12);
    await prisma.user.create({
      data: {
        name: "RLAI Admin",
        email: adminEmail,
        password: hashed,
        role: "ADMIN",
      },
    });
    console.log(`✅ Admin account created: ${adminEmail}`);
  } else {
    console.log(`ℹ️  Admin account already exists: ${adminEmail}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
