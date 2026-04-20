-- Enums métiers PaaS (rôles, types d'instance, sauvegardes)
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'USER', 'VIEWER');
CREATE TYPE "GameType" AS ENUM (
  'MINECRAFT_JAVA',
  'MINECRAFT_BEDROCK',
  'VALHEIM',
  'TERRARIA',
  'SATISFACTORY',
  'ARK',
  'CSGO',
  'CUSTOM'
);
CREATE TYPE "InstanceStatus" AS ENUM (
  'INSTALLING',
  'STOPPED',
  'STARTING',
  'RUNNING',
  'STOPPING',
  'CRASHED',
  'ERROR'
);
CREATE TYPE "WebStack" AS ENUM ('NGINX_STATIC', 'NODE_JS', 'PYTHON_WSGI', 'PHP_FPM', 'CUSTOM');
CREATE TYPE "BackupStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'FAILED');

-- Évolution du modèle utilisateur : rôle et horodatage de mise à jour
ALTER TABLE "User" ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'USER';
ALTER TABLE "User" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE "UserQuota" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "maxInstances" INTEGER NOT NULL DEFAULT 3,
    "maxMemoryMb" INTEGER NOT NULL DEFAULT 2048,
    "maxCpuCores" DOUBLE PRECISION NOT NULL DEFAULT 2.0,
    "maxDiskGb" INTEGER NOT NULL DEFAULT 20,

    CONSTRAINT "UserQuota_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserQuota_userId_key" ON "UserQuota"("userId");
ALTER TABLE "UserQuota" ADD CONSTRAINT "UserQuota_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "GameServerInstance" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "containerId" TEXT,
    "name" TEXT NOT NULL,
    "gameType" "GameType" NOT NULL,
    "status" "InstanceStatus" NOT NULL DEFAULT 'STOPPED',
    "port" INTEGER,
    "rconPort" INTEGER,
    "memoryMb" INTEGER NOT NULL,
    "cpuCores" DOUBLE PRECISION NOT NULL,
    "diskGb" INTEGER NOT NULL,
    "env" JSONB NOT NULL DEFAULT '{}',
    "installLogs" TEXT,
    "startedAt" TIMESTAMP(3),
    "stoppedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameServerInstance_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "GameServerInstance" ADD CONSTRAINT "GameServerInstance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "WebInstance" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "containerId" TEXT,
    "name" TEXT NOT NULL,
    "domain" TEXT,
    "status" "InstanceStatus" NOT NULL DEFAULT 'STOPPED',
    "techStack" "WebStack" NOT NULL,
    "memoryMb" INTEGER NOT NULL,
    "diskGb" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebInstance_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WebInstance_domain_key" ON "WebInstance"("domain");
ALTER TABLE "WebInstance" ADD CONSTRAINT "WebInstance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "InstanceBackup" (
    "id" UUID NOT NULL,
    "instanceId" UUID NOT NULL,
    "path" TEXT NOT NULL,
    "sizeBytes" BIGINT NOT NULL,
    "status" "BackupStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InstanceBackup_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "InstanceBackup" ADD CONSTRAINT "InstanceBackup_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "GameServerInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "details" JSONB,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "UserQuota" ("id", "userId")
SELECT gen_random_uuid(), u."id"
FROM "User" u
LEFT JOIN "UserQuota" q ON q."userId" = u."id"
WHERE q."userId" IS NULL;
