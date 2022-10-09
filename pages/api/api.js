import { createClient } from "urql";

const API_URL = "https://api.lens.dev";

// Setup the client to use the API_URL as the base URL
export const client = createClient({
  url: API_URL,
});

export const authorizedClient = (token) => createClient({
	url: API_URL,
	fetchOptions: {
		headers: {
		  Authorization: token,
		  Accept: 'application/vnd.github.packages-preview+json',
		},
	}
  });
// Get the recommended profiles
export const getProfiles = `
query RecommendedProfiles {
	recommendedProfiles {
	      id
	    name
	    bio
	    attributes {
	      displayType
	      traitType
	      key
	      value
	    }
	      followNftAddress
	    metadata
	    isDefault
	    picture {
	      ... on NftImage {
		contractAddress
		tokenId
		uri
		verified
	      }
	      ... on MediaSet {
		original {
		  url
		  mimeType
		}
	      }
	      __typename
	    }
	    handle
	    coverPicture {
	      ... on NftImage {
		contractAddress
		tokenId
		uri
		verified
	      }
	      ... on MediaSet {
		original {
		  url
		  mimeType
		}
	      }
	      __typename
	    }
	    ownedBy
	    dispatcher {
	      address
	      canUseRelay
	    }
	    stats {
	      totalFollowers
	      totalFollowing
	      totalPosts
	      totalComments
	      totalMirrors
	      totalPublications
	      totalCollects
	    }
	    followModule {
	      ... on FeeFollowModuleSettings {
		type
		amount {
		  asset {
		    symbol
		    name
		    decimals
		    address
		  }
		  value
		}
		recipient
	      }
	      ... on ProfileFollowModuleSettings {
	       type
	      }
	      ... on RevertFollowModuleSettings {
	       type
	      }
	    }
	}
      }
`;

export const getProfile = `
query Profiles($id: ProfileId!) {
	profiles(request: { profileIds: [$id], limit: 25 }) {
	  items {
	    id
	    name
	    bio
	    attributes {
	      displayType
	      traitType
	      key
	      value
	    }
	    metadata
	    isDefault
	    picture {
	      ... on NftImage {
		contractAddress
		tokenId
		uri
		verified
	      }
	      ... on MediaSet {
		original {
		  url
		  mimeType
		}
	      }
	      __typename
	    }
	    handle
	    coverPicture {
	      ... on NftImage {
		contractAddress
		tokenId
		uri
		verified
	      }
	      ... on MediaSet {
		original {
		  url
		  mimeType
		}
	      }
	      __typename
	    }
	    ownedBy
	    dispatcher {
	      address
	      canUseRelay
	    }
	    stats {
	      totalFollowers
	      totalFollowing
	      totalPosts
	      totalComments
	      totalMirrors
	      totalPublications
	      totalCollects
	    }
	  }
	  pageInfo {
	    prev
	    next
	    totalCount
	  }
	}
      }
`;

export const getPublications = `
  query Publications($id: ProfileId!, $limit: LimitScalar) {
    publications(request: {
      profileId: $id,
      publicationTypes: [POST],
      limit: $limit
    }) {
      items {
        __typename 
        ... on Post {
          ...PostFields
        }
      }
    }
  }
  fragment PostFields on Post {
    id
    metadata {
      ...MetadataOutputFields
    }
    createdAt
  }
  fragment MetadataOutputFields on MetadataOutput {
    name
    description
    content
    media {
      original {
        ...MediaFields
      }
    }
    attributes {
      displayType
      traitType
      value
    }
  }
  fragment MediaFields on Media {
    url
    mimeType
  }
`;

export const challenge = (address) => `query Challenge {
	challenge(request: { address: "${address}" }) {
	  text
	}
  }
  `	
export const login = (address, signature) => `mutation Authenticate {
	authenticate(request: {
	  address: "${address}",
	  signature: "${signature}"
	}) {
	  accessToken
	  refreshToken
	}
  }  
`;
export const publish = (profileId, contentURI) => `mutation CreatePostTypedData {
	createPostTypedData(request: {
	  profileId: "${profileId}",
	  contentURI: "${contentURI}",
	  collectModule: {
		revertCollectModule: true
	  },
	  referenceModule: {
		followerOnlyReferenceModule: false
	  }
	}) {
	  id
	  expiresAt
	  typedData {
		types {
		  PostWithSig {
			name
			type
		  }
		}
		domain {
		  name
		  chainId
		  version
		  verifyingContract
		}
		value {
		  nonce
		  deadline
		  profileId
		  contentURI
		  collectModule
		  collectModuleInitData
		  referenceModule
		  referenceModuleInitData
		}
	  }
	}
  }
`;

export const hasTransactionBeenIndexed = (txHash) => `query HasTxHashBeenIndexed {
	hasTxHashBeenIndexed(request: { txHash: "${txHash}" }) {
	  ... on TransactionIndexedResult {
		indexed
		txReceipt {
		  to
		  from
		  contractAddress
		  transactionIndex
		  root
		  gasUsed
		  logsBloom
		  blockHash
		  transactionHash
		  blockNumber
		  confirmations
		  cumulativeGasUsed
		  effectiveGasPrice
		  byzantium
		  type
		  status
		  logs {
			blockNumber
			blockHash
			transactionIndex
			removed
			address
			data
			topics
			transactionHash
			logIndex
		  }
		}
		metadataStatus {
		  status
		  reason
		}
	  }
	  ... on TransactionError {
		reason
		txReceipt {
		  to
		  from
		  contractAddress
		  transactionIndex
		  root
		  gasUsed
		  logsBloom
		  blockHash
		  transactionHash
		  blockNumber
		  confirmations
		  cumulativeGasUsed
		  effectiveGasPrice
		  byzantium
		  type
		  status
		  logs {
			blockNumber
			blockHash
			transactionIndex
			removed
			address
			data
			topics
			transactionHash
			logIndex
		  }
		}
	  },
	  __typename
	}
  }
`;