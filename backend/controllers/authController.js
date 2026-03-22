const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

const registerUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const user = await User.create({ email, password: hashedPassword });
    if (user) {
      return res.status(201).json({
        _id: user.id,
        email: user.email,
        token: generateToken(user._id)
      });
    }
    return res.status(400).json({ message: 'Invalid user data' });
  } catch (error) {
    console.error('Register error:', error.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    return res.json({
      _id: user.id,
      email: user.email,
      name: user.name,
      weight: user.weight,
      height: user.height,
      goal: user.goal,
      activityLevel: user.activityLevel,
      token: generateToken(user._id)
    });
  } catch (error) {
    console.error('Login error:', error.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

const getMe = async (req, res) => {
  return res.status(200).json(req.user);
};

const updateProfile = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user.id, req.body, { new: true, runValidators: true }
    ).select('-password');
    return res.status(200).json(user);
  } catch (error) {
    console.error('Profile update error:', error.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { registerUser, loginUser, getMe, updateProfile };
