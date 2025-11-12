const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { z } = require('zod');
const auth = require('../../presentation/authMiddleware');
const config = require('../../core/config');
const { usecases } = require('../../shared/container');
const validate = require('../../presentation/validate');
const eventBus = require('../../core/eventBus');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, config.uploadsDir),
  filename: (_, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    cb(null, `${Date.now()}-${safeName}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: config.maxUploadBytes }
});

const uploadSchema = z.object({
  roomId: z.string().uuid()
});

router.post('/upload', auth, upload.single('file'), validate(uploadSchema, 'body'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Thiếu tệp đính kèm' });
  }
  try {
    const url = `/uploads/${req.file.filename}`;
    const baseMessage = usecases.chat.sendMessage({
      roomId: req.body.roomId,
      senderId: req.user.id,
      type: 'file',
      content: req.file.originalname,
      metadata: { url, mimeType: req.file.mimetype }
    }, { silent: true });
    const fileRecord = usecases.file.attach({
      messageId: baseMessage.id,
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      url
    });
    const filePayload = {
      id: fileRecord.id,
      messageId: fileRecord.message_id,
      name: fileRecord.file_name,
      mimeType: fileRecord.mime_type,
      size: fileRecord.size,
      url: fileRecord.url
    };
    const message = { ...baseMessage, files: [filePayload] };
    eventBus.emit('message:created', { roomId: req.body.roomId, message });
    res.status(201).json({ message, file: filePayload });
  } catch (err) {
    if (req.file) {
      fs.unlinkSync(path.join(config.uploadsDir, req.file.filename));
    }
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
