const express = require('express');
const router = express.Router();
const {login} =require('../controllers/auth.controller');
const { PrismaClient } = require("../generated/prisma"); 
const prisma = new PrismaClient();
const bcrypt = require('bcrypt');


router.post('/login', login);



module.exports = router;