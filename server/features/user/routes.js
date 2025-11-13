const express = require('express');
const { z } = require('zod');
const multer = require('multer');
const validate = require('../../presentation/validate');
const auth = require('../../presentation/authMiddleware');
const { usecases, services } = require('../../shared/container');
const bcrypt = require('bcrypt');
const config = require('../../core/config');

const router = express.Router();

// Multer config for avatar upload
const avatarStorage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, config.uploadsDir),
  filename: (_, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    cb(null, `avatar-${Date.now()}-${safeName}`);
  }
});

const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận file ảnh'));
    }
  }
});

const updateSchema = z.object({
  displayName: z.string().min(2).optional(),
  bio: z.string().max(180).optional(),
  avatarUrl: z.string().url().optional()
}).refine((body) => Object.keys(body).length > 0, { message: 'Không có trường nào để cập nhật' });

const passwordSchema = z.object({
  password: z.string().min(6)
});

router.get('/me', auth, (req, res) => {
  const profile = usecases.user.getProfile(req.user.id);
  res.json(profile);
});

router.patch('/me', auth, validate(updateSchema), (req, res) => {
  const payload = {};
  if (req.body.displayName !== undefined) {
    payload.displayName = req.body.displayName;
  }
  if (req.body.bio !== undefined) {
    payload.bio = req.body.bio;
  }
  if (req.body.avatarUrl !== undefined) {
    payload.avatarUrl = req.body.avatarUrl;
  }
  const updated = usecases.user.updateProfile(req.user.id, payload);
  res.json(updated);
});

router.patch('/me/password', auth, validate(passwordSchema), async (req, res) => {
  const hash = await bcrypt.hash(req.body.password, 10);
  const updated = services.userService.updatePassword(req.user.id, hash);
  res.json(updated);
});

router.post('/me/avatar', auth, avatarUpload.single('avatar'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Thiếu file ảnh' });
  }
  try {
    const avatarUrl = `/uploads/${req.file.filename}`;
    const updated = usecases.user.updateProfile(req.user.id, { avatarUrl });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/search', auth, (req, res) => {
  const keyword = req.query.q || '';
  if (!keyword.trim()) {
    return res.json([]);
  }
  const results = usecases.user.search(keyword.trim());
  res.json(results);
});

module.exports = router;
