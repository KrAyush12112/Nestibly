const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    bookingRef: { type: String, required: true, unique: true },
    homeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Home', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    checkIn: { type: Date, required: true },
    checkOut: { type: Date, required: true },
    guests: { type: Number, required: true },
    nights: { type: Number, required: true },
    totalPrice: { type: Number, required: true }
},
{ timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);