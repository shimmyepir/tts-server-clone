const { sub } = require("date-fns");
const { exec } = require("child_process");
const cron = require("node-cron");
const Playlist = require("../models/Playlist");
const Playlistfollower = require("../models/PlaylistFollowers");
const PlaylistsCount = require("../models/PlaylistsCount");
const Email = require("../utils/Email");
const ArtisteAdsInsightService = require("../services/artistAdsInsightsService");

exports.schedulePlaylistFollowersCheck = async () => {
  console.log("scheduled playlist followers check");
  cron.schedule("*/40 * * * *", async () => {
    console.log("checking database for recent followers", new Date());
    const followers = await Playlistfollower.find({
      createdAt: {
        $gte: sub(new Date(), { minutes: 20 }),
        $lte: new Date(),
      },
    });
    const playlistCount = await PlaylistsCount.find()
      .sort("-createdAt")
      .limit(1);
    console.log(followers.length, playlistCount[0].count);
    if (followers.length < playlistCount[0].count * 0.1) {
      await new Email("udistribusiness@gmail.com").sendPlaylistNotTracking();
      await new Email("oludareodedoyin@gmail.com").sendPlaylistNotTracking();
      console.log("no followers found restarting server", new Date());
      exec("pm2 reload server");
    }
  });
};

exports.schedulePlaylistsCount = async () => {
  console.log("scheduled Playlist count update");
  cron.schedule("*/10 * * * *", async () => {
    const playlists = await Playlist.find();
    console.log("updating playlist count", playlists.length, new Date());
    await PlaylistsCount.create({ count: playlists.length });
  });
};

exports.scheduleAdsInsightsRefresh = async () => {
  console.log("scheduled ads insights refresh");
  cron.schedule("0 5 * * *", async () => {
    try {
      await ArtisteAdsInsightService.refreshAdsInsight("kato", 4);
    } catch (error) {
      setTimeout(() => {
        ArtisteAdsInsightService.refreshAdsInsight("kato", 1).catch();
      }, 60000);
    }
  });
};
