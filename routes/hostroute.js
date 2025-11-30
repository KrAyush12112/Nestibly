const express = require("express");
const hostRoute = express.Router();
const hostController = require('../controller/hostController');
const {upload} = require('../utils/multerUtils');


// Handels /host/add-home get request
hostRoute.get("/add-home", hostController.addHomeForm);

// Handels /host/add-home post request
hostRoute.post("/add-home", upload.array('image', 10), hostController.postAddHomeController);

// Route to manage homes UI
hostRoute.get("/Manage-Homes", hostController.manageHomes);

// Route to Show edit form
hostRoute.get("/update-form/:id", hostController.updateForm);

// Route to Update home details
hostRoute.post("/edit-home", upload.single('image'), hostController.updateHome);

// Route to delete home
hostRoute.get("/delete/:id", hostController.deleteHome);


exports.hostroute = hostRoute;



