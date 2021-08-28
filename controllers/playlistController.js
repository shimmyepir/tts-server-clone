const Playlist = require("../models/Playlist");
const PlaylistFollowers = require("../models/PlaylistFollowers");
const catchAsyncErrors = require("../utils/catchAsyncErrors");
const { spotifyWebApi } = require("../utils/spotify");
const agenda = require("../jobs/agenda");
const { startOfDay, endOfDay, sub, format } = require("date-fns");

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

const getFollowersBetweenDates = async (
  spotifyId,
  startDate,
  endDate,
  returnTotal
) => {
  const followers = await PlaylistFollowers.find({
    spotifyId,
    createdAt: {
      $gte: startOfDay(new Date(startDate)),
      $lte: endOfDay(new Date(endDate)),
    },
  }).sort("createdAt");

  if (!followers.length) {
    return 0;
  } else {
    if (returnTotal) {
      if (followers.length) return followers[followers.length - 1].followers;
      else return 0;
    } else {
      return followers[followers.length - 1].followers - followers[0].followers;
    }
  }
};

const followersDaily = async (id, total, days = 27) => {
  const endDate = endOfDay(new Date());
  const dates = [];
  for (let i = days; i >= 0; i--) {
    dates.push(sub(endDate, { days: i }));
  }
  const data = [];
  await Promise.all(
    dates.map(async (date) => {
      const followers = await getFollowersBetweenDates(id, date, date, total);
      let formatedDate = format(new Date(date), "yyyy-MM-dd");
      data.push({ date: formatedDate, followers });
    })
  );

  return data.sort((a, b) => new Date(a.date) - new Date(b.date));
};

exports.followersPerDayPerPeriod = catchAsyncErrors(async (req, res) => {
  const followersPerDay = await followersDaily(req.params.id, true);
  res.status(200).json({ followersPerDay });
});

exports.getFollowersBetweenDates = getFollowersBetweenDates;
exports.followersDaily = followersDaily;
