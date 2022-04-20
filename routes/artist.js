const router = require("express").Router();
const {
  getArtistEarningsSpends,
  updateArtistStreamsData,
  refreshArtistStreamsData,
  getLatestRefreshRun,
} = require("../controllers/artist");

router.get("/:artistId/earnings", getArtistEarningsSpends);
router
  .route("/:artistId/streams")
  .post(updateArtistStreamsData)
  .put(refreshArtistStreamsData);
router.get("/:artistId/streams/refresh-run", getLatestRefreshRun);
module.exports = router;
