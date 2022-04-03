const { startOfDay, endOfDay, format, sub } = require("date-fns");
const _ = require("lodash");
const util = require("util");
const AdData = require("../models/AdData");
const SnapchatService = require("./snapchatService");
const FacebookService = require("./facebookService");
const TikTokService = require("./tiktokService");
const { lastXDays, followersDaily } = require("./playlistServices");
const CampaignRefreshReport = require("../models/CampaignRefreshReport");

const getDate = (date) => {
  const dateArray = date.split("-").map(Number);
  return new Date(dateArray[0], dateArray[1] - 1, dateArray[2], 10);
};

function delay(t) {
  return new Promise((resolve) => setTimeout(resolve, t));
}

class AdDataService {
  static async saveAdDataToDb(data, spotify_id, platform, campaign_id) {
    if (!data || !data.length) return;
    return data.map(async (item) => {
      const { spend, impressions, date, cpc, clicks, country } = item;
      // console.log(item);
      const adData = await AdData.findOne({
        formated_date: date,
        campaign_id,
        platform,
        spotify_id,
        country,
      });

      if (adData) {
        console.log("updating");
        // if (adData.spotify_id !== spotify_id)
        //   console.log("Beware, this is not a duplicate");
        // // adData.update();
        await AdData.findByIdAndUpdate(
          adData.id,
          {
            spend,
            clicks,
            impressions,
            cpc,
          },
          { new: true }
        );
      } else {
        // console.log("creating");
        await AdData.create({
          campaign_id,
          platform,
          spend,
          clicks,
          impressions,
          cpc,
          spotify_id,
          formated_date: date,
          date: getDate(date),
          country,
        });
      }
    });
  }

  static async updateManyCampaignsDataForLastDays(
    campaigns,
    days,
    platformsToRefresh
  ) {
    // await AdData.deleteMany({
    //   platform: "snapchat",
    //   date: { $gt: new Date(2022, 2, 25) },
    // });
    const report = {
      date: new Date(),
      totalCampaings: [
        ...campaigns.facebook,
        ...campaigns.tiktok,
        ...campaigns.snapchat,
      ].length,
      totalNumberOfEntries: 0,
      facebook: {
        total: campaigns.facebook.length,
        requested: 0,
        successful: 0,
        failed: 0,
        errors: [],
      },
      snapchat: {
        total: campaigns.snapchat.length,
        requested: 0,
        successful: 0,
        failed: 0,
        errors: [],
      },
      tiktok: {
        total: campaigns.tiktok.length,
        requested: 0,
        successful: 0,
        failed: 0,
        errors: [],
      },
    };

    const dataTobeSaved = [];

    if (platformsToRefresh === "all" || platformsToRefresh === "facebook") {
      await Promise.all(
        campaigns.facebook.map(async (campaign) => {
          const { campaign_id, platform, spotify_id } = campaign;
          report.facebook.requested += 1;
          try {
            const data = await FacebookService.getDailyStats(campaign_id, days);
            report.totalNumberOfEntries += data.length;
            report.facebook.successful += 1;
            dataTobeSaved.push({ data, spotify_id, platform, campaign_id });
          } catch (error) {
            report.facebook.failed += 1;
            report.facebook.errors.push({
              platform,
              campaign_id,
              error: util.format(error.response),
            });
          }
        })
      );
    }

    const fetchTiktok = async (batch) => {
      await Promise.all(
        batch.map(async (campaign) => {
          const { campaign_id, platform, spotify_id, advertiser_id } = campaign;
          report.tiktok.requested += 1;
          try {
            const data = await TikTokService.getDailyStats(
              campaign_id,
              days,
              advertiser_id
            );
            report.totalNumberOfEntries += data.length;
            dataTobeSaved.push({ data, spotify_id, platform, campaign_id });
            report.tiktok.successful += 1;
          } catch (error) {
            report.tiktok.failed += 1;
            report.tiktok.errors.push({
              platform,
              campaign_id,
              error,
            });
          }
        })
      );
    };

    // console.log("total tiktok batchs", tiktokBatches.length);
    if (platformsToRefresh === "all" || platformsToRefresh === "tiktok") {
      const tiktokBatches = _.chunk(campaigns.tiktok, 9);

      for (let i = 0; i < tiktokBatches.length; i++) {
        await delay(2000);
        await fetchTiktok(tiktokBatches[i]);
        // console.log("fetching batch", i + 1);
      }
    }

    const fetchSnapChat = async (snapchatBatch) => {
      await Promise.all(
        snapchatBatch.map(async (campaign) => {
          const { campaign_id, platform, spotify_id } = campaign;
          report.snapchat.requested += 1;
          try {
            const data = await SnapchatService.getDailyStats(campaign_id, days);
            dataTobeSaved.push({ data, spotify_id, platform, campaign_id });
            report.totalNumberOfEntries += data.length;
            report.snapchat.successful += 1;
          } catch (error) {
            report.snapchat.failed += 1;
            report.snapchat.errors.push({
              platform,
              campaign_id,
              error: util.format(error.response),
            });
          }
        })
      );
    };

    if (platformsToRefresh === "all" || platformsToRefresh === "snapchat") {
      const snapchatBatches = _.chunk(campaigns.snapchat, 10);

      for (let i = 0; i < snapchatBatches.length; i++) {
        await delay(3000);
        await fetchSnapChat(snapchatBatches[i]);
      }
    }

    for (let i = 0; i < dataTobeSaved.length; i++) {
      const { data, spotify_id, platform, campaign_id } = dataTobeSaved[i];
      await this.saveAdDataToDb(data, spotify_id, platform, campaign_id);
    }

    await CampaignRefreshReport.create({ report });
    return report;
  }

