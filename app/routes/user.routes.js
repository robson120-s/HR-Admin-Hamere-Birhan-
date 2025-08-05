const express = require('express');
const router = express.Router();
const { registerEmployee } = require('../controllers/user.controller');


router.post('/register', registerEmployee);

module.exports = router;