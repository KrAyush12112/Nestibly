const express = require("express");

const authController = require("../controller/authController");

const authRoute = express.Router();

// Handle GET request for Sign-in page
authRoute.get("/Log-in", authController.getLogIn);   

authRoute.post("/Log-in", authController.postLogIn); 

authRoute.get("/Log-out", authController.getLogOut); 

authRoute.get("/Sign-up", authController.getSignUp); 

authRoute.post("/Sign-up", authController.postSignUp); 

exports.authroute = authRoute;
