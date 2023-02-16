const router = require("express").Router();
const { endOfDay, startOfDay } = require("date-fns");
const {
  addPlaylist,
  getFollowers,
  getPlaylist,
  searchPlaylist,
  updatePlaylist,
  followersPerDayPerPeriod,
  getPlaylists,
  deletePlaylist,
  addCampaign,
  removeCampaign,
  getCampaignsReport,
  getDailyCampaignsReport,
  getSnapchatSpend,
  getLatestCampaignsReport,
  refreshCampaignsAdData,
  playGround,
  campaignsDailyStats,
  artistReport,
  addPlaylistStreams,
  fetchPlaylistsStreams,
  getLatestStreamsRefreshRun,
} = require("../controllers/playlistController");

router.get("/", getPlaylists);
router.get("/search", searchPlaylist);
router.get("/latest-campaign-report", getLatestCampaignsReport);
router.get("/tests", playGround);
router.get("/artist-report", artistReport);
router.post("/refresh-campaigns", refreshCampaignsAdData);
router.post("/refresh-streams", fetchPlaylistsStreams);
router.get("/streams-refresh-run", getLatestStreamsRefreshRun);
router
  .route("/:id")
  .get(getPlaylist)
  .post(addPlaylist)
  .put(updatePlaylist)
  .delete(deletePlaylist);
router.route("/:id/followers").get(getFollowers);
router.route("/:id/streams").post(addPlaylistStreams);
router.get("/:id/followers-per-day", followersPerDayPerPeriod);
router.route("/:id/campaigns").post(addCampaign);
router.route("/:id/campaigns/:campaignId").delete(removeCampaign);
router.get("/:id/campaigns-report", getCampaignsReport);
router.get("/:id/campaigns-report-daily", getDailyCampaignsReport);
router.get("/:id/7-day-snapchat-spend", getSnapchatSpend);
router.get("/:id/campaigns-daily-stats", campaignsDailyStats);

module.exports = router;
