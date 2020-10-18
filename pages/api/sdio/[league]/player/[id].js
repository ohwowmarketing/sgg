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

  const { query: { league, id }} = req;

  console.time(`${league.toUpperCase()} Player ${id}`);

  const { db } = await connectToDatabase();
  const cacheTime = process.env.EXTENDED_CACHE_MINS * 60 * 1000;
  const cache = await db
    .collection("sdioplayer")
    .findOne({
      _id: `${league}|${id}`,
      updated_at: {
        $gte: new Date(new Date().getTime() - cacheTime).toISOString()
      }
    })

  if (cache) {
    console.timeEnd(`${league.toUpperCase()} Player ${id}`);
    res.status(200).json(cache.data);
    return;
  }

  console.log(`${league.toUpperCase()} Player ${id}: [cache miss...]`);
  
  const url = `https://api.sportsdata.io/v3/${league}/scores/json/Player/${id}`;
  
  const { data } = await axios.get(url, {
    headers: {
      'Ocp-Apim-Subscription-Key': process.env.SDIO
    }
  });

  const player = {
    team: data.TeamID,
    display: `${data.FirstName} ${data.LastName}`
  };
  
  await db
  .collection("sdioplayer")
  .updateOne(
    { _id: `${league}|${id}` },
    { $set: { data: player, updated_at: new Date().toISOString() } },
    { upsert: true }
  )

  console.timeEnd(`${league.toUpperCase()} Player ${id}`);
  
  res.status(200).json(player);
}
