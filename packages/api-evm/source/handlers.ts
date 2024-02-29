import Hapi from "@hapi/hapi";

export = {
	name: "EVM API",
	async register(server: Hapi.Server): Promise<void> {
		const handlers: { register: (server: Hapi.Server) => {} }[] = [];

		for (const handler of handlers) {
			handler.register(server);
		}
	},
	version: "1.0.0",
};
