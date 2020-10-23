import axios from 'axios';
import { setHeaders } from '../../../../util/response';
import { checkCache, saveCache } from '../../../../util/mongodb';
require('events').EventEmitter.defaultMaxListeners = 200;

const getTeams = async (league, meta) => {
  if (!meta.known) {
    return null;
  }
  const { data } = await axios(`${process.env.API_URL}/api/sdio/${league}/teams`);
  return data;
}

const getPlayer = async (league, id) => {
  const { data } = await axios(`${process.env.API_URL}/api/sdio/${league}/player/${id}`);
  return data;
}

const getFutures = async (league) => {
  const { data: season } = await axios(`${process.env.API_URL}/api/sdio/${league}/season`);
  const { data: futures } = await axios(`${process.env.API_URL}/api/sdio/${league}/futures/${season.current}`);
  return futures;
}

const sortSportsbooks = (sportsbooks) => {
  const priority = ['Consensus', 'RiversCasinoPA', 'UnibetNJ'];
  let newSportsbooks = [];
  priority.forEach((bubble) => {
    sportsbooks.forEach((sportsbook) => {
      if (sportsbook === bubble) {
        newSportsbooks.push(sportsbook);
      }
    })
  });
  sportsbooks.forEach((sportsbook) => {
    if (!newSportsbooks.includes(sportsbook)) {
      newSportsbooks.push(sportsbook);
    }
  });
  return newSportsbooks;
}

const sortRows = (a, b) => {
  if (!a.order && !b.order) {
    return a.display.localeCompare(b.display);
  } else if (a.order && !b.order) {
    return 1;
  } else if (!a.order && b.order) {
    return -1;
  } else if (a.order === b.order) {
    return 0;
  }
  return a.order < b.order ? -1 : 1;
}

const isCached = async (league, market) => {
  const cache = await checkCache('futures', `${league}|${market}`, process.env.BRIEF_CACHE_MINS);
  if (cache) {
    return cache;
  }
  return false;
}

const getMeta = (futures) => {
  const oneFuture = futures[0] || null;
  const oneBet = oneFuture.bets[0] || null;
  const display = oneFuture.display || null;
  const single = futures.length === 1 ? true : false;
  const known = (oneBet.team !== null || oneBet.player !== null);
  const isTeam = (known && oneBet.team) ? true : false;
  return { display, single, known, isTeam }
}

const getSportsbooks = (futures, meta) => {
  if (meta.single) {
    return futures[0].sportsbooks
  }
  let sportsbooks = new Set();
  futures.forEach((bet) => {
    bet.sportsbooks.forEach((sportsbook) => {
      sportsbooks.add(sportsbook);
    });
  });
  return Array.from(sportsbooks);
}

const getParticipantIds = (futures, meta) => {
  let participants = new Set();
  if (!meta.single) {
    futures.forEach((future) => {
      let participant = future.display;
      if (meta.known) {
        participant = (meta.isTeam) ? future.team : future.player;
      }
      participants.add(participant);
    });
  } else {
    futures[0].bets.forEach((bet) => {
      let participant = bet.participant;
      if (meta.known) {
        participant = (meta.isTeam) ? bet.team : bet.player;
      }
      participants.add(participant);
    });
  }
  return Array.from(participants);
}

