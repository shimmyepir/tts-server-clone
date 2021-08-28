const router = require("express").Router();
const {
  getCampaign,
  getDailyStats,
} = require("../controllers/tiktokController");

router.get("/", (req, res) => {
  console.log(req.params, req.query, req.originalUrl);
  res.end();
});

router.get("/campaigns", getCampaign);
router.get("/campaigns/daily-stats", getDailyStats);

module.exports = router;
