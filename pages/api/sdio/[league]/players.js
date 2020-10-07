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

  const { query: { league }} = req;
  const url = `https://api.sportsdata.io/v3/${league}/scores/json/players`;
  const { data } = await axios.get(url, {
    headers: {
      'Ocp-Apim-Subscription-Key': process.env.SDIO
    }
  });

  const players = data
    // .filter((item) => item.Status === 'Active')
    .map((item) => ({
      sdio: item.PlayerID,
      team: item.TeamID,
      display: `${item.FirstName} ${item.LastName}`,
    }));

  res.status(200);
  res.send(players);
}

