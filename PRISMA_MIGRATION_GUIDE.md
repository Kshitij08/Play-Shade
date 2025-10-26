# Guide: Switching from Drizzle to Prisma

## ⚠️ Warning: This is a significant rewrite!

Switching from Drizzle to Prisma requires rewriting most database code. Only do this if you have specific needs that Prisma addresses better.

## 📋 Steps to Switch

### 1. Install Prisma
```bash
pnpm add prisma @prisma/client
pnpm add -D prisma
```

### 2. Initialize Prisma
```bash
npx prisma init
```

### 3. Convert Schema
**From:** `src/db/schema.ts` (Drizzle)
**To:** `prisma/schema.prisma` (Prisma)

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")  // Note: Prisma uses DATABASE_URL, not DB_URL
}

model DailyAttempt {
  id            Int      @id @default(autoincrement())
  userId        String   @db.VarChar(50)
  userName      String   @db.VarChar(100)
  date          String   @db.VarChar(10)
  gameType      String   @default("color-mixing") @db.VarChar(20)
  targetColor   String   @db.VarChar(50)
  capturedColor String   @db.VarChar(50)
  similarity    Decimal  @db.Decimal(5, 2)
  timeTaken     Decimal  @db.Decimal(8, 3)
  timeScore     Int
  finalScore    Int
  streak        Int      @default(1)
  createdAt     DateTime @default(now())

  @@unique([userId, date, gameType], name: "daily_attempts_user_date_game_unique")
  @@map("daily_attempts")
}

model Leaderboard {
  id        Int      @id @default(autoincrement())
  userId    String   @db.VarChar(50)
  userName  String   @db.VarChar(100)
  date      String   @db.VarChar(10)
  gameType  String   @default("color-mixing") @db.VarChar(20)
  score     Int
  timeTaken Decimal  @default("0") @db.Decimal(8, 3)
  rank      Int?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([userId, date, gameType], name: "leaderboard_user_date_game_unique")
  @@map("leaderboard")
}

model NotificationDetail {
  id                   Int      @id @default(autoincrement())
  fid                  Int      @unique
  notificationDetails  Json
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  @@map("notification_details")
}
```

### 4. Update Environment Variable
```env
# Change from:
DB_URL=your-connection-string

# To:
DATABASE_URL=your-connection-string
```

### 5. Replace Database Client
**Replace:** `src/db/index.ts`
```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

### 6. Rewrite All Queries
**Every query needs to be rewritten!**

**Example - Get User History:**
```typescript
// OLD (Drizzle)
const history = await db
  .select({
    score: dailyAttempts.finalScore,
    timeTaken: dailyAttempts.timeTaken,
  })
  .from(dailyAttempts)
  .where(eq(dailyAttempts.userId, userId))
  .orderBy(desc(dailyAttempts.createdAt))
  .limit(limit);

// NEW (Prisma)
const history = await prisma.dailyAttempt.findMany({
  where: { userId },
  select: {
    finalScore: true,
    timeTaken: true,
  },
  orderBy: { createdAt: 'desc' },
  take: limit,
});
```

### 7. Update All API Routes
Every file in `src/app/api/` that uses database queries needs to be updated.

### 8. Generate Prisma Client
```bash
npx prisma generate
```

### 9. Migrate Database
```bash
npx prisma db push
```

---

## 📊 Effort Required

- **Files to modify:** ~10-15 files
- **Time required:** 4-8 hours
- **Risk level:** High (breaking changes)
- **Testing needed:** Extensive

---

## 🎯 Recommendation

**Don't switch unless you need:**
- ✅ Prisma Studio (database GUI)
- ✅ Advanced relationship handling
- ✅ Built-in connection pooling
- ✅ Migration history tracking

**Your current Drizzle setup is excellent for:**
- ⚡ Performance
- 📦 Bundle size
- 🎯 Simplicity
- 🔧 SQL control

---

## 💡 Better Alternative

Instead of switching ORMs, consider:

1. **Keep Drizzle + Add Drizzle Studio:**
   ```bash
   pnpm db:studio  # Already available!
   ```

2. **Keep Drizzle + Add Database GUI:**
   - Use pgAdmin
   - Use TablePlus
   - Use DBeaver

3. **Keep Drizzle + Better Migration Workflow:**
   ```bash
   pnpm db:generate  # Generate migrations
   pnpm db:migrate   # Run migrations
   ```

This gives you the benefits without the rewrite cost!