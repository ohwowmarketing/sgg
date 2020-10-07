const axios = require('axios');

export default async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { query: { league, abbr }} = req;
  const url = `https://api.sportsdata.io/v3/${league}/odds/json/TeamTrends/${abbr}`;
  console.log(url);
  const { data } = await axios.get(url, {
    headers: {
      'Ocp-Apim-Subscription-Key': process.env.SDIO
    }
  });
  const trends = {
    sdio: data.TeamID,
    home: data.TeamGameTrends
      .filter((trend) => trend.Scope === 'Last 10 Home Games')
      .map((trend) => ({
        spreadWin: trend.WinsAgainstTheSpread,
        spreadLosses: trend.LossesAgainstTheSpread,
        spreadPush: trend.PushesAgainstTheSpread,
        overs: trend.Overs,
        unders: trend.Unders,
        overUnderPushes: trend.OverUnderPushes
      })),
    away: data.TeamGameTrends
      .filter((trend) => trend.Scope === 'Last 10 Away Games')
      .map((trend) => ({
        spreadWin: trend.WinsAgainstTheSpread,
        spreadLosses: trend.LossesAgainstTheSpread,
        spreadPush: trend.PushesAgainstTheSpread,
        overs: trend.Overs,
        unders: trend.Unders,
        overUnderPushes: trend.OverUnderPushes
      })),
  };

  res.status(200);
  res.send(trends);
}
