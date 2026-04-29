import { PrismaClient, JobCategory } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding...");
  const adminHash = await bcrypt.hash("Admin123!", 12);
  const userHash = await bcrypt.hash("User1234!", 12);

  await prisma.user.upsert({
    where: { email: "admin@taskhub.az" }, update: {},
    create: {
      email: "admin@taskhub.az", username: "admin", fullName: "Platform Admin",
      passwordHash: adminHash, dateOfBirth: new Date("1995-01-01"),
      role: "ADMIN", emailVerified: true, verificationStatus: "VERIFIED", city: "Bakı",
    },
  });
  await prisma.user.upsert({
    where: { email: "ali@taskhub.az" }, update: {},
    create: {
      email: "ali@taskhub.az", username: "ali_worker", fullName: "Əli Hüseynov",
      passwordHash: userHash, dateOfBirth: new Date("2002-05-15"), city: "Bakı",
      bio: "IT mütəxəssisi, kompüter təmiri və proqram qurulumu üzrə təcrübəli.",
    },
  });
  await prisma.user.upsert({
    where: { email: "leyla@taskhub.az" }, update: {},
    create: {
      email: "leyla@taskhub.az", username: "leyla_emp", fullName: "Leyla Məmmədova",
      passwordHash: userHash, dateOfBirth: new Date("1998-09-20"), city: "Bakı",
    },
  });

  const skills = [
    { name: "Ev təmizliyi", category: "HOME_SERVICES" as JobCategory },
    { name: "Santexnika", category: "HOME_SERVICES" as JobCategory },
    { name: "Kuryer xidməti", category: "DELIVERY" as JobCategory },
    { name: "Kompüter təmiri", category: "TECHNICAL" as JobCategory },
    { name: "Veb sayt qurulması", category: "TECHNICAL" as JobCategory },
    { name: "Riyaziyyat dərsləri", category: "EDUCATION" as JobCategory },
    { name: "İngilis dili dərsi", category: "EDUCATION" as JobCategory },
    { name: "Foto/video çəkilişi", category: "EVENTS" as JobCategory },
    { name: "DJ xidməti", category: "EVENTS" as JobCategory },
  ];
  for (const s of skills) await prisma.skill.upsert({ where: { name: s.name }, update: {}, create: s });

  console.log("✅ Seed complete");
  console.log("   Admin: admin@taskhub.az / Admin123!");
  console.log("   User1: ali@taskhub.az / User1234!");
  console.log("   User2: leyla@taskhub.az / User1234!");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
