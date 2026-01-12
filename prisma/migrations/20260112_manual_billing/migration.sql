-- AlterTable
ALTER TABLE "User"
ADD COLUMN     "manualPaymentStatus" TEXT NOT NULL DEFAULT 'none',
ADD COLUMN     "manualPaymentPlan" TEXT,
ADD COLUMN     "manualPaymentPayerEmail" TEXT,
ADD COLUMN     "manualPaymentTxnRef" TEXT,
ADD COLUMN     "manualPaymentNote" TEXT,
ADD COLUMN     "manualPaymentRequestedAt" TIMESTAMP(3),
ADD COLUMN     "manualPaymentReviewedAt" TIMESTAMP(3),
ADD COLUMN     "manualPaymentReviewedBy" TEXT;

-- CreateIndex
CREATE INDEX "User_manualPaymentStatus_requestedAt_idx" ON "User"("manualPaymentStatus", "manualPaymentRequestedAt");
