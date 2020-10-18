const axios = require('axios');
import { connectToDatabase } from '../../../../../util/mongodb';
require('events').EventEmitter.defaultMaxListeners = 200;

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

  const { query: { league, season }} = req;

  console.time(`${league.toUpperCase()} ${season} Futures`);

  const { db } = await connectToDatabase();
  const cacheTime = process.env.BRIEF_CACHE_MINS * 60 * 1000;
  const cache = await db
    .collection("sdiofutures")
    .findOne({
      _id: `${league}|${season}`,
      updated_at: {
        $gte: new Date(new Date().getTime() - cacheTime).toISOString()
      }
    })

  if (cache) {
    console.timeEnd(`${league.toUpperCase()} ${season} Futures`);
    res.status(200).json(cache.data);
    return;
  }

  console.log(`${league.toUpperCase()} ${season} Futures: [cache miss...]`);

  let key;
  switch (league) {
    case 'mlb': key = process.env.SDIO_MLB; break;
    case 'nba': key = process.env.SDIO_NBA; break;
    case 'nfl': key = process.env.SDIO_NFL; break;
    default: break;
  }
  const url = `https://api.sportsdata.io/v3/${league}/odds/json/BettingFuturesBySeason/${season}`;
  const { data: responseData } = await axios.get(url, {
    headers: {
      'Ocp-Apim-Subscription-Key': key
    }
  });
  const [data] = responseData;
  const markets = data.BettingMarkets;
  const futures = markets.map((market) => ({
    bet: market.BettingBetTypeID,
    display: market.BettingBetType,
    team: market.TeamID,
    abbr: market.TeamKey,
    player: market.PlayerID,
    sportsbooks: market.AvailableSportsbooks
      .map((sportsbook) => sportsbook.Name),
    bets: market.BettingOutcomes
      .filter((bet) => bet.IsAvailable)
      .map((bet) => ({
        typeId: bet.BettingOutcomeTypeID,
        type: bet.BettingOutcomeType,
        american: bet.PayoutAmerican,
        decimal: bet.PayoutDecimal,
        value: bet.Value,
        participant: bet.Participant,
        team: bet.TeamID,
        player: bet.PlayerID,
        sportsbook: bet.SportsBook.Name
      }))
  }));

  await db
  .collection("sdiofutures")
  .updateOne(
    { _id: `${league}|${season}` },
    { $set: { data: futures, updated_at: new Date().toISOString() } },
    { upsert: true }
  )

  console.timeEnd(`${league.toUpperCase()} ${season} Futures`);

  res.status(200).json(futures);
}
