import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import { Providers } from "@arkecosystem/core-kernel";
import { describe, Sandbox } from "../../core-test-framework";
import importFresh from "import-fresh";

import { defaults } from "./defaults";
import { Peer } from "./peer";
import { ServiceProvider } from "./service-provider";

describe<{
	sandbox: Sandbox;
	serviceProvider: ServiceProvider;
}>("ServiceProvider", ({ it, assert, beforeEach, stub }) => {
	const triggerService = { bind: () => {} };
	const validator = { addFormat: () => {} };
	const server = { boot: async () => {}, dispose: async () => {}, initialize: async () => {} };

	beforeEach((context) => {
		context.sandbox = new Sandbox();

		context.sandbox.app.bind(Identifiers.TriggerService).toConstantValue(triggerService);
		context.sandbox.app.bind(Identifiers.Cryptography.Validator).toConstantValue(validator);

		context.serviceProvider = context.sandbox.app.resolve(ServiceProvider);
	});

	it("#register - should register", async ({ serviceProvider }) => {
		await assert.resolves(() => serviceProvider.register());
	});

	it("#bootWhen - should return false when process.env.DISABLE_P2P_SERVER", async ({ serviceProvider }) => {
		process.env.DISABLE_P2P_SERVER = "true";
		assert.false(await serviceProvider.bootWhen());

		delete process.env.DISABLE_P2P_SERVER;
	});

	it("#bootWhen - should return true when !process.env.DISABLE_P2P_SERVER", async ({ serviceProvider }) => {
		assert.true(await serviceProvider.bootWhen());
	});

	it("#boot - should call the server boot method", async ({ sandbox, serviceProvider }) => {
		const peerEventListener = { initialize: () => {} };

		const spyPeerEventListenerInitialize = stub(peerEventListener, "initialize");
		const spyServerInitialize = stub(server, "initialize");
		const spyServerBoot = stub(server, "boot");

		sandbox.app.bind(Identifiers.PeerEventListener).toConstantValue(peerEventListener);
		sandbox.app.bind(Identifiers.P2PServer).toConstantValue(server);

		const config = sandbox.app.resolve(Providers.PluginConfiguration).from("", defaults);
		serviceProvider.setConfig(config);

		await serviceProvider.boot();

		spyPeerEventListenerInitialize.calledOnce();
		spyServerInitialize.calledOnce();
		spyServerBoot.calledOnce();
	});

	it("#dispose - should call the server dispose method when process.env.DISABLE_P2P_SERVER is undefined", async ({
		sandbox,
		serviceProvider,
	}) => {
		const spyServerDispose = stub(server, "dispose");
		sandbox.app.bind(Identifiers.P2PServer).toConstantValue(server);

		await serviceProvider.dispose();

		spyServerDispose.calledOnce();
	});

	it("#dispose - should not call the server dispose method when process.env.DISABLE_P2P_SERVER = true", async ({
		sandbox,
		serviceProvider,
	}) => {
		const spyServerDispose = stub(server, "dispose");
		sandbox.app.bind(Identifiers.P2PServer).toConstantValue(server);

		process.env.DISABLE_P2P_SERVER = "true";
		await serviceProvider.dispose();

		spyServerDispose.neverCalled();

		delete process.env.DISABLE_P2P_SERVER; // reset to initial undefined value
	});

	it("#required - should return true", async ({ serviceProvider }) => {
		assert.true(await serviceProvider.required());
	});

	it("#peerFactory - should create a peer with integer port number, when using string config", async ({
		sandbox,
		serviceProvider,
	}) => {
		const config = sandbox.app.resolve(Providers.PluginConfiguration).from("", defaults);
		serviceProvider.setConfig(config);
		await serviceProvider.register();

		const ip = "188.133.1.2";
		const peer = sandbox.app.get<Contracts.P2P.PeerFactory>(Identifiers.PeerFactory)(ip);

		assert.instance(peer, Peer);
		assert.number(peer.port);
		assert.equal(peer.port, 4002);
	});
});

describe<{
	sandbox: Sandbox;
	serviceProvider: ServiceProvider;
}>("ServiceProvider.configSchema", ({ it, assert, beforeEach }) => {
	const importDefaults = () => importFresh<any>("../distribution/defaults.js").defaults;

	const triggerService = { bind: () => {} };
	const validator = { addFormat: () => {} };

	beforeEach((context) => {
		context.sandbox = new Sandbox();

		context.sandbox.app.bind(Identifiers.TriggerService).toConstantValue(triggerService);
		context.sandbox.app.bind(Identifiers.Cryptography.Validator).toConstantValue(validator);

		context.serviceProvider = context.sandbox.app.resolve(ServiceProvider);

		for (const key of Object.keys(process.env)) {
			if (key.includes("CORE_P2P_")) {
				delete process.env[key];
			}
		}
	});

	it("should validate schema using defaults", ({ serviceProvider }) => {
		const defaults = importDefaults();

		const result = serviceProvider.configSchema().validate(defaults);

		assert.undefined(result.error);

		assert.array(result.value.blacklist);
		assert.number(result.value.getBlocksTimeout);
		assert.number(result.value.maxPeerSequentialErrors);
		assert.number(result.value.maxPeersBroadcast);
		assert.number(result.value.maxSameSubnetPeers);
		assert.number(result.value.minimumNetworkReach);
		assert.array(result.value.minimumVersions);
		assert.number(result.value.rateLimit);
		assert.number(result.value.rateLimitPostTransactions);
		assert.array(result.value.remoteAccess);
		assert.string(result.value.server.hostname);
		assert.number(result.value.server.logLevel);
		assert.number(result.value.server.port);
		assert.number(result.value.verifyTimeout);
		assert.array(result.value.whitelist);
	});

	it("should allow configuration extension", async ({ serviceProvider }) => {
		const defaults = importDefaults();

		defaults.customField = "dummy";

		const result = serviceProvider.configSchema().validate(defaults);

		assert.undefined(result.error);
		assert.equal(result.value.customField, "dummy");
	});

	it("should parse process.env.CORE_P2P_HOST", async ({ serviceProvider }) => {
		process.env.CORE_P2P_HOST = "127.0.0.1";

		const result = serviceProvider.configSchema().validate(importDefaults());

		assert.undefined(result.error);
		assert.equal(result.value.server.hostname, "127.0.0.1");
	});

	it("should throw if process.env.CORE_P2P_HOST is not ipv4 or ipv6 address", async ({ serviceProvider }) => {
		process.env.CORE_P2P_HOST = "123";

		const result = serviceProvider.configSchema().validate(importDefaults());

		assert.defined(result.error);
		assert.equal(
			result.error?.message,
			'"server.hostname" must be a valid ip address of one of the following versions [ipv4, ipv6] with a optional CIDR',
		);
	});

	it("should parse process.env.CORE_P2P_PORT", async ({ serviceProvider }) => {
		process.env.CORE_P2P_PORT = "5000";

		const result = serviceProvider.configSchema().validate(importDefaults());

		assert.undefined(result.error);
		assert.equal(result.value.server.port, 5000);
	});

	it("should throw if process.env.CORE_P2P_PORT is not number", async ({ serviceProvider }) => {
		process.env.CORE_P2P_PORT = "false";

		const result = serviceProvider.configSchema().validate(importDefaults());

		assert.defined(result.error);
		assert.equal(result.error?.message, '"server.port" must be a number');
	});

	it("should return logLevel = 1 if process.env.CORE_NETWORK_NAME is testnet", async ({ serviceProvider }) => {
		process.env.CORE_NETWORK_NAME = "testnet";

		const result = serviceProvider.configSchema().validate(importDefaults());

		assert.undefined(result.error);
		assert.equal(result.value.server.logLevel, 1);
	});

	it("should return logLevel = 0 if process.env.CORE_NETWORK_NAME is not testnet", async ({ serviceProvider }) => {
		process.env.CORE_NETWORK_NAME = "devnet";

		const result = serviceProvider.configSchema().validate(importDefaults());

		assert.undefined(result.error);
		assert.equal(result.value.server.logLevel, 0);
	});

	it("should parse process.env.CORE_P2P_MIN_NETWORK_REACH", async ({ serviceProvider }) => {
		process.env.CORE_P2P_MIN_NETWORK_REACH = "10";

		const result = serviceProvider.configSchema().validate(importDefaults());

		assert.undefined(result.error);
		assert.equal(result.value.minimumNetworkReach, 10);
	});

	it("should throw if process.env.CORE_P2P_MIN_NETWORK_REACH is not number", async ({ serviceProvider }) => {
		process.env.CORE_P2P_MIN_NETWORK_REACH = "false";

		const result = serviceProvider.configSchema().validate(importDefaults());

		assert.defined(result.error);
		assert.equal(result.error?.message, '"minimumNetworkReach" must be a number');
	});

	it("should parse process.env.CORE_P2P_MAX_PEERS_SAME_SUBNET", async ({ serviceProvider }) => {
		process.env.CORE_P2P_MAX_PEERS_SAME_SUBNET = "5000";

		const result = serviceProvider.configSchema().validate(importDefaults());

		assert.undefined(result.error);
		assert.equal(result.value.maxSameSubnetPeers, 5000);
	});

	it("should throw if process.env.CORE_P2P_MAX_PEERS_SAME_SUBNET is not number", async ({ serviceProvider }) => {
		process.env.CORE_P2P_MAX_PEERS_SAME_SUBNET = "false";

		const result = serviceProvider.configSchema().validate(importDefaults());

		assert.defined(result.error);
		assert.equal(result.error?.message, '"maxSameSubnetPeers" must be a number');
	});

	it("should parse process.env.CORE_P2P_MAX_PEER_SEQUENTIAL_ERRORS", async ({ serviceProvider }) => {
		process.env.CORE_P2P_MAX_PEER_SEQUENTIAL_ERRORS = "5000";

		const result = serviceProvider.configSchema().validate(importDefaults());

		assert.undefined(result.error);
		assert.equal(result.value.maxPeerSequentialErrors, 5000);
	});

	it("should throw if process.env.CORE_P2P_MAX_PEER_SEQUENTIAL_ERRORS is not number", async ({ serviceProvider }) => {
		process.env.CORE_P2P_MAX_PEER_SEQUENTIAL_ERRORS = "false";

		const result = serviceProvider.configSchema().validate(importDefaults());

		assert.defined(result.error);
		assert.equal(result.error?.message, '"maxPeerSequentialErrors" must be a number');
	});

	it("should parse process.env.CORE_P2P_RATE_LIMIT", async ({ serviceProvider }) => {
		process.env.CORE_P2P_RATE_LIMIT = "5000";

		const result = serviceProvider.configSchema().validate(importDefaults());

		assert.undefined(result.error);
		assert.equal(result.value.rateLimit, 5000);
	});

	it("should throw if process.env.CORE_P2P_RATE_LIMIT is not number", async ({ serviceProvider }) => {
		process.env.CORE_P2P_RATE_LIMIT = "false";

		const result = serviceProvider.configSchema().validate(importDefaults());

		assert.defined(result.error);
		assert.equal(result.error?.message, '"rateLimit" must be a number');
	});

	it("should parse process.env.CORE_P2P_RATE_LIMIT_POST_TRANSACTIONS", async ({ serviceProvider }) => {
		process.env.CORE_P2P_RATE_LIMIT_POST_TRANSACTIONS = "5000";

		const result = serviceProvider.configSchema().validate(importDefaults());

		assert.undefined(result.error);
		assert.equal(result.value.rateLimitPostTransactions, 5000);
	});

	it("should throw if process.env.CORE_P2P_RATE_LIMIT_POST_TRANSACTIONS is not number", async ({
		serviceProvider,
	}) => {
		process.env.CORE_P2P_RATE_LIMIT_POST_TRANSACTIONS = "false";

		const result = serviceProvider.configSchema().validate(importDefaults());

		assert.defined(result.error);
		assert.equal(result.error?.message, '"rateLimitPostTransactions" must be a number');
	});

	it("#schemaRestrictions - server is required && is object", async ({ serviceProvider }) => {
		const defaults = importDefaults();
		defaults.server = false;
		let result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"server" must be of type object');

		delete defaults.server;
		result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"server" is required');
	});

	it("#schemaRestrictions - server.hostname is required && is string && is IP address", async ({
		serviceProvider,
	}) => {
		const defaults = importDefaults();
		defaults.server.hostname = false;
		let result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"server.hostname" must be a string');

		defaults.server.hostname = "dummy";
		result = serviceProvider.configSchema().validate(defaults);

		assert.equal(
			result.error?.message,
			'"server.hostname" must be a valid ip address of one of the following versions [ipv4, ipv6] with a optional CIDR',
		);

		delete defaults.server.hostname;
		result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"server.hostname" is required');
	});

	it("#schemaRestrictions - server.port is required && is integer && >= 1 && <= 65535", async ({
		serviceProvider,
	}) => {
		const defaults = importDefaults();
		defaults.server.port = false;
		let result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"server.port" must be a number');

		defaults.server.port = 1.12;
		result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"server.port" must be an integer');

		defaults.server.port = 0;
		result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"server.port" must be greater than or equal to 1');

		defaults.server.port = 65536;
		result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"server.port" must be less than or equal to 65535');

		delete defaults.server.port;
		result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"server.port" is required');
	});

	it("#schemaRestrictions - server.logLevel is required && is integer && >= 0", async ({ serviceProvider }) => {
		const defaults = importDefaults();
		defaults.server.logLevel = false;
		let result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"server.logLevel" must be a number');

		defaults.server.logLevel = 1.12;
		result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"server.logLevel" must be an integer');

		defaults.server.logLevel = -1;
		result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"server.logLevel" must be greater than or equal to 0');

		delete defaults.server.logLevel;
		result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"server.logLevel" is required');
	});

	it("#schemaRestrictions - minimumVersions is required && is array && contains strings", async ({
		serviceProvider,
	}) => {
		const defaults = importDefaults();
		defaults.minimumVersions = false;
		let result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"minimumVersions" must be an array');

		defaults.minimumVersions = [false];
		result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"minimumVersions[0]" must be a string');

		delete defaults.minimumVersions;
		result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"minimumVersions" is required');
	});

	it("#schemaRestrictions - minimumNetworkReach is required && is integer && >= 0", async ({ serviceProvider }) => {
		const defaults = importDefaults();
		defaults.minimumNetworkReach = false;
		let result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"minimumNetworkReach" must be a number');

		defaults.minimumNetworkReach = 1.12;
		result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"minimumNetworkReach" must be an integer');

		defaults.minimumNetworkReach = -1;
		result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"minimumNetworkReach" must be greater than or equal to 0');

		delete defaults.minimumNetworkReach;
		result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"minimumNetworkReach" is required');
	});

	it("#schemaRestrictions - verifyTimeout is required && is integer && >= 0", async ({ serviceProvider }) => {
		const defaults = importDefaults();
		defaults.verifyTimeout = false;
		let result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"verifyTimeout" must be a number');

		defaults.verifyTimeout = 1.12;
		result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"verifyTimeout" must be an integer');

		defaults.verifyTimeout = -1;
		result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"verifyTimeout" must be greater than or equal to 0');

		delete defaults.verifyTimeout;
		result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"verifyTimeout" is required');
	});

	it("#schemaRestrictions - getBlocksTimeout is required && is integer && >= 0", async ({ serviceProvider }) => {
		const defaults = importDefaults();
		defaults.getBlocksTimeout = false;
		let result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"getBlocksTimeout" must be a number');

		defaults.getBlocksTimeout = 1.12;
		result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"getBlocksTimeout" must be an integer');

		defaults.getBlocksTimeout = -1;
		result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"getBlocksTimeout" must be greater than or equal to 0');

		delete defaults.getBlocksTimeout;
		result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"getBlocksTimeout" is required');
	});

	it("#schemaRestrictions - maxPeersBroadcast is required && is integer && >= 0", async ({ serviceProvider }) => {
		const defaults = importDefaults();
		defaults.maxPeersBroadcast = false;
		let result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"maxPeersBroadcast" must be a number');

		defaults.maxPeersBroadcast = 1.12;
		result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"maxPeersBroadcast" must be an integer');

		defaults.maxPeersBroadcast = -1;
		result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"maxPeersBroadcast" must be greater than or equal to 0');

		delete defaults.maxPeersBroadcast;
		result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"maxPeersBroadcast" is required');
	});

	it("#schemaRestrictions - maxSameSubnetPeers is required && is integer && >= 0", async ({ serviceProvider }) => {
		const defaults = importDefaults();
		defaults.maxSameSubnetPeers = false;
		let result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"maxSameSubnetPeers" must be a number');

		defaults.maxSameSubnetPeers = 1.12;
		result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"maxSameSubnetPeers" must be an integer');

		defaults.maxSameSubnetPeers = -1;
		result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"maxSameSubnetPeers" must be greater than or equal to 0');

		delete defaults.maxSameSubnetPeers;
		result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"maxSameSubnetPeers" is required');
	});

	it("#schemaRestrictions - maxPeerSequentialErrors is required && is integer && >= 0", async ({
		serviceProvider,
	}) => {
		const defaults = importDefaults();
		defaults.maxPeerSequentialErrors = false;
		let result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"maxPeerSequentialErrors" must be a number');

		defaults.maxPeerSequentialErrors = 1.12;
		result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"maxPeerSequentialErrors" must be an integer');

		defaults.maxPeerSequentialErrors = -1;
		result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"maxPeerSequentialErrors" must be greater than or equal to 0');

		delete defaults.maxPeerSequentialErrors;
		result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"maxPeerSequentialErrors" is required');
	});

	it("#schemaRestrictions - whitelist is required && is array && contains strings", async ({ serviceProvider }) => {
		const defaults = importDefaults();
		defaults.whitelist = false;
		let result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"whitelist" must be an array');

		defaults.whitelist = [false];
		result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"whitelist[0]" must be a string');

		delete defaults.whitelist;
		result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"whitelist" is required');
	});

	it("#schemaRestrictions - blacklist is required && is array && contains strings", async ({ serviceProvider }) => {
		const defaults = importDefaults();
		defaults.blacklist = false;
		let result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"blacklist" must be an array');

		defaults.blacklist = [false];
		result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"blacklist[0]" must be a string');

		delete defaults.blacklist;
		result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"blacklist" is required');
	});

	it("#schemaRestrictions - remoteAccess is required && is array && contains IP addresses", async ({
		serviceProvider,
	}) => {
		const defaults = importDefaults();
		defaults.remoteAccess = false;
		let result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"remoteAccess" must be an array');

		defaults.remoteAccess = [false];
		result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"remoteAccess[0]" must be a string');

		defaults.remoteAccess = ["dummy"];
		result = serviceProvider.configSchema().validate(defaults);

		assert.equal(
			result.error?.message,
			'"remoteAccess[0]" must be a valid ip address of one of the following versions [ipv4, ipv6] with a optional CIDR',
		);

		delete defaults.remoteAccess;
		result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"remoteAccess" is required');
	});

	it("#schemaRestrictions - rateLimit is required && is integer && >= 0", async ({ serviceProvider }) => {
		const defaults = importDefaults();
		defaults.rateLimit = false;
		let result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"rateLimit" must be a number');

		defaults.rateLimit = 1.12;
		result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"rateLimit" must be an integer');

		defaults.rateLimit = 0;
		result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"rateLimit" must be greater than or equal to 1');

		delete defaults.rateLimit;
		result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"rateLimit" is required');
	});

	it("#schemaRestrictions - rateLimitPostTransactions is required && is integer && >= 0", async ({
		serviceProvider,
	}) => {
		const defaults = importDefaults();
		defaults.rateLimitPostTransactions = false;
		let result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"rateLimitPostTransactions" must be a number');

		defaults.rateLimitPostTransactions = 1.12;
		result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"rateLimitPostTransactions" must be an integer');

		defaults.rateLimitPostTransactions = 0;
		result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"rateLimitPostTransactions" must be greater than or equal to 1');

		delete defaults.rateLimitPostTransactions;
		result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"rateLimitPostTransactions" is required');
	});

	it("#schemaRestrictions - networkStart is optional && is boolean", async ({ serviceProvider }) => {
		const defaults = importDefaults();
		defaults.networkStart = 123;
		let result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"networkStart" must be a boolean');

		delete defaults.networkStart;
		result = serviceProvider.configSchema().validate(defaults);

		assert.undefined(result.error);
	});

	it("#schemaRestrictions - disableDiscovery is optional && is boolean", async ({ serviceProvider }) => {
		const defaults = importDefaults();
		defaults.disableDiscovery = 123;
		let result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"disableDiscovery" must be a boolean');

		delete defaults.disableDiscovery;
		result = serviceProvider.configSchema().validate(defaults);

		assert.undefined(result.error);
	});

	it("#schemaRestrictions - skipDiscovery is optional && is boolean", async ({ serviceProvider }) => {
		const defaults = importDefaults();
		defaults.skipDiscovery = 123;
		let result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"skipDiscovery" must be a boolean');

		delete defaults.skipDiscovery;
		result = serviceProvider.configSchema().validate(defaults);

		assert.undefined(result.error);
	});

	it("#schemaRestrictions - ignoreMinimumNetworkReach is optional && is boolean", async ({ serviceProvider }) => {
		const defaults = importDefaults();
		defaults.ignoreMinimumNetworkReach = 123;
		let result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"ignoreMinimumNetworkReach" must be a boolean');

		delete defaults.ignoreMinimumNetworkReach;
		result = serviceProvider.configSchema().validate(defaults);

		assert.undefined(result.error);
	});
});
