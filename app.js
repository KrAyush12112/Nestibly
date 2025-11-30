const express = require("express");
const session = require('express-session');
const mongoose = require('mongoose');
const MongoDBStore = require('connect-mongodb-session')(session); 
const path = require('path');
const multer = require('multer');
require("dotenv").config();


 // Routes
const userRouter = require("./routes/userRoute");
const {hostroute} = require("./routes/hostroute");
const {authroute} = require("./routes/authroute");
const rootDir = require('./utils/pathUtils')
const upload = require('./utils/multerUtils');

const {Errorcontroller} = require('./controller/404');

const app = express();


app.set('view engine', 'ejs');
app.set('views', 'views'); 

app.use(express.static(path.join(rootDir,'public')));
app.use('/uploads', express.static(path.join(rootDir, 'uploads'))); 


const store = new MongoDBStore({
    uri: process.env.MONGO_URI,
    collection: 'sessions'
}); 


app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: store
})); 


app.use((request , response , next)=>{
    request.isLoggedIn = request.session.isLoggedIn;
    next();
});


app.use((request , response , next)=>{
    console.log(request.url , request.method);
    next();
});

app.use(express.urlencoded());

app.use("/auth",authroute);

app.use(userRouter);


app.use("/host" , (request , response , next)=>{
    if(!request.session.isLoggedIn){
        return response.redirect('/auth/Log-in');
    }
    const user = request.session.user;
    if(!user || user.userType !== 'host'){
        return response.status(403).render('403');
    }
    next();
});
app.use("/host",hostroute);


app.use(Errorcontroller);

const port = process.env.PORT || 3001;

const DB_URL = process.env.MONGO_URI;


mongoose.connect(DB_URL)
    .then(() => {
    app.listen(port, ()=>{
    console.log(`server is running at http://localhost:${port}`);
    });
    })
    .catch((err) => {
        console.error('Error connecting to MongoDB:', err);
    });