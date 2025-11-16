const express = require('express');
const { z } = require('zod');
const validate = require('../../presentation/validate');
const auth = require('../../presentation/authMiddleware');
const { usecases } = require('../../shared/container');

const router = express.Router();

const directSchema = z.object({ peerId: z.string().uuid() });
const groupSchema = z.object({
  name: z.string().trim().min(3, 'Tên nhóm tối thiểu 3 ký tự'),
  memberIds: z.array(z.string().trim().min(1, 'Mã thành viên không hợp lệ')).min(1, 'Cần ít nhất 1 thành viên')
});
const renameSchema = z.object({ name: z.string().trim().min(3) });
const inviteSchema = z.object({
  memberIds: z.array(z.string().trim().min(1, 'Mã thành viên không hợp lệ')).min(1, 'Cần ít nhất 1 thành viên')
});

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

router.delete('/:id/leave', (req, res) => {
  try {
    usecases.room.leaveGroup(req.params.id, req.user.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/:id/members', validate(inviteSchema), (req, res) => {
  try {
    const result = usecases.room.addMembers(req.params.id, req.user.id, req.body.memberIds);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    usecases.room.disband(req.params.id, req.user.id);
    res.json({ success: true });
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
