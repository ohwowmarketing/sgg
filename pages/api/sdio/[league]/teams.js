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
  const url = `https://api.sportsdata.io/v3/${league}/scores/json/teams`;
  const { data } = await axios.get(url, {
    headers: {
      'Ocp-Apim-Subscription-Key': process.env.SDIO
    }
  });

  const teams = data.map((item) => ({
    sdio: item.TeamID,
    abbr: item.Key,
    display: `${item.City} ${item.Name}`,
    logo: item.WikipediaLogoUrl
  }));
  

  res.status(200);
  res.send(teams);
}

