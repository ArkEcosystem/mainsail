import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";

import { describe } from "@mainsail/test-runner";
import { SetPeerHandler } from "./set-peer";

describe<{
	app: Application;
	peerRepository: any;
}>("SetPeerHandler", ({ beforeEach, it, spy }) => {
	beforeEach((context) => {
		context.peerRepository = { setPeer: () => {} };

		context.app = new Application();
		context.app.bind(Identifiers.TransactionPool.Peer.Repository).toConstantValue(context.peerRepository);
	});

	it("sets the peer by ip", async (context) => {
		const setPeer = spy(context.peerRepository, "setPeer");

		await context.app.resolve(SetPeerHandler).handle("127.0.0.1");

		setPeer.calledOnce();
		setPeer.calledWith("127.0.0.1");
	});
});
