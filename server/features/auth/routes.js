
const express = require('express');
const { z } = require('zod');
const validate = require('../../presentation/validate');
const { usecases } = require('../../shared/container');

const router = express.Router();

const registerSchema = z.object({
  phone: z.string().min(8, 'Số điện thoại không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
  displayName: z.string().min(2)
});

const loginSchema = z.object({
  phone: z.string(),
  password: z.string()
});

router.post('/register', validate(registerSchema), async (req, res) => {
  try {
    const result = await usecases.auth.register(req.body);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/login', validate(loginSchema), async (req, res) => {
  try {
    const result = await usecases.auth.login(req.body);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
