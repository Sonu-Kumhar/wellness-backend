const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const Session = require('./models/Session');
const verifyToken = require('./middleware/auth');


const app = express();
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log('✅ MongoDB connected'))
.catch((err) => console.error('❌ MongoDB error:', err));

// User Schema
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});

// Session Schema
// const sessionSchema = new mongoose.Schema({
//   user_id: mongoose.Schema.Types.ObjectId,
//   title: String,
//   tags: [String],
//   json_file_url: String,
//   status: { type: String, enum: ['draft', 'published'], default: 'draft' },
//   created_at: { type: Date, default: Date.now },
//   updated_at: { type: Date, default: Date.now }
// });

// const Session = mongoose.model('Session', sessionSchema);


const User = mongoose.model('User', userSchema);

// Register Route
app.post('/register', async (req, res) => {
  const { email, password } = req.body;
  try {
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ email, password: hashedPassword });
    await newUser.save();
    
    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Publish session
app.post('/my-sessions/publish', verifyToken, async (req, res) => {
  const { title, description, duration, date, mentor } = req.body;
  try {
    const newSession = new Session({
      title,
      description,
      duration,
      date,
      mentor,
      status: 'published',
      userId: req.userId,
    });
    await newSession.save();
    res.status(201).json({ message: 'Session published successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error publishing session' });
  }
});

// Save draft
app.post('/my-sessions/save-draft', verifyToken, async (req, res) => {
  const { title, description, duration, date, mentor } = req.body;
  try {
    const newSession = new Session({
      title,
      description,
      duration,
      date,
      mentor,
      status: 'draft',
      userId: req.userId,
    });
    await newSession.save();
    res.status(201).json({ message: 'Session draft saved successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error saving draft' });
  }
});

app.get('/my-sessions', verifyToken, async (req, res) => {
  try {
    const sessions = await Session.find({ userId: req.userId });
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch sessions' });
  }
});



// Login Route
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || 'secret_key',
      { expiresIn: '1h' }
    );

    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Public Sessions Route
app.get('/sessions', async (req, res) => {
  try {
    const sessions = await Session.find({ status: 'published' });
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.delete('/my-sessions/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    const deleted = await Session.findOneAndDelete({ _id: id, userId: req.userId });
    if (!deleted) {
      return res.status(404).json({ message: 'Session not found or unauthorized' });
    }
    res.json({ message: 'Session deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting session' });
  }
});

app.put('/my-sessions/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  const { title, description, duration, date, mentor, status } = req.body;

  try {
    const session = await Session.findOneAndUpdate(
      { _id: id, userId: req.userId },
      { title, description, duration, date, mentor, status, updated_at: Date.now() },
      { new: true }
    );

    if (!session) {
      return res.status(404).json({ message: 'Session not found or unauthorized' });
    }

    res.json({ message: 'Session updated successfully', session });
  } catch (err) {
    res.status(500).json({ message: 'Error updating session' });
  }
});





// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

mongoose.connection.on('connected', () => {
  console.log(`✅ Connected to MongoDB database: ${mongoose.connection.name}`);
});