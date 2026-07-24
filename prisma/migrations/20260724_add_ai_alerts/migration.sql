-- CreateTable
CREATE TABLE "ai_alerts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "type" VARCHAR(50) NOT NULL,
    "severity" VARCHAR(20) NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "resource_id" TEXT,
    "resource_name" TEXT,
    "metric_value" DOUBLE PRECISION,
    "threshold" DOUBLE PRECISION,
    "status" VARCHAR(20) NOT NULL DEFAULT 'open',
    "detected_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMPTZ,
    "metadata" JSONB,

    CONSTRAINT "ai_alerts_pkey" PRIMARY KEY ("id")
);