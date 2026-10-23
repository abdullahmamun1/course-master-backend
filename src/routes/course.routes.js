// route definitions for course-related endpoints

const router = require("express").Router();
const courseController = require("../controllers/course.controller");
const optionalAuthMiddleware = require("../middlewares/optionalAuthMiddleware");

// optional auth: admins get quiz answers, everyone else gets them stripped
router.get("/", optionalAuthMiddleware, courseController.getCourses);
router.get("/:id", optionalAuthMiddleware, courseController.getCourseById);

module.exports = router;
