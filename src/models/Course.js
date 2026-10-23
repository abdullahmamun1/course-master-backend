// course model

const { Schema, model } = require("mongoose");

const lessonSchema = new Schema(
  {
    title: { type: String, required: true },
    videoUrl: { type: String, required: true },
    liveClassLink: { type: String }, // Google Meet or Zoom link
    liveClassDate: { type: Date }, // When the live class will be held
    assignmentPrompt: { type: String },
    quiz: [
      {
        question: { type: String, required: [true, "Quiz question is required"], trim: true },
        options: {
          type: [{ type: String, trim: true }],
          validate: {
            validator: (opts) => opts.length >= 2 && opts.every((o) => o && o.length > 0),
            message: "Quiz needs at least 2 options and none can be empty",
          },
        },
        correctIndex: {
          type: Number,
          required: [true, "Correct answer is required"],
          min: [0, "Correct answer must be one of the options"],
          validate: {
            validator: function (idx) {
              // `this` is the quiz item on save; skip on query updates where it's not available
              return !Array.isArray(this?.options) || idx < this.options.length;
            },
            message: "Correct answer must be one of the options",
          },
        },
      },
    ],
  },
  { _id: true }
);

const moduleSchema = new Schema(
  {
    title: { type: String, required: true },
    lessons: [lessonSchema],
  },
  { _id: true }
);

const courseSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, index: true },
    description: { type: String, required: true, trim: true },
    instructorName: { type: String, required: true, trim: true, index: true },
    price: { type: Number, required: true, min: [0, "Price cannot be negative"] },
    category: { type: String, index: true },
    tags: [{ type: String, index: true }],
    syllabus: [moduleSchema],
    batches: [
      {
        name: String,
        startDate: Date,
      },
    ],
  },
  { timestamps: true }
);

module.exports = model("Course", courseSchema);
