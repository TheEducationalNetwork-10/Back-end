const express = require('express');

const router = express.Router();

const bcrypt = require("bcrypt");

const jwt = require("jsonwebtoken");

const nodemailer = require("nodemailer");

const Students = require('../models/students');

const { nanoid } = require("nanoid");


// Mailing service
var transporter = nodemailer.createTransport({
    service: process.env.SERVICE,
    auth: {
        user: process.env.USER,
        pass: process.env.PASS
    }
});

// Code Generator
function randomString(length) {
    chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
    var result = '';
    for (var i = length; i > 0; --i) {
        result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
}

// ----> Handling Routes

//Signup student
router.post("/signup", async (req, res) => {

    const student = new Students({
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        password: req.body.password,
        dateOfBirth: req.body.dateOfBirth,
        gender: req.body.gender,
        city: req.body.city,
        universityName: req.body.universityName,
        degreeTitle: req.body.degreeTitle,
        isApproved: false,
        verificationCode: "",
        phoneNumber: req.body.phoneNumber,
        profilePicture: req.body.profilePicture
    });

    // To check if email exists in tables 
    const emailExists = await Students.findOne({ email: student.email });


    if (emailExists) {
        res.status(400).json({ message: "Email Already Exists", data: null });
        return;
    }

    //salt to hash password
    const salt = await bcrypt.genSalt(10);

    //user password to hashed password
    student.password = await bcrypt.hash(student.password, salt);

    // generating random code for verification 
    const randomCode = randomString(8);

    student.verificationCode = await bcrypt.hash(randomCode, salt);

    try {
        const studentResponse = await student.save();

        var mailOptions = {
            from: process.env.USER,
            to: student.email,
            subject: 'Confirm your email',
            text: `Please use this verification code to complete your sign up :${randomCode}`
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.log(error);
            }
            else {
                console.log('Email Sent:' + info.response);
            }

        });

        res.json({ message: "Account Created Successfully", data: studentResponse });

    } catch (error) {
        // console.log(error)
        res.status(400).json({ message: error.message, data: null });
    }
});

// Get all students
router.get("/", (req, res) => {
    Students.find()
        .then((students) => res.json({ message: "All Students", data: students }))
        .catch((error) => {
            res.status(500).json({ message: "Something went wrong", data: null });
        });
});

// Get student by ID 
router.get("/:studentID", async (req, res) => {
    await Students.findById(req.params.studentID).then(async student => {
        if (student) {

            let findFriends = [];
            let findfriendRequests = [];
            let requestsSent = [];

            for (let i = 0; i < student.friends.length; i++) {
                let friendList = await Students.findById(student.friends[i].studentID);
                findFriends.push(friendList);
            }

            for (let i = 0; i < student.friendRequests.length; i++) {
                let friendList = await Students.findById(student.friendRequests[i].studentID);
                findfriendRequests.push(friendList);
            }

            for (let i = 0; i < student.requestsSent.length; i++) {
                let friendList = await Students.findById(student.requestsSent[i].studentID);
                requestsSent.push(friendList);
            }

            res.status(200).json({ message: "Success", data: { student: student, friends: findFriends, friendRequests: findfriendRequests, requestsSent: requestsSent } });
            return;

        }
        res.status(404).json({ message: "Student was not found", data: null });
    }).catch(() => {
        res.status(500).json({ message: "Something went wrong", data: null });
    })
});

// Login students
router.post("/login", async (req, res) => {
    const body = req.body;
    const student = await Students.findOne({ email: body.email });

    if (student) {

        // checking user password with hashed password stored in the database
        const validPassword = await bcrypt.compare(body.password, student.password);

        if (validPassword) {

            // var token = jwt.sign(
            //     { retailCustomer },
            //     process.env.JWT_KEY,
            //     { expiresIn: "1h" });


            // res.json({ message: "Success", data: { retailCustomer: retailCustomer, retailCustomerDetails: retailCustomerDetails, token: token } });
            // return;

            // Data required to response for shoaib
            let findFriends = [];
            let findfriendRequests = [];
            let requestsSent = [];

            for (let i = 0; i < student.friends.length; i++) {
                let friendList = await Students.findById(student.friends[i].studentID);
                findFriends.push(friendList);
            }

            for (let i = 0; i < student.friendRequests.length; i++) {
                let friendList = await Students.findById(student.friendRequests[i].studentID);
                findfriendRequests.push(friendList);
            }

            for (let i = 0; i < student.requestsSent.length; i++) {
                let friendList = await Students.findById(student.requestsSent[i].studentID);
                requestsSent.push(friendList);
            }

            // console.log("From here");
            // console.log(findFriends);
            // console.log(findfriendRequests);
            // console.log(requestsSent);

            res.status(200).json({ message: "Login successfully", data: { student: student, friends: findFriends, friendRequests: findfriendRequests, requestsSent: requestsSent } });
            // res.status(200).json({ message: "Login successfully", data: student });
            return;


        } else {
            res.status(400).json({ message: "Invalid Password", data: null });
        }
    } else {
        res.status(401).json({ message: "Student does not exist", data: null });
    }
});

// Verify verification code 
router.post("/verification/:studentID", async (req, res) => {

    await Students.findById(req.params.studentID).then(async student => {

        if (student) {

            if (student.isApproved) {

                res.json({ message: "User is Already Verified" });
                return;

            } else {
                // checking user verfication code with hashed code stored in the database
                const validCode = await bcrypt.compare(req.body.verificationCode, student.verificationCode);

                if (validCode) {

                    student.isApproved = true;
                    student.verificationCode = "";

                    const saveStudent = await student.save(function (error, user) {
                        console.log(error);

                    });

                    res.json({ message: "User Verified" });
                    return;

                } else {
                    res.status(400).json({ message: "Wrong verification code", data: null });
                    return;
                }
            }
        }
        res.status(404).json({ message: "Student not found", data: null });
    }).catch(() => {
        res.status(500).json({ message: "Something went wrong", data: null });
    })

});

