import axios from 'axios';
import { connectToDatabase } from '../../../util/mongodb';
require('events').EventEmitter.defaultMaxListeners = 40;

const getTeams = async (league) => {
  const { data } = await axios(`${process.env.API_URL}/api/sdio/${league}/teams`);
  return data;
}

const getStandings = async (league) => {
  const { data: season } = await axios(`${process.env.API_URL}/api/sdio/${league}/season`);
  const { data: standings } = await axios(`${process.env.API_URL}/api/sdio/${league}/standings/${season.current}`);
  return standings;
}

const getTrends = async (league, abbr) => {
  const { data } = await axios(`${process.env.API_URL}/api/sdio/${league}/trends/${abbr}`);
  return data;
}

const getTeam = (id, teams) => teams.find((team) => team.sdio === id)

const getRow = async (league, standing, teams) => {
  const team = await getTeam(standing.sdio, teams);
  const trends = await getTrends(league, team.abbr);
  const homeNum = (standing.wins + standing.losses < 6) ? 'homeFive' : 'homeTen';
  const awayNum = (standing.wins + standing.losses < 6) ? 'awayFive' : 'awayTen';
  return {
    logo: team.logo,
    display: team.display,
    wins: standing.wins,
    losses: standing.losses,
    homeWins: standing.homeWins,
    homeLosses: standing.homeLosses,
    awayWins: standing.awayWins,
    awayLosses: standing.awayLosses,
    homeSpreadWins: trends[homeNum].spreadWins,
    homeSpreadLosses: trends[homeNum].spreadLosses,
    homeSpreadPushes: trends[homeNum].spreadPushes,
    awaySpreadWins: trends[awayNum].spreadWins,
    awaySpreadLosses: trends[awayNum].spreadLosses,
    awaySpreadPushes: trends[awayNum].spreadPushes,
    homeOvers: trends[homeNum].overs,
    homeUnders: trends[homeNum].unders,
    homeOverUnderPushes: trends[homeNum].overUnderPushes,
    awayOvers: trends[awayNum].overs,
    awayUnders: trends[awayNum].unders,
    awayOverUnderPushes: trends[awayNum].overUnderPushes
  }
}

const getSpreads = async (league) => {
  console.time(`${league.toUpperCase()} Spread`);

  const { db } = await connectToDatabase();
  const cacheTime = process.env.BRIEF_CACHE_MINS * 60 * 1000;
  const cache = await db
    .collection("spreads")
    .findOne({
      _id: `${league}`,
      updated_at: {
        $gte: new Date(new Date().getTime() - cacheTime).toISOString()
      }
    })

  if (cache) {
    console.timeEnd(`${league.toUpperCase()} Spread`);
    return cache.data;
  }

  console.log(`${league.toUpperCase()} Spread: [cache miss...]`);

  const teams = await getTeams(league);
  const standings = await getStandings(league);
  const spreads = await Promise.all(standings.map(async (standing) => getRow(league, standing, teams)));
  
  spreads.sort((a, b) => {
    if (a.wins === b.wins) {
      if (a.losses === b.losses) {
        return a.display.localeCompare(b.display);
      }
      return a.losses < b.losses ? -1 : 1;
    }
    return a.wins > b.wins ? -1 : 1;
  });

  await db
  .collection("spreads")
  .updateOne(
    { _id: league },
    { $set: { data: spreads, updated_at: new Date().toISOString() } },
    { upsert: true }
  )

  console.timeEnd(`${league.toUpperCase()} Spread`);

  return spreads;
}

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

  const { query: { league }} = req;
  const spreads = await getSpreads(league);
  res.status(200).json(spreads);
};