const { startOfDay, endOfDay, format } = require("date-fns");
const Playlist = require("../models/Playlist");
const PlaylistFollowers = require("../models/PlaylistFollowers");
const AdDataService = require("../services/adsDataService");
const CampaignsService = require("../services/campaingsService");
const catchAsyncErrors = require("../utils/catchAsyncErrors");
const { spotifyWebApi } = require("../utils/spotify");
const agenda = require("../jobs/agenda");
const AppError = require("../utils/AppError");
const {
  getFollowersBetweenDates,
  deletePlaylist,
  followersDaily,
  searchPlaylistsByName,
} = require("../services/playlistServices");
const { formatDailySpendPerFollower } = require("../utils/helpers");
const AdData = require("../models/AdData");
const CampaignRefreshReport = require("../models/CampaignRefreshReport");
const FacebookService = require("../services/facebookService");
const ArtisteAdsInsightService = require("../services/artistAdsInsightsService");
const ArtistAdsInsight = require("../models/ArtistAdsInsight");
const Email = require("../utils/Email");
const PlaylistStreams = require("../models/PlaylistStreams");
const StreamsService = require("../services/streamsService");
const PlaylistStreamsService = require("../services/playlistStreamsService");
const { RefreshRun, REFRESH_RUN_TYPES } = require("../models/RefreshRun");
const InfluencerSpend = require("../models/InfluencerSpend");

const CAMPAIGN_TYPES = {
  INFLUENCER: "influencer",
  SOCIAL_PLATFORM: "social_platform",
};

const getDate = (date) => {
  const dateArray = date.split("-").map(Number);
  return new Date(dateArray[0], dateArray[1] - 1, dateArray[2], 10);
};

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
  await updateFollowerAgenda.repeatEvery("15 minutes").save();
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
  const { country, isActive, name, updateImage } = req.body;
  const data = {
    country,
    isActive,
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
  const { endDate } = req.query;
  const followersPerDay = await followersDaily(
    req.params.id,
    true,
    27,
    endDate
  );
  res.status(200).json({ followersPerDay });
});

exports.addCampaign = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  const {
    campaignId,
    platform,
    user,
    advertiserId,
    campaignType,
    spend,
    influencerName,
    date,
  } = req.body;

  if (
    campaignType === CAMPAIGN_TYPES.SOCIAL_PLATFORM &&
    (!campaignId || !platform || !user)
  )
    return next(
      new AppError("Campaign Id, Platform and User are required", 400)
    );

  if (platform === "tiktok" && !advertiserId) {
    return next(new AppError("Advertiser Id is required for tiktok", 400));
  }

  if (
    campaignType === CAMPAIGN_TYPES.INFLUENCER &&
    (!influencerName || !spend || !date)
  )
    return next(
      new AppError("Influencer name, spend and date are required", 400)
    );

  const playlist = await Playlist.findOne({ spotifyId: id });
  if (campaignType === CAMPAIGN_TYPES.SOCIAL_PLATFORM) {
    const existingPlaylist = playlist.campaigns.find(
      (campaign) => campaign.campaign_id === campaignId
    );

    if (existingPlaylist)
      return next(new AppError("This campaign has been added already", 400));

    playlist.campaigns.push({
      campaign_id: campaignId,
      platform,
      user,
      advertiser_id: advertiserId,
    });
    await playlist.save();
    await AdDataService.addNewCampaignAdData(
      campaignId,
      platform,
      id,
      advertiserId
    );
  } else {
    await InfluencerSpend.create({
      spotifyId: id,
      spend: parseFloat(spend),
      influencerName,
      date: getDate(date),
      formattedDate: date,
    });
  }
  res.status(200).json({ playlist });
});

exports.removeCampaign = catchAsyncErrors(async (req, res) => {
  const { id, campaignId } = req.params;
  const playlist = await Playlist.findOneAndUpdate(
    { spotifyId: id },
    { $pull: { campaigns: { campaign_id: campaignId } } },
    { new: true }
  );
  await AdData.deleteMany({ spotify_id: id, campaign_id: campaignId });
  res.status(200).json({ playlist });
});

