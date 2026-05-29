import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";

import { describe } from "@mainsail/test-runner";
import { ForgetPeerHandler } from "./forget-peer";

describe<{
	app: Application;
	peerRepository: any;
}>("ForgetPeerHandler", ({ beforeEach, it, spy }) => {
	beforeEach((context) => {
		context.peerRepository = { forgetPeer: () => {} };

		context.app = new Application();
		context.app.bind(Identifiers.TransactionPool.Peer.Repository).toConstantValue(context.peerRepository);
	});

	it("forgets the peer by ip", async (context) => {
		const forgetPeer = spy(context.peerRepository, "forgetPeer");

		await context.app.resolve(ForgetPeerHandler).handle("127.0.0.1");

		forgetPeer.calledOnce();
		forgetPeer.calledWith("127.0.0.1");
	});
});
