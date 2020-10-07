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
  const url = `https://api.sportsdata.io/v3/${league}/scores/json/Standings/${season}`;
  
  const { data } = await axios.get(url, {
    headers: {
      'Ocp-Apim-Subscription-Key': process.env.SDIO
    }
  });
  const teams = data.map((team) => ({
    sdio: team.TeamID,
    abbr: team.Key,
    display: (team.City) ? `${team.City} ${team.Name}` : team.Name,
    wins: team.Wins,
    losses: team.Losses,
    homeWins: team.HomeWins || null,
    homeLosses: team.HomeLosses || null,
    awayWins: team.AwayWins || null,
    awayLosses: team.AwayLosses || null,
    lastTenWins: team.LastTenWins || null,
    lastTenLosses: team.LastTenLosses || null
  }));
  

  res.status(200);
  res.send(teams);
}
