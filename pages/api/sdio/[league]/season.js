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
  const url = `https://api.sportsdata.io/v3/${league}/scores/json/CurrentSeason`;
  const { data } = await axios.get(url, {
    headers: {
      'Ocp-Apim-Subscription-Key': process.env.SDIO
    }
  });

  res.status(200);
  res.json({
    current: (league !== 'nfl') ? data.Season : data,
    sdio: (league !== 'nfl') ? data.ApiSeason : `${data}`,
    type: (league !== 'nfl') ? data.SeasonType : null,
  });
}

