import type { IBls } from "@chainsafe/bls/types";

/* c8 ignore start */
import { getImplementation } from "@chainsafe/bls/getImplementation";

let _bls: IBls | undefined;
export const getBls = async (): Promise<IBls> => {
	if (!_bls) {
		const runtime = globalThis.process?.release?.name ?? "browser";
		if (runtime === "node") {
			_bls = await getImplementation("blst-native");
		} else {
			_bls = await getImplementation("herumi");
		}
	}

	return _bls;
};
/* c8 ignore stop */
