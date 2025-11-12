import { Enums } from "@mainsail/constants";

import { describe } from "../../../test-framework/source";
import { getPeerUrl } from "./get-peer-url";

describe("getPeerUrl", ({ each, assert }) => {
	each(
		"should return peer url",
		({ dataset, context }) => {
			assert.equal(getPeerUrl(dataset[0]), dataset[1]);
		},
		[
			[{ ip: "127.0.0.1", port: 80, protocol: Enums.Api.Protocol.Http }, "http://127.0.0.1:80"],
			[{ ip: "127.0.0.1", port: 443, protocol: Enums.Api.Protocol.Https }, "https://127.0.0.1:443"],
			[{ ip: "127.0.0.1", port: 5555, protocol: Enums.Api.Protocol.Https }, "https://127.0.0.1:5555"],
			// port 80 and 443 overwrite explicit protocol
			[{ ip: "127.0.0.1", port: 80, protocol: Enums.Api.Protocol.Https }, "http://127.0.0.1:80"],
			[{ ip: "127.0.0.1", port: 443, protocol: Enums.Api.Protocol.Http }, "https://127.0.0.1:443"],
			// defaults to HTTP if unknown protocol
			[{ ip: "127.0.0.1", port: 80, protocol: 5 }, "http://127.0.0.1:80"],
		],
	);
});
