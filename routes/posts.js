const express = require('express');

const router = express.Router();

const Students = require('../models/students');

const Posts = require('../models/posts');

const { nanoid } = require("nanoid");


// ----> Handling Routes

// Create Post
router.post("/create/:studentID", async (req, res) => {

    await Students.findById(req.params.studentID).then(async student => {

        if (student) {

            const post = new Posts({
                studentID: req.params.studentID,
                postBody: req.body.postBody,
                attachment: req.body.attachment
            });

            try {
                const postResponse = await post.save();

                res.status(200).json({ message: "Post Created Successfully" });

            } catch (error) {
                // console.log(error)
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

// Delete Post
router.post("/delete/:studentID/:postID", async (req, res) => {

    await Students.findById(req.params.studentID).then(async student => {

        if (student) {

            const findPost = await Posts.findOne({ _id: req.params.postID, studentID: req.params.studentID });

            if (!findPost) {
                res.status(400).json({ message: "Post was not found" });
                return;
            }

            try {

                const delPost = await findPost.delete();

                res.status(200).json({ message: "Post Deleted Successfully" });


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

// Update Post
router.post("/update/:studentID/:postID", async (req, res) => {

    await Students.findById(req.params.studentID).then(async student => {

        if (student) {

            const findPost = await Posts.findOne({ _id: req.params.postID, studentID: req.params.studentID });

            if (!findPost) {
                res.status(400).json({ message: "Post was not found" });
                return;
            }

            try {


                findPost.postBody = req.body.postBody;
                findPost.attachment = req.body.attachment;

                const savePost = await findPost.save();

                res.status(200).json({ message: "Post Updated Successfully" });

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

// Get all posts
router.get("/", (req, res) => {
    Posts.find()
        .then((posts) => res.json({ message: "All Posts", data: posts }))
        .catch((error) => {
            res.status(500).json({ message: "Something went wrong", data: null });
        });
});

// Get post by post ID
router.get("/:postID", async (req, res) => {
    await Posts.findById(req.params.postID).then(async post => {
        if (post) {

            res.json({ message: "Success", data: post });
            return;

        }
        res.status(404).json({ message: "Post was not found", data: null });
    }).catch(() => {
        res.status(500).json({ message: "Something went wrong", data: null });
    })
});

// Get all posts by student ID
router.get("/studentposts/:studentID", async (req, res) => {

    await Posts.find({ studentID: req.params.studentID }).then(async posts => {

        if (posts) {

            res.json({ message: "Success", data: posts });
            return;

        }
        res.status(404).json({ message: "No posts found", data: null });
    }).catch(() => {
        res.status(500).json({ message: "Something went wrong", data: null });
    })
});



module.exports = router;