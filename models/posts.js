const mongoose = require('mongoose');

//Posts schema
const PostsSchema = new mongoose.Schema({
    studentID: { type: String, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    postBody: { type: String, required: true },
    attachment: { type: String }
}, { timestamps: true });


module.exports = mongoose.model('posts', PostsSchema);