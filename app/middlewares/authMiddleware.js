const jwt = require('jsonwebtoken');
const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();


// Authentication middleware to verify JWT and extract user info
const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access token missing' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: {
        roles: {
          include: { role: true },
        },
      },
    });

    if (!user) return res.status(401).json({ error: 'Invalid token' });

    req.user = user;
    req.roles = user.roles.map((r) => r.role.name);
    next();
  } catch (err) {
    console.error(err);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Authorization middleware to check if user has required roles
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    const hasRole = req.roles.some((role) => allowedRoles.includes(role));
    if (!hasRole) {
      return res.status(403).json({ error: 'Access denied: insufficient role' });
    }
    next();
  };
};

module.exports = {
  authenticate,
  authorize,
};