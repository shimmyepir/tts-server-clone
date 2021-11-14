const { sub } = require("date-fns");
const { exec } = require("child_process");
const cron = require("node-cron");
const Playlistfollower = require("../models/PlaylistFollowers");

exports.schedulePlaylistFollowersCheck = async () => {
  console.log("scheduled database updates check");
  cron.schedule("*/1 * * * *", async () => {
    console.log("checking database for recent followers", new Date());
    const followers = await Playlistfollower.find({
      createdAt: {
        $gte: sub(new Date(), { minutes: 5 }),
        $lte: new Date(),
      },
    });
    console.log(followers.length);
    if (followers.length < 1) {
      console.log("no followers found restarting server", new Date());
      exec("pm2 reload server");
    }
  });
};
