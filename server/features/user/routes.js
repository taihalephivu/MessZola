const express = require('express');
const { z } = require('zod');
const validate = require('../../presentation/validate');
const auth = require('../../presentation/authMiddleware');
const { usecases, services } = require('../../shared/container');
const bcrypt = require('bcrypt');

const router = express.Router();

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
  const payload = {
    displayName: req.body.displayName,
    bio: req.body.bio ?? '',
    avatarUrl: req.body.avatarUrl ?? ''
  };
  const updated = usecases.user.updateProfile(req.user.id, payload);
  res.json(updated);
});

router.patch('/me/password', auth, validate(passwordSchema), async (req, res) => {
  const hash = await bcrypt.hash(req.body.password, 10);
  const updated = services.userService.updatePassword(req.user.id, hash);
  res.json(updated);
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
