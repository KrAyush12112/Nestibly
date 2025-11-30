const express = require("express");

const userRouter= express.Router();
const userController = require("../controller/userController");
const favourite = require("../controller/favouriteController");




userRouter.get("/", userController.redirectHome);
userRouter.get("/detailed-view/:id", userController.homeDetails)

userRouter.get("/Listed-Homes", userController.listedHomes)

userRouter.post("/favorites/add/:id", favourite.addToFavorites);
userRouter.get("/favorites", favourite.showFavorites);
userRouter.post("/favorites/remove/:id", favourite.removeFavorites);

userRouter.post("/search-results", userController.searchResults);

userRouter.post("/bookings/checkAvailability/:id", userController.checkAvailability);

userRouter.post("/bookings/:id", userController.bookHome);

userRouter.get("/bookings", userController.showBookings);

userRouter.post("/bookings/:id/cancel", userController.cancelBooking);


module.exports = userRouter;
