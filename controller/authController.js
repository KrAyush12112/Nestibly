const { check, validationResult } = require("express-validator");
const User = require("../models/user");
const bcrypt = require("bcryptjs");
const { generateOTP, storeOTP, verifyOTP } = require("../utils/otpUtils");
const { sendOTPEmail } = require("../utils/emailService");

exports.getLogIn =(request, response , next)=>{
    //   console.log("session data:", request.session);
    response.render('auth/login',{
        title:"Sign In",
        isLoggedIn: false,
        user: request.session.user
    });
};

exports.postLogIn = [
    check("email")
    .normalizeEmail(),

    async (request, response, next) => {
    // request.session.isLoggedIn = true;

    const { email, password } = request.body;
    
    console.log("Login data:", { email, password });
    // console.log("Login data:",email);
    try {
        console.log("Login data:", email);
        const user = await User.findOne({ email });
        console.log("Found user:", user);
        if (!user) {
            return response.status(401).render('auth/login', {
                title: "Sign In",
                isLoggedIn: false,
                errorMessages: ["Invalid email."],
                formData: { email },
                user: request.session.user
            });
        }

        // Check if email is verified
        if (!user.isVerified) {
            return response.status(403).render('auth/login', {
                title: "Sign In",
                isLoggedIn: false,
                errorMessages: ["Please verify your email first. Redirecting to verification page..."],
                formData: { email },
                user: request.session.user
            });
        }

        const doMatch = await bcrypt.compare(password, user.password);
        if (!doMatch) {
            return response.status(401).render('auth/login', {
                title: "Sign In",
                isLoggedIn: false,
                errorMessages: ["Invalid email or password."],
                formData: { email },
                user: request.session.user
            });
        }
        request.session.isLoggedIn = true;
        request.session.user = user;
        await request.session.save();
        console.log("User logged in successfully:", user);
        response.redirect('/');
    } catch (err) {
        console.error("Error during login:", err);
        return response.status(500).render('auth/login', {
            title: "Sign In",
            isLoggedIn: false,
            // errorMessages: ["Internal server error. Please try again later."]
            errorMessages: ["Login action unsuccessfull."],
            user: request.session.user
        });
    }
}];

exports.getLogOut =(request, response , next)=>{
    request.session.destroy((err)=>{
        console.log(err);
        response.redirect('/');
    });
   
};


exports.getVerifyOTP = (request, response, next) => {
    const email = request.query.email;
    
    if (!email) {
        return response.status(400).redirect('/auth/signup');
    }
    
    response.render('auth/verify-otp', {
        title: "Verify Email",
        isLoggedIn: false,
        user: request.session.user,
        email: email,
        errorMessages: []
    });
};

exports.postVerifyOTP = async (request, response, next) => {
    const { email, otp } = request.body;
    
    if (!email || !otp) {
        return response.status(400).render('auth/verify-otp', {
            title: "Verify Email",
            isLoggedIn: false,
            user: request.session.user,
            email: email,
            errorMessages: ["Please enter both email and OTP."]
        });
    }
    
    try {
        const otpResult = await verifyOTP(email, otp);
        
        if (!otpResult.valid) {
            return response.status(400).render('auth/verify-otp', {
                title: "Verify Email",
                isLoggedIn: false,
                user: request.session.user,
                email: email,
                errorMessages: [otpResult.message]
            });
        }
        
        // OTP is valid, mark user as verified
        const user = await User.findOneAndUpdate(
            { email: email },
            { isVerified: true },
            { new: true }
        );
        
        if (!user) {
            return response.status(404).render('auth/verify-otp', {
                title: "Verify Email",
                isLoggedIn: false,
                user: request.session.user,
                email: email,
                errorMessages: ["User not found."]
            });
        }
        
        console.log("User verified successfully:", user.email);
        
        // Redirect to login with success message
        request.session.successMessage = "Email verified successfully! Please log in.";
        response.redirect('/auth/Log-in');
    } 
    catch (err) {
        console.error("Error during OTP verification:", err);
        return response.status(500).render('auth/verify-otp', {
            title: "Verify Email",
            isLoggedIn: false,
            user: request.session.user,
            email: email,
            errorMessages: ["Internal server error. Please try again later."]
        });
    }
};


