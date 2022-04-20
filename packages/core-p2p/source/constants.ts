import { Constants } from "@arkecosystem/core-contracts";

export const constants = {
	// maximum number of blocks we can download at once
	DEFAULT_MAX_PAYLOAD: 20 * Constants.Units.MEGABYTE,
	// default maxPayload value on the server WS socket
	DEFAULT_MAX_PAYLOAD_CLIENT: 100 * Constants.Units.KILOBYTE,
	MAX_DOWNLOAD_BLOCKS: 400, // default maxPayload value on the client WS socket
	MAX_PEERS_GETPEERS: 2000,
};
