const express = require('express');
const auth = require('../../presentation/authMiddleware');
const { usecases } = require('../../shared/container');

const router = express.Router({ mergeParams: true });

router.use(auth);

router.get('/:roomId/messages', (req, res) => {
  try {
    const messages = usecases.chat.getHistory({
      roomId: req.params.roomId,
      userId: req.user.id,
      before: req.query.before ? Number(req.query.before) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : 30
    });
    res.json(messages);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
