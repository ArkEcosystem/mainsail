import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import dayjs from "dayjs";

import { ApiNodeDiscoverer } from "./api-node-discoverer";
import { normalizeUrl } from "./utils/index.js";

describe<{
	discoverer: ApiNodeDiscoverer;
	apiNodeRepository: any;
	apiNodeProcessor: any;
	communicator: any;
	logger: any;
}>("ApiNodeDiscoverer", ({ it, beforeEach, spy }) => {
	const peer = { ip: "1.2.3.4" };

	beforeEach((context) => {
		context.apiNodeRepository = { getApiNodes: () => [] };
		context.apiNodeProcessor = { revalidateApiNode: async () => {}, validateAndAcceptApiNode: async () => {} };
		context.communicator = { getApiNodes: async () => ({ apiNodes: [] }) };
		context.logger = { debug: () => {} };

		const app = new Application();
		app.bind(Identifiers.ServiceProvider.Configuration)
			.toConstantValue({ getOptional: (key: string, defaultValue: unknown) => defaultValue })
			.whenTagged("plugin", "p2p");
		app.bind(Identifiers.P2P.ApiNode.Factory).toConstantValue((url: string) => ({ url: normalizeUrl(url) }));
		app.bind(Identifiers.P2P.ApiNode.Processor).toConstantValue(context.apiNodeProcessor);
		app.bind(Identifiers.P2P.Peer.Communicator).toConstantValue(context.communicator);
		app.bind(Identifiers.P2P.ApiNode.Repository).toConstantValue(context.apiNodeRepository);
		app.bind(Identifiers.P2P.Peer.Repository).toConstantValue({ getPeers: () => [peer] });
		app.bind(Identifiers.Services.Log.Service).toConstantValue(context.logger);

		context.discoverer = app.resolve(ApiNodeDiscoverer);
	});

	it("#discoverApiNodes - should hand every advertised node to the processor", async ({
		discoverer,
		communicator,
		apiNodeProcessor,
	}) => {
		const apiNodes = [{ url: "http://1.2.3.4:4003/" }, { url: "http://5.6.7.8:4003/" }];
		communicator.getApiNodes = async () => ({ apiNodes });
		const validateAndAcceptApiNode = spy(apiNodeProcessor, "validateAndAcceptApiNode");

		await discoverer.discoverApiNodes(peer);

		validateAndAcceptApiNode.calledTimes(2);
		validateAndAcceptApiNode.calledWith({ url: "http://1.2.3.4:4003/" }, {});
		validateAndAcceptApiNode.calledWith({ url: "http://5.6.7.8:4003/" }, {});
	});

	it("#discoverApiNodes - should hand the factory-normalized url to the processor", async ({
		discoverer,
		communicator,
		apiNodeProcessor,
	}) => {
		communicator.getApiNodes = async () => ({ apiNodes: [{ url: "http://1.2.3.4:4003/api/?x=1#frag" }] });
		const validateAndAcceptApiNode = spy(apiNodeProcessor, "validateAndAcceptApiNode");

		await discoverer.discoverApiNodes(peer);

		validateAndAcceptApiNode.calledOnce();
		validateAndAcceptApiNode.calledWith({ url: "http://1.2.3.4:4003/api" }, {});
	});

	it("#discoverApiNodes - should skip an advertised url the factory rejects", async ({
		discoverer,
		communicator,
		apiNodeProcessor,
		logger,
	}) => {
		communicator.getApiNodes = async () => ({
			apiNodes: [{ url: "http://" }, { url: "ftp://1.2.3.4/" }, { url: "http://5.6.7.8:4003/" }],
		});
		const validateAndAcceptApiNode = spy(apiNodeProcessor, "validateAndAcceptApiNode");
		const debug = spy(logger, "debug");

		await discoverer.discoverApiNodes(peer);

		validateAndAcceptApiNode.calledOnce();
		validateAndAcceptApiNode.calledWith({ url: "http://5.6.7.8:4003/" }, {});
		debug.calledTimes(2);
	});

	it("#discoverApiNodes - should swallow a failed request", async ({
		discoverer,
		communicator,
		apiNodeProcessor,
	}) => {
		communicator.getApiNodes = async () => {
			throw new Error("boom");
		};
		const validateAndAcceptApiNode = spy(apiNodeProcessor, "validateAndAcceptApiNode");

		await discoverer.discoverApiNodes(peer);

		validateAndAcceptApiNode.neverCalled();
	});

	it("#refreshApiNodes - should revalidate nodes that were never pinged or were pinged long ago", async ({
		discoverer,
		apiNodeRepository,
		apiNodeProcessor,
	}) => {
		const neverPinged = { url: "http://1.1.1.1:4003/" };
		const pingedLongAgo = { lastPinged: dayjs().subtract(11, "minutes"), url: "http://2.2.2.2:4003/" };
		const pingedRecently = { lastPinged: dayjs().subtract(1, "minute"), url: "http://3.3.3.3:4003/" };
		apiNodeRepository.getApiNodes = () => [neverPinged, pingedLongAgo, pingedRecently];
		const revalidateApiNode = spy(apiNodeProcessor, "revalidateApiNode");

		await discoverer.refreshApiNodes();

		revalidateApiNode.calledTimes(2);
		revalidateApiNode.calledWith(neverPinged);
		revalidateApiNode.calledWith(pingedLongAgo);
	});
});
