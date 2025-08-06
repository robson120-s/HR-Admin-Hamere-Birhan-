const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { authenticate, authorize } = require("../middlewares/authMiddleware");

// GET /api/intern/dashboard
router.get('/dashboard', authenticate, authorize('Intern'), async (req, res) => {
  const userId = req.user.id;

  try {
    const employee = await prisma.employee.findFirst({
      where: { userId },
      include: {
        attendanceLogs: {
          orderBy: { date: 'desc' }
        }
      }
    });

    if (!employee) {
      return res.status(404).json({ error: "Intern not found." });
    }

    const presentDays = employee.attendanceLogs.filter(log => log.status === 'present').length;
    const absentDays = employee.attendanceLogs.filter(log => log.status === 'absent').length;
    const lastStatus = employee.attendanceLogs[0]?.status || 'No records';

    res.status(200).json({
      message: `Welcome ${employee.firstName}`,
      presentDays,
      absentDays,
      lastStatus
    });
  } catch (err) {
    console.error("Failed to load intern dashboard:", err);
    res.status(500).json({ error: "Failed to load dashboard" });
  }
});

// GET /api/intern/attendance-history
router.get('/attendance-history', authenticate, authorize('Intern'), async (req, res) => {
  const userId = req.user.id;

  try {
    const employee = await prisma.employee.findFirst({
      where: { userId },
      select: {
        id: true,
        attendanceLogs: {
          orderBy: { date: 'desc' },
          select: {
            date: true,
            status: true
          }
        }
      }
    });

    if (!employee) {
      return res.status(404).json({ error: "Intern not found." });
    }

    res.status(200).json({ history: employee.attendanceLogs });
  } catch (err) {
    console.error("Failed to fetch attendance history:", err);
    res.status(500).json({ error: "Failed to load attendance history." });
  }
});

// GET /api/intern/profile
router.get('/profile', authenticate, authorize('Intern'), async (req, res) => {
  const userId = req.user.id;

  try {
    const intern = await prisma.employee.findFirst({
      where: { userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        address: true,
        employmentDate: true,
        department: {
          select: { name: true }
        },
        user: {
          select: {
            email: true,
            roles: {
              select: {
                role: {
                  select: {
                    name: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!intern) {
      return res.status(404).json({ error: "Intern not found." });
    }

    const profileData = {
      fullName: `${intern.firstName} ${intern.lastName}`,
      email: intern.user.email,
      phone: intern.phone || "",
      address: intern.address || "",
      department: intern.department?.name || "",
      role: intern.user.roles[0]?.role.name || "Intern",
      joinedDate: intern.employmentDate,
      employeeId: intern.id
    };

    res.status(200).json(profileData);
  } catch (err) {
    console.error("Error loading intern profile:", err);
    res.status(500).json({ error: "Failed to load profile." });
  }
});

// PATCH /api/intern/change-password
router.patch('/change-password', authenticate, async (req, res) => {
  const userId = req.user.id;
  const { currentPassword, newPassword, confirmNewPassword } = req.body;

  if (!currentPassword || !newPassword || !confirmNewPassword) {
    return res.status(400).json({ error: "All fields are required." });
  }

  if (newPassword !== confirmNewPassword) {
    return res.status(400).json({ error: "New passwords do not match." });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Current password is incorrect." });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    res.status(200).json({ message: "Password updated successfully." });
  } catch (err) {
    console.error("Password change error:", err);
    res.status(500).json({ error: "Failed to update password." });
  }
});

//post /api/intern/complaints
router.post("/complaints", authenticate, async (req,res)=>{
    const userId = req.user.id;
  const { subject, description } = req.body;

  if (!subject || !description) {
    return res.status(400).json({ error: "Subject and description are required." });
  }

  try {
    // Find employee record linked to this intern user
    const employee = await prisma.employee.findFirst({
      where: { userId: userId },
    });

    if (!employee) {
      return res.status(404).json({ error: "Employee not found." });
    }

    // Create the complaint
    const complaint = await prisma.complaint.create({
      data: {
        employeeId: employee.id,
        subject,
        description,
        status: "open", // default status
      },
    });

    return res.status(201).json({
      message: "Complaint submitted successfully.",
      data: complaint,
    });
  } catch (error) {
    console.error("Submit complaint error:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
});

router.get("/performance-reviews", authenticate, authorize("Intern"), async (req,res)=>{
    const userId = req.user.id;

  try {
    const employee = await prisma.employee.findFirst({
      where: { userId },
    });

    if (!employee) {
      return res.status(404).json({ error: "Intern not found." });
    }

    const reviews = await prisma.performanceReview.findMany({
      where: { employeeId: employee.id },
      orderBy: { reviewDate: "desc" },
    });

    res.status(200).json({ data: reviews });
  } catch (error) {
    console.error("Error fetching performance reviews:", error);
    res.status(500).json({ error: "Failed to fetch performance reviews." });
  }
});


module.exports = router;
