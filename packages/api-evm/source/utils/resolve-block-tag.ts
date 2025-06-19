import { Contracts } from "@mainsail/contracts";

export const resolveBlockTag = async (
	stateStore: Contracts.State.Store,
	tag: string | Contracts.Crypto.BlockTag,
): Promise<number> => {
	if (tag.startsWith("0x")) {
		return Number.parseInt(tag);
	}

	switch (tag as Contracts.Crypto.BlockTag) {
		case "finalized":
		case "latest":
		case "safe": {
			return stateStore.getBlockNumber();
		}
		default: {
			throw new Error("invalid blockTag:" + tag);
		}
	}
};

export const getHistoryHeightFromBlockTag = async (
	tag: string | Contracts.Crypto.BlockTag,
): Promise<bigint | undefined> => {
	if (tag.startsWith("0x")) {
		return BigInt(Number.parseInt(tag));
	}

	switch (tag as Contracts.Crypto.BlockTag) {
		case "finalized":
		case "latest":
		case "safe": {
			return undefined; // do not use history
		}
		default: {
			throw new Error("invalid blockTag:" + tag);
		}
	}
};
