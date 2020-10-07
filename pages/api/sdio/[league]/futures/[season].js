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

  const { query: { league, season }} = req;
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

  res.status(200);
  res.send(futures);
}
