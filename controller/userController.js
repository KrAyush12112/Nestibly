// it handles redirection to home page and fetching registered homes from database

const Database = require('../models/database');
const User = require('../models/user');
const Booking = require('../models/booking');
const mongoose = require('mongoose');
const { request } = require('express');


exports.redirectHome = (request, response , next)=>{
    console.log("session data:", request.session);
    Database.find().then(
        (registeredHomes)=>{
            // console.log("Registered homes:", registeredHomes);
            response.render('welcome', {
                registeredHomes,
                title: "Welcome",
                isLoggedIn: request.isLoggedIn,
                user: request.session.user
            })
        }
    ).catch(err=>{
        console.log(err)
    })
}

// Handle get request on UserSide "View detail" event

exports.homeDetails = (request, response , next)=>{
    const Id = request.params.id; // Parse and extract from URL
    console.log("Home id for details view:", Id);
    Database.findById(Id).populate('user').then(
        (homeData) =>{
            console.log('Home details are:',homeData);
            // const userName = request.session.user ? request.session.user.name : null;
            response.render("home-details", {
            home: homeData,
            title: "Home Details",
            isLoggedIn: request.isLoggedIn,
            user: request.session.user,
            checkAvailability: false,
            priceFlag: false
            });
        }
    ).catch(err =>{
        console.log(err);
    });
}

// Handles get request for "/Listed-Homes"
exports.listedHomes = (request, response , next)=>{
    Database.find().then(
        (registeredHomes)=>{
            response.render("listed-homes",{
                registeredHomes,
                title:"Listed Homes",
                isLoggedIn: request.isLoggedIn,
                user: request.session.user
            })
        }
    )
}

exports.searchResults = (request, response, next) => {
    const { location, guests, dates } = request.body;
    console.log("Search parameters:", location, guests, dates);
    let Location = location.replace(/[^a-zA-Z0-9]/g, "");
    console.log("Cleaned location:", Location); 
    // Simple search implementation: filter by location (case-insensitive)
    Database.find({ location: { $regex: new RegExp(Location, 'i') } })
        .then((searchResults) => {
            console.log("Search results:", searchResults);
            searchResults = searchResults.filter(home => home.maxGuests >= parseInt(guests)); 
            response.render('search-results', {
                homes:searchResults,
                title: 'Search Results',
                isLoggedIn: request.isLoggedIn,
                user: request.session.user
            });
        })
        .catch(err => {
            console.log(err);
        });
}