exports.getCampaignsReport = catchAsyncErrors(async (req, res) => {
  const { id } = req.params;
  const { startDate, endDate } = req.query;
  const playlist = await Playlist.findOne({ spotifyId: id });
  if (!playlist) return;
  let report;
  if (playlist.campaigns.length > 0) {
    const metrics = await AdDataService.getPlaylistAdDataBetweenDates(
      playlist.spotifyId,
      startDate,
      endDate
    );
    report = {
      metrics,
    };
  } else {
    report = {
      metrics: {
        clicks: 0,
        cpc: 0,
        impressions: 0,
        spend: 0,
      },
    };
  }
  const followers = await getFollowersBetweenDates(id, startDate, endDate);
  const playlistStreams =
    await PlaylistStreamsService.getPlaylisStreamsBetweenDates(
      id,
      startDate,
      endDate
    );

  const influencerSpend = await InfluencerSpend.find({
    spotifyId: id,
    date: {
      $gte: startOfDay(new Date(startDate)),
      $lte: endOfDay(new Date(endDate)),
    },
  });

  res
    .status(200)
    .json({ ...report, followers, playlistStreams, influencerSpend });
});

exports.getDailyCampaignsReport = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  const { endDate } = req.query;
  const playlist = await Playlist.findOne({ spotifyId: id });
  if (playlist.campaigns.length < 1)
    return next(new AppError("No campaigns found", 400));
  const dailySpendFollowers = await AdDataService.getDailySpendsAndFollowers(
    playlist,
    endDate
  );
  const dailySpendPerFollower =
    formatDailySpendPerFollower(dailySpendFollowers);
  res.status(200).json({ dailySpendFollowers, dailySpendPerFollower });
});

exports.getSnapchatSpend = catchAsyncErrors(async (req, res) => {
  const { id } = req.params;
  const playlist = await Playlist.findOne({ spotifyId: id });
  const snapchatCampaigns = playlist.campaigns.filter(
    (campaign) => campaign.platform === "snapchat"
  );
  const data = await Promise.all(
    snapchatCampaigns.map(async (campaign) => {
      const stats = await AdDataService.getDailyAdData(campaign.campaign_id, 7);
      return {
        campaign_id: campaign.campaign_id,
        data: stats,
      };
    })
  );
  res.status(200).json({ data });
});

exports.getLatestCampaignsReport = catchAsyncErrors(async (req, res) => {
  const report = await CampaignRefreshReport.findOne({}).sort("-createdAt");
  res.status(200).json({ report });
});

exports.getLatestStreamsRefreshRun = catchAsyncErrors(async (req, res) => {
  const refreshRun = await RefreshRun.findOne({
    type: REFRESH_RUN_TYPES.PLAYLIST_STREAMS,
  })
    .sort("-createdAt")
    .limit(1);
  res.status(200).json({ refreshRun });
});

exports.refreshCampaignsAdData = catchAsyncErrors(async (req, res) => {
  const { days, platform } = req.body;

  const adsByPlatform = await CampaignsService.groupCampaignsByPlatform();
  await AdDataService.updateManyCampaignsDataForLastDays(
    adsByPlatform,
    days,
    platform
  );
  res.status(200).json({ status: "success" });
});

exports.campaignsDailyStats = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  const { endDate } = req.query;

  const playlist = await Playlist.findOne({ spotifyId: id });
  if (!playlist || (playlist && playlist.campaigns.length < 2))
    return next(new AppError("No campaigns found", 400));
  const data = await Promise.all(
    playlist.campaigns.map(async (campaign) => {
      const stats = await AdDataService.getDailyAdData(
        campaign.campaign_id,
        27,
        endDate
      );
      return {
        campaign_id: campaign.campaign_id,
        platform: campaign.platform,
        data: stats,
        totalSpend: stats.reduce((acc, curr) => acc + curr.spend, 0),
      };
    })
  );
  res.status(200).json({ data });
});

