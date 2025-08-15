-- DropForeignKey
ALTER TABLE `meeting` DROP FOREIGN KEY `Meeting_creatorId_fkey`;

-- DropIndex
DROP INDEX `Meeting_creatorId_fkey` ON `meeting`;

-- AlterTable
ALTER TABLE `meeting` MODIFY `creatorId` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `Meeting` ADD CONSTRAINT `Meeting_creatorId_fkey` FOREIGN KEY (`creatorId`) REFERENCES `Employee`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