exports.checkAvailability = async (req, res) => {
    try {
        const homeId = req.params.id;
        const checkAvailability = true;
        const prefersJson = req.headers.accept && req.headers.accept.indexOf('application/json') !== -1; // Check if client prefers JSON response
        // Validate ID format
        if (!mongoose.Types.ObjectId.isValid(homeId)) {
            if (prefersJson || req.xhr) return res.status(400).json({ available: false, message: 'Invalid Home ID' });
            return res.status(400).render('home-details', {
                message: 'Invalid Home ID',
                title: 'Availability Check Error',
                isLoggedIn: req.isLoggedIn,
                user: req.session.user,
                home: null,
                checkAvailability,
                priceFlag: false
            }); 
        }

        // Fetch home data
        const home = await Database.findById(homeId).populate('user');

        if (!home) {
            if (prefersJson || req.xhr) return res.status(404).json({ available: false, message: 'Home not found' });
            return res.status(404).render('home-details', {
                message: 'Home not found',
                title: 'Availability Check Error',
                isLoggedIn: req.isLoggedIn,
                user: req.session.user,
                home: null,
                checkAvailability,
                priceFlag: false
            });
        }

        const { checkIn, checkOut, guests } = req.body;

        // Parse date-only input and convert to UTC-midnight to avoid timezone shifts
        function parseDateOnlyToUTC(dateStr){
            const [y, m, d] = dateStr.split('-').map(s => parseInt(s, 10));
            return new Date(Date.UTC(y, m - 1, d));
        }

        const checkInDate = parseDateOnlyToUTC(checkIn);
        const checkOutDate = parseDateOnlyToUTC(checkOut);

        // create a "today" at UTC-midnight for correct comparison
        const now = new Date();
        const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

        // Past date validation
            if (checkInDate < today || checkOutDate < today) {
            if (prefersJson || req.xhr) return res.status(400).json({ available: false, message: 'Dates cannot be in the past' });
            return res.status(400).render('home-details', {
                message: 'Dates cannot be in the past',
                title: 'Availability Check Error',
                isLoggedIn: req.isLoggedIn,
                user: req.session.user,
                home,
                checkAvailability,
                priceFlag: false
            });
        }

        // Date sequence validation
            if (checkOutDate <= checkInDate) {
            if (prefersJson || req.xhr) return res.status(400).json({ available: false, message: 'Check-out date must be after check-in date' });
            return res.status(400).render('home-details', {
                message: 'Check-out date must be after check-in date',
                title: 'Availability Check Error',
                isLoggedIn: req.isLoggedIn,
                user: req.session.user,
                home,
                checkAvailability,
                priceFlag: false
            });
        }

        // Calculate nights
        const diff = checkOutDate - checkInDate;
        const nights = Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));

        // Guest validation
        if (parseInt(guests) > home.maxGuests) {
            if (prefersJson || req.xhr) return res.status(400).json({ available: false, message: `Maximum capacity is ${home.maxGuests} guests` });
            return res.status(400).render('home-details', {
                message: `Maximum capacity is ${home.maxGuests} guests`,
                title: 'Availability Check Error',
                isLoggedIn: req.isLoggedIn,
                user: req.session.user,
                home,
                checkAvailability,
                priceFlag: false
            });
        }

        // Check for overlapping bookings
        const existingBooking = await Booking.findOne({
            homeId,
            checkIn: { $lt: checkOutDate },
            checkOut: { $gt: checkInDate }
        });

        if (existingBooking) {
            if (prefersJson || req.xhr) return res.status(400).json({ available: false, message: 'Home is not available for selected dates' });
            return res.status(400).render('home-details', {
                message: 'Home is not available for selected dates',
                title: 'Availability Check Error',
                isLoggedIn: req.isLoggedIn,
                user: req.session.user,
                home,
                checkAvailability,
                priceFlag: false
            });
        }

        // Small helper - format Date as YYYY-MM-DD in LOCAL time (avoids toISOString UTC shift)
        function formatDateLocal(d){
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${dd}`;
        }

        // Home is available
        // If the client asked for JSON (AJAX), return a compact JSON response so the page can update in-place.
        if (prefersJson || req.xhr) {
            return res.json({
                available: true,
                message: 'Home is available for selected dates',
                nights,
                // for client display, return the original input strings (no timezone conversion surprises)
                checkIn,
                checkOut,
                totalPrice: (home.price || 0) * nights
            });
        }

        return res.render('home-details', {
            message: 'Home is available for selected dates',
            title: 'Home Details',
            isLoggedIn: req.isLoggedIn,
            user: req.session.user,
            home,
            priceFlag: true,
            checkAvailability: true,
            nights,
            // re-populate the user input (use original YYYY-MM-DD strings to avoid timezone shifts)
            checkIn,
            checkOut,
            guests
        });

    } catch (err) {
        console.error(err);
        return res.status(500).render('home-details', {
            message: 'Server error while checking availability',
            title: 'Availability Check Error',
            isLoggedIn: req.isLoggedIn,
            user: req.session.user,
            home: null
        });
    }
};

exports.bookHome = async (request, response, next) => {
    try {
        const homeId = request.params.id;
        if(!request.session.user || !request.session.user._id){
            console.log("User not logged in");
            return response.redirect('/auth/log-in');
        }
        // Validate ID format
        if (!mongoose.Types.ObjectId.isValid(homeId)) {
            return response.status(400).render('home-details', {
                message: 'Invalid Home ID',
                title: 'Booking Error',
                isLoggedIn: request.isLoggedIn,
                user: request.session.user,
                home: null,
                checkAvailability: false,
                priceFlag: false
            });
        }

        // FIRST: Always fetch home data
        const home = await Database.findById(homeId).populate('user');

        if (!home) {
            return response.status(404).render('home-details', {
                message: 'Home not found',
                title: 'Booking Error',
                isLoggedIn: request.isLoggedIn,
                user: request.session.user,
                home: null,
                checkAvailability: false,
                priceFlag: false
            });
        }

        const { checkIn, checkOut, guests } = request.body;

        // helper - parse date-only string into UTC-midnight Date
        function parseDateOnlyToUTC(dateStr){
            const [y, m, d] = dateStr.split('-').map(s => parseInt(s, 10));
            return new Date(Date.UTC(y, m - 1, d));
        }

        // helper - format Date (UTC) to YYYY-MM-DD for re-populating form inputs on error
        function formatDateLocal(d){
            const y = d.getUTCFullYear();
            const m = String(d.getUTCMonth() + 1).padStart(2, '0');
            const dd = String(d.getUTCDate()).padStart(2, '0');
            return `${y}-${m}-${dd}`;
        }

        // Parse dates into UTC-midnight (this avoids timezone shifts that can make saved dates -1)
        const checkInDate = parseDateOnlyToUTC(checkIn);
        const checkOutDate = parseDateOnlyToUTC(checkOut);
        const now = new Date();
        const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

        // Past date error
        if (checkInDate < today || checkOutDate < today) {
            return response.status(400).render('home-details', {
                message: 'Dates cannot be in the past',
                title: 'Booking Error',
                isLoggedIn: request.isLoggedIn,
                user: request.session.user,
                home,
                checkAvailability: false,
                priceFlag: false,
                checkIn: formatDateLocal(checkInDate),
                checkOut: formatDateLocal(checkOutDate),
                guests
            });
        }

        // Wrong sequence
        if (checkOutDate <= checkInDate) {
            return response.status(400).render('home-details', {
                message: 'Check-out date must be after check-in date',
                title: 'Booking Error',
                isLoggedIn: request.isLoggedIn,
                user: request.session.user,
                home,
                checkAvailability: false,
                priceFlag: false,
                checkIn: formatDateLocal(checkInDate),
                checkOut: formatDateLocal(checkOutDate),
                guests
            });
        }

        // Calculate nights
        const diff = checkOutDate - checkInDate;
        const nights = Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));

        // Guest validation
        if (parseInt(guests) > home.maxGuests) {
            return response.status(400).render('home-details', {
                message: `Maximum capacity is ${home.maxGuests} guests`,
                title: 'Booking Error',
                isLoggedIn: request.isLoggedIn,
                user: request.session.user,
                home,
                checkAvailability: false,
                priceFlag: false,
                checkIn: formatDateLocal(checkInDate),
                checkOut: formatDateLocal(checkOutDate),
                guests
            });
        }

        // Overlap booking check
        const existingBooking = await Booking.findOne({
            homeId,
            checkIn: { $lt: checkOutDate },
            checkOut: { $gt: checkInDate }
        });

        if (existingBooking) {
            return response.status(400).render('home-details', {
                message: 'Home is not available for selected dates',
                title: 'Booking Error',
                isLoggedIn: request.isLoggedIn,
                user: request.session.user,
                home,
                checkAvailability: false,
                priceFlag: false,
                checkIn: formatDateLocal(checkInDate),
                checkOut: formatDateLocal(checkOutDate),
                guests
            });
        }

        // Price calculation
        const nightsPrice = (home.price || 0) * nights;
        function generateRef() {
        return 'BK-' + Math.random().toString(36).slice(2, 8).toUpperCase();
        }

        // Create booking
        const newBooking = new Booking({
            bookingRef: generateRef(),
            homeId,
            userId: request.session.user._id,
            checkIn: checkInDate,
            checkOut: checkOutDate,
            guests: parseInt(guests),
            nights,
            totalPrice: nightsPrice
        });

        await newBooking.save();



        return response.render('booking-confirmation', {
            booking: newBooking,
            // nights,
            // totalPrice: nightsPrice,
            title: 'Booking Confirmed',
            isLoggedIn: request.isLoggedIn,
            user: request.session.user,
        });

    } catch (err) {
        console.error(err);
        return response.status(500).render('home-details', {
            message: 'Server error while booking',
            title: 'Booking Error',
            isLoggedIn: request.isLoggedIn,
            user: request.session.user,
            home: null,
            checkAvailability: false,
            priceFlag: false
        });
    }
};


exports.showBookings = async (request, response, next)=>{
    if(!request.session.user || !request.session.user._id){
        console.log("User not logged in");
        return response.redirect('/auth/log-in');
    }
    const userId = request.session.user._id;
    const bookings = await Booking.find({userId: userId}).populate('homeId');
    console.log("User bookings:", bookings);    
    response.render('bookings', {
        title: 'All bookings',
        isLoggedIn: request.isLoggedIn,
        user: request.session.user,
        home: bookings
    });
}
exports.cancelBooking = async (request, response, next)=>{
    if(!request.session.user || !request.session.user._id){
        console.log("User not logged in");
        return response.redirect('/auth/log-in');
    }
    const userId = request.session.user._id;
    const removeBookings = await Booking.deleteOne({userId: userId});
    console.log("User bookings:", removeBookings);    
    // response.render('bookings', {
    //     title: 'All bookings',
    //     isLoggedIn: request.isLoggedIn,
    //     user: request.session.user,
    //     home: bookings
    // });
    return response.redirect('/bookings');
}
