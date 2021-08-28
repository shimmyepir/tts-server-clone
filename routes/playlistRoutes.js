const router = require("express").Router();
const {
  addPlaylist,
  getFollowers,
  getPlaylist,
  searchPlaylist,
  updatePlaylist,
  followersPerDayPerPeriod,
} = require("../controllers/playlistController");

router.get("/search", searchPlaylist);
router.route("/:id").get(getPlaylist).post(addPlaylist).put(updatePlaylist);
router.route("/:id/followers").get(getFollowers);
router.get("/:id/followers-per-day", followersPerDayPerPeriod);

module.exports = router;
