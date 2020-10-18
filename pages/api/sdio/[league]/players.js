const axios = require('axios');
import { connectToDatabase } from '../../../../util/mongodb';
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

  const { query: { league }} = req;

  console.time(`${league.toUpperCase()} Players`);

  const { db } = await connectToDatabase();
  const cache = await db
    .collection("sdioplayers")
    .findOne({
      league: league,
      updated_at: {
        $gte: new Date(new Date().getTime() - 1 * 60 * 1000).toISOString()
      }
    })

  if (cache) {
    console.timeEnd(`${league.toUpperCase()} Players`);
    res.status(200).json(cache.data);
    return;
  }
  
  console.log(`${league.toUpperCase()} Players: [cache miss...]`);

  const url = `https://api.sportsdata.io/v3/${league}/scores/json/players`;
  const { data } = await axios.get(url, {
    headers: {
      'Ocp-Apim-Subscription-Key': process.env.SDIO
    }
  });

  const players = data
    .filter((item) => item.Status === 'Active')
    .map((item) => ({
      sdio: item.PlayerID,
      team: item.TeamID,
      display: `${item.FirstName} ${item.LastName}`,
    }));

  await db
    .collection("sdioplayers")
    .updateOne(
      { league: league },
      { $set: { data: players, updated_at: new Date().toISOString() } },
      { upsert: true }
    )

  console.timeEnd(`${league.toUpperCase()} Players`);
  
  res.status(200).json(players);
}

