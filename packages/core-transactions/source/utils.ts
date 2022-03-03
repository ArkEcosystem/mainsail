import { Contracts } from "@arkecosystem/core-contracts";

export const isRecipientOnActiveNetwork = (
	recipientId: string,
	base58,
	configuration: Contracts.Crypto.IConfiguration,
): boolean => base58.decodeCheck(recipientId).readUInt8(0) === configuration.get("network.pubKeyHash");
