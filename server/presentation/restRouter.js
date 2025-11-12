const express = require('express');
const authRoutes = require('../features/auth/routes');
const userRoutes = require('../features/user/routes');
const friendRoutes = require('../features/friend/routes');
const roomRoutes = require('../features/room/routes');
const chatRoutes = require('../features/chat/routes');
const fileRoutes = require('../features/file/routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/friends', friendRoutes);
router.use('/rooms', roomRoutes);
router.use('/rooms', chatRoutes);
router.use('/files', fileRoutes);

module.exports = router;
