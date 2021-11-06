const agenda = require("../jobs/agenda");
const Playlist = require("../models/Playlist");
const PlaylistFollowers = require("../models/PlaylistFollowers");

exports.deletePlaylist = async (spotifyId) => {
  await Playlist.findOneAndDelete({ spotifyId });
  await PlaylistFollowers.deleteMany({ spotifyId });
  await agenda.cancel({
    name: "update followers",
    "data.spotifyId": spotifyId,
  });
};
