const Streams = require("../models/Streams");
const AdDataService = require("../services/adsDataService");
const { searchPlaylistsByName } = require("../services/playlistServices");
const StreamsService = require("../services/streamsService");
const StreamsRefreshRun = require("../models/StreamsRefreshRun");
const AppError = require("../utils/AppError");
const catchAsyncErrors = require("../utils/catchAsyncErrors");
const countryCodes = require("../utils/countries");
const { getKeyByValue } = require("../utils/helpers");

exports.getArtistEarningsSpends = catchAsyncErrors(async (req, res, next) => {
  const data = await AdDataService.playlistSpendPerDayByCountry(29);
  const streams = await Streams.findOne().sort("-createdAt").limit(1);
  const incomeSpends = StreamsService.formatStreamsData(streams.streams, data);
  res.status(200).json({ incomeSpends });
});

exports.updateArtistStreamsData = catchAsyncErrors(async (req, res, next) => {
  const { streams } = req.body;
  if (streams) {
    const formattedStreams = {};
    Object.keys(streams).forEach((key) => {
      const countryCode = getKeyByValue(countryCodes, key) || "Worldwide";
      formattedStreams[countryCode] = streams[key];
    });
    await Streams.create({
      artistName: req.params.artistId,
      streams: formattedStreams,
    });

    const lastRefreshRun = await StreamsRefreshRun.findOne({
      artistName: "kato",
    })
      .sort("-createdAt")
      .limit(1);

    lastRefreshRun.status = "completed";
    lastRefreshRun.completedAt = new Date();
    await lastRefreshRun.save();
  }
  res.status(200).json({ status: "success" });
});

const canRunRefreshAfterTime = (date) => {
  const now = new Date();
  const diff = now - new Date(date);
  const diffInMinutes = Math.round(diff / 60000);
  return diffInMinutes > 60 * 6;
};

const runningForToolong = (date) => {
  const now = new Date();
  const diff = now - new Date(date);
  const diffInMinutes = Math.round(diff / 60000);
  return diffInMinutes > 1;
};

exports.refreshArtistStreamsData = catchAsyncErrors(async (req, res, next) => {
  const lastRefreshRun = await StreamsRefreshRun.findOne({
    artistName: "kato",
  })
    .sort("-createdAt")
    .limit(1);

  if (
    lastRefreshRun &&
    lastRefreshRun.status === "running" &&
    !runningForToolong(lastRefreshRun.updatedAt)
  ) {
    return next(new AppError("Refresh already running for this artist", 400));
  } else if (
    lastRefreshRun &&
    lastRefreshRun.status === "running" &&
    runningForToolong(lastRefreshRun.updatedAt)
  ) {
    await lastRefreshRun.update({ status: "failed" });
  }

  if (
    lastRefreshRun &&
    lastRefreshRun.status === "completed" &&
    !canRunRefreshAfterTime(lastRefreshRun.completedAt)
  ) {
    return next(
      new AppError(
        "You can only refresh after 6 hours from last the refresh",
        400
      )
    );
  }

  const streamsRefreshRun = await StreamsRefreshRun.create({
    artistName: "kato",
    status: "running",
    progress: 0,
    countries: [],
  });

  StreamsService.refreshStreams(streamsRefreshRun);

  res.status(200).json({ streamsRefreshRun, message: "refresh started" });
});

exports.getLatestRefreshRun = catchAsyncErrors(async (req, res, next) => {
  const streamsRefreshRun = await StreamsRefreshRun.findOne({
    artistName: "kato",
  })
    .sort("-createdAt")
    .limit(1);
  res.status(200).json({ streamsRefreshRun });
});