  static async getPlaylistAdDataBetweenDates(spotify_id, startDate, endDate) {
    const data = await AdData.aggregate([
      {
        $match: {
          spotify_id,
          date: {
            $gte: startOfDay(new Date(startDate)),
            $lte: endOfDay(new Date(endDate)),
          },
        },
      },
      {
        $group: {
          _id: {
            all: null,
            country: "$country",
          },
          spend: { $sum: "$spend" },
          impressions: { $sum: "$impressions" },
          cpc: { $avg: "$cpc" },
          clicks: { $sum: "$clicks" },
        },
      },
      {
        $group: {
          _id: "$_id.all",
          spend: { $sum: "$spend" },
          impressions: { $sum: "$impressions" },
          cpc: { $avg: "$cpc" },
          clicks: { $sum: "$clicks" },
          countries: {
            $push: {
              country: "$_id.country",
              spend: "$spend",
              impressions: "$impressions",
              cpc: "$cpc",
              clicks: "$clicks",
            },
          },
        },
      },
    ]);

    if (!data[0])
      return {
        spend: 0,
        impressions: 0,
        cpc: 0,
        clicks: 0,
        countries: [],
      };
    return data[0];
  }

  static async getDailySpendsAndFollowers(playlist) {
    const { campaigns } = playlist;
    const dates = lastXDays(27);
    const dailySpends = {};
    dates.forEach((date) => {
      dailySpends[format(new Date(date), "yyyy-MM-dd")] = 0;
    });
    if (campaigns.length < 1) return [];

    const data = await AdData.aggregate([
      {
        $match: {
          spotify_id: playlist.spotifyId,
          date: {
            $gte: startOfDay(sub(new Date(), { days: 27 })),
            $lte: endOfDay(new Date()),
          },
        },
      },
      {
        $group: {
          _id: "$formated_date",
          date: {
            $first: "$formated_date",
          },
          spend: { $sum: "$spend" },
        },
      },
    ]);
    data.forEach((item) => {
      const { date, spend } = item;
      dailySpends[date] = Number(spend.toFixed(2));
    });

    const followers = await followersDaily(playlist.spotifyId, false, 27);
    return { dailySpends, followers };
  }

  static async getDailyAdData(campaign_id, days) {
    const data = await AdData.find({
      campaign_id,
      date: {
        $gte: startOfDay(sub(new Date(), { days })),
        $lte: endOfDay(new Date()),
      },
    }).sort("date");
    return data.map((item) => ({
      cpc: item.cpc,
      spend: item.spend,
      date: item.formated_date,
    }));
  }

  static async addNewCampaignAdData(
    campaignId,
    platform,
    spotify_id,
    advertiserId
  ) {
    let service = FacebookService;
    if (platform === "tiktok") service = TikTokService;
    if (platform === "snapchat") service = SnapchatService;
    const data = await service.getDailyStats(campaignId, 27, advertiserId);
    await this.saveAdDataToDb(data, spotify_id, platform, campaignId);
  }
}

module.exports = AdDataService;
