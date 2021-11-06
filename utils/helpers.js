exports.formatDailySpendPerFollower = (dailySpendFollowers) => {
  const { followers, dailySpends } = dailySpendFollowers;
  const dailySpendPerFollower = followers.map((item) => {
    const spend = dailySpends[item.date];
    return {
      ...item,
      spend,
      spendPerFollower: item.followers
        ? Number((spend / item.followers).toFixed(2))
        : 0,
    };
  });

  return dailySpendPerFollower;
};
