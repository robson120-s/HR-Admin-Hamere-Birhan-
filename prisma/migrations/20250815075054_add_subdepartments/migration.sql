-- AlterTable
ALTER TABLE `department` ADD COLUMN `parentId` INTEGER NULL;

-- AlterTable
ALTER TABLE `employee` ADD COLUMN `subDepartmentId` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `Department` ADD CONSTRAINT `Department_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `Department`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
