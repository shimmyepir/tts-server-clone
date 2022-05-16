const { startOfDay, endOfDay } = require("date-fns");
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
const ArtisteAdsInsightService = require("../services/artistAdsInsightsService");
const ArtistAdsInsight = require("../models/ArtistAdsInsight");

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
  res.status(200).json({ ...report, followers });
});

exports.getDailyCampaignsReport = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  const playlist = await Playlist.findOne({ spotifyId: id });
  if (playlist.campaigns.length < 1)
    return next(new AppError("No campaigns found", 400));
  const dailySpendFollowers = await AdDataService.getDailySpendsAndFollowers(
    playlist
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
  const report = await CampaignRefreshReport.findOne({})
    .sort("-createdAt")
    .limit(1);
  res.status(200).json({ report });
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
  const playlist = await Playlist.findOne({ spotifyId: id });
  if (!playlist || (playlist && playlist.campaigns.length < 2))
    return next(new AppError("No campaigns found", 400));
  const data = await Promise.all(
    playlist.campaigns.map(async (campaign) => {
      const stats = await AdDataService.getDailyAdData(
        campaign.campaign_id,
        27
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
  const data = await ArtisteAdsInsightService.refreshAdsInsight("kato", 4);
  // const data = await ArtistAdsInsight.aggregate([
  //   {
  //     $match: {
  //       platform: "tiktok",
  //       formatedDate: "2022-04-04",
  //     },
  //   },
  //   {
  //     $group: {
  //       _id: null,
  //       spend: { $sum: "$spend" },
  //     },
  //   },
  // ]);
  //   const playlists = await Playlist.find();
  //   let data;
  //   playlists.forEach((playlist) => {
  //     const { campaigns } = playlist;
  //     const foundCampaings = {};
  //     if (campaigns.length > 1) {
  //       campaigns.forEach((campaign) => {
  //         foundCampaings[campaign.campaign_id] = foundCampaings[
  //           campaign.campaign_id
  //         ]
  //           ? foundCampaings[campaign.campaign_id] + 1
  //           : 1;
  //       });
  //       console.log(foundCampaings);
  //       data = Object.entries(foundCampaings).map(([key, value]) => {
  //         if (value > 1) return { [key]: value };
  //       });
  //     }
  //   });
  // const data = await Playlist.aggregate([
  //   {
  //     $unwind: "$campaigns",
  //   },
  //   {
  //     $group: {
  //       _id: "$campaigns.campaign_id",
  //       total: { $sum: 1 },
  //       docs: { $push: "$$ROOT" },
  //     },
  //   },
  //   {
  //     $match: {
  //       total: { $gt: 1 },
  //     },
  //   },
  // ]);
  // const spotifyId = "332jKl2I2qZMbQSDciJD7i";
  // const spotifyId = "6uML7x40l9487G2o1HiA1L";
  // const playlist = await Playlist.findOne({ spotifyId });
  // const data = await Promise.all(
  //   playlist.campaigns
  //     .filter((campaign) => campaign.platform === "snapchat")
  //     .map(async (campaign) => ({
  //       campaign_id: campaign.campaign_id,
  //       data: await getDailyStats(campaign.campaign_id, 2),
  //     }))
  // );

  // const data = await AdData.aggregate([
  //   {
  //     $match: {
  //       spotify_id: spotifyId,
  //       platform: "facebook",
  //       date: {
  //         $gte: startOfDay(new Date("2022-01-31")),
  //         $lte: endOfDay(new Date("2022-01-31")),
  //       },
  //     },
  //   },
  //   {
  //     $group: {
  //       _id: "$campaign_id",
  //       // campaign: { $push: "$$ROOT" },
  //       spend: { $sum: "$spend" },
  //     },
  //   },
  //   {
  //     $group: {
  //       _id: null,
  //       // campaign: { $push: "$$ROOT" },
  //       spend: { $sum: "$spend" },
  //     },
  //   },
  // ]);
  // const playlist = await Playlist.findOne({ spotifyId });
  // const campaignsNotFound = [];
  // playlist.campaigns.forEach((campaign) => {
  //   if (!data.find((item) => item._id === campaign.campaign_id)) {
  //     campaignsNotFound.push({
  //       ...campaign.toObject(),
  //       spotify_id: playlist.spotifyId,
  //     });
  //   }
  // });
  // await AdDataService.addNewCampaignAdData(
  //   "6292885114974",
  //   "facebook",
  //   spotifyId
  // );
  res.status(200).send(data);
});

// 6292888630774
