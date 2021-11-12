const { exec } = require("child_process");
const cron = require("node-cron");
const Playlistfollower = require("../models/PlaylistFollowers");

exports.schedulePlaylistFollowersCheck = () => {
  console.log("scheduled database updates check");
  cron.schedule("*/5 * * * *", async () => {
    console.log("checking database for recent followers", new Date());
    const followers = await Playlistfollower.find();
    if (followers.length < 1) {
      console.log("no followers found restarting server", new Date());
      exec("pm2 reload server");
    }
  });
};
