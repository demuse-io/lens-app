import Head from "next/head";
import Profiles from "../components/profiles";
import { ethers } from "ethers";
import { useState, useEffect } from "react";

import { client, getProfiles, login, challenge } from "../pages/api/api";

export default function Home() {
  // Setup the state for the profiles
  const [profiles, setProfiles] = useState([]);
  const [address, setAddress] = useState("");
  const [signature, setSignature] = useState("");

  // Get the recommended profiles
  const fetchProfiles = async () => {
    try {
      const response = await client.query(getProfiles).toPromise();

      setProfiles(response.data.recommendedProfiles);

      console.log(response.data.recommendedProfiles);
    } catch (e) {
      console.log(e);
    }
  };

  // Run the fetchProfiles function when the component is mounted
  useEffect(() => {
    // fetchProfiles();
  }, []);

  async function connectWallet() {
    const provider = new ethers.providers.Web3Provider(window.ethereum);

    await provider.send("eth_requestAccounts", []);
    const signer = provider.getSigner();
    const address = await signer.getAddress();
    const response = await client.query(challenge(address)).toPromise();
    const messageToSign = response.data.challenge.text;
    const signature = await signer.signMessage(messageToSign);

    console.log("calling login");
    console.log(login(address, signature));
    const response2 = await client
      .mutation(login(address, signature))
      .toPromise();
    console.log("response2", response2.data);
    console.log(response2.data);
  }

  // Render the component
  return (
    <div className="grid grid-cols-3 divide-x">
      <Head>
        <title>Decentralized Social Network - Lens protocol</title>
        <meta name="description" content="Decentralize Social Media App" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="col-span-3">
        <div className="px-4 py-8">
          <h1 className="text-3xl font-bold leading-tight text-center">
            Decentralized Social Network - Lens protocol
          </h1>
          <p className="text-center">
            This is a decentralized social network built on the Lens protocol.
          </p>
        </div>
      </div>
      <button onClick={connectWallet}>Connect Wallet</button>

      {profiles && profiles.length > 0 ? (
        <Profiles profiles={profiles} />
      ) : (
        <div className="text-center text-gray-500 p-5 font-medium text-xl tracking-tight leading-tight">
          <p>Loading...</p>
        </div>
      )}
    </div>
  );
}
