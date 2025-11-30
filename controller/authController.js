const { check, validationResult } = require("express-validator");
const User = require("../models/user");
const bcrypt = require("bcryptjs");


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


    (request, response , next)=>{
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

    bcrypt.hash(password, 12)
    .then(hashedPassword => {
        const newUser = new User({ fullName, email, password: hashedPassword, userType});
        newUser.save()
        .then((result)=>{
            console.log("User created successfully:", result);
            response.redirect('/auth/Log-in');
        }) 
        .catch((err)=>{
            console.error("Error saving user:", err);
            return response.status(422).render('auth/signup', { 
                title: "Sign Up",
                isLoggedIn: false,
                errorMessages: ["Email already exists. Please use a different email."],
                user: request.session.user,
                formData: { 
                    fullName,
                    email,
                    userType,
                    password,
                }
            });
        });
    }).catch(err => {
        console.error("Error hashing password:", err);
        return response.status(500).render('auth/signup', {
            title: "Sign Up",
            isLoggedIn: false,
            user: request.session.user,
            errorMessages: ["Internal server error. Please try again later."],
            formData: {
                fullName,
                email,  
                userType,
                password,
            }
        });
    });
}];