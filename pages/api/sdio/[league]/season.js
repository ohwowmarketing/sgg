const axios = require('axios')
import { connectToDatabase } from '../../../../util/mongodb'
require('events').EventEmitter.defaultMaxListeners = 200

export default async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  )
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  const {
    query: { league }
  } = req

  console.time(`${league.toUpperCase()} Season`)

  const { db } = await connectToDatabase()
  const cacheTime = process.env.EXTENDED_CACHE_MINS * 60 * 1000
  const cache = await db.collection('sdioseason').findOne({
    _id: league,
    updated_at: {
      $gte: new Date(new Date().getTime() - cacheTime).toISOString()
    }
  })

  if (cache) {
    console.timeEnd(`${league.toUpperCase()} Season`)
    res.status(200).json(cache.data)
    return
  }

  console.log(`${league.toUpperCase()} Season: [cache miss...]`)

  const url = `https://fly.sportsdata.io/v3/${league}/scores/json/CurrentSeason`
  const { data } = await axios.get(url, {
    headers: {
      'Ocp-Apim-Subscription-Key': process.env.SDIO
    }
  })

  const season = {
    current: league !== 'nfl' ? data.Season : data,
    sdio: league !== 'nfl' ? data.ApiSeason : `${data}`,
    type: league !== 'nfl' ? data.SeasonType : null
  }

  await db
    .collection('sdioseason')
    .updateOne(
      { _id: league },
      { $set: { data: season, updated_at: new Date().toISOString() } },
      { upsert: true }
    )

  console.timeEnd(`${league.toUpperCase()} Season`)

  res.status(200).json(season)
}
