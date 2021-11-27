const router = require("express").Router();
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
} = require("../controllers/playlistController");

router.get("/", getPlaylists);
router.get("/search", searchPlaylist);
router
  .route("/:id")
  .get(getPlaylist)
  .post(addPlaylist)
  .put(updatePlaylist)
  .delete(deletePlaylist);
router.route("/:id/followers").get(getFollowers);
router.get("/:id/followers-per-day", followersPerDayPerPeriod);
router.route("/:id/campaigns").post(addCampaign);
router.route("/:id/campaigns/:campaignId").delete(removeCampaign);
router.get("/:id/campaigns-report", getCampaignsReport);
router.get("/:id/campaigns-report-daily", getDailyCampaignsReport);
router.get("/:id/7-snapchat-spend", getSnapchatSpend);

module.exports = router;