// Resend verification code
router.post("/resendcode/:studentID", async (req, res) => {

    await Students.findById(req.params.studentID).then(async student => {

        if (student) {

            if (student.isApproved) {

                res.json({ message: "User is Already Verified" });
                return;

            } else {

                //salt to hash password
                const salt = await bcrypt.genSalt(10);

                // generating random code for verification 
                const randomCode = randomString(8);

                student.verificationCode = await bcrypt.hash(randomCode, salt);

                try {
                    const studentResponse = await student.save();

                    var mailOptions = {
                        from: process.env.USER,
                        to: student.email,
                        subject: 'Confirm your email',
                        text: `Please use this verification code to complete your sign up :${randomCode}`
                    };

                    transporter.sendMail(mailOptions, (error, info) => {
                        if (error) {
                            res.status(500).json({ message: error.message });
                            return;
                            // console.log(error);
                        }
                        else {
                            res.json({ message: "Code send successfully" });
                            return;
                        }

                    });

                } catch (error) {
                    res.status(400).json({ message: error.message });
                }
                return;
            }
        }
        res.status(404).json({ message: "Student was not found", data: null });
    }).catch((error) => {
        res.status(500).json({ message: "Something went wrong", data: null });

    })

});

// Forgot Password
router.post("/forgotpassword", async (req, res) => {

    await Students.findOne({ email: req.body.email }).then(async student => {
        if (student) {

            //salt to hash password
            const salt = await bcrypt.genSalt(10);

            // generating random code for verification 
            const randomCode = randomString(8);

            student.verificationCode = await bcrypt.hash(randomCode, salt);

            try {
                const retailCustomerResponse = await student.save();

                var mailOptions = {
                    from: process.env.USER,
                    to: student.email,
                    subject: 'Forgot password',
                    text: `Please use this verification code to change your password :${randomCode}`
                };

                transporter.sendMail(mailOptions, (error, info) => {
                    if (error) {
                        res.status(500).json({ message: error.message });
                        return;
                    }
                    else {
                        res.json({ message: "Code send successfully" });
                        return;
                    }

                });

            } catch (error) {
                res.status(400).json({ message: error.message });
            }
            return;

        }
        res.status(404).json({ message: "Student not found", data: null });
    }).catch((error) => {
        res.status(500).json({ message: "Something went wrong", data: null });

    })

});

// Forgot Password->Change Password
router.post("/forgotpassword/changepassword/:email", async (req, res) => {

    await Students.findOne({ email: req.params.email }).then(async student => {

        if (student) {

            // checking user verfication code with hashed code stored in the database
            const validCode = await bcrypt.compare(req.body.verificationCode, student.verificationCode);

            if (validCode) {

                if (req.body.password !== null && req.body.password !== '' && req.body.password.length >= 8) {

                    //salt to hash password
                    const salt = await bcrypt.genSalt(10);

                    //user password to hashed password
                    student.password = await bcrypt.hash(req.body.password, salt);

                    student.verificationCode = "";

                    try {
                        const studentResponse = await student.save();
                        res.status(200).json({ message: "Password changed successfully" });

                    } catch (error) {
                        res.status(400).json({ message: error.message });

                    }
                    return;
                } else {
                    res.status(400).json({ message: "Invalid password length" });
                    return;
                }
            } else {
                res.status(400).json({ message: "Invalid verification code" });
                return;
            }
        }
        res.status(404).json({ message: "Student was not found", data: null });
        return;
    }).catch((error) => {
        // console.log(error);
        res.status(500).json({ message: "Something went wrong", data: null });

    })

});

// Change Password
router.post("/changepassword/:studentID", async (req, res) => {

    await Students.findById(req.params.studentID).then(async student => {

        if (student) {

            // checking user password with hashed password stored in the database
            const checkOldPassword = await bcrypt.compare(req.body.newpassword, student.password);

            if (checkOldPassword) {

                res.status(400).json({ message: "New password can't be old password" });
                return;

            } else {

                // checking if the old password of user is valid
                const validOldPassword = await bcrypt.compare(req.body.oldpassword, student.password);

                if (validOldPassword) {

                    if (req.body.newpassword !== null && req.body.newpassword !== '' && req.body.newpassword.length >= 8) {

                        //salt to hash password
                        const salt = await bcrypt.genSalt(10);

                        //user password to hashed password
                        student.password = await bcrypt.hash(req.body.newpassword, salt);

                        try {
                            const studentResponse = await student.save();
                            res.status(200).json({ message: "Password changed successfully" });

                        } catch (error) {
                            res.status(400).json({ message: error.message });

                        }
                        return;
                    } else {
                        res.status(400).json({ message: "Invalid password length" });
                        return;
                    }
                } else {
                    res.status(400).json({ message: "Invalid old password" });
                    return;
                }
            }

        }
        res.status(404).json({ message: "Student was not found", data: null });
        return;
    }).catch((error) => {
        res.status(500).json({ message: "Something went wrong", data: null });

    })

});

