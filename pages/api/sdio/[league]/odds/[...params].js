const axios = require('axios');
import { connectToDatabase } from '../../../../../util/mongodb';
require('events').EventEmitter.defaultMaxListeners = 40;

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
  let id;
  let timer;

  if (league === 'nfl') {
    const [season, week] = params;
    id = `nfl|${season}|${week}`;
    timer = `NFL ${season} Week ${week} Odds`;
    url = `https://api.sportsdata.io/v3/nfl/odds/json/GameOddsByWeek/${season}/${week}`;
    key = process.env.SDIO_NFL;
  } else {
    const [date] = params;
    id = `${league}|${date}`;
    timer = `${league} ${date} Odds`;
    url = `https://api.sportsdata.io/v3/${league}/odds/json/GameOddsByDate/${date}`;
    key = (league === 'nba') ? process.env.SDIO_NBA : process.env.SDIO_MLB;
  }

  console.time(timer);

  const { db } = await connectToDatabase();
  const cacheTime = process.env.BRIEF_CACHE_MINS * 60 * 1000;
  const cache = await db
    .collection("sdioodds")
    .findOne({
      _id: id,
      updated_at: {
        $gte: new Date(new Date().getTime() - cacheTime).toISOString()
      }
    })

  if (cache) {
    console.timeEnd(timer);
    res.status(200).json(cache.data);
    return;
  }

  console.log(`${timer}: [cache miss...]`);

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

  await db
  .collection("sdioodds")
  .updateOne(
    { _id: id },
    { $set: { data: odds, updated_at: new Date().toISOString() } },
    { upsert: true }
  )

  console.timeEnd(timer);

  res.status(200).json(odds);
}