exports.artistReport = catchAsyncErrors(async (req, res, next) => {
  const { artist, startDate, endDate } = req.query;
  if (!artist || !startDate || !endDate)
    return next(new AppError("artist, startDate and endDate required", 400));
  const playlists = await searchPlaylistsByName(artist);
  if (!playlists.length)
    return next(new AppError("No playlists found for this artist", 400));

  const artistCampaignsData = await Promise.all(
    playlists.map(async (playlist) => {
      const metrics = await AdDataService.getPlaylistAdDataBetweenDates(
        playlist.spotifyId,
        startDate,
        endDate
      );
      const followers = await getFollowersBetweenDates(
        playlist.spotifyId,
        startDate,
        endDate
      );
      const dailySpendFollowers =
        await AdDataService.getDailySpendsAndFollowers(playlist);
      const dailySpendPerFollower =
        formatDailySpendPerFollower(dailySpendFollowers);
      return {
        playlist: playlist.name,
        metrics,
        dailySpendPerFollower,
        followers,
      };
    })
  );

  const totalCampaings = playlists.reduce(
    (acc, playlist) => acc + playlist.campaigns.length,
    0
  );

  let summary = {
    clicks: 0,
    cpc: 0,
    impressions: 0,
    spend: 0,
    followers: 0,
    totalPlaylists: playlists.length,
    totalCampaings,
    countries: [],
    dailySpendPerFollower: [],
  };
  if (artistCampaignsData.length) {
    artistCampaignsData.forEach((item) => {
      summary.clicks = summary.clicks + item.metrics.clicks;
      summary.cpc = summary.cpc + item.metrics.cpc;
      summary.impressions = summary.impressions + item.metrics.impressions;
      summary.followers = summary.followers + item.followers;
      summary.spend = summary.spend + item.metrics.spend;
      summary.countries = [...summary.countries, ...item.metrics.countries];

      item.dailySpendPerFollower.forEach((dailySpend) => {
        const index = summary.dailySpendPerFollower.findIndex(
          (spend) => spend.date === dailySpend.date
        );
        if (index === -1) {
          summary.dailySpendPerFollower.push({
            date: dailySpend.date,
            spend: dailySpend.spend,
            followers: dailySpend.followers,
            spendPerFollower: dailySpend.spendPerFollower,
          });
        } else {
          const newSpend =
            summary.dailySpendPerFollower[index].spend + dailySpend.spend;
          const newFollowers =
            summary.dailySpendPerFollower[index].followers +
            dailySpend.followers;
          summary.dailySpendPerFollower[index].spend = newSpend
            ? Number(newSpend.toFixed(2))
            : 0;
          summary.dailySpendPerFollower[index].followers = newFollowers
            ? Number(newFollowers.toFixed(2))
            : 0;

          summary.dailySpendPerFollower[index].spendPerFollower =
            !newSpend || !newFollowers
              ? 0
              : Number((newSpend / newFollowers).toFixed(2));
        }
      });
    });
  }

  if (summary.countries.length) {
    summary.countries = summary.countries.reduce((acc, curr) => {
      const country = curr.country || "others";
      acc[country] = {
        clicks: (acc[country]?.clicks || 0) + curr.clicks,
        cpc: (acc[country]?.cpc || 0) + curr.cpc,
        impressions: (acc[country]?.impressions || 0) + curr.impressions,
        spend: (acc[country]?.spend || 0) + curr.spend,
      };
      return acc;
    }, {});
  }

  res.status(200).json({ summary, artistCampaignsData });
});

exports.playGround = catchAsyncErrors(async (req, res) => {
  // const data = await ArtisteAdsInsightService.refreshAdsInsight("kato", 4);
  // const data = await FacebookService.getDailyStats("6320052117774", 3);
  const data = await FacebookService.getCampaign(
    "2022-08-26",
    "2022-08-27",
    "6320052117774"
  );

  res.status(200).send(data);
});

exports.addPlaylistStreams = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { streams, artistId, artistName } = req.body;
    const formattedDate = format(new Date(), "yyyy-MM-dd");
    const existingPlaylistStreams = await PlaylistStreams.findOne({
      spotifyId: id,
      formattedDate,
      artistId,
    });

    if (!existingPlaylistStreams)
      await PlaylistStreams.create({
        spotifyId: id,
        formattedDate,
        streams: Number(streams),
        artistId,
        artistName,
      });
    else console.log("Playlist streams already exist for today");
    res.sendStatus(200);
  } catch (err) {
    console.log(err);
    res.sendStatus(200);
  }
};

exports.fetchPlaylistsStreams = catchAsyncErrors(async (req, res, next) => {
  StreamsService.refreshPlaylistsStreams();
  res.sendStatus(200);
});
