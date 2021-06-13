const express = require('express');

const mongoose = require('mongoose');

const rateLimit = require("express-rate-limit");

const cors = require('cors');

const app = express();

// middle wares

//  Request Rate Limiter
const limiter = rateLimit({
    windowMs: 60 * 1000, // 1 minutes
    max: 60 // limit each IP to 60 requests per windowMs
});

// Max Payload
app.use(express.json({ limit: '50mb' }));

// Allow for all 
app.use(cors());

app.use(limiter);

const PORT = process.env.PORT || 3000;

// Environment variable for connection String 
require('dotenv').config();

// Importing the routes
const students = require('./routes/students');
// const subscriberRoute = require('./routes/subscriber');
// const kitchenRoute = require('./routes/kitchen');

// middle wares
app.use(express.json());

// Our data can have strings, arrays, objects etc.
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/students', students);
// app.use('/api/subscriber', subscriberRoute);
// app.use('/api/kitchen', kitchenRoute);


// Connection to mongo atlas 
mongoose.connect(process.env.MONGO_URL, { useNewUrlParser: true }).then(() => {
    console.log("Connected to Mongo");
}).catch(error => {
    console.log("Something wrong happened", error);
});

app.listen(PORT, () => {
    console.log("Server started at port", PORT);
})

// Will catch any uncaught exeption. 
process.on('uncaughtException', function (error) {
    console.log(error);
});

