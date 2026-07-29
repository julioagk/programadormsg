const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const salt = await bcrypt.genSalt(10);

  // 1. Seed standard test user
  const userEmail = 'test@example.com';
  const userPassword = 'password123';
  const existingUser = await prisma.user.findUnique({
    where: { email: userEmail }
  });

  if (!existingUser) {
    const userPasswordHash = await bcrypt.hash(userPassword, salt);
    await prisma.user.create({
      data: {
        email: userEmail,
        name: 'Usuario de Prueba',
        password: userPasswordHash,
        role: 'USER',
        settings: {
          create: {
            minDelay: 20,
            maxDelay: 90,
            timezone: 'UTC'
          }
        }
      }
    });
    console.log(`Usuario estándar ${userEmail} insertado con éxito.`);
  } else {
    console.log(`El usuario estándar ${userEmail} ya existe.`);
  }

  // 2. Seed admin user
  const adminEmail = 'admin@example.com';
  const adminPassword = 'admin123';
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail }
  });

  if (!existingAdmin) {
    const adminPasswordHash = await bcrypt.hash(adminPassword, salt);
    await prisma.user.create({
      data: {
        email: adminEmail,
        name: 'Administrador',
        password: adminPasswordHash,
        role: 'ADMIN',
        settings: {
          create: {
            minDelay: 20,
            maxDelay: 90,
            timezone: 'UTC'
          }
        }
      }
    });
    console.log(`Usuario administrador ${adminEmail} insertado con éxito.`);
  } else {
    console.log(`El usuario administrador ${adminEmail} ya existe.`);
  }

  console.log('--------------------------------------------------');
  console.log('Credenciales de Acceso:');
  console.log(`Usuario estándar:      ${userEmail} / ${userPassword}`);
  console.log(`Administrador:         ${adminEmail} / ${adminPassword}`);
  console.log('--------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('Error al insertar los usuarios de prueba:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