const getParticipantBets = (futures, meta, participant, sportsbooks) => {;
  if (meta.single) {
    const bets = futures[0].bets.filter((bet) => {
      if (!meta.known && bet.participant === participant) {
        return true;
      }
      if (meta.known && meta.isTeam && bet.team === participant) {
        return true;
      }
      if (meta.known && !meta.isTeam && bet.player === participant) {
        return true;
      }
      return false;
    }).map((bet) => bet);

    let data = {};
    sportsbooks.forEach((sportsbook) => {
      const [payout] = bets
        .filter((bet) => bet.sportsbook === sportsbook)
        .map((bet) => ({
          american: bet.american,
          decimal: bet.decimal
        }));
      data[sportsbook] = payout;
    });
    return data;
  } else {
    const rawBets = futures
      .filter((future) => {
        if (!meta.known && future.abbr === participant) {
          return true;
        }
        if (meta.known && meta.isTeam && future.team === participant) {
          return true;
        }
        if (meta.known && !meta.isTeam && futurte.player === participant) {
          return true;
        }
        return false;
      }).map((future) => future.bets);
    const [bets] = rawBets;

    let data = {};
    sportsbooks.forEach((sportsbook) => {
      const rawTypes = bets
        .filter((bet) => bet.sportsbook === sportsbook)
        .map((bet) => ({
          [bet.type]: {
            american: bet.american,
            decimal: bet.decimal,
            value: bet.value
          }
        }));
      let types = {};
      rawTypes.forEach((type) => {
        const keys = Object.keys(type);
        const [key] = keys;
        types[key] = {
          american: type[key].american,
          decimal: type[key].decimal,
          value: type[key].value
        } 
      });
      data[sportsbook] = types;
    });
    return data;
  }
}

const getParticipantDisplay = (meta, id, team, player) => {
  if (meta.known) {
    if (meta.isTeam && team) {
      if (team.display) {
        return team.display;
      }
    }
    if (!meta.isTeam && player) {
      if (player.display) {
        return player.display;
      }
    }
  }
  return id;
}

const getParticipantLogo = (meta, team) => {
  if (meta.known && team) {
    if (team.logo) {
      return team.logo;
    }
  }
  return null;
}

const getParticipantConsensus = (bets) => {
  if (typeof bets === 'object' && Object.keys(bets).includes('Consensus')) {
    if (typeof bets.Consensus === 'object' && Object.keys(bets.Consensus).includes('american')) {
      return bets.Consensus.american;
    } else {
      if (typeof bets.Consensus === 'object') {
        const types = Object.keys(bets.Consensus);
        if (types.includes('Over')) {
          if (typeof bets.Consensus.Over === 'object' && Object.keys(bets.Consensus.Over).includes('american')) {
            return bets.Consensus.Over.american
          }
        }
        if (types.includes('Yes')) {
          if (typeof bets.Consensus.Yes === 'object' && Object.keys(bets.Consensus.Yes).includes('american')) {
            return bets.Consensus.Yes.american
          }
        }
      }
    }
  }
  return null;
}

const getRows = async (league, ids, futures, meta, sportsbooks, teams) => {
  return await Promise.all(ids.map(async (id) => {
    const player = (meta.known && !meta.isTeam) ? await getPlayer(league, id) : null;
    const teamId = (meta.known) ? (meta.isTeam ? id : player.team ) : null ;
    const team = (teamId) ? teams.find((team) => team.sdio === teamId) : null;
    const display = getParticipantDisplay(meta, id, team, player);
    const logo = getParticipantLogo(meta, team);
    const participantBets = await getParticipantBets(futures, meta, id, sportsbooks);
    const order = getParticipantConsensus(participantBets);

    return {
      display,
      logo,
      order,
      participantBets,
    }
  }));
}

const getFuturesByMarket = async (league, market) => {
  const cache = await isCached(league, market);
  if (cache) { return cache; }

  const allFutures = await getFutures(league);
  const futures = allFutures.filter((future) => future.bet === parseInt(market));
  
  const meta = getMeta(futures);
  const teams = await getTeams(league, meta);
  const unsortedSportsbooks = getSportsbooks(futures, meta);
  const sportsbooks = sortSportsbooks(unsortedSportsbooks);
  const participantIds = getParticipantIds(futures, meta);
  const rows = await getRows(league, participantIds, futures, meta, sportsbooks, teams);
  rows.sort(sortRows);

  const data = { market, meta, sportsbooks, rows }
  await saveCache('futures', `${league}|${market}`, data);
  return data;
}

export default async (req, res) => {
  const end = setHeaders(req, res);
  if (end) {
    return;
  }

  const { query: { league, market }} = req;
  const futures = await getFuturesByMarket(league, market);
  res.status(200).json(futures);
};