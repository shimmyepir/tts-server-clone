const mongoose = require("mongoose");

const playlistStreamsSchema = new mongoose.Schema(
  {
    spotifyId: {
      type: String,
      required: true,
    },
    artistId: {
      type: String,
      required: true,
    },
    artistName: {
      type: String,
      required: true,
    },
    streams: {
      type: String,
      required: true,
    },
    formattedDate: {
      type: String,
      required: true,
    },
  },
  { timestamps: true, toJSON: { virtuals: true } }
);

const PlaylistStreams = mongoose.model(
  "PlaylistStreams",
  playlistStreamsSchema
);

module.exports = PlaylistStreams;
