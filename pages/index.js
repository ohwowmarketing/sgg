import Head from 'next/head'
import { connectToDatabase } from '../util/mongodb'

export default function Home({ isConnected }) {
  return (
    <div className="container">
      <Head>
        <title>SGG</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main>
        <h1 className="title">
          Welcome to the <a href="https://sportsgamblingguides.com/">Sports Gambling Guide API!</a>
        </h1>

        {isConnected ? (
          <h2 className="subtitle">DB connected&hellip;</h2>
        ) : (
          <h2 className="subtitle">
            You are NOT connected to MongoDB. Check the README.md{' '}
            for instructions.
          </h2>
        )}

        <p className="description">
          Get started by visiting any of the following routes:
        </p>

        <ul>
          <li>api/sdio/{"{league}"}/futures/{"{season}"}</li>
          <li>api/sdio/<b>nfl</b>/odds/{"{season}"}/{"{week}"}</li>
          <li>api/sdio/{"{league}"}/odds/{"{season}"}/{"{yyyy-mm-dd}"}</li>
          <li>api/sdio/{"{league}"}/players</li>
          <li>api/sdio/{"{league}"}/teams</li>
          <li>api/sdio/{"{league}"}/trends/{"{team-key}"}</li>
        </ul>
      </main>

      <footer>
        <p>SGG</p>
      </footer>
    </div>
  )
}

export async function getServerSideProps(context) {
  const { client } = await connectToDatabase()

  const isConnected = await client.isConnected() // Returns true or false

  return {
    props: { isConnected },
  }
}
