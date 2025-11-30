const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');

const homeSchema = new mongoose.Schema({
    title: { type: String, required: true },
    location: { type: String, required: true },
    price: { type: Number, required: true },
    image: { type: [String], required: true },
    description: { type: String, required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    maxGuests: { type: Number, required: true }
},
{ timestamps: true });

module.exports = mongoose.model('Home', homeSchema);
