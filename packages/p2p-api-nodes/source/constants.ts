export const constants = {
	// The directory is checked this often, at a random point of the range so that the nodes of a network
	// do not all ask at once.
	CHECK_INTERVAL_MAX_MINUTES: 20,
	CHECK_INTERVAL_MIN_MINUTES: 10,

	// Longest API node url we keep, serve to peers or accept from them.
	MAX_API_NODE_URL_LENGTH: 2048,

	// Urls taken from one peer's answer, and nodes told to a peer that asks.
	MAX_API_NODES_PER_PEER: 100,

	// Peers asked for their API nodes in one check.
	PEERS_PER_CHECK: 5,

	// A node is not checked again within this time.
	REVALIDATE_AFTER_MINUTES: 10,

	// Time an API node has to answer a check.
	VERIFY_TIMEOUT: 5000,
};
