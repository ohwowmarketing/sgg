const axios = require('axios')
import { connectToDatabase } from '../../../../../util/mongodb'
require('events').EventEmitter.defaultMaxListeners = 40

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
    query: { league, season }
  } = req

  console.time(`${league.toUpperCase()} ${season} Standings`)

  const { db } = await connectToDatabase()
  const cacheTime = process.env.EXTENDED_CACHE_MINS * 60 * 1000
  const cache = await db.collection('sdiostandings').findOne({
    _id: `${league}|${season}`,
    updated_at: {
      $gte: new Date(new Date().getTime() - cacheTime).toISOString()
    }
  })

  if (cache) {
    console.timeEnd(`${league.toUpperCase()} ${season} Standings`)
    res.status(200).json(cache.data)
    return
  }

  console.log(`${league.toUpperCase()} ${season} Standings: [cache miss...]`)

  const url = `https://fly.sportsdata.io/v3/${league}/scores/json/Standings/${season}`

  const { data } = await axios.get(url, {
    headers: {
      'Ocp-Apim-Subscription-Key': process.env.SDIO
    }
  })
  const teams = data.map((team) => ({
    sdio: team.TeamID,
    abbr: team.Key,
    display: team.City ? `${team.City} ${team.Name}` : team.Name,
    wins: team.Wins,
    losses: team.Losses,
    homeWins: team.HomeWins || null,
    homeLosses: team.HomeLosses || null,
    awayWins: team.AwayWins || null,
    awayLosses: team.AwayLosses || null,
    lastTenWins: team.LastTenWins || null,
    lastTenLosses: team.LastTenLosses || null
  }))

  await db
    .collection('sdiostandings')
    .updateOne(
      { _id: `${league}|${season}` },
      { $set: { data: teams, updated_at: new Date().toISOString() } },
      { upsert: true }
    )

  console.timeEnd(`${league.toUpperCase()} ${season} Standings`)

  res.status(200).json(teams)
}
