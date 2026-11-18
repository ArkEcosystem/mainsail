import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { HeaderHandleReceiveMiddleware } from "./header-handle";

const headers = {
	blockNumber: 7,
	round: 0,
	step: 0,
	validatorsSignedPrecommit: [],
	validatorsSignedPrevote: [],
	version: "1",
};

describe<{
	middleware: HeaderHandleReceiveMiddleware;
	repository: any;
	headerService: any;
	peer: any;
}>("HeaderHandleReceiveMiddleware", ({ it, assert, beforeEach, spy }) => {
	beforeEach((context) => {
		context.peer = { ip: "1.1.1.1" };
		context.repository = { getActivePeer: () => context.peer, hasActivePeer: () => true };
		context.headerService = { handle: () => {} };

		const app = new Application();
		app.bind(Identifiers.P2P.Peer.Repository).toConstantValue(context.repository);
		app.bind(Identifiers.P2P.Header.Service).toConstantValue(context.headerService);

		context.middleware = app.resolve(HeaderHandleReceiveMiddleware);
	});

	it("should hand the request headers of an active peer to the header service", async ({
		middleware,
		headerService,
		peer,
	}) => {
		const handle = spy(headerService, "handle");

		await middleware.before({ connection: { remoteAddress: "1.1.1.1" }, request: { data: { headers } } } as any);

		handle.calledWith(peer, headers);
	});

	it("should ignore requests of peers that are not active and requests without headers", async ({
		middleware,
		repository,
		headerService,
	}) => {
		const handle = spy(headerService, "handle");

		await middleware.before({ connection: { remoteAddress: "1.1.1.1" }, request: { data: {} } } as any);

		repository.hasActivePeer = () => false;
		await middleware.before({ connection: { remoteAddress: "1.1.1.1" }, request: { data: { headers } } } as any);

		handle.neverCalled();
	});
});
