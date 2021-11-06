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

module.exports = router;
