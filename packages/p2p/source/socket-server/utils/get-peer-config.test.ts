import { Identifiers } from "@mainsail/contracts";
import { describe } from "../../../../test-framework";

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
			{ options: {}, package: "@mainsail/api" },
			{ package: "@mainsail/webhooks" },
			{ package: "@mainsail/p2p" },
		];

		coreApiServiceProvider = {
			config: () => ({
				all: () => coreApiServiceProviderConfiguration,
			}),
			name: () => "api",
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
			name: () => "webhooks",
		};
		coreP2PServiceProvider = {
			config: () => ({
				all: () => ({}),
			}),
			name: () => "p2p",
		};
		serviceProviders = {
			"@mainsail/api": coreApiServiceProvider,
			"@mainsail/p2p": coreP2PServiceProvider,
			"@mainsail/webhooks": coreWebhooksServiceProvider,
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
				"@mainsail/api": {
					enabled: true,
					// estimateTotalCount: true,
					port: 4003,
				},
				"@mainsail/webhooks": {
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

		delete result.plugins["@mainsail/api"];
		assert.equal(getPeerConfig(app), result);
	});

	it("should omit a plugin if it is storing the [port] in the [options] key", () => {
		coreApiServiceProviderConfiguration = {
			enabled: true,
			options: {
				port: 4003,
			},
		};

		delete result.plugins["@mainsail/api"];
		assert.equal(getPeerConfig(app), result);
	});

	it("should omit a plugin if it is storing the [port] in the [server] object", () => {
		coreApiServiceProviderConfiguration = {
			enabled: true,
			server: {
				port: 4003,
			},
		};

		delete result.plugins["@mainsail/api"];
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

		result.plugins["@mainsail/api"].enabled = false;
		assert.equal(getPeerConfig(app), result);
	});
});
