const express = require('express');
const router = express.Router();
const { PrismaClient } = require("../generated/prisma");
const prisma = new PrismaClient();
const attendanceSummaryController = require('../controllers/attendanceSummary.controller');
const { authenticate, authorize } = require('../middlewares/authMiddleware');


// Generate summaries for a specific date and department
router.post('/generate', authenticate, authorize('HR'), attendanceSummaryController.generateSummaries);

// Get summaries by department and date
router.get('/by-department', authenticate, authorize('HR'), attendanceSummaryController.getSummariesByDepartment);

// Approve a single employee’s summary (HR  admin)
router.patch("/approve/:id", authenticate, authorize('HR'), attendanceSummaryController.approveSingleSummary);

// Approve bulk summaries for a specific date and department (HR  admin)
router.patch('/approve-bulk', authenticate, authorize('HR'), attendanceSummaryController.approveBulkSummaries);



module.exports = router;

// Get all summaries with optional filters

// router.get('/', async (req, res) => {
//   const { status, departmentId, date } = req.query;

//   try {
//     const summaries = await prisma.attendanceSummary.findMany({
//       where: {
//         ...(status && { status }),
//         ...(departmentId && { departmentId: parseInt(departmentId) }),
//         ...(date && { date: new Date(date) }),
//       },
//       include: {
//         employee: {
//           select: {
//             id: true,
//             firstName: true,
//             lastName: true,
//           }
//         },
//         department: {
//           select: {
//             name: true,
//           }
//         }
//       },
//       orderBy: {
//         date: 'desc'
//       }
//     });

//     res.status(200).json(summaries);
//   } catch (error) {
//     console.error("Error fetching summaries:", error);
//     res.status(500).json({ error: "Failed to fetch summaries." });
//   }
// });