// Send Friend Request
router.post("/sendrequest/:studentID/:requestedStudentID", async (req, res) => {

    await Students.findById(req.params.studentID).then(async student => {

        if (student) {

            const findStudentRequested = Students.findById(req.params.requestedStudentID);

            if (!findStudentRequested) {
                res.status(400).json({ message: "Requested student was not found" });
                return;
            }

            const findUserInFriendRequest = await Students.find(
                {
                    _id: req.params.requestedStudentID,
                    friendRequests: { $elemMatch: { studentID: req.params.studentID } }
                }
            );

            const findUserInFriends = await Students.find(
                {
                    _id: req.params.requestedStudentID,
                    friends: { $elemMatch: { studentID: req.params.studentID } }
                }
            );

            const findUserInRequestsSent = await Students.find(
                {
                    _id: req.params.requestedStudentID,
                    requestsSent: { $elemMatch: { studentID: req.params.studentID } }
                }
            );

            if (findUserInFriendRequest.length > 0) {

                res.status(400).json({ message: "You have already sent request" });
                return;
            }

            if (findUserInFriends.length > 0) {

                res.status(400).json({ message: "You are already friend with the requested user" });
                return;
            }

            if (findUserInRequestsSent.length > 0) {

                res.status(400).json({ message: "Requested user has already send you friend request, Please check your friend requests" });
                return;
            }


            try {

                // To save info in requested students requests array
                const saveInfoRequestedStudent = await Students.findOneAndUpdate(
                    { _id: req.params.requestedStudentID },
                    { $push: { friendRequests: { studentID: req.params.studentID } } }
                );

                // To save info in students friends array
                const saveInfoStudent = await Students.findOneAndUpdate(
                    { _id: req.params.studentID },
                    { $push: { requestsSent: { studentID: req.params.requestedStudentID } } }
                );

                res.status(200).json({ message: "Friend Request Sent Successfully" });

            } catch (error) {
                res.status(400).json({ message: error.message });

            }

            return;
        }
        res.status(404).json({ message: "Student was not found" });
        return;
    }).catch((error) => {
        res.status(500).json({ message: "Something went wrong" });

    })

});

// Approve Friend Request
router.post("/approverequest/:studentID/:toApproveStudentID", async (req, res) => {

    await Students.findById(req.params.studentID).then(async student => {

        if (student) {

            const findStudentRequested = Students.findById(req.params.toApproveStudentID);

            if (!findStudentRequested) {
                res.status(400).json({ message: "Requested student was not found" });
                return;
            }

            const friendRequestExists = await Students.find(
                { _id: req.params.studentID },
                { friendRequests: { $elemMatch: { studentID: req.params.toApproveStudentID } } }
            );

            if (!friendRequestExists) {
                res.status(400).json({ message: "Friend request not found" });
                return;
            }

            const findUserInFriends = await Students.find(
                {
                    _id: req.params.studentID,
                    friends: { $elemMatch: { studentID: req.params.toApproveStudentID } }
                }
            );

            if (findUserInFriends.length > 0) {
                res.status(400).json({ message: "You are already friends" });
                return;
            }



            try {

                // To save info in requested students friends array
                const saveInfoRequestedStudentrequestsSent = await Students.findOneAndUpdate(
                    { _id: req.params.toApproveStudentID },
                    { $pull: { requestsSent: { studentID: req.params.studentID } } });

                const saveInfoRequestedStudentfriends = await Students.findOneAndUpdate(
                    { _id: req.params.toApproveStudentID },
                    { $push: { friends: { studentID: req.params.studentID } } }
                );


                // To save info in students friends/friendRequests array
                const saveInfoStudentfriendRequests = await Students.findOneAndUpdate(
                    { _id: req.params.studentID },
                    { $pull: { friendRequests: { studentID: req.params.toApproveStudentID } } }
                );

                const saveInfoStudentfriends = await Students.findOneAndUpdate(
                    { _id: req.params.studentID },
                    { $push: { friends: { studentID: req.params.toApproveStudentID } } }
                );



                res.status(200).json({ message: "Friend Request Approved Successfully" });

            } catch (error) {
                res.status(400).json({ message: error.message });

            }

            return;
        }
        res.status(404).json({ message: "Student was not found" });
        return;
    }).catch((error) => {
        res.status(500).json({ message: "Something went wrong" });

    })

});

// Delete Friend Request
router.post("/deleterequest/:studentID/:requestedStudentID", async (req, res) => {

    await Students.findById(req.params.studentID).then(async student => {

        if (student) {

            const findStudentRequested = Students.findById(req.params.requestedStudentID);

            if (!findStudentRequested) {
                res.status(400).json({ message: "Requested student was not found" });
                return;
            }

            const findUserInfriendRequests = await Students.find(
                {
                    _id: req.params.studentID,
                    friendRequests: { $elemMatch: { studentID: req.params.requestedStudentID } }
                }
            );

            if (findUserInfriendRequests.length < 1) {
                res.status(400).json({ message: "No requests found to delete" });
                return;
            }

            try {

                // To save info in requested students friends array
                const deleteFriendRequests = await Students.findOneAndUpdate(
                    { _id: req.params.studentID },
                    { $pull: { 'friendRequests': { studentID: req.params.requestedStudentID } } });

                // To save info in students friends array
                const deleteRequestsSent = await Students.findOneAndUpdate(
                    { _id: req.params.requestedStudentID },
                    { $pull: { 'requestsSent': { studentID: req.params.studentID } } });

                res.status(200).json({ message: "Friend Request Deleted Successfully" });

            } catch (error) {
                res.status(400).json({ message: error.message });

            }

            return;
        }
        res.status(404).json({ message: "Student was not found" });
        return;
    }).catch((error) => {
        res.status(500).json({ message: "Something went wrong" });

    })

});