exports.postResendOTP = async (request, response, next) => {
    const { email } = request.body;
    // console.log("Resend OTP request for email:", email);
    if (!email) {
        return response.status(400).json({ success: false, message: "Email is required." });
    }
    
    try {
        const user = await User.findOne({ email });
        
        if (!user) {
            return response.status(404).json({ success: false, message: "User not found." });
        }
        
        if (user.isVerified) {
            return response.status(400).json({ success: false, message: "User is already verified." });
        }
        
        // Generate new OTP and store in MongoDB
        const otp = generateOTP();
        const storeResult = await storeOTP(email, otp);
        
        if (!storeResult.success) {
            return response.status(500).json({ success: false, message: "Failed to generate OTP. Please try again." });
        }
        
        // Send OTP email
        const emailResult = await sendOTPEmail(email, otp, user.fullName);
        
        if (!emailResult.success) {
            return response.status(500).json({ success: false, message: "Failed to resend OTP. Please try again." });
        }
        
        return response.status(200).json({ success: true, message: "OTP resent successfully. Check your email." });
    } 
    catch (err) {
        console.error("Error resending OTP:", err);
        return response.status(500).json({ success: false, message: "Internal server error." });
    }
};


exports.getSignUp =(request, response , next)=>{
    response.render('auth/signup',{
        title:"Sign Up",
        isLoggedIn: false,
        user: request.session.user
    });
};

exports.postSignUp = [
    check("fullName")
    .trim()
    .isLength({ min: 3 })
    .withMessage("Full Name must be at least 3 characters long.")
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage("Full Name must contain only letters and spaces."),

    check("email")
    .isEmail()
    .withMessage("Please enter a valid email address.")
    .normalizeEmail(),

    check("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long.")
    .matches(/[A-Z]/)
    .withMessage("Password must contain at least one Uppercase letter.")
    .matches(/[a-z]/)
    .withMessage("Password must contain at least one Lowercase letter.")
    .matches(/[0-9]/)
    .withMessage("Password must contain at least one Number.")
    .matches(/[\W]/)
    .withMessage("Password must contain at least one Special character.")
    .trim(),

    check("userType")
    .isIn(["host", "guest"])
    .withMessage("User Type must be either 'host' or 'guest'."),

    check("terms")
    .equals("on")
    .withMessage("You must accept the terms and conditions."),

    check("confirmPassword").custom((value, { req }) => {
        if (value !== req.body.password) {
            throw new Error("Passwords do not match");
        }
        return true;
    }),


    async (request, response , next)=>{
    const {fullName, email, password, userType} = request.body;
    const errors = validationResult(request);
    // console.log("errors",errors);
    // console.log("error array: ",errors.array());
    if (!errors.isEmpty()) {
        return response.status(422).render('auth/signup', { 
            title: "Sign Up",
            isLoggedIn: false,
            user: request.session.user,
            errorMessages: errors.array().map(err => err.msg),
            formData: {
                fullName,
                email, 
                userType,
                password,
            }
        });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 12);
        
        // Create unverified user
        const newUser = new User({ 
            fullName, 
            email, 
            password: hashedPassword, 
            userType,
            isVerified: false
        });
        
        await newUser.save();
        console.log("Unverified user created:", newUser);
        
        // Generate OTP and store in MongoDB
        const otp = generateOTP();
        const storeResult = await storeOTP(email, otp);
        
        // If storing OTP failed
        if (!storeResult.success) {
            console.error("Failed to store OTP:", storeResult.error);
            return response.status(500).render('auth/signup', {
                title: "Sign Up",
                isLoggedIn: false,
                user: request.session.user,
                errorMessages: ["Failed to generate OTP. Please try again."],
                formData: { fullName, email, userType, password }
            });
        }
        
        // Send OTP email via Resend
        const emailResult = await sendOTPEmail(email, otp, fullName);
        // if sending OTP email failed
        if (!emailResult.success) {
            console.error("Failed to send OTP email:", emailResult.error);
            return response.status(500).render('auth/signup', {
                title: "Sign Up",
                isLoggedIn: false,
                user: request.session.user,
                errorMessages: ["Failed to send verification email. Please try again."],
                formData: { fullName, email, userType, password }
            });
        }
        
        // Redirect to OTP verification page with email
        response.redirect(`/auth/verify-otp?email=${encodeURIComponent(email)}`); // encodeURIComponent is used to safely encode the email for URL
    } 
    catch (err) {
        console.error("Error during signup:", err);
        let errorMessage = "Internal server error. Please try again later.";
        
        if (err.code === 11000) {
            errorMessage = "Email already exists. Please use a different email.";
        }
        
        return response.status(422).render('auth/signup', { 
            title: "Sign Up",
            isLoggedIn: false,
            errorMessages: [errorMessage],
            user: request.session.user,
            formData: { 
                fullName,
                email,
                userType,
                password,
            }
        });
    }
}];