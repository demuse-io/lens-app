import Head from "next/head";
import omitDeep from "omit-deep";
import { ethers } from "ethers";
import { useState, useEffect } from "react";
import { NFTStorage } from "nft.storage";
const nftStorage = new NFTStorage({ token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkaWQ6ZXRocjoweEY5MmY3MTg0M0Y4MzkzMjU5MjlmOGNGMzIzNThkMkY2RmNGNUU3RjkiLCJpc3MiOiJuZnQtc3RvcmFnZSIsImlhdCI6MTY2NTI5MTM5NDI3NSwibmFtZSI6ImRlbXVzZSJ9.abZfTRzXNEU1onl-fqHfdsyv1RfPpGsePrDsS3UM3dU' });

import {
  client,
  publish,
  login,
  challenge,
  getProfile,
  authorizedClient,
  hasTransactionBeenIndexed
} from "../pages/api/api";
import { lensHub } from "./api/lens-hub";

export default function Home() {
  // Setup the state for the profiles
  const [profile, setProfile] = useState([]);
  const [address, setAddress] = useState("");
  const [token, setToken] = useState("");
  const profileId = "0xa9a5";

  // Get the recommended profiles
  const fetchProfile = async (id) => {
    const returnedProfile = await client
      .query(getProfile, { id: profileId })
      .toPromise();
    console.log(returnedProfile.data.profiles.items[0]);
    // setProfiles([returnedProfile.data.profile]);
    setProfile(returnedProfile.data.profiles.items[0]);
  };

  const authenticate = async () => {
    const provider = new ethers.providers.Web3Provider(window.ethereum);

    await provider.send("eth_requestAccounts", []);
    const signer = provider.getSigner();
    const addr = await signer.getAddress();
    const response = await client.query(challenge(addr)).toPromise();
    const messageToSign = response.data.challenge.text;
    const signature = await signer.signMessage(messageToSign);

    console.log("calling login");
    const response2 = await client.mutation(login(addr, signature)).toPromise();

    await fetchProfile();

    setToken(response2.data.authenticate.accessToken);
    setAddress(addr);
  };
   const storeAsBlob = async (json) => {
    const encodedJson = new TextEncoder().encode(JSON.stringify(json));
    const blob = new Blob([encodedJson], {
      type: "application/json;charset=utf-8",
    });
    const file = new File([blob], "metadata.json");
    const cid = await nftStorage.storeBlob(file);
    return "ipfs://" + cid;
  };

  const post = async () => {
    const cl = authorizedClient(token);

        
    const ipfsResult = await storeAsBlob({
      "version": "2.0.0",
      "mainContentFocus": "TEXT_ONLY",
      "metadata_id": "b9254eb7-a95d-48e4-a2d4-6caf27b6ace1",
      "description": "I want to make money out of my music :( :(",
      "locale": "en-US",
      "content": "Content",
      "name": "Name",
      "attributes": [],
      "tags": ["demuse_post"],
      "appId": "api_examples_github"
    });
    console.log('create post: ipfs result', ipfsResult);

    const published = await cl.mutation(publish(profileId, ipfsResult)).toPromise();
    console.log("publish", published.data);
    console.log(published.data);

    // await signCreatePostTypedData()
    return published.data.createPostTypedData;
    // await fetchProfile();
  };

  const omit = (object, name) => {
    return omitDeep(object, name);
  };

  const splitSignature = (signature) => {
    return ethers.utils.splitSignature(signature);
  };

  const signedTypeData = async (domain, types, value) => {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    const signer = provider.getSigner();
    // remove the __typedname from the signature!
    return signer._signTypedData(
      omit(domain, "__typename"),
      omit(types, "__typename"),
      omit(value, "__typename")
    );
  };
  const hasTxBeenIndexed = async (request) => {
    const result = await authorizedClient(token)
      .query(hasTransactionBeenIndexed(request))
      .toPromise();
    console.log(result.data);
    return result.data.hasTxHashBeenIndexed;
  };

  const pollUntilIndexed = async (input) => {
    while (true) {
      const response = await hasTxBeenIndexed(input);
      console.log("pool until indexed: result", response);

      if (response.__typename === "TransactionIndexedResult") {
        console.log("pool until indexed: indexed", response.indexed);
        console.log(
          "pool until metadataStatus: metadataStatus",
          response.metadataStatus
        );

        console.log(response.metadataStatus);
        if (response.metadataStatus) {
          if (response.metadataStatus.status === "SUCCESS") {
            return response;
          }

          if (response.metadataStatus.status === "METADATA_VALIDATION_FAILED") {
            throw new Error(response.metadataStatus.status);
          }
        } else {
          if (response.indexed) {
            return response;
          }
        }

        console.log(
          "pool until indexed: sleep for 1500 milliseconds then try again"
        );
        // sleep for a second before trying again
        await new Promise((resolve) => setTimeout(resolve, 1500));
      } else {
        // it got reverted and failed!
        throw new Error(response.reason);
      }
    }
  };
  const signCreatePostTypedData = async (request) => {
    const result = await post();
    console.log("create post: createPostTypedData", result);

    const typedData = result.typedData;
    console.log("create post: typedData", typedData);

    const signature = await signedTypeData(
      typedData.domain,
      typedData.types,
      typedData.value
    );
    console.log("create post: signature", signature);

    const signedResult = { result, signature };

    console.log("create post: signedResult", signedResult);

    const { v, r, s } = splitSignature(signedResult.signature);
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    const signer = provider.getSigner();

    const tx = await lensHub(signer).postWithSig({
      profileId: typedData.value.profileId,
      contentURI: typedData.value.contentURI,
      collectModule: typedData.value.collectModule,
      collectModuleInitData: typedData.value.collectModuleInitData,
      referenceModule: typedData.value.referenceModule,
      referenceModuleInitData: typedData.value.referenceModuleInitData,
      sig: {
        v,
        r,
        s,
        deadline: typedData.value.deadline,
      },
    });
    console.log("create post: tx hash", tx.hash);

    console.log("create post: poll until indexed");
    const indexedResult = await pollUntilIndexed(tx.hash);

    console.log("create post: profile has been indexed");

    const logs = indexedResult.txReceipt.logs;

    console.log("create post: logs", logs);

    const topicId = ethers.utils.id(
      "PostCreated(uint256,uint256,string,address,bytes,address,bytes,uint256)"
    );
    console.log("topicid we care about", topicId);

    const profileCreatedLog = logs.find((l) => l.topics[0] === topicId);
    console.log("create post: created log", profileCreatedLog);

    let profileCreatedEventLog = profileCreatedLog.topics;
    console.log("create post: created event logs", profileCreatedEventLog);

    const publicationId = ethers.utils.defaultAbiCoder.decode(
      ["uint256"],
      profileCreatedEventLog[2]
    )[0];

    console.log(
      "create post: contract publication id",
      publicationId
    );
    console.log(
      "create post: internal publication id",
      profileId + "-" + publicationId
    );
  };

  // Run the fetchProfiles function when the component is mounted
  useEffect(() => {}, []);

  // Render the component
  return (
    <div className="">
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
      <div className="grid grid-cols-2 divide-x">
        <button onClick={authenticate}>Login</button>
        <button onClick={signCreatePostTypedData}>Post</button>
      </div>
      <div className="grid grid-cols-2 divide-x">
        {profile && profile.picture && (
          <div className="grid grid-cols-2 divide-x">
            <div>
              <img src={profile.picture.original.url}></img>
            </div>
            <div>
              <p>Handle: {profile.handle}</p>
              <p>Name: {profile.name}</p>
              <p>Bio: {profile.bio}</p>
              {console.log(profile.picture.original.url)}
              {/* {console.log(profile.picture.original.url)} */}
              {/* <p>Pic: {profile.picture.original.url}</p> */}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