// Cancel Friend Request
router.post("/cancelrequest/:studentID/:requestedStudentID", async (req, res) => {

    await Students.findById(req.params.studentID).then(async student => {

        if (student) {

            const findStudentRequested = Students.findById(req.params.requestedStudentID);

            if (!findStudentRequested) {
                res.status(400).json({ message: "Requested student was not found" });
                return;
            }

            const findUserInRequestsSent = await Students.find(
                {
                    _id: req.params.studentID,
                    requestsSent: { $elemMatch: { studentID: req.params.requestedStudentID } }
                }
            );

            if (findUserInRequestsSent.length < 1) {
                res.status(400).json({ message: "No requests found to cancel" });
                return;
            }

            try {

                // To save info in requested students friends array
                const deleteFriendRequests = await Students.findOneAndUpdate(
                    { _id: req.params.studentID },
                    { $pull: { 'requestsSent': { studentID: req.params.requestedStudentID } } });

                // To save info in students friends array
                const deleteRequestsSent = await Students.findOneAndUpdate(
                    { _id: req.params.requestedStudentID },
                    { $pull: { 'friendRequests': { studentID: req.params.studentID } } });

                res.status(200).json({ message: "Friend Request Canceled Successfully" });

            } catch (error) {
                res.status(400).json({ message: error.message });

            }

            return;
        }
        res.status(404).json({ message: "Student was not found" });
        return;
    }).catch((error) => {
        res.status(500).json({ message: "Something went wrong" });

    })

});

// // Update personal information
// router.post("/update/personalinformation/:customerID", async (req, res) => {

//     await RetailCustomer.findById(req.params.customerID).then(async customer => {

//         if (customer) {

//             customer.firstname = req.body.firstname;
//             customer.lastname = req.body.lastname;
//             customer.phoneNumber = req.body.phoneNumber;

//             try {
//                 const retailCustomerResponse = await customer.save();

//                 // To update foodBusinessName in kitchen schema
//                 const updateInfoUserKitchen = await Kitchen.updateMany(
//                     { "retailCustomers.customerID": req.params.customerID },
//                     {
//                         $set: {
//                             "retailCustomers.$.customerName": `${req.body.firstname} ${req.body.lastname}`
//                         }
//                     }
//                 );

//                 res.status(200).json({ message: "Personal information updated successfully", data: retailCustomerResponse });
//             } catch (error) {
//                 res.status(400).json({ message: error.message });

//             }
//             return;
//         }
//         res.status(404).json({ message: "Customer was not found", data: null });
//         return;
//     }).catch((error) => {
//         res.status(500).json({ message: "Something went wrong", data: null });
//     });

// });


// // Retail Customer Secondary Email Routes

// // Add secondary emails
// router.post("/add/secondaryemail/:customerID", async (req, res) => {

//     await RetailCustomer.findById(req.params.customerID).then(async customer => {
//         if (customer) {
//             const retailCustomerSecondaryEmailRes = await RetailCustomersSecondaryEmail.findOne({ customerID: req.params.customerID });

//             if (retailCustomerSecondaryEmailRes) {

//                 // Checking is email exists
//                 const emailExists = await RetailCustomersSecondaryEmail.find({ secondaryEmail: { $elemMatch: { email: req.body.email } } });
//                 const emailExistsPrimary = await RetailCustomer.findOne({ email: req.body.email });
//                 const findEmailRetailCustomerDetails = await RetailCustomersDetails.findOne({ businessEmail: req.body.email });
//                 const findEmailSubscriber = await Subscriber.findOne({ email: req.body.email });
//                 const findEmailSubscriberSecondaryEmail = await SubscriberSecondaryEmail.find({ secondaryEmail: { $elemMatch: { email: req.body.email } } });


//                 if (emailExists.length > 0 || emailExistsPrimary || findEmailRetailCustomerDetails || findEmailSubscriber || findEmailSubscriberSecondaryEmail.length > 0) {
//                     res.status(400).json({ message: "Email Already Exists" });
//                     return;
//                 } else {

//                     // generating random code for verification 
//                     const salt = await bcrypt.genSalt(10);
//                     const randomCode = randomString(8);

//                     try {
//                         const saveinfo = await RetailCustomersSecondaryEmail.findOneAndUpdate(
//                             { customerID: req.params.customerID },
//                             { $push: { secondaryEmail: { email: req.body.email, isApproved: false, verificationCode: await bcrypt.hash(randomCode, salt) } } }
//                         );

//                         var mailOptions = {
//                             from: process.env.USER,
//                             to: req.body.email,
//                             subject: 'Confirm your email',
//                             text: `Please use this verification code to verify your email :${randomCode}`
//                         };

//                         transporter.sendMail(mailOptions, (error, info) => {
//                             if (error) {
//                                 console.log(error);
//                             }
//                             else {
//                                 console.log('Email Sent:' + info.response);
//                             }

//                         });

//                         const secondaryEmailResponse = await RetailCustomersSecondaryEmail.findOne({ customerID: req.params.customerID });
//                         res.status(200).json({ message: "Email Added successfully", data: secondaryEmailResponse });

//                     } catch (error) {
//                         res.status(400).json({ message: error.message });
//                     }
//                     return;
//                 }

//             } else {
//                 const emailExists = await RetailCustomersSecondaryEmail.find({ secondaryEmail: { $elemMatch: { email: req.body.email } } });
//                 const emailExistsPrimary = await RetailCustomer.findOne({ email: req.body.email });
//                 const findEmailRetailCustomerDetails = await RetailCustomersDetails.findOne({ businessEmail: req.body.email });
//                 const findEmailSubscriber = await Subscriber.findOne({ email: req.body.email });
//                 const findEmailSubscriberSecondaryEmail = await SubscriberSecondaryEmail.find({ secondaryEmail: { $elemMatch: { email: req.body.email } } });


//                 if (emailExistsPrimary || emailExists.length > 0 || findEmailRetailCustomerDetails || findEmailSubscriber || findEmailSubscriberSecondaryEmail.length > 0) {
//                     res.status(400).json({ message: "Email Already Exists" });
//                     return;
//                 } else {

//                     // generating random code for verification 
//                     const salt = await bcrypt.genSalt(10);
//                     const randomCode = randomString(8);

//                     const retailCustomerSecondaryEmail = new RetailCustomersSecondaryEmail({
//                         customerID: req.params.customerID,
//                         secondaryEmail: { email: req.body.email, isApproved: false, verificationCode: await bcrypt.hash(randomCode, salt) }
//                     });

//                     try {

//                         var mailOptions = {
//                             from: process.env.USER,
//                             to: req.body.email,
//                             subject: 'Confirm your email',
//                             text: `Please use this verification code to verify your email :${randomCode}`
//                         };

//                         transporter.sendMail(mailOptions, (error, info) => {
//                             if (error) {
//                                 console.log(error);
//                             }
//                             else {
//                                 console.log('Email Sent:' + info.response);
//                             }

//                         });

//                         const saveinfo = await retailCustomerSecondaryEmail.save();
//                         res.status(200).json({ message: "Email Added successfully", data: saveinfo });

//                     } catch (error) {
//                         res.status(400).json({ message: error.message });

//                     }
//                     return;
//                 }
//             }
//         }
//         res.status(404).json({ message: "Customer was not found", data: null });
//         return;
//     }).catch((error) => {
//         res.status(500).json({ message: "Something went wrong", data: null });
//     });

// });

// // Resend verification code/ Secondary email
// router.post("/resendCode/secondaryemail/:customerID", async (req, res) => {

//     await RetailCustomersSecondaryEmail.findOne({ customerID: req.params.customerID }).then(async customer => {
//         if (customer) {

//             const retailCustomerSecondaryEmailRes = await RetailCustomersSecondaryEmail.findOne({ customerID: req.params.customerID });

//             var isEmailFound = false;
//             var emailIndex = 0;

//             for (let i = 0; i < retailCustomerSecondaryEmailRes.secondaryEmail.length; i++) {

//                 if (retailCustomerSecondaryEmailRes.secondaryEmail[i].email === req.body.email) {
//                     isEmailFound = true;
//                     emailIndex = i;
//                     break;
//                 } else {
//                     isEmailFound = false;
//                 }
//             }

//             if (!isEmailFound) {

//                 res.status(400).json({ message: "Email not found" });
//                 return;

//             } else {

//                 if (retailCustomerSecondaryEmailRes.secondaryEmail[emailIndex].isApproved === true) {

//                     res.status(400).json({ message: "Email is already verified" });
//                     return;

//                 } else {

//                     // generating random code for verification 
//                     const salt = await bcrypt.genSalt(10);
//                     const randomCode = randomString(8);

//                     try {

//                         const saveinfo = await RetailCustomersSecondaryEmail.updateOne(
//                             { 'secondaryEmail.email': req.body.email },
//                             {
//                                 '$set': {
//                                     'secondaryEmail.$.email': req.body.email,
//                                     'secondaryEmail.$.isApproved': false, 'secondaryEmail.$.verificationCode': await bcrypt.hash(randomCode, salt), 'secondaryEmail.$._id': retailCustomerSecondaryEmailRes.secondaryEmail[emailIndex]._id
//                                 }
//                             }
//                         );


//                         var mailOptions = {
//                             from: process.env.USER,
//                             to: req.body.email,
//                             subject: 'Confirm your email',
//                             text: `Please use this verification code to verify your email :${randomCode}`
//                         };

//                         transporter.sendMail(mailOptions, (error, info) => {
//                             if (error) {
//                                 console.log(error);
//                             }
//                             else {
//                                 console.log('Email Sent:' + info.response);
//                             }

//                         });

//                         res.status(200).json({ message: "Verification code sent successfully" });

//                     } catch (error) {
//                         res.status(400).json({ message: error.message });
//                     }
//                     return;
//                 }
//             }
//         }
//         res.status(404).json({ message: "No secondary emails found" });
//     }).catch((error) => {
//         res.status(500).json({ message: `Something went wrong ${error}` });

//     });

// });

// // Get secondary emails by customer ID
// router.get("/secondaryemail/:customerID", async (req, res) => {

//     await RetailCustomer.findById(req.params.customerID).then(async customer => {
//         if (customer) {
//             const retailCustomerSecondaryEmailRes = await RetailCustomersSecondaryEmail.findOne({ customerID: req.params.customerID });
//             if (retailCustomerSecondaryEmailRes) {

//                 res.status(200).json({ message: "Success", data: retailCustomerSecondaryEmailRes });
//                 return;

//             } else {
//                 res.status(400).json({ message: "No secondary emails found" });
//                 return;
//             }
//         }

//     }).catch(() => {
//         res.status(404).json({ message: "Customer was not found", data: null });
//     });

// });

// // Delete secondary email
// router.post("/delete/secondaryemail/:customerID", async (req, res) => {

