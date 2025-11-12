const express = require('express');
const { z } = require('zod');
const validate = require('../../presentation/validate');
const auth = require('../../presentation/authMiddleware');
const { usecases } = require('../../shared/container');

const router = express.Router();

const requestSchema = z.object({
  toUserId: z.string().uuid()
});

router.use(auth);

router.get('/', (req, res) => {
  const friends = usecases.friend.getFriends(req.user.id);
  res.json(friends);
});

router.get('/requests', (req, res) => {
  const requests = usecases.friend.getRequests(req.user.id);
  res.json(requests);
});

router.post('/requests', validate(requestSchema), (req, res) => {
  try {
    const request = usecases.friend.sendRequest(req.user.id, req.body.toUserId);
    res.status(201).json(request);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/requests/:id/accept', (req, res) => {
  try {
    const result = usecases.friend.acceptRequest(req.params.id, req.user.id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
