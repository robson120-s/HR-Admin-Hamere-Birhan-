const express = require('express');
const router = express.Router();
const { PrismaClient } =require('@prisma/client');
const prisma = new PrismaClient();

router.post('/login', async (req, res) => {
    const {username, password} = req.body;
    const user = await prisma.user.findUnique({
        where: {
            username: username,
            password: password
        }
    });
    if (user){
        return res.status(200).json({message: 'Login successful', user});
    }
});
