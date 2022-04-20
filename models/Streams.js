const mongoose = require("mongoose");

const streamsSchema = new mongoose.Schema(
  {
    artistId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Artist",
    },
    artistName: {
      type: String,
      required: true,
    },
    streams: {
      type: Object,
      required: true,
    },
  },
  { timestamps: true }
);

const Streams = mongoose.model("Streams", streamsSchema);

module.exports = Streams;
