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

  const { query: { league, params }} = req;
  let url;
  let key;

  if (league === 'nfl') {
    const [season, week] = params;
    url = `https://api.sportsdata.io/v3/nfl/odds/json/GameOddsByWeek/${season}/${week}`;
    key = process.env.SDIO_NFL;
  } else {
    const [date] = params;
    url = `https://api.sportsdata.io/v3/${league}/odds/json/GameOddsByDate/${date}`;
    key = (league === 'nba') ? process.env.SDIO_NBA : process.env.SDIO_MLB;
  }
  const { data } = await axios.get(url, {
    headers: {
      'Ocp-Apim-Subscription-Key': key
    }
  });
  const odds = data.map((odd) => ({
    dateTime: odd.DateTime,
    status: odd.Status,
    homeSDIO: odd.HomeTeamId,
    awaySDIO: odd.AwayTeamId,
    homeScore: odd.HomeTeamScore,
    awayScore: odd.AwayTeamScore,
    homeRotation: odd.HomeRotationNumber,
    awayRotation: odd.AwayRotationNumber,
    odds: odd.PregameOdds.map((item) => ({
      sportsbook: item.Sportsbook,
      updated: item.Updated,
      homeMoneyLine: item.HomeMoneyLine,
      awayMoneyLine: item.AwayMoneyLine,
      drawMoneyLine: item.DrawMoneyLine,
      homePointSpread: item.HomePointSpreadPayout,
      awayPointSpread: item.AwayPointSpread,
      overUnder: item.OverUnder,
      overPayout: item.OverPayout,
      underPayout: item.UnderPayout,
      type: item.OddType
    }))
  }));

  res.status(200);
  res.send(odds);
}
