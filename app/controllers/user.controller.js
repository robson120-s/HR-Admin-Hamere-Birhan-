const { PrismaClient } = require('../generated/prisma');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

exports.registerEmployee = async (req, res) => {
  try {
    const {
      username,
      email,
      password,
      roleId,
      employeeData // All employee fields packed here
    } = req.body;

    // 1. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 2. Create user
    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
      },
    });

    // 3. Assign role
    await prisma.userRole.create({
      data: {
        userId: user.id,
        roleId: parseInt(roleId),
      },
    });

    // 4. Create employee profile
    const employee = await prisma.employee.create({
      data: {
        ...employeeData,
        userId: user.id,
      },
    });

    res.status(201).json({ message: "User and employee registered", user, employee });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Registration failed" });
  }
};
