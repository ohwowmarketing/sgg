import axios from 'axios';
import { setHeaders } from '../../../util/response';
import { checkCache, saveCache } from '../../../util/mongodb';

const getFutures = async (league) => {
  const { data: season } = await axios(`${process.env.API_URL}/api/sdio/${league}/season`);
  const { data: futures } = await axios(`${process.env.API_URL}/api/sdio/${league}/futures/${season.current}`);
  return futures;
}

const getMarkets = async (league) => {
  console.time(`${league.toUpperCase()} Market`);

  const cache = await checkCache('markets', `${league}`);
  if (cache) {
    console.timeEnd(`${league.toUpperCase()} Market`);
    return cache;
  }
  console.log(`${league.toUpperCase()} Market: [cache miss...]`);

  const futures = await getFutures(league);
  let markets = [];
  let last = 0;
  futures.forEach((future) => {
    if (future.bet !== last) {
      markets.push({ id: future.bet, display: future.display });
      last = future.bet;
    }
  });

  await saveCache('markets', `${league}`, markets);
  console.timeEnd(`${league.toUpperCase()} Market`);
  return markets;
}

export default async (req, res) => {
  const end = setHeaders(req, res);
  if (end) {
    return;
  }

  const { query: { league }} = req;
  const markets = await getMarkets(league);
  res.status(200).json(markets);
};