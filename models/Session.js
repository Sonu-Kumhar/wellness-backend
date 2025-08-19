const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  title: String,
  description: String,
  duration: String,
  date: String,
  mentor: String,
  status: {
    type: String,
    enum: ['draft', 'published'],
    default: 'draft',
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('Session', sessionSchema);
