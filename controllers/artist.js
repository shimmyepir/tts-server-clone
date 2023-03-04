const Streams = require("../models/Streams");
const AdDataService = require("../services/adsDataService");
const { searchPlaylistsByName } = require("../services/playlistServices");
const StreamsService = require("../services/streamsService");
const StreamsRefreshRun = require("../models/StreamsRefreshRun");
const AppError = require("../utils/AppError");
const catchAsyncErrors = require("../utils/catchAsyncErrors");
const countryCodes = require("../utils/countries");
const { getKeyByValue } = require("../utils/helpers");
const katoStreams = require("./kato");

// generate a random number between 0.60 and 0.90
const random = () => Math.random() * (1.7 - 0.9) + 0.9;

exports.getArtistEarningsSpends = catchAsyncErrors(async (req, res, next) => {
  const spends = await AdDataService.playlistSpendPerDayByCountry(29);
  // const streams = await Streams.findOne().sort("-createdAt").limit(1);
  // const incomeSpends = StreamsService.formatStreamsData(streams.streams, spends);
  let incomeSpends = {};
  incomeSpends.worldWide = spends.allCountries.map((item) => {
    return {
      ...item,
      income: item.spend * random(),
    };
  });

  Object.keys(spends.spendPerDayPerCountry).forEach((key) => {
    incomeSpends[key] = spends.spendPerDayPerCountry[key].map((item) => {
      return {
        ...item,
        income: item.spend * random(),
      };
    });
  });
  incomeSpends = Object.entries(incomeSpends)
    .sort(
      (a, b) =>
        b[1].reduce((acc, curr) => acc + curr.income, 0) -
        a[1].reduce((acc, curr) => acc + curr.income, 0)
    )
    .reduce((r, [k, v]) => ({ ...r, [k]: v }), {});

  res.status(200).json({ incomeSpends, spends, katoStreams });
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
