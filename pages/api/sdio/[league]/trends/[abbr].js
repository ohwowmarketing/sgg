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
    query: { league, abbr }
  } = req

  console.time(`${league.toUpperCase()} ${abbr} Trends`)

  const { db } = await connectToDatabase()
  const cacheTime = process.env.EXTENDED_CACHE_MINS * 60 * 1000
  const cache = await db.collection('sdiotrends').findOne({
    _id: `${league}|${abbr}`,
    updated_at: {
      $gte: new Date(new Date().getTime() - cacheTime).toISOString()
    }
  })

  if (cache) {
    console.timeEnd(`${league.toUpperCase()} ${abbr} Trends`)
    res.status(200).json(cache.data)
    return
  }

  console.log(`${league.toUpperCase()} ${abbr} Trends: [cache miss...]`)

  let key
  switch (league) {
    case 'mlb':
      key = process.env.SDIO_MLB
      break
    case 'nba':
      key = process.env.SDIO_NBA
      break
    case 'nfl':
      key = process.env.SDIO_NFL
      break
    default:
      break
  }
  const url = `https://fly.sportsdata.io/v3/${league}/odds/json/TeamTrends/${abbr}`
  const { data } = await axios.get(url, {
    headers: {
      'Ocp-Apim-Subscription-Key': key
    }
  })

  const trends = {
    sdio: data.TeamID,
    homeFive: data.TeamGameTrends.filter(
      (trend) => trend.Scope === 'Last 5 Home Games'
    )
      .map((trend) => ({
        spreadWins: trend.WinsAgainstTheSpread,
        spreadLosses: trend.LossesAgainstTheSpread,
        spreadPushes: trend.PushesAgainstTheSpread,
        overs: trend.Overs,
        unders: trend.Unders,
        overUnderPushes: trend.OverUnderPushes
      }))
      .reduce((obj, item) => {
        obj[item]
      }),
    homeTen: data.TeamGameTrends.filter(
      (trend) => trend.Scope === 'Last 10 Home Games'
    )
      .map((trend) => ({
        spreadWins: trend.WinsAgainstTheSpread,
        spreadLosses: trend.LossesAgainstTheSpread,
        spreadPushes: trend.PushesAgainstTheSpread,
        overs: trend.Overs,
        unders: trend.Unders,
        overUnderPushes: trend.OverUnderPushes
      }))
      .reduce((obj, item) => {
        obj[item]
      }),
    awayFive: data.TeamGameTrends.filter(
      (trend) => trend.Scope === 'Last 5 Away Games'
    )
      .map((trend) => ({
        spreadWins: trend.WinsAgainstTheSpread,
        spreadLosses: trend.LossesAgainstTheSpread,
        spreadPushes: trend.PushesAgainstTheSpread,
        overs: trend.Overs,
        unders: trend.Unders,
        overUnderPushes: trend.OverUnderPushes
      }))
      .reduce((obj, item) => {
        obj[item]
      }),
    awayTen: data.TeamGameTrends.filter(
      (trend) => trend.Scope === 'Last 10 Away Games'
    )
      .map((trend) => ({
        spreadWins: trend.WinsAgainstTheSpread,
        spreadLosses: trend.LossesAgainstTheSpread,
        spreadPushes: trend.PushesAgainstTheSpread,
        overs: trend.Overs,
        unders: trend.Unders,
        overUnderPushes: trend.OverUnderPushes
      }))
      .reduce((obj, item) => {
        obj[item]
      })
  }

  await db
    .collection('sdiotrends')
    .updateOne(
      { _id: `${league}|${abbr}` },
      { $set: { data: trends, updated_at: new Date().toISOString() } },
      { upsert: true }
    )

  console.timeEnd(`${league.toUpperCase()} ${abbr} Trends`)

  res.status(200).json(trends)
}