//     await RetailCustomersSecondaryEmail.findOne({ customerID: req.params.customerID }).then(async customer => {
//         if (customer) {
//             const emailExists = await RetailCustomersSecondaryEmail.find({
//                 secondaryEmail: { $elemMatch: { email: req.body.email } }
//             });
//             if (emailExists.length > 0) {

//                 try {
//                     const delEmail = await RetailCustomersSecondaryEmail.updateOne(
//                         { customerID: req.params.customerID },
//                         { $pull: { 'secondaryEmail': { email: req.body.email } } }
//                     );

//                     res.status(200).json({ message: "Email deleted successfully" });

//                 } catch (error) {
//                     res.status(400).json({ message: error.message });
//                 }
//                 return;

//             } else {
//                 res.status(400).json({ message: "Email does not exist" });
//                 return;
//             }
//         }
//         res.status(404).json({ message: "No secondary emails found" });
//     }).catch((error) => {
//         res.status(500).json({ message: `Something went wrong ${error}` });

//     });

// });

// // Verify / Secondary email
// router.post("/verify/secondaryemail/:customerID", async (req, res) => {

//     await RetailCustomersSecondaryEmail.findOne({ customerID: req.params.customerID }).then(async customer => {
//         if (customer) {

//             const retailCustomerSecondaryEmailRes = await RetailCustomersSecondaryEmail.findOne({ customerID: req.params.customerID });

//             var isEmailFound = false;
//             var emailIndex = 0;

//             for (let i = 0; i < retailCustomerSecondaryEmailRes.secondaryEmail.length; i++) {

//                 if (retailCustomerSecondaryEmailRes.secondaryEmail[i].email === req.body.email) {
//                     isEmailFound = true;
//                     emailIndex = i;
//                     break;
//                 } else {
//                     isEmailFound = false;
//                 }
//             }

//             if (!isEmailFound) {

//                 res.status(400).json({ message: "Email not found" });
//                 return;

//             } else {

//                 if (retailCustomerSecondaryEmailRes.secondaryEmail[emailIndex].isApproved === true) {

//                     res.status(400).json({ message: "Email is already verified" });
//                     return;

//                 } else {

//                     const validCode = await bcrypt.compare(req.body.verificationCode, retailCustomerSecondaryEmailRes.secondaryEmail[emailIndex].verificationCode);

//                     if (validCode) {

//                         try {

//                             const saveinfo = await RetailCustomersSecondaryEmail.updateOne(
//                                 { 'secondaryEmail.email': req.body.email },
//                                 {
//                                     '$set': {
//                                         'secondaryEmail.$.email': req.body.email,
//                                         'secondaryEmail.$.isApproved': true, 'secondaryEmail.$.verificationCode': "", 'secondaryEmail.$._id': retailCustomerSecondaryEmailRes.secondaryEmail[emailIndex]._id
//                                     }
//                                 }
//                             );

//                             res.status(200).json({ message: "Email Verified Successfully" });

//                         } catch (error) {
//                             res.status(400).json({ message: error.message });
//                         }
//                         return;

//                     } else {

//                         res.status(400).json({ message: "Wrong verification code" });
//                         return;

//                     }
//                 }
//             }
//         }
//         res.status(404).json({ message: "No secondary emails found" });
//     }).catch((error) => {
//         res.status(500).json({ message: `Something went wrong ${error}` });

//     });

// });

// // Account Settings / Business Profile

// // Update Account Setting Business Profile

// router.post("/update/businessprofile/:customerID", async (req, res) => {

//     await RetailCustomersDetails.find({ customerID: req.params.customerID }).then(async customer => {

//         if (customer) {

//             if (req.body.image === null || req.body.image === "" || req.body.image.trim() === "") {
//                 const retailCustomer = await RetailCustomersDetails.findOne({ customerID: req.params.customerID });
//                 // set the previous image no upload or update
//                 try {
//                     const saveinfo = await RetailCustomersDetails.findOneAndUpdate(
//                         { customerID: req.params.customerID },
//                         {
//                             foodBusinessName: req.body.foodBusinessName,
//                             businessCategory: req.body.businessCategory,
//                             businessStage: req.body.businessStage,
//                             description: req.body.description,
//                             businessLogo: retailCustomer.businessLogo,
//                             logoName: retailCustomer.logoName
//                         });

//                     const getUpdatedRetailCustomer = await RetailCustomersDetails.findOne({ customerID: req.params.customerID });
//                     const getRetailCustomerBasic = await RetailCustomer.findById(req.params.customerID);

//                     // To update foodBusinessName in kitchen schema
//                     const updateInfoUserKitchen = await Kitchen.updateMany(
//                         { "retailCustomers.customerID": req.params.customerID },
//                         {
//                             $set: {
//                                 "retailCustomers.$.foodBusinessName": req.body.foodBusinessName
//                             }
//                         }
//                     );


//                     res.status(200).json({ message: "Information updated successfully", data: { retailCustomer: getRetailCustomerBasic, retailCustomerDetails: getUpdatedRetailCustomer } });

//                 } catch (error) {

//                     res.status(400).json({ message: error.message });

//                 }
//                 return;

//             } else {

//                 // Uploading Image
//                 let userImageID = "";
//                 let userImageName = "";

//                 // If image is not empty, check if business logo is empty or not
//                 const retailCustomer = await RetailCustomersDetails.findOne({ customerID: req.params.customerID });

//                 if (retailCustomer.businessLogo === null || retailCustomer.businessLogo === "") {

//                     // If logo is empty then upload a file...


