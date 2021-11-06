const { startOfDay, endOfDay } = require("date-fns");
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
          metrics.cpc += Number(cpc);
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
          metrics.cpc += Number(cpc);
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
          metrics.cpc += Number(cpc);
        }
      }
    })
  );
  return { detailedMetrics, metrics };
};

const getDailyCampaignsData = async (playlist) => {
  const { campaigns } = playlist;
  if (campaigns.length < 1) return [];
  const dailySpends = {};
  await Promise.all(
    campaigns.map(async (campaign) => {
      if (campaign.platform === "snapchat") {
        dailySpends[campaign.campaign_id] = await snapchatService.getDailyStats(
          campaign.campaign_id
        );
      }
      if (campaign.platform === "tiktok") {
        dailySpends[campaign.campaign_id] = await tiktokService.getDailyStats(
          campaign.campaign_id,
          campaign.advertiser_id
        );
      }
      if (campaign.platform === "facebook") {
        dailySpends[campaign.campaign_id] = await facebookService.getDailyStats(
          campaign.campaign_id
        );
      }
    })
  );
  return dailySpends;
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

module.exports = {
  getFollowersBetweenDates,
  getDailyCampaignsData,
  deletePlaylist,
  getPlaylistCampaignsData,
};
