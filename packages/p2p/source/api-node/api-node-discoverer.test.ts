import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import dayjs from "dayjs";

import { ApiNodeDiscoverer } from "./api-node-discoverer";
import { normalizeUrl } from "../utils/index.js";

describe<{
	discoverer: ApiNodeDiscoverer;
	apiNodeRepository: any;
	apiNodeProcessor: any;
	communicator: any;
	configuration: any;
	logger: any;
}>("ApiNodeDiscoverer", ({ it, beforeEach, spy }) => {
	const peer = { ip: "1.2.3.4" };

	beforeEach((context) => {
		context.apiNodeRepository = { getApiNodes: () => [] };
		context.apiNodeProcessor = { revalidateApiNode: async () => {}, validateAndAcceptApiNode: async () => {} };
		context.communicator = { getApiNodes: async () => ({ apiNodes: [] }) };
		context.configuration = { getOptional: (key: string, defaultValue: unknown) => defaultValue };
		context.logger = { debug: () => {}, warn: () => {} };

		const app = new Application();
		app.bind(Identifiers.ServiceProvider.Configuration)
			.toConstantValue(context.configuration)
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

	it("#discoverApiNodes - should skip a non-public advertised url without dropping the rest", async ({
		discoverer,
		communicator,
		apiNodeProcessor,
		logger,
	}) => {
		communicator.getApiNodes = async () => ({
			apiNodes: [
				{ url: "http://10.0.0.5:4003/" },
				{ url: "http://1.2.3.4:4003/" },
				{ url: "http://localhost:4003/" },
				{ url: "http://[::1]:4003/" },
				{ url: "https://api.example.com/api" },
			],
		});
		const validateAndAcceptApiNode = spy(apiNodeProcessor, "validateAndAcceptApiNode");
		const debug = spy(logger, "debug");

		await discoverer.discoverApiNodes(peer);

		validateAndAcceptApiNode.calledTimes(2);
		validateAndAcceptApiNode.calledWith({ url: "http://1.2.3.4:4003/" }, {});
		validateAndAcceptApiNode.calledWith({ url: "https://api.example.com/api" }, {});
		debug.calledTimes(3);
	});

	it("#populateApiNodesFromConfiguration - should seed every configured node, private ones included", async ({
		discoverer,
		configuration,
		apiNodeProcessor,
	}) => {
		configuration.getOptional = () => [
			"http://10.0.0.5:4003",
			"http://localhost:4003/",
			"https://api.example.com/api/",
		];
		const validateAndAcceptApiNode = spy(apiNodeProcessor, "validateAndAcceptApiNode");

		await discoverer.populateApiNodesFromConfiguration();

		validateAndAcceptApiNode.calledTimes(3);
		validateAndAcceptApiNode.calledWith({ url: "http://10.0.0.5:4003/" }, { seed: true });
		validateAndAcceptApiNode.calledWith({ url: "http://localhost:4003/" }, { seed: true });
		validateAndAcceptApiNode.calledWith({ url: "https://api.example.com/api" }, { seed: true });
	});

	it("#populateApiNodesFromConfiguration - should warn about and skip a configured url the factory rejects", async ({
		discoverer,
		configuration,
		apiNodeProcessor,
		logger,
	}) => {
		configuration.getOptional = () => ["ws://1.2.3.4:4003/", "http://1.2.3.4:4003/", "http://1.2.3.4:99999/"];
		const validateAndAcceptApiNode = spy(apiNodeProcessor, "validateAndAcceptApiNode");
		const warn = spy(logger, "warn");

		await discoverer.populateApiNodesFromConfiguration();

		validateAndAcceptApiNode.calledOnce();
		validateAndAcceptApiNode.calledWith({ url: "http://1.2.3.4:4003/" }, { seed: true });
		warn.calledTimes(2);
		warn.calledWith("Skipping configured API node: Invalid API Node url: ws://1.2.3.4:4003/", "p2p");
		warn.calledWith("Skipping configured API node: Invalid API Node url: http://1.2.3.4:99999/", "p2p");
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