//                     const uploadImg = req.body.image.split(/,(.+)/)[1];
//                     const buf = new Buffer.from(uploadImg, "base64"); // Added
//                     const bs = new stream.PassThrough(); // Added
//                     bs.end(buf); // Added
//                     let ID = nanoid();
//                     const imageID = await uploadFile(bs, ID);
//                     userImageID = imageID;
//                     userImageName = ID;

//                 } else {

//                     // else update the existing file...

//                     const uploadImg = req.body.image.split(/,(.+)/)[1];
//                     const buf = new Buffer.from(uploadImg, "base64"); // Added
//                     const bs = new stream.PassThrough(); // Added
//                     bs.end(buf); // Added
//                     const imageID = await updateFile(bs, retailCustomer.businessLogo);
//                     userImageID = imageID;
//                     userImageName = retailCustomer.logoName;

//                 }

//                 try {
//                     const saveinfo = await RetailCustomersDetails.findOneAndUpdate(
//                         { customerID: req.params.customerID },
//                         {
//                             foodBusinessName: req.body.foodBusinessName,
//                             businessCategory: req.body.businessCategory,
//                             businessStage: req.body.businessStage,
//                             description: req.body.description,
//                             businessLogo: userImageID,
//                             logoName: userImageName
//                         });

//                     const getUpdatedRetailCustomer = await RetailCustomersDetails.findOne({ customerID: req.params.customerID });
//                     const getRetailCustomerBasic = await RetailCustomer.findById(req.params.customerID);

//                     // To update foodBusinessName in kitchen schema
//                     const updateInfoUserKitchen = await Kitchen.updateMany(
//                         { "retailCustomers.foodBusinessName": retailCustomer._doc.foodBusinessName },
//                         {
//                             $set: {
//                                 "retailCustomers.$.foodBusinessName": req.body.foodBusinessName
//                             }
//                         }
//                     );

//                     res.status(200).json({ message: "Information updated successfully", data: { retailCustomer: getRetailCustomerBasic, retailCustomerDetails: getUpdatedRetailCustomer } });

//                 } catch (error) {

//                     res.status(400).json({ message: error.message });

//                 }
//                 return;

//             }

//         }
//         res.status(404).json({ message: "Customer was not found", data: null });
//         return;
//     }).catch((error) => {
//         res.status(500).json({ message: "Something went wrong", data: null });
//         console.log(error);
//     });

// });

// // Update Account Setting Online Presence 
// router.post("/update/onlinepresence/:customerID", async (req, res) => {

//     await RetailCustomersDetails.find({ customerID: req.params.customerID }).then(async customer => {

//         if (customer.length > 0) {

//             try {
//                 const saveinfo = await RetailCustomersDetails.findOneAndUpdate(
//                     { customerID: req.params.customerID },
//                     {
//                         OnlinePresence: {
//                             website: req.body.website,
//                             facebook: req.body.facebook,
//                             instagram: req.body.instagram,
//                             twitter: req.body.twitter
//                         }
//                     });

//                 const getUpdatedRetailCustomer = await RetailCustomersDetails.findOne({ customerID: req.params.customerID });
//                 const getRetailCustomerBasic = await RetailCustomer.findById(req.params.customerID);

//                 res.status(200).json({ message: "Information updated successfully", data: { retailCustomer: getRetailCustomerBasic, retailCustomerDetails: getUpdatedRetailCustomer } });

//             } catch (error) {

//                 res.status(400).json({ message: error.message });

//             }
//             return;

//         }
//         res.status(404).json({ message: "Customer was not found", data: null });
//         return;
//     }).catch((error) => {
//         res.status(500).json({ message: "Something went wrong", data: null });
//         console.log(error);
//     });

// });

// // Update Account Setting Public Contact 
// router.post("/update/publiccontact/:customerID", async (req, res) => {

//     await RetailCustomersDetails.find({ customerID: req.params.customerID }).then(async customer => {

//         if (customer.length > 0) {

//             try {
//                 const saveinfo = await RetailCustomersDetails.findOneAndUpdate(
//                     { customerID: req.params.customerID },
//                     {
//                         businessEmail: req.body.businessEmail,
//                         businessPhone: req.body.businessPhone

//                     });

//                 const getUpdatedRetailCustomer = await RetailCustomersDetails.findOne({ customerID: req.params.customerID });
//                 const getRetailCustomerBasic = await RetailCustomer.findById(req.params.customerID);

//                 res.status(200).json({ message: "Information updated successfully", data: { retailCustomer: getRetailCustomerBasic, retailCustomerDetails: getUpdatedRetailCustomer } });

//             } catch (error) {

//                 res.status(400).json({ message: error.message });

//             }
//             return;

//         }
//         res.status(404).json({ message: "Customer was not found", data: null });
//         return;
//     }).catch((error) => {
//         res.status(500).json({ message: "Something went wrong", data: null });
//         console.log(error);
//     });

// });


// //---> Kitchen stuff

// // Affiliate with kitchen (After login in business profile)
// router.post("/affiliate/login/:customerID/:subscriberID", async (req, res) => {

//     await RetailCustomer.findById(req.params.customerID).then(async customer => {

//         if (customer) {

//             const findKitchen = await Kitchen.findOne({ subscriberID: req.params.subscriberID });

//             if (!findKitchen) {
//                 res.status(400).json({ message: "Kitchen not found", data: null });
//                 return;
//             }

//             try {

//                 const customerAlreadyExists = await Kitchen.find({ subscriberID: req.params.subscriberID, retailCustomers: { $elemMatch: { customerID: req.params.customerID } } });

//                 if (customerAlreadyExists.length > 0) {
//                     res.status(400).json({ message: "Customer is already in this kitchen" });
//                     return;
//                 }

