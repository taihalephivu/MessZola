const express = require('express');
const { z } = require('zod');
const validate = require('../../presentation/validate');
const auth = require('../../presentation/authMiddleware');
const { usecases } = require('../../shared/container');

const router = express.Router();

const directSchema = z.object({ peerId: z.string().uuid() });
const groupSchema = z.object({
  name: z.string().min(3),
  memberIds: z.array(z.string().uuid()).min(1)
});
const renameSchema = z.object({ name: z.string().min(3) });

router.use(auth);

router.get('/', (req, res) => {
  const rooms = usecases.room.list(req.user.id);
  res.json(rooms);
});

router.post('/direct', validate(directSchema), (req, res) => {
  try {
    const room = usecases.room.ensureDirect(req.user.id, req.body.peerId);
    res.json(room);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/group', validate(groupSchema), (req, res) => {
  try {
    const room = usecases.room.createGroup({ ownerId: req.user.id, name: req.body.name, memberIds: req.body.memberIds });
    res.status(201).json(room);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.patch('/:id', validate(renameSchema), (req, res) => {
  try {
    const room = usecases.room.rename(req.params.id, req.body.name);
    res.json(room);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
