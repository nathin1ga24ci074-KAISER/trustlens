# TrustLens Database Architecture

## Persistence Layer

TrustLens uses **PostgreSQL** as its relational database and **Prisma ORM** for type-safe schema definitions, automated migrations, and compile-time query guarantees.

---

## Schema Models

### 1. `User` Model
Represents registered platform analysts and users.

```prisma
model User {
  id            String                @id @default(uuid())
  name          String
  email         String                @unique
  passwordHash  String
  createdAt     DateTime              @default(now())
  updatedAt     DateTime              @updatedAt
  verifications VerificationHistory[]

  @@index([email])
  @@map("users")
}
```

### 2. `VerificationHistory` Model
Audit trail for claims analyzed across all modalities.

```prisma
model VerificationHistory {
  id               String               @id @default(uuid())
  userId           String
  type             VerificationType
  originalInput    String               @db.Text
  extractedClaim   String?              @db.Text
  verdict          VerificationVerdict?
  trustScore       Float?               // 0.0 to 100.0 score
  uncertaintyScore Float?               // 0.0 to 1.0
  confidenceScore  Float?               // 0.0 to 1.0
  explanation      String?              @db.Text
  metadata         Json?                // Stored analysis artifacts
  createdAt        DateTime             @default(now())
  updatedAt        DateTime             @updatedAt
  user             User                 @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([type])
  @@index([createdAt])
  @@map("verification_history")
}
```

### Enums
- `VerificationType`: `TEXT`, `URL`, `IMAGE`, `VIDEO`
- `VerificationVerdict`: `VERIFIED_TRUE`, `MOSTLY_TRUE`, `MISLEADING`, `FALSE`, `UNVERIFIED`, `DISPUTED`

---

## Migration and Setup Commands

```bash
# Push schema directly to database (development)
npm --workspace=server run prisma:push

# Generate Prisma Client
npm --workspace=server run prisma:generate

# Create migration migration SQL files
npm --workspace=server run prisma:migrate
```
