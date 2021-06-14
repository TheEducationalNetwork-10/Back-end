const mongoose = require('mongoose');
// const OnlinePresence = require('./onlinePresence');

//Students schema
const StudentsSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true,
        minlength: 0,
        maxlength: 20
    },
    lastName: {
        type: String,
        required: true,
        minlength: 0,
        maxlength: 20
    },
    email: {
        type: String,
        required: true,
        minlength: 0,
        maxlength: 30
    },
    password: {
        type: String,
        required: true,
        minlength: 8
    },
    dateOfBirth: {
        type: String,
        required: true,
        minlength: 5
    },
    gender: {
        type: String,
        required: true,
        minlength: 4
    },
    city: {
        type: String,
        required: true,
        minlength: 2
    },
    universityName: {
        type: String,
        required: true,
        minlength: 2
    },
    degreeTitle: {
        type: String,
        required: true,
        minlength: 2
    },
    isApproved: {
        type: Boolean,
        required: true
    },
    verificationCode: {
        type: String
    },
    phoneNumber: {
        type: String,
        required: true
    },
    profilePicture: {
        type: String
    },
    friends: [                             // Contains all friends including the ones whom I have requested
        {
            studentID: { type: String },
            status: { type: String }
        }],
    friendRequests: [                             // Contains all friends including the ones whom I have requested
        {
            studentID: { type: String }
        }],
    requestsSent: [                             // Contains all friends including the ones whom I have requested
        {
            studentID: { type: String }
        }],

}, { timestamps: true });


module.exports = mongoose.model('students', StudentsSchema);