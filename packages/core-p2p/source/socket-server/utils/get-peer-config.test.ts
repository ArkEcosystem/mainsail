import { Identifiers } from "@arkecosystem/core-contracts";
import { describe } from "@arkecosystem/core-test-framework";

import { getPeerConfig } from "./get-peer-config";

describe("getPeerConfig", ({ it, assert, beforeEach }) => {
	let mockConfig;
	let configuration;
	let version;
	let appPlugins;
	let coreApiServiceProviderConfiguration;
	let coreApiServiceProvider;
	let coreWebhooksServiceProvider;
	let coreP2PServiceProvider;
	let serviceProviders;
	let app;
	let result;

	beforeEach(() => {
		mockConfig = {
			"network.client.explorer": "explorer.thechain.com",
			"network.client.symbol": "TCH",
			"network.client.token": "TCHAIN",
			"network.name": "thechain",
			"network.nethash": "nethahs",
			"network.pubKeyHash": "pubkyhash",
		};
		configuration = {
			get: (key) => mockConfig[key],
		};

		version = "3.0.9";
		appPlugins = [
			{ options: {}, package: "@arkecosystem/core-api" },
			{ package: "@arkecosystem/core-webhooks" },
			{ package: "@arkecosystem/core-p2p" },
		];

		coreApiServiceProvider = {
			config: () => ({
				all: () => coreApiServiceProviderConfiguration,
			}),
			name: () => "core-api",
		};
		coreWebhooksServiceProvider = {
			config: () => ({
				all: () => ({
					enabled: true,
					server: {
						http: {
							port: 4004,
						},
					},
				}),
			}),
			name: () => "core-webhooks",
		};
		coreP2PServiceProvider = {
			config: () => ({
				all: () => ({}),
			}),
			name: () => "core-p2p",
		};
		serviceProviders = {
			"@arkecosystem/core-api": coreApiServiceProvider,
			"@arkecosystem/core-p2p": coreP2PServiceProvider,
			"@arkecosystem/core-webhooks": coreWebhooksServiceProvider,
		};
		const configRepository = { get: () => appPlugins }; // get("app.plugins")
		const serviceProviderRepository = { get: (plugin) => serviceProviders[plugin] };
		const appGet = {
			[Identifiers.Cryptography.Configuration]: configuration,
			[Identifiers.ConfigRepository]: configRepository,
			[Identifiers.ServiceProviderRepository]: serviceProviderRepository,
		};

		app = {
			get: (key) => appGet[key],
			version: () => version,
		};

		result = {
			network: {
				explorer: mockConfig["network.client.explorer"],
				name: mockConfig["network.name"],
				nethash: mockConfig["network.nethash"],
				token: {
					name: mockConfig["network.client.token"],
					symbol: mockConfig["network.client.symbol"],
				},
				version: mockConfig["network.pubKeyHash"],
			},
			plugins: {
				"@arkecosystem/core-api": {
					enabled: true,
					// estimateTotalCount: true,
					port: 4003,
				},
				"@arkecosystem/core-webhooks": {
					enabled: true,
					port: 4004,
				},
			},
			version,
		};
	});

	it("should omit a plugin if it is storing the [port] at the root of the options", () => {
		coreApiServiceProviderConfiguration = {
			enabled: true,
			port: 4003,
		};

		delete result.plugins["@arkecosystem/core-api"];
		assert.equal(getPeerConfig(app), result);
	});

	it("should omit a plugin if it is storing the [port] in the [options] key", () => {
		coreApiServiceProviderConfiguration = {
			enabled: true,
			options: {
				port: 4003,
			},
		};

		delete result.plugins["@arkecosystem/core-api"];
		assert.equal(getPeerConfig(app), result);
	});

	it("should omit a plugin if it is storing the [port] in the [server] object", () => {
		coreApiServiceProviderConfiguration = {
			enabled: true,
			server: {
				port: 4003,
			},
		};

		delete result.plugins["@arkecosystem/core-api"];
		assert.equal(getPeerConfig(app), result);
	});

	it("should accept a plugin if it is storing the [port] in the [server.http] object", () => {
		coreApiServiceProviderConfiguration = {
			enabled: true,
			options: {
				estimateTotalCount: true,
			},
			server: {
				http: {
					port: 4003,
				},
			},
		};

		assert.equal(getPeerConfig(app), result);
	});

	it("should accept a plugin if it is storing the [port] in the [server.https] object", () => {
		coreApiServiceProviderConfiguration = {
			enabled: true,
			options: {
				estimateTotalCount: true,
			},
			server: {
				https: {
					port: 4003,
				},
			},
		};

		assert.equal(getPeerConfig(app), result);
	});

	it("should return plugins enabled value if enabled property is listed in configuration", () => {
		coreApiServiceProviderConfiguration = {
			enabled: false,
			options: {
				estimateTotalCount: true,
			},
			server: {
				http: {
					port: 4003,
				},
			},
		};

		result.plugins["@arkecosystem/core-api"].enabled = false;
		assert.equal(getPeerConfig(app), result);
	});
});
