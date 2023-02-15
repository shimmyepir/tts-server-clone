const mongoose = require("mongoose");

const artistListenerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    spotifyArtistId: {
      type: String,
      required: true,
    },
    listeners: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

const ArtistListener = mongoose.model("ArtistListener", artistListenerSchema);

module.exports = ArtistListener;
