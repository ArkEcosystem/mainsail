import { Contracts } from "@mainsail/contracts";

export const isRecipientOnActiveNetwork = (
	recipientId: string,
	base58,
	configuration: Contracts.Crypto.Configuration,
): boolean => base58.decodeCheck(recipientId).readUInt8(0) === configuration.get("network.pubKeyHash");
