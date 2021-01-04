import axios from 'axios'
import Head from 'next/head'

const score = (wins, losses, draws = 0) => {
  return (draws > 0) ?  `${wins} - ${losses} - ${draws}` : `${wins} - ${losses}`;
}

const Spread = ({ league, spreads }) => {

  return (
    <div className="container">
      <Head>
        <title>{league.toUpperCase()} Spread</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main>
        <h1 className="title">
          {league.toUpperCase()} Spread
        </h1>

        <table id="ats-table" className="uk-table uk-table-divider" data-league="<?php echo $league; ?>">
          <thead>
            <tr>
              <th className="team-label">Team</th>
              <th>Overall</th>
              {league !== 'nfl' && (
                <>
                <th>Home</th>
                <th>Away</th>
                </>
              )}
              <th><small>Last 10 Games</small> ATS Home</th>
              <th><small>Last 10 Games</small> ATS Away</th>
              <th><small>Last 10 Games</small> OV/UN Home</th>
              <th><small>Last 10 Games</small> OV/UN Away</th>
            </tr>
          </thead>
          <tbody>
            {spreads.map((spread) => (
              <tr key={spread.display}>
                <td className="team-panel">
                  <img src={spread.logo} style={{
                    width: '36px',
                    height: '24px',
                    paddingRight: '12px',
                    objectFit: 'contain'
                  }} />
                  {spread.display}
                </td>
                <td>{score(spread.wins, spread.losses)}</td>
                {(league !== 'nfl') ? (
                  <>
                    <td>{score(spread.homeWins, spread.homeLosses)}</td>
                    <td>{score(spread.awayWins, spread.awayLosses)}</td>
                  </>
                ) : null}
                <td>
                  {score(spread.homeSpreadWins, spread.homeSpreadLosses, spread.homeSpreadPushes)}
                </td>
                <td>
                  {score(spread.awaySpreadWins, spread.awaySpreadLosses, spread.awaySpreadPushes)}
                </td>
                <td>
                  {score(spread.homeOvers, spread.homeUnders, spread.homeOverUnderPushes)}
                </td>
                <td>
                  {score(spread.awayOvers, spread.awayUnders, spread.awayOverUnderPushes)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </main>

      <footer>
        <p>SGG</p>
      </footer>
    </div>
  )
}

export default Spread;

export async function getServerSideProps({ params }) {
  const { league } = params;
  const { data } = await axios(`${process.env.API_URL}/api/${league}/spread`);
  return {
    props: { league, spreads: data },
  }
}
