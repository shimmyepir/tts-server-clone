const { startOfDay, endOfDay } = require("date-fns");
const Playlist = require("../models/Playlist");
const PlaylistFollowers = require("../models/PlaylistFollowers");
const catchAsyncErrors = require("../utils/catchAsyncErrors");
const { spotifyWebApi } = require("../utils/spotify");
const agenda = require("../jobs/agenda");
const AppError = require("../utils/AppError");
const {
  getDailyCampaignsData,
  getPlaylistCampaignsData,
  getFollowersBetweenDates,
  deletePlaylist,
  followersDaily,
} = require("../services/playlistServices");
const { formatDailySpendPerFollower } = require("../utils/helpers");

exports.addPlaylist = catchAsyncErrors(async (req, res) => {
  const { id } = req.params;
  const { body } = await spotifyWebApi.getPlaylist(id);
  const playlist = await Playlist.create({
    name: body.name,
    spotifyId: body.id,
    image: body.images[0].url,
  });
  const updateFollowerAgenda = await agenda.create("update followers", {
    playlistId: playlist._id,
    spotifyId: id,
  });
  await updateFollowerAgenda.repeatEvery("5 minutes").save();
  res.status(201).json({ playlist });
});

exports.getFollowers = catchAsyncErrors(async (req, res) => {
  const { id } = req.params;
  const { date } = req.query;
  const followers = await PlaylistFollowers.find({
    spotifyId: id,
    createdAt: {
      $gte: startOfDay(new Date(date)),
      $lte: endOfDay(new Date(date)),
    },
  });
  res.status(200).json({ followers });
});

exports.getPlaylist = catchAsyncErrors(async (req, res) => {
  const { id } = req.params;
  const playlist = await Playlist.findOne({ spotifyId: id });
  res.status(200).json({ playlist });
});

exports.deletePlaylist = catchAsyncErrors(async (req, res) => {
  const { id } = req.params;
  await deletePlaylist(id);
  res.status(200).json({ message: "Playlist deleted" });
});

exports.updatePlaylist = catchAsyncErrors(async (req, res) => {
  const { id } = req.params;
  const { campaignId, adPlatform, name, updateImage } = req.body;
  const data = {
    campaignId,
    adPlatform,
    name,
  };
  if (updateImage) {
    const { body } = await spotifyWebApi.getPlaylist(id);
    data.image = body.images[0].url;
  }
  const playlist = await Playlist.findOneAndUpdate({ spotifyId: id }, data, {
    new: true,
  });
  res.status(200).json({ playlist });
});

exports.searchPlaylist = catchAsyncErrors(async (req, res) => {
  const { q } = req.query;
  const playlists = await Playlist.find({
    name: { $regex: new RegExp(q, "i") },
  });
  res.status(200).json({ playlists });
});

exports.getPlaylists = catchAsyncErrors(async (req, res) => {
  const playlists = await Playlist.find().sort("-updatedAt");
  res.status(200).json({ playlists });
});

exports.followersPerDayPerPeriod = catchAsyncErrors(async (req, res) => {
  const followersPerDay = await followersDaily(req.params.id, true);
  res.status(200).json({ followersPerDay });
});

exports.addCampaign = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  const { campaignId, platform, user, advertiserId } = req.body;
  if (platform === "tiktok" && !advertiserId) {
    return next(new AppError("Advertiser Id is required for tiktok", 400));
  }
  const playlist = await Playlist.findOne({ spotifyId: id });
  playlist.campaigns.push({
    campaign_id: campaignId,
    platform,
    user,
    advertiser_id: advertiserId,
  });
  await playlist.save();
  res.status(200).json({ playlist });
});

exports.removeCampaign = catchAsyncErrors(async (req, res) => {
  const { id } = req.params;
  const { campaignId } = req.body;
  await Playlist.updateOne(
    { spotifyId: id },
    { $pull: { campaigns: { campaign_id: campaignId } } }
  );
  res.status(204);
});

exports.getCampaignsReport = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  const { startDate, endDate } = req.query;
  const playlist = await Playlist.findOne({ spotifyId: id });
  if (playlist.campaigns.length < 1)
    return next(new AppError("No campaigns found", 400));
  const report = await getPlaylistCampaignsData(playlist, startDate, endDate);
  const followers = await getFollowersBetweenDates(id, startDate, endDate);
  res.status(200).json({ ...report, followers });
});

exports.getDailyCampaignsReport = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  const playlist = await Playlist.findOne({ spotifyId: id });
  if (playlist.campaigns.length < 1)
    return next(new AppError("No campaigns found", 400));
  const dailySpendFollowers = await getDailyCampaignsData(playlist);
  const dailySpendPerFollower =
    formatDailySpendPerFollower(dailySpendFollowers);
  res.status(200).json({ dailySpendFollowers, dailySpendPerFollower });
});
