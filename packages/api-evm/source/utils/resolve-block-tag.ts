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
			return stateStore.getHeight();
		}
		default: {
			throw new Error("invalid blockTag:" + tag);
		}
	}
};
