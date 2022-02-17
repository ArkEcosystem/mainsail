import Hapi from "@hapi/hapi";

import * as Blockchain from "./routes/blockchain";
import * as Node from "./routes/node";
import * as Peers from "./routes/peers";

export = {
	async register(server: Hapi.Server): Promise<void> {
		const handlers = [Blockchain, Node, Peers];

		for (const handler of handlers) {
			handler.register(server);
		}
	},
	name: "Public API",
	version: "2.0.0",
};
