const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // ── USERS ──────────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('watermark2026', 10)

  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: 'hrdwatermark@gmail.com' },
      update: {},
      create: { name: 'HRD Watermark', email: 'hrdwatermark@gmail.com', hashedPassword: passwordHash, role: 'OWNER', divisi: 'EVENT', employeeStatus: 'ACTIVE' },
    }),
    prisma.user.upsert({
      where: { email: 'wulan@watermark.co.id' },
      update: {},
      create: { name: 'Wulan', email: 'wulan@watermark.co.id', hashedPassword: passwordHash, role: 'PROJECT_MANAGER', jobTitle: 'Project Manager', divisi: 'EVENT', employeeStatus: 'ACTIVE', phone: '+62 877-2256-9856' },
    }),
    prisma.user.upsert({
      where: { email: 'irham@watermark.co.id' },
      update: {},
      create: { name: 'Irham', email: 'irham@watermark.co.id', hashedPassword: passwordHash, role: 'PROJECT_MANAGER', jobTitle: 'Project Manager', divisi: 'EVENT', employeeStatus: 'ACTIVE', phone: '+62 812-8464-6336' },
    }),
    prisma.user.upsert({
      where: { email: 'doddi@watermark.co.id' },
      update: {},
      create: { name: 'Doddi', email: 'doddi@watermark.co.id', hashedPassword: passwordHash, role: 'PRODUCTION', jobTitle: 'Production', divisi: 'EVENT', employeeStatus: 'ACTIVE', phone: '+62 821-1092-9897' },
    }),
    prisma.user.upsert({
      where: { email: 'reghy@watermark.co.id' },
      update: {},
      create: { name: 'Reghy', email: 'reghy@watermark.co.id', hashedPassword: passwordHash, role: 'PRODUCTION', jobTitle: 'Production', divisi: 'EVENT', employeeStatus: 'ACTIVE', phone: '+62 813-1145-2173' },
    }),
    prisma.user.upsert({
      where: { email: 'putra@watermark.co.id' },
      update: {},
      create: { name: 'Putra', email: 'putra@watermark.co.id', hashedPassword: passwordHash, role: 'PROJECT_OFFICER', jobTitle: 'Project Officer', divisi: 'EVENT', employeeStatus: 'ACTIVE', phone: '+62 838-5242-5984' },
    }),
    prisma.user.upsert({
      where: { email: 'boni@watermark.co.id' },
      update: {},
      create: { name: 'Boni', email: 'boni@watermark.co.id', hashedPassword: passwordHash, role: 'INTERNSHIP', jobTitle: 'Internship Event', divisi: 'EVENT', employeeStatus: 'ACTIVE', phone: '+62 812-1308-5657' },
    }),
    prisma.user.upsert({
      where: { email: 'eca@watermark.co.id' },
      update: {},
      create: { name: 'Eca', email: 'eca@watermark.co.id', hashedPassword: passwordHash, role: 'INTERNSHIP', jobTitle: 'Internship Event', divisi: 'EVENT', employeeStatus: 'ACTIVE', phone: '+62 819-1984-4817' },
    }),
    prisma.user.upsert({
      where: { email: 'jennifer@watermark.co.id' },
      update: {},
      create: { name: 'Jennifer', email: 'jennifer@watermark.co.id', hashedPassword: passwordHash, role: 'CREATIVE_LEAD', jobTitle: 'Creative Lead', divisi: 'CREATIVE', employeeStatus: 'ACTIVE', phone: '+62 877-8211-7228' },
    }),
    prisma.user.upsert({
      where: { email: 'saip@watermark.co.id' },
      update: {},
      create: { name: 'Saip', email: 'saip@watermark.co.id', hashedPassword: passwordHash, role: 'GRAPHIC_DESIGNER', jobTitle: 'Graphic Designer', divisi: 'CREATIVE', employeeStatus: 'ACTIVE', phone: '+62 822-6138-0964' },
    }),
    prisma.user.upsert({
      where: { email: 'kres@watermark.co.id' },
      update: {},
      create: { name: 'Kres', email: 'kres@watermark.co.id', hashedPassword: passwordHash, role: 'STAGE_DESIGNER', jobTitle: 'Stage Designer', divisi: 'CREATIVE', employeeStatus: 'ACTIVE', phone: '+62 822-1982-3924' },
    }),
    prisma.user.upsert({
      where: { email: 'saffira@watermark.co.id' },
      update: {},
      create: { name: 'Saffira', email: 'saffira@watermark.co.id', hashedPassword: passwordHash, role: 'STAGE_DESIGNER', jobTitle: 'Stage Designer', divisi: 'CREATIVE', employeeStatus: 'ACTIVE', phone: '+62 857-5957-4265' },
    }),
    prisma.user.upsert({
      where: { email: 'kay@watermark.co.id' },
      update: {},
      create: { name: 'Kay', email: 'kay@watermark.co.id', hashedPassword: passwordHash, role: 'INTERNSHIP', jobTitle: 'Internship Creative', divisi: 'CREATIVE', employeeStatus: 'ACTIVE', phone: '+62 859-5003-0491' },
    }),
    prisma.user.upsert({
      where: { email: 'sultan@watermark.co.id' },
      update: {},
      create: { name: 'Sultan', email: 'sultan@watermark.co.id', hashedPassword: passwordHash, role: 'CONTENT_CREATOR', jobTitle: 'Content Creator', divisi: 'EVENT', employeeStatus: 'ACTIVE', phone: '+62 815-1138-6389' },
    }),
    prisma.user.upsert({
      where: { email: 'bastya@watermark.co.id' },
      update: {},
      create: { name: 'Bastya', email: 'bastya@watermark.co.id', hashedPassword: passwordHash, role: 'PROJECT_MANAGER', jobTitle: 'Project Manager', divisi: 'EVENT', employeeStatus: 'ACTIVE' },
    }),
    prisma.user.upsert({
      where: { email: 'ica@watermark.co.id' },
      update: {},
      create: { name: 'Ica', email: 'ica@watermark.co.id', hashedPassword: passwordHash, role: 'PROJECT_MANAGER', jobTitle: 'Project Manager', divisi: 'EVENT', employeeStatus: 'NOT_ACTIVE', phone: '+62 896-0829-3749' },
    }),
    prisma.user.upsert({
      where: { email: 'david@watermark.co.id' },
      update: { role: 'DIRECTOR', jobTitle: 'Event Director' },
      create: { name: 'David', email: 'david@watermark.co.id', hashedPassword: passwordHash, role: 'DIRECTOR', jobTitle: 'Event Director', divisi: 'EVENT', employeeStatus: 'ACTIVE' },
    }),
    prisma.user.upsert({
      where: { email: 'fakhril@watermark.co.id' },
      update: {},
      create: { name: 'Fakhril', email: 'fakhril@watermark.co.id', hashedPassword: passwordHash, role: 'DIRECTOR', jobTitle: 'Creative Director', divisi: 'CREATIVE', employeeStatus: 'ACTIVE' },
    }),
    prisma.user.upsert({
      where: { email: 'gunadarma@watermark.co.id' },
      update: {},
      create: { name: 'Gunadarma', email: 'gunadarma@watermark.co.id', hashedPassword: passwordHash, role: 'DIRECTOR', jobTitle: 'PH Director', divisi: 'PH', employeeStatus: 'ACTIVE' },
    }),
    prisma.user.upsert({
      where: { email: 'anung@watermark.co.id' },
      update: {},
      create: { name: 'Anung', email: 'anung@watermark.co.id', hashedPassword: passwordHash, role: 'DIRECTOR', jobTitle: 'Finance & HRGA Director', divisi: 'FINANCE_HRGA', employeeStatus: 'ACTIVE' },
    }),
    prisma.user.upsert({
      where: { email: 'antoni@watermark.co.id' },
      update: {},
      create: { name: 'Antoni', email: 'antoni@watermark.co.id', hashedPassword: passwordHash, role: 'FINANCE', jobTitle: 'Finance & HRGA', divisi: 'FINANCE_HRGA', employeeStatus: 'ACTIVE' },
    }),
    prisma.user.upsert({
      where: { email: 'bambang@watermark.co.id' },
      update: { jobTitle: 'Direktur Utama' },
      create: { name: 'Bambang R.', email: 'bambang@watermark.co.id', hashedPassword: passwordHash, role: 'OWNER', jobTitle: 'Direktur Utama', divisi: 'EVENT', employeeStatus: 'ACTIVE' },
    }),
    prisma.user.upsert({
      where: { email: 'bagastya@watermark.co.id' },
      update: {},
      create: { name: 'Bagastya', email: 'bagastya@watermark.co.id', hashedPassword: passwordHash, role: 'PROJECT_MANAGER', jobTitle: 'Account Exe / Project Mgr', divisi: 'EVENT', employeeStatus: 'ACTIVE' },
    }),
    prisma.user.upsert({
      where: { email: 'syaifullah@watermark.co.id' },
      update: {},
      create: { name: 'Syaifullah', email: 'syaifullah@watermark.co.id', hashedPassword: passwordHash, role: 'GRAPHIC_DESIGNER', jobTitle: 'Design Graphic', divisi: 'CREATIVE', employeeStatus: 'ACTIVE' },
    }),
    prisma.user.upsert({
      where: { email: 'noval@watermark.co.id' },
      update: {},
      create: { name: 'Noval', email: 'noval@watermark.co.id', hashedPassword: passwordHash, role: 'CONTENT_CREATOR', jobTitle: 'Motion Graphic', divisi: 'CREATIVE', employeeStatus: 'ACTIVE' },
    }),
    prisma.user.upsert({
      where: { email: 'jamal@watermark.co.id' },
      update: {},
      create: { name: 'Jamal', email: 'jamal@watermark.co.id', hashedPassword: passwordHash, role: 'PRODUCTION', jobTitle: 'Video Production', divisi: 'PH', employeeStatus: 'ACTIVE' },
    }),
    prisma.user.upsert({
      where: { email: 'henri@watermark.co.id' },
      update: {},
      create: { name: 'Henri', email: 'henri@watermark.co.id', hashedPassword: passwordHash, role: 'MEMBER', jobTitle: 'GA & Officer', divisi: 'FINANCE_HRGA', employeeStatus: 'ACTIVE' },
    }),
    prisma.user.upsert({
      where: { email: 'sutrisna@watermark.co.id' },
      update: {},
      create: { name: 'Sutrisna', email: 'sutrisna@watermark.co.id', hashedPassword: passwordHash, role: 'MEMBER', jobTitle: 'GA & Officer', divisi: 'FINANCE_HRGA', employeeStatus: 'ACTIVE' },
    }),
    prisma.user.upsert({
      where: { email: 'bima@watermark.co.id' },
      update: {},
      create: { name: 'Bima', email: 'bima@watermark.co.id', hashedPassword: passwordHash, role: 'FINANCE', jobTitle: 'Finance & HRD', divisi: 'FINANCE_HRGA', employeeStatus: 'ACTIVE' },
    }),
  ])

  const userMap = {}
  users.forEach(u => { userMap[u.name] = u })

  console.log(`✓ ${users.length} users seeded`)

  // ── CLIENTS ────────────────────────────────────────────────────────────
  const clientsData = [
    { name: 'PT Integrasi Transit Jakarta', industry: 'Government-related' },
    { name: 'Taman Safari Indonesia', industry: 'Tourism & Hospitality' },
    { name: 'Panorama JTB', industry: 'MICE' },
    { name: 'HIPMI', industry: 'Organization / Association' },
    { name: 'Coolvita', industry: 'FMCG' },
    { name: 'Pertamina Tugu Insurance', industry: 'Financial & Insurance' },
    { name: 'UD Truck', industry: 'Commercial Automotive' },
    { name: 'Midea', industry: 'Consumer Electronics & Home Appliances' },
    { name: 'Midea MBT', industry: 'HVAC / B2B Engineering Solutions' },
    { name: 'Daikin', industry: 'HVAC' },
    { name: 'Daihatsu Sales Operation', industry: 'Automotive' },
    { name: 'Timberlab', industry: 'Building Materials / Construction' },
    { name: 'Realhe', industry: 'Health & Wellness' },
    { name: 'Isuzu Astra Motor Indonesia', industry: 'Automotive' },
    { name: 'BenQ', industry: 'Technology' },
    { name: 'Astra Daihatsu Motor', industry: 'Automotive Manufacturing' },
    { name: 'PT Unitama', industry: null },
    { name: 'PT Biro Klasifikasi Indonesia (PERSERO)', industry: 'Government-related' },
    { name: 'PT Rintis Sejahtera', industry: 'Bank' },
    { name: 'Shopee', industry: 'E-Commerce' },
    { name: 'Alva', industry: null },
    { name: 'GWM', industry: null },
    { name: 'OLX', industry: 'Otomotif' },
    { name: 'PT Jaya Proteksindo Sakti', industry: null },
    { name: 'PT ID Survey', industry: null },
    { name: 'BAIC', industry: null },
    { name: 'AUDI', industry: null },
    { name: 'ASISI', industry: null },
    { name: 'Indomobil', industry: null },
  ]

  const clientMap = {}
  for (const c of clientsData) {
    const client = await prisma.client.upsert({
      where: { name: c.name },
      update: {},
      create: c,
    })
    clientMap[c.name] = client
  }
  console.log(`✓ ${clientsData.length} clients seeded`)

  // ── PROJECTS ───────────────────────────────────────────────────────────
  const projectsData = [
    // Active pipeline
    { code: 'P-001', name: 'Strategic Deployment', clientName: 'PT Integrasi Transit Jakarta', category: 'MEETING_CONFERENCE', budgetTier: 'LOW', eventComplexity: 'SIMPLE', recommendation: 'MAINTAIN', picName: 'Irham', status: 'HOLD', pitchStatus: 'PITCH', pitchResult: 'NOT_FINAL', members: ['Irham','Doddi','Eca','Jennifer'] },
    { code: 'P-002', name: 'HUT DKI JAKARTA : Fun Run 2026', clientName: 'HIPMI', category: 'ACTIVATION', budgetTier: 'HIGH', eventComplexity: 'COMPLEX', recommendation: 'MAINTAIN', picName: 'Wulan', briefDate: new Date('2026-02-27'), submitDate: new Date('2026-03-30'), pitchDuration: 32, startDate: new Date('2026-06-01'), status: 'HOLD', pitchStatus: 'PITCH', pitchResult: 'NOT_FINAL', members: ['Wulan','Doddi','Jennifer','Saip','Kres','Kay','Saffira'] },
    { code: 'P-003', name: 'Grand Opening BSD Office', clientName: 'Midea MBT', category: 'LAUNCHING', budgetTier: 'MEDIUM', eventComplexity: 'MEDIUM', recommendation: 'MAINTAIN', picName: 'Wulan', briefDate: new Date('2026-01-26'), submitDate: new Date('2026-03-12'), pitchDuration: 46, startDate: new Date('2026-05-17'), endDate: new Date('2026-05-17'), projectDuration: 1, status: 'HOLD', pitchStatus: 'PITCH_PLUS', pitchResult: 'NOT_FINAL', wonLossReason: 'Budget', members: ['Wulan','Reghy','Doddi','Boni','Jennifer','Saip','Kay'] },
    { code: 'P-004', name: 'Mall Activation 2026 - TSI x EV x JA', clientName: 'Taman Safari Indonesia', category: 'ACTIVATION', budgetTier: 'HIGH', eventComplexity: 'COMPLEX', recommendation: 'MAINTAIN', picName: 'Irham', briefDate: new Date('2026-04-01'), submitDate: new Date('2026-04-10'), pitchDuration: 10, startDate: new Date('2026-06-01'), status: 'HOLD', pitchStatus: 'PITCH', pitchResult: 'NOT_FINAL', members: ['Irham','Putra'] },
    { code: 'P-005', name: 'AUDI Customer Gathering', clientName: 'AUDI', category: 'MEETING_CONFERENCE', budgetTier: 'LOW', eventComplexity: 'SIMPLE', recommendation: 'MAINTAIN', picName: 'Wulan', briefDate: new Date('2026-05-26'), submitDate: new Date('2026-06-02'), pitchDuration: 8, startDate: new Date('2026-05-28'), endDate: new Date('2026-06-08'), projectDuration: 12, status: 'PITCHING', pitchStatus: 'PITCH_PLUS', pitchResult: 'NOT_FINAL', members: [] },
    { code: 'P-006', name: 'Mall Activation Spark - Gajah Mada', clientName: 'Taman Safari Indonesia', category: 'ACTIVATION', budgetTier: 'LOW', eventComplexity: 'MEDIUM', recommendation: 'EVALUATE', picName: 'Irham', briefDate: new Date('2026-06-05'), submitDate: new Date('2026-06-09'), pitchDuration: 5, startDate: new Date('2026-06-12'), endDate: new Date('2026-06-21'), projectDuration: 10, status: 'PITCHING', pitchStatus: 'PITCH', members: ['Doddi','Jennifer','Kres','Saffira'] },
    { code: 'P-007', name: 'Prima Executive Gathering', clientName: 'PT Rintis Sejahtera', category: 'MEETING_CONFERENCE', budgetTier: 'HIGH', eventComplexity: 'COMPLEX', recommendation: 'MAINTAIN', picName: 'Irham', briefDate: new Date('2026-03-25'), submitDate: new Date('2026-04-06'), pitchDuration: 13, startDate: new Date('2026-08-06'), endDate: new Date('2026-08-07'), projectDuration: 2, status: 'WAITING_PITCH_RESULT', pitchStatus: 'PITCH', pitchResult: 'NOT_FINAL', members: ['Wulan','Irham','Jennifer','Saip','Saffira','Boni'] },
    { code: 'P-008', name: 'Bintang Rucika', clientName: 'Panorama JTB', category: 'MEETING_CONFERENCE', budgetTier: 'HIGH', eventComplexity: 'MEDIUM', recommendation: 'PRIORITIZE', picName: 'Irham', briefDate: new Date('2026-04-17'), submitDate: new Date('2026-04-23'), pitchDuration: 7, startDate: new Date('2026-04-22'), status: 'WAITING_PITCH_RESULT', pitchStatus: 'PITCH', pitchResult: 'NOT_FINAL', members: ['Wulan','Putra','Eca','Boni','Jennifer','Saip','Kres','Saffira'] },
    { code: 'P-009', name: 'BAIC GIIAS Exhibition', clientName: 'BAIC', category: 'EXHIBITION', budgetTier: 'HIGH', eventComplexity: 'COMPLEX', recommendation: 'MAINTAIN', picName: 'Wulan', briefDate: new Date('2026-05-12'), submitDate: new Date('2026-05-19'), pitchDuration: 8, startDate: new Date('2026-07-30'), endDate: new Date('2026-08-09'), projectDuration: 11, status: 'WAITING_PITCH_RESULT', pitchStatus: 'PITCH', pitchResult: 'NOT_FINAL', members: [] },
    { code: 'P-010', name: 'ASISI Milad Nusantara ke-18', clientName: 'ASISI', category: 'MEETING_CONFERENCE', budgetTier: 'MEDIUM', eventComplexity: 'SIMPLE', recommendation: 'PRIORITIZE', picName: 'Bastya', briefDate: new Date('2026-05-26'), submitDate: new Date('2026-06-02'), pitchDuration: 8, startDate: new Date('2026-05-28'), endDate: new Date('2026-05-31'), projectDuration: 4, status: 'WAITING_PITCH_RESULT', pitchStatus: 'PITCH', pitchResult: 'NOT_FINAL', members: [] },
    { code: 'P-011', name: 'Midea Club Flash Installation Tournament 2026', clientName: 'Midea', category: 'MEETING_CONFERENCE', budgetTier: 'MEDIUM', eventComplexity: 'MEDIUM', recommendation: 'MAINTAIN', picName: 'Irham', briefDate: new Date('2026-06-02'), submitDate: new Date('2026-06-04'), pitchDuration: 3, startDate: new Date('2026-06-02'), endDate: new Date('2026-09-15'), projectDuration: 106, status: 'WAITING_PITCH_RESULT', pitchStatus: 'PITCH', pitchResult: 'NOT_FINAL', members: ['Doddi','Reghy','Putra','Boni'] },
    // Preparation
    { code: 'P-012', name: 'HUT BKI 62', clientName: 'PT Biro Klasifikasi Indonesia (PERSERO)', category: 'INCENTIVE_GATHERING', budgetTier: 'HIGH', eventComplexity: 'MEDIUM', recommendation: 'PRIORITIZE', picName: 'Irham', briefDate: new Date('2026-05-04'), submitDate: new Date('2026-05-31'), pitchDuration: 28, startDate: new Date('2026-07-01'), endDate: new Date('2026-07-01'), projectDuration: 1, status: 'PREPARATION', pitchStatus: 'AUTO_WIN', pitchResult: 'WIN', wonLossReason: 'Budget', members: ['Putra','Jennifer','Wulan'] },
    { code: 'P-013', name: 'Stakeholder Management Samarinda', clientName: 'PT Biro Klasifikasi Indonesia (PERSERO)', category: 'MEETING_CONFERENCE', budgetTier: 'HIGH', eventComplexity: 'MEDIUM', recommendation: 'PRIORITIZE', picName: 'Irham', briefDate: new Date('2026-05-05'), submitDate: new Date('2026-05-15'), pitchDuration: 11, startDate: new Date('2026-05-06'), endDate: new Date('2026-05-15'), projectDuration: 10, status: 'PREPARATION', pitchStatus: 'AUTO_WIN', pitchResult: 'WIN', wonLossReason: 'Budget', members: ['Irham','Doddi','Putra','Boni','Saffira'] },
    // Event Day
    { code: 'P-014', name: 'MBT Training Club', clientName: 'Midea MBT', category: 'MEETING_CONFERENCE', budgetTier: 'LOW', eventComplexity: 'SIMPLE', recommendation: 'MAINTAIN', picName: 'Wulan', briefDate: new Date('2026-02-09'), submitDate: new Date('2026-02-10'), pitchDuration: 2, startDate: new Date('2026-03-01'), endDate: new Date('2026-12-31'), projectDuration: 306, status: 'EVENT_DAY', pitchStatus: 'PITCH_PLUS', pitchResult: 'WIN', wonLossReason: 'Budget', members: ['Wulan','Putra','Eca','Reghy'] },
    // Reporting
    { code: 'P-015', name: 'Marriot Bonvoy', clientName: 'Midea MBT', category: 'SPONSORSHIP', budgetTier: 'LOW', eventComplexity: 'SIMPLE', recommendation: 'MAINTAIN', picName: 'Wulan', briefDate: new Date('2026-03-16'), submitDate: new Date('2026-03-17'), pitchDuration: 2, startDate: new Date('2026-05-17'), endDate: new Date('2026-05-18'), projectDuration: 2, status: 'REPORTING', pitchStatus: 'PITCH', pitchResult: 'WIN', wonLossReason: 'Budget', members: ['Wulan','Putra'] },
    { code: 'P-016', name: 'Daikin Service Partner FY25', clientName: 'Daikin', category: 'MEETING_CONFERENCE', budgetTier: 'HIGH', eventComplexity: 'COMPLEX', recommendation: 'MAINTAIN', picName: 'Wulan', briefDate: new Date('2026-02-20'), submitDate: new Date('2026-03-08'), pitchDuration: 17, startDate: new Date('2026-05-21'), endDate: new Date('2026-05-21'), projectDuration: 1, status: 'REPORTING', pitchStatus: 'PITCH', pitchResult: 'WIN', wonLossReason: 'Budget & Creative', members: ['Wulan','Irham','Doddi','Reghy','Putra','Jennifer','Saip','Kres','Saffira'] },
    { code: 'P-017', name: 'Midea - Dealer Factory Visit & Gala Dinner 2026', clientName: 'Midea', category: 'MEETING_CONFERENCE', budgetTier: 'MEDIUM', eventComplexity: 'MEDIUM', recommendation: 'MAINTAIN', picName: 'Irham', briefDate: new Date('2026-04-09'), submitDate: new Date('2026-04-10'), pitchDuration: 2, startDate: new Date('2026-05-20'), endDate: new Date('2026-05-22'), projectDuration: 3, status: 'REPORTING', pitchStatus: 'PITCH', pitchResult: 'WIN', wonLossReason: 'Budget', members: [] },
    { code: 'P-018', name: 'Daihatsu Kumpul Sahabat Nation Wide 2026', clientName: 'Astra Daihatsu Motor', category: 'MEETING_CONFERENCE', budgetTier: 'MEDIUM', eventComplexity: 'MEDIUM', recommendation: 'MAINTAIN', picName: 'Irham', briefDate: new Date('2026-04-13'), submitDate: new Date('2026-04-17'), pitchDuration: 5, startDate: new Date('2026-05-16'), endDate: new Date('2026-05-16'), projectDuration: 1, status: 'REPORTING', pitchStatus: 'PITCH', pitchResult: 'WIN', wonLossReason: 'Budget', members: [] },
    { code: 'P-019', name: 'Manpower Event Cooking Demo Toshiba', clientName: 'Midea', category: 'EXHIBITION', budgetTier: 'LOW', eventComplexity: 'SIMPLE', recommendation: 'MAINTAIN', picName: 'Irham', briefDate: new Date('2026-05-04'), submitDate: new Date('2026-05-09'), pitchDuration: 6, startDate: new Date('2026-05-09'), status: 'REPORTING', pitchStatus: 'AUTO_WIN', pitchResult: 'WIN', wonLossReason: 'Budget', members: [] },
    // Invoicing
    { code: 'P-020', name: 'Mall Exhibition Surabaya', clientName: 'Daihatsu Sales Operation', category: 'EXHIBITION', budgetTier: 'LOW', eventComplexity: 'SIMPLE', recommendation: 'MAINTAIN', picName: 'Wulan', briefDate: new Date('2026-02-01'), submitDate: new Date('2026-02-06'), pitchDuration: 6, startDate: new Date('2026-04-13'), endDate: new Date('2026-04-19'), projectDuration: 7, status: 'INVOICING', pitchStatus: 'PITCH_PLUS', pitchResult: 'WIN', wonLossReason: 'Budget', members: ['Wulan','Jennifer','Reghy','Boni','Kres'] },
    { code: 'P-021', name: 'Sosialisasi Kecepatan Kapal Cepat Penumpang', clientName: 'PT Biro Klasifikasi Indonesia (PERSERO)', category: 'MEETING_CONFERENCE', budgetTier: 'HIGH', eventComplexity: 'MEDIUM', recommendation: 'PRIORITIZE', picName: 'Irham', briefDate: new Date('2026-04-06'), submitDate: new Date('2026-04-10'), pitchDuration: 5, startDate: new Date('2026-04-27'), endDate: new Date('2026-04-27'), projectDuration: 1, status: 'INVOICING', pitchStatus: 'PITCH_PLUS', pitchResult: 'WIN', wonLossReason: 'Budget', members: ['Irham','Jennifer','Doddi','Putra','Eca','Boni'] },
    // Done
    { code: 'P-022', name: 'Buka Puasa Bersama', clientName: 'Midea MBT', category: 'MEETING_CONFERENCE', budgetTier: 'LOW', eventComplexity: 'SIMPLE', recommendation: 'MAINTAIN', picName: 'Wulan', startDate: new Date('2026-03-02'), endDate: new Date('2026-03-06'), projectDuration: 5, status: 'DONE', pitchStatus: 'PITCH', pitchResult: 'WIN', wonLossReason: 'Budget', members: ['Wulan','Putra'] },
    { code: 'P-023', name: 'Ifex 2026', clientName: 'Timberlab', category: 'EXHIBITION', budgetTier: 'MEDIUM', eventComplexity: 'SIMPLE', recommendation: 'PRIORITIZE', picName: 'Wulan', startDate: new Date('2026-03-02'), endDate: new Date('2026-03-04'), projectDuration: 3, status: 'DONE', pitchStatus: 'PITCH', pitchResult: 'WIN', wonLossReason: 'Budget', members: ['Wulan','Doddi'] },
    { code: 'P-024', name: 'Syukuran Idul Fitri 1446 H', clientName: 'PT Biro Klasifikasi Indonesia (PERSERO)', category: 'MEETING_CONFERENCE', budgetTier: 'MEDIUM', eventComplexity: 'SIMPLE', recommendation: 'PRIORITIZE', picName: 'Irham', briefDate: new Date('2026-03-25'), submitDate: new Date('2026-03-29'), pitchDuration: 5, startDate: new Date('2026-04-06'), endDate: new Date('2026-04-06'), projectDuration: 1, status: 'DONE', pitchStatus: 'PITCH_PLUS', pitchResult: 'WIN', wonLossReason: 'Budget', members: ['Doddi','Reghy','Putra','Boni','Jennifer','Kres','Kay'] },
    { code: 'P-025', name: 'GWM PIK Grand Opening', clientName: 'GWM', category: 'LAUNCHING', budgetTier: 'LOW', eventComplexity: 'SIMPLE', recommendation: 'MAINTAIN', picName: 'Wulan', briefDate: new Date('2026-04-19'), submitDate: new Date('2026-04-21'), pitchDuration: 3, startDate: new Date('2026-04-29'), endDate: new Date('2026-04-29'), projectDuration: 1, status: 'DONE', pitchStatus: 'PITCH_PLUS', pitchResult: 'WIN', wonLossReason: 'Budget', members: [] },
    // Failed
    { code: 'P-026', name: 'ADM Culture Summit 2026', clientName: 'Astra Daihatsu Motor', category: 'MEETING_CONFERENCE', budgetTier: 'LOW', eventComplexity: 'MEDIUM', recommendation: 'EVALUATE', picName: 'Irham', briefDate: new Date('2026-03-16'), submitDate: new Date('2026-04-02'), pitchDuration: 18, startDate: new Date('2026-06-03'), endDate: new Date('2026-06-03'), projectDuration: 1, status: 'FAILED', pitchStatus: 'PITCH', pitchResult: 'LOSE', wonLossReason: 'Budget', members: ['Wulan','Irham','Jennifer','Putra','Saip','Kres','Kay'] },
    { code: 'P-027', name: 'Daikin Dealer Award FY25', clientName: 'Daikin', category: 'MEETING_CONFERENCE', budgetTier: 'HIGH', eventComplexity: 'COMPLEX', recommendation: 'MAINTAIN', picName: 'Wulan', startDate: new Date('2026-05-08'), endDate: new Date('2026-05-08'), projectDuration: 1, status: 'FAILED', pitchStatus: 'PITCH', pitchResult: 'LOSE', wonLossReason: 'Creative', vendorWinner: 'ORVA MOTION', members: ['Wulan','Irham','Jennifer','Doddi','Reghy','Putra','Saip','Kay','Kres','Saffira'] },
    { code: 'P-028', name: 'SPayLater x Jakarta Fair 2026', clientName: 'Shopee', category: 'EXHIBITION', budgetTier: 'HIGH', eventComplexity: 'MEDIUM', recommendation: 'PRIORITIZE', picName: 'Irham', briefDate: new Date('2026-04-02'), submitDate: new Date('2026-04-13'), pitchDuration: 12, startDate: new Date('2026-06-11'), endDate: new Date('2026-07-12'), projectDuration: 32, status: 'FAILED', pitchStatus: 'PITCH', pitchResult: 'LOSE', wonLossReason: 'Budget & Creative', members: ['Wulan','Irham','Jennifer','Kres','Saffira','Saip','Kay','Doddi','Putra','Boni'] },
    { code: 'P-029', name: 'OLX GIIAS 2026', clientName: 'OLX', category: 'EXHIBITION', budgetTier: 'HIGH', eventComplexity: 'COMPLEX', recommendation: 'MAINTAIN', picName: 'Wulan', briefDate: new Date('2026-04-27'), submitDate: new Date('2026-05-10'), pitchDuration: 14, startDate: new Date('2026-07-30'), endDate: new Date('2026-08-09'), projectDuration: 11, status: 'FAILED', pitchStatus: 'PITCH', pitchResult: 'LOSE', members: ['Jennifer','Saip','Putra','Doddi','Wulan','Reghy','Eca','Boni','Kres'] },
    // Canceled
    { code: 'P-030', name: 'Indomobil PIK Showroom Event', clientName: 'Indomobil', category: 'MEETING_CONFERENCE', budgetTier: 'LOW', eventComplexity: 'SIMPLE', recommendation: 'MAINTAIN', picName: 'Bastya', briefDate: new Date('2026-05-29'), submitDate: new Date('2026-06-08'), pitchDuration: 11, startDate: new Date('2026-05-28'), endDate: new Date('2026-06-04'), projectDuration: 8, status: 'CANCELED', pitchStatus: 'CANCEL_PROJECT', pitchResult: 'NOT_FINAL', members: [] },
    // PH (Production House) sample project
    { code: 'P-031', name: 'Company Profile Video - Astra Daihatsu', clientName: 'Astra Daihatsu Motor', category: 'LAUNCHING', budgetTier: 'MEDIUM', eventComplexity: 'MEDIUM', recommendation: 'MAINTAIN', picName: 'Bagastya', briefDate: new Date('2026-06-01'), submitDate: new Date('2026-06-05'), pitchDuration: 4, startDate: new Date('2026-06-15'), endDate: new Date('2026-06-30'), projectDuration: 15, status: 'PREPARATION', pitchStatus: 'AUTO_WIN', pitchResult: 'WIN', division: 'PH', members: ['Jamal', 'Gunadarma', 'Noval'] },
    // Creative division sample project
    { code: 'P-032', name: 'Rebranding Campaign - Midea', clientName: 'Midea', category: 'LAUNCHING', budgetTier: 'MEDIUM', eventComplexity: 'MEDIUM', recommendation: 'PRIORITIZE', picName: 'Wulan', briefDate: new Date('2026-06-03'), submitDate: new Date('2026-06-08'), pitchDuration: 5, startDate: new Date('2026-06-20'), endDate: new Date('2026-07-10'), projectDuration: 20, status: 'PREPARATION', pitchStatus: 'PITCH_PLUS', pitchResult: 'WIN', division: 'CREATIVE', members: ['Jennifer', 'Saip', 'Syaifullah', 'Noval', 'Fakhril'] },
  ]

  let projectCount = 0
  for (const p of projectsData) {
    const client = p.clientName ? clientMap[p.clientName] : null
    const pic = p.picName ? userMap[p.picName] : null

    const project = await prisma.project.upsert({
      where: { code: p.code },
      update: {},
      create: {
        code: p.code,
        name: p.name,
        clientId: client?.id,
        category: p.category,
        budgetTier: p.budgetTier,
        eventComplexity: p.eventComplexity,
        recommendation: p.recommendation,
        division: p.division || 'EVENT',
        picId: pic?.id,
        briefDate: p.briefDate,
        submitDate: p.submitDate,
        pitchDuration: p.pitchDuration,
        startDate: p.startDate,
        endDate: p.endDate,
        projectDuration: p.projectDuration,
        status: p.status,
        pitchStatus: p.pitchStatus,
        pitchResult: p.pitchResult,
        wonLossReason: p.wonLossReason,
        vendorWinner: p.vendorWinner,
      },
    })

    // Add members
    for (const memberName of (p.members || [])) {
      const member = userMap[memberName]
      if (member) {
        await prisma.projectMember.upsert({
          where: { projectId_userId: { projectId: project.id, userId: member.id } },
          update: {},
          create: { projectId: project.id, userId: member.id },
        })
      }
    }
    projectCount++
  }
  console.log(`✓ ${projectCount} projects seeded`)

  // ── SAMPLE TASKS for Daikin Service Partner ────────────────────────────
  const daikinProject = await prisma.project.findUnique({ where: { code: 'P-016' } })
  if (daikinProject) {
    const taskTemplates = [
      { title: 'Kickoff meeting dengan klien', status: 'DONE', order: 1 },
      { title: 'Finalisasi konsep event', status: 'DONE', order: 2 },
      { title: 'Desain materi kreatif', status: 'DONE', order: 3 },
      { title: 'Approval desain dari klien', status: 'DONE', order: 4 },
      { title: 'Koordinasi vendor produksi', status: 'IN_PROGRESS', order: 5 },
      { title: 'Run of Show', status: 'TODO', order: 6 },
      { title: 'Technical rehearsal', status: 'TODO', order: 7 },
      { title: 'Event Day execution', status: 'TODO', order: 8 },
      { title: 'Laporan post-event', status: 'TODO', order: 9 },
      { title: 'Invoice & dokumentasi final', status: 'TODO', order: 10 },
    ]
    for (const t of taskTemplates) {
      await prisma.task.upsert({
        where: { id: `task-p016-${t.order}` },
        update: {},
        create: { id: `task-p016-${t.order}`, projectId: daikinProject.id, title: t.title, status: t.status, order: t.order },
      }).catch(() => prisma.task.create({ data: { projectId: daikinProject.id, title: t.title, status: t.status, order: t.order } }))
    }
    console.log('✓ Sample tasks seeded for Daikin Service Partner')
  }

  console.log('\n✅ Seed complete!')
  console.log('───────────────────────────────')
  console.log('Login credentials (all users):')
  console.log('  Password: watermark2026')
  console.log('  Admin : hrdwatermark@gmail.com')
  console.log('  PM    : wulan@watermark.co.id / irham@watermark.co.id')
  console.log('  Team  : [name]@watermark.co.id')
  console.log('───────────────────────────────')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
