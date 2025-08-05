const express = require('express');
const router = express.Router();
const bcrypt = require("bcrypt");
const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();
const authenticate = require('../middlewares/authMiddleware').authenticate;


// GET /api/employee/dashboard
router.get('/dashboard', authenticate, async (req, res) => {
  try {
    const userId = req.user.id; // Set in the auth middleware

    // Find the employee associated with this user
    const employee = await prisma.employee.findFirst({
      where: { userId },
    });

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found.' });
    }

    const employeeId = employee.id;

    // Count present and absent days
    const totalPresentDays = await prisma.attendanceSummary.count({
      where: {
        employeeId,
        status: 'present',
      },
    });

    const totalAbsentDays = await prisma.attendanceSummary.count({
      where: {
        employeeId,
        status: 'absent',
      },
    });

    // Get the last status
    const lastRecord = await prisma.attendanceSummary.findFirst({
      where: { employeeId },
      orderBy: {
        date: 'desc',
      },
      select: {
        status: true,
        date: true,
      },
    });

    const name = `${employee.firstName} ${employee.lastName}`;
    res.status(200).json({
      welcome: `Welcome ${name}`,
      totalPresentDays,
      totalAbsentDays,
      lastStatus: lastRecord?.status || 'N/A',
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data.' });
  }
});

// GET /api/employee/history
router.get('/attendance-history', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    // Step 1: Find employee linked to the logged-in user
    const employee = await prisma.employee.findFirst({
      where: { userId },
      select: { id: true },
    });

    if (!employee) {
      return res.status(404).json({ error: "Employee not found." });
    }

    // Step 2: Fetch attendance summaries for the employee
    const history = await prisma.attendanceSummary.findMany({
      where: { employeeId: employee.id },
      orderBy: { date: 'desc' },
      select: {
        date: true,
        status: true
      }
    });

    // Step 3: Format dates to "YYYY-MM-DD" and return
    const formatted = history.map(entry => ({
      date: new Date(entry.date).toISOString().split('T')[0],
      status: entry.status
    }));

    res.status(200).json(formatted);

  } catch (error) {
    console.error("Error fetching attendance history:", error);
    res.status(500).json({ error: "Failed to load attendance history." });
  }
});

// GET /api/employee/profile
router.get('/profile', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        roles: {
          include: {
            role: true,
          },
        },
        employees: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            employmentDate: true,
            salary: true,
            address: true,
            subCity: true,
            department: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!user || user.employees.length === 0) {
      return res.status(404).json({ error: "Employee profile not found." });
    }

    const emp = user.employees[0];

    const profile = {
      employeeId: emp.id,
      fullName: `${emp.firstName} ${emp.lastName}`,
      email: user.email,
      phone: emp.phone,
      department: emp.department?.name,
      roles: user.roles.map(r => r.role.name),
      joinedDate: emp.employmentDate,
      salary: emp.salary,
      location: emp.address || emp.subCity || "N/A",
    };

    res.status(200).json(profile);
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ error: "Failed to load profile." });
  }
});


// PATCH /api/employee/change-password
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


module.exports = router;
