const express = require("express");

const authController = require("../controller/authController");

const authRoute = express.Router();

// Handle GET request for Sign-in page
authRoute.get("/Log-in", authController.getLogIn);   

authRoute.post("/Log-in", authController.postLogIn); 

authRoute.get("/Log-out", authController.getLogOut); 

authRoute.get("/Sign-up", authController.getSignUp); 

authRoute.post("/Sign-up", authController.postSignUp); 

// OTP Verification routes
authRoute.get("/verify-otp", authController.getVerifyOTP);

authRoute.post("/verify-otp", authController.postVerifyOTP);

authRoute.post("/resend-otp", authController.postResendOTP);

exports.authroute = authRoute;