//                 const retailCustomerDetails = await RetailCustomersDetails.findOne({ customerID: req.params.customerID });

//                 // To store info of retail customer in Kitchen schema
//                 let newCustomer = {
//                     foodBusinessName: retailCustomerDetails._doc.foodBusinessName,
//                     customerName: `${customer._doc.firstname} ${customer._doc.lastname}`,
//                     customerID: req.params.customerID,
//                     status: "Pending"
//                 }

//                 // To store info of retail customer in retailCustomerKitchen schema
//                 let newCustomerKitchen = {
//                     subscriberID: req.params.subscriberID,
//                     kitchenName: findKitchen._doc.kitchenName,
//                     status: "Pending"
//                 };

//                 const updateKitchen = await Kitchen.updateOne(
//                     { subscriberID: req.params.subscriberID },
//                     { $addToSet: { retailCustomers: newCustomer } });

//                 const updateUsersKitchen = await RetailCustomerKitchens.updateOne(
//                     { customerID: req.params.customerID },
//                     { $addToSet: { kitchen: newCustomerKitchen } });

//                 res.status(200).json({ message: "Request sent successfully" });

//             } catch (error) {

//                 res.status(400).json({ message: error.message });

//             }
//             return;

//         }
//         res.status(404).json({ message: "Customer was not found", data: null });
//         return;
//     }).catch((error) => {
//         res.status(500).json({ message: "Something went wrong", data: null });
//         console.log(error);
//     });

// });

// // Get all kitchens list
// router.get("/getallkitchens/:customerID", async (req, res) => {
//     await RetailCustomerKitchens.findOne({ customerID: req.params.customerID }).then(async customer => {

//         if (customer) {

//             res.json({ message: "Success", data: customer });
//             return;

//         }
//         res.status(404).json({ message: "Customer not found in this kitchen", data: null });
//     }).catch(() => {
//         res.status(500).json({ message: "Something went wrong", data: null });
//     })
// });

// Create Space Booking
// router.post("/createbooking/:customerID/:subscriberID", async (req, res) => {

//     await RetailCustomer.findById(req.params.customerID).then(async customer => {

//         if (customer) {

//             const findKitchen = await Kitchen.findOne({ subscriberID: req.params.subscriberID });

//             if (!findKitchen) {
//                 res.status(400).json({ message: "Kitchen not found", data: null });
//                 return;
//             }

//             const findAllSpaces = await Spaces.find({ subscriberID: req.params.subscriberID });

//             if (!findAllSpaces) {
//                 res.status(400).json({ message: "No spaces for this subscriber", data: null });
//                 return;
//             }

//             const findCurrentSpace = await Space.find(
//                 {
//                     subscriberID: req.params.subscriberID,
//                     spaceName: req.body.spaceName
//                 });

//             if (!findCurrentSpace) {

//                 res.status(400).json({ message: "Space not found", data: null });
//                 return;
//             }


//             // To store booking info of retail customer in Space schema
//             let newCustomer = {
//                 retailCustomerID: req.params.customerID,
//                 foodBusinessName: customer._doc.foodBusinessName,
//                 startDate: req.body.startDate,          // Input
//                 endDate: req.body.endDate,              // Input
//                 startTime: req.body.startTime,          // Input
//                 endTime: req.body.endTime,              // Input
//                 bookingStatus: "",
//                 bookingLength: endTime - startTime,
//                 kitchenName: findKitchen._doc.kitchenName,
//                 spaceName: req.body.spaceName           // Input
//             }

//             // If there are customers with booking
//             if (findAllSpaces._doc.retailCustomers.length > 0) {

//                 let clashFound = true;

//                 for (let i = 0; i < findAllSpaces._doc.retailCustomers.length; i++) {

//                     if (findAllSpaces._doc.retailCustomers[i].endDate < req.body.startDate) {
//                         clashFound = false;
//                     }
//                     // If startDate and enddate are equal compared with new customer
//                     else if (findAllSpaces._doc.retailCustomers[i].startDate === req.body.startDate ||
//                         findAllSpaces._doc.retailCustomers[i].endDate === req.body.endDate) {

//                         if (findAllSpaces._doc.retailCustomers[i].endTime < req.body.startTime) {

//                             clashFound = false;

//                         } else {

//                             clashFound = true;
//                         }
//                     }
//                 }

//                 if (clashFound === true) {

//                     res.status(400).json({ message: "Clash found", data: null });
//                     return;
//                 }

//                 try {

//                     // To store booking of retail customer in spaces schema
//                     const storeBooking = await Spaces.updateOne(
//                         { subscriberID: req.params.subscriberID },
//                         { $addToSet: { retailCustomers: newCustomer } });

//                     res.status(200).json({ message: "Booking created successfully" });

//                 } catch (error) {

//                     res.status(400).json({ message: error.message });

//                 }
//                 return;
//             }
//             else {

//                 try {

//                     // To store booking of retail customer in spaces schema
//                     const storeBooking = await Spaces.updateOne(
//                         { subscriberID: req.params.subscriberID },
//                         { $addToSet: { retailCustomers: newCustomer } });

//                     res.status(200).json({ message: "Booking created successfully" });

//                 } catch (error) {

//                     res.status(400).json({ message: error.message });

//                 }
//                 return;

//             }


//         }
//         res.status(404).json({ message: "Customer was not found", data: null });
//         return;
//     }).catch((error) => {
//         res.status(500).json({ message: "Something went wrong", data: null });
//         console.log(error);
//     });

// });






module.exports = router;