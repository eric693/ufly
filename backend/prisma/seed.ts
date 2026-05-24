import { PrismaClient } from '@prisma/client'
import { v4 as uuidv4 } from 'uuid'

const prisma = new PrismaClient()

async function main() {
  const count = await prisma.driver.count()
  if (count > 0) { console.log('Already seeded'); return }

  await prisma.driver.createMany({
    data: [
      { id: uuidv4(), name: '王小明', phone: '0912-111-001', area: '士林區', status: 'busy',    rating: 4.9, totalTrips: 234, lat: 25.0880, lng: 121.5219 },
      { id: uuidv4(), name: '陳美玲', phone: '0912-111-002', area: '內湖區', status: 'online',  rating: 4.8, totalTrips: 187, lat: 25.0793, lng: 121.5883 },
      { id: uuidv4(), name: '李大華', phone: '0912-111-003', area: '中正區', status: 'busy',    rating: 4.7, totalTrips: 156, lat: 25.0435, lng: 121.5116 },
      { id: uuidv4(), name: '林志遠', phone: '0912-111-004', area: '大安區', status: 'online',  rating: 4.9, totalTrips: 298, lat: 25.0268, lng: 121.5432 },
      { id: uuidv4(), name: '張淑芬', phone: '0912-111-005', area: '中和區', status: 'offline', rating: 4.6, totalTrips: 112, lat: 24.9965, lng: 121.5033 },
      { id: uuidv4(), name: '黃建國', phone: '0912-111-006', area: '文山區', status: 'online',  rating: 4.8, totalTrips: 203, lat: 24.9991, lng: 121.5672 },
    ],
  })

  // Admin user
  await prisma.user.upsert({
    where: { email: 'admin@ufly.tw' },
    update: {},
    create: {
      id: uuidv4(),
      name: 'Admin',
      email: 'admin@ufly.tw',
      role: 'admin',
    },
  })

  console.log('Seeded 6 drivers + admin user')
}

main().finally(() => prisma.$disconnect())
