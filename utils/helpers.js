exports.formatDailySpendPerFollowers = (
  dailySpends,
  dailyFollowers,
  spendUnit = 1
) => {
  const dailySpendPerFollowers = [];
  dailyFollowers.forEach((item, i) => {
    const daySpend = dailySpends.find((spend) => spend.date === item.date);
    if (daySpend) {
      dailySpendPerFollowers.push({
        date: item.date,
        spend: Number(Number(daySpend.spend / spendUnit).toFixed(2)),
        followers: item.followers,
        spendPerFollower: item.followers
          ? Number((daySpend.spend / spendUnit / item.followers).toFixed(2))
          : 0,
      });
    } else {
      dailySpendPerFollowers.push({
        date: item.date,
        spend: 0,
        followers: item.followers,
        spendPerFollower: 0,
      });
    }
  });

  return dailySpendPerFollowers;
};
