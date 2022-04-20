const { startOfDay, endOfDay, sub, format } = require("date-fns");
const agenda = require("../jobs/agenda");
const Playlist = require("../models/Playlist");
const PlaylistFollowers = require("../models/PlaylistFollowers");
const snapchatService = require("./snapchatService");
const tiktokService = require("./tiktokService");
const facebookService = require("./facebookService");

const deletePlaylist = async (spotifyId) => {
  await Playlist.findOneAndDelete({ spotifyId });
  await PlaylistFollowers.deleteMany({ spotifyId });
  await agenda.cancel({
    name: "update followers",
    "data.spotifyId": spotifyId,
  });
};

const getPlaylistCampaignsData = async (playlist, startDate, endDate) => {
  const { campaigns } = playlist;
  if (campaigns.length < 1) return;
  const detailedMetrics = {};
  const metrics = {
    clicks: 0,
    impressions: 0,
    spend: 0,
    cpc: 0,
  };
  await Promise.all(
    campaigns.map(async (campaign) => {
      if (campaign.platform === "snapchat") {
        const data = await snapchatService.getCampaign(
          startDate,
          endDate,
          campaign.campaign_id
        );
        if (data) {
          const { swipes, impressions } = data;
          const spend = data.spend / 1000000;
          const cpc = spend / data.swipes;
          detailedMetrics[campaign.campaign_id] = {
            clicks: swipes,
            impressions,
            spend,
            cpc,
          };
          metrics.clicks += Number(swipes);
          metrics.impressions += Number(impressions);
          metrics.spend += Number(spend);
        }
      }
      if (campaign.platform === "tiktok") {
        const data = await tiktokService.getCampaign(
          startDate,
          endDate,
          campaign.campaign_id,
          campaign.advertiser_id
        );
        if (data) {
          const { clicks, impressions, spend, cpc } = data;
          detailedMetrics[campaign.campaign_id] = {
            clicks,
            impressions,
            spend,
            cpc,
          };
          metrics.clicks += Number(clicks);
          metrics.impressions += Number(impressions);
          metrics.spend += Number(spend);
        }
      }
      if (campaign.platform === "facebook") {
        const data = await facebookService.getCampaign(
          startDate,
          endDate,
          campaign.campaign_id
        );
        if (data) {
          const { clicks, impressions, spend, cpc } = data;
          detailedMetrics[campaign.campaign_id] = {
            clicks,
            impressions,
            spend,
            cpc,
          };
          metrics.clicks += Number(clicks);
          metrics.impressions += Number(impressions);
          metrics.spend += Number(spend);
        }
      }
    })
  );
  metrics.cpc = metrics.spend / metrics.clicks;
  return { detailedMetrics, metrics };
};

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

  let total;
  if (!followers.length) {
    total = 0;
  } else {
    total = returnTotal
      ? followers[followers.length - 1].followers
      : followers[followers.length - 1].followers - followers[0].followers;
  }
  return total;
};

const lastXDays = (days) => {
  const endDate = endOfDay(new Date());
  const dates = [];
  for (let i = days; i >= 0; i--) {
    dates.push(sub(endDate, { days: i }));
  }
  return dates;
};

const followersDaily = async (id, total, days = 27) => {
  const dates = lastXDays(days);
  const data = [];
  await Promise.all(
    dates.map(async (date) => {
      const followers = await getFollowersBetweenDates(id, date, date, total);
      const formatedDate = format(new Date(date), "yyyy-MM-dd");
      data.push({ date: formatedDate, followers });
    })
  );
  return data.sort((a, b) => new Date(a.date) - new Date(b.date));
};

const getDailyCampaignsData = async (playlist) => {
  const { campaigns } = playlist;
  if (campaigns.length < 1) return [];
  const dates = lastXDays(27);
  const dailySpendsPerCampaign = {};
  const dailySpends = {};
  dates.forEach((date) => {
    dailySpends[format(new Date(date), "yyyy-MM-dd")] = 0;
  });

  const addData = (data) => {
    data.forEach((item) => {
      dailySpends[item.date] += Number(item.spend);
    });
  };

  await Promise.all(
    campaigns.map(async (campaign) => {
      if (campaign.platform === "snapchat") {
        const data = await snapchatService.getDailyStats(
          campaign.campaign_id,
          27
        );
        if (data.length) {
          dailySpendsPerCampaign[campaign.campaign_id] = data;
          addData(data);
        }
      }
      if (campaign.platform === "tiktok") {
        const data = await tiktokService.getDailyStats(
          campaign.campaign_id,
          campaign.advertiser_id
        );
        dailySpendsPerCampaign[campaign.campaign_id] = data;
        addData(data);
      }
      if (campaign.platform === "facebook") {
        const data = await facebookService.getDailyStats(campaign.campaign_id);
        dailySpendsPerCampaign[campaign.campaign_id] = data;
        addData(data);
      }
    })
  );
  const followers = await followersDaily(playlist.spotifyId, false, 27);
  return { dailySpends, followers, dailySpendsPerCampaign };
};

const searchPlaylistsByName = async (name) => {
  const playlists = await Playlist.find({
    name: { $regex: name, $options: "i" },
  });
  return playlists;
};

module.exports = {
  getFollowersBetweenDates,
  getDailyCampaignsData,
  deletePlaylist,
  getPlaylistCampaignsData,
  followersDaily,
  lastXDays,
  searchPlaylistsByName,
};
