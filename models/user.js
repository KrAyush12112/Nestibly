const mongoose = require('mongoose');
const Home = require('./database');

const userSchema = new mongoose.Schema({    
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    userType: { type: String, enum: ['host', 'guest'], required: true , default: 'guest' },
    favourite: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Home' }],
    isVerified: { type: Boolean, default: false }
},{ timestamps: true });

const User = mongoose.model('User', userSchema);

module.exports = User;