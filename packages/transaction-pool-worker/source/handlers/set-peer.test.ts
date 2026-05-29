import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";

import { describe } from "@mainsail/test-runner";
import { SetPeerHandler } from "./set-peer";

describe<{
	app: Application;
	handler: SetPeerHandler;
	peerRepository: any;
}>("SetPeerHandler", ({ beforeEach, it, spy }) => {
	beforeEach((context) => {
		context.peerRepository = { setPeer: () => {} };

		context.app = new Application();
		context.app.bind(Identifiers.TransactionPool.Peer.Repository).toConstantValue(context.peerRepository);

		context.handler = context.app.resolve(SetPeerHandler);
	});

	it("sets the peer by ip", async ({ handler, peerRepository }) => {
		const setPeer = spy(peerRepository, "setPeer");

		await handler.handle("127.0.0.1");

		setPeer.calledOnce();
		setPeer.calledWith("127.0.0.1");
	});
});
