import { EnvironmentVariables } from "@mainsail/constants";
import { describe } from "@mainsail/test-runner";

let bust = 0;
const load = async (): Promise<any> => (await import(`./defaults.js?bust=${bust++}`)).defaults;

const envKeys = [
	EnvironmentVariables.MAINSAIL_API_EVM_DISABLED,
	EnvironmentVariables.MAINSAIL_API_EVM_HOST,
	EnvironmentVariables.MAINSAIL_API_EVM_PORT,
	EnvironmentVariables.MAINSAIL_API_EVM_RATE_LIMIT_BLACKLIST,
	EnvironmentVariables.MAINSAIL_API_EVM_RATE_LIMIT_DISABLED,
	EnvironmentVariables.MAINSAIL_API_EVM_RATE_LIMIT_USER_EXPIRES,
	EnvironmentVariables.MAINSAIL_API_EVM_RATE_LIMIT_USER_LIMIT,
	EnvironmentVariables.MAINSAIL_API_EVM_RATE_LIMIT_WHITELIST,
	EnvironmentVariables.MAINSAIL_API_EVM_SSL,
	EnvironmentVariables.MAINSAIL_API_EVM_SSL_CERT,
	EnvironmentVariables.MAINSAIL_API_EVM_SSL_HOST,
	EnvironmentVariables.MAINSAIL_API_EVM_SSL_KEY,
	EnvironmentVariables.MAINSAIL_API_EVM_SSL_PORT,
	EnvironmentVariables.MAINSAIL_API_EVM_TRUST_PROXY,
];

describe<{ snapshot: Record<string, string | undefined> }>("Defaults", ({ assert, it, beforeEach, afterEach }) => {
	beforeEach((context) => {
		context.snapshot = {};
		for (const key of envKeys) {
			context.snapshot[key] = process.env[key];
			delete process.env[key];
		}
	});

	afterEach((context) => {
		for (const key of envKeys) {
			if (context.snapshot[key] === undefined) {
				delete process.env[key];
			} else {
				process.env[key] = context.snapshot[key];
			}
		}
	});

	it("provides the built-in defaults when no environment variables are set", async () => {
		const defaults = await load();

		assert.equal(defaults, {
			plugins: {
				rateLimit: {
					blacklist: [],
					duration: 60,
					enabled: true,
					points: 150,
					whitelist: [],
				},
				socketTimeout: 5000,
				trustProxy: false,
				whitelist: ["*"],
			},
			server: {
				http: {
					enabled: true,
					host: "127.0.0.1",
					port: 4008,
				},
				https: {
					enabled: false,
					host: "127.0.0.1",
					port: 8446,
					tls: {
						cert: undefined,
						key: undefined,
					},
				},
			},
		});
	});

	it("disables the http server when MAINSAIL_API_EVM_DISABLED is set", async () => {
		process.env[EnvironmentVariables.MAINSAIL_API_EVM_DISABLED] = "true";

		const defaults = await load();

		assert.false(defaults.server.http.enabled);
	});

	it("enables the https server when MAINSAIL_API_EVM_SSL is set", async () => {
		process.env[EnvironmentVariables.MAINSAIL_API_EVM_SSL] = "true";

		const defaults = await load();

		assert.true(defaults.server.https.enabled);
	});

	it("enables trustProxy when MAINSAIL_API_EVM_TRUST_PROXY is set", async () => {
		process.env[EnvironmentVariables.MAINSAIL_API_EVM_TRUST_PROXY] = "true";

		const defaults = await load();

		assert.true(defaults.plugins.trustProxy);
	});

	it("disables the rate limit when MAINSAIL_API_EVM_RATE_LIMIT_DISABLED is set", async () => {
		process.env[EnvironmentVariables.MAINSAIL_API_EVM_RATE_LIMIT_DISABLED] = "true";

		const defaults = await load();

		assert.false(defaults.plugins.rateLimit.enabled);
	});

	it('treats the value "1" as true for boolean flags', async () => {
		process.env[EnvironmentVariables.MAINSAIL_API_EVM_DISABLED] = "1";
		process.env[EnvironmentVariables.MAINSAIL_API_EVM_SSL] = "1";
		process.env[EnvironmentVariables.MAINSAIL_API_EVM_TRUST_PROXY] = "1";
		process.env[EnvironmentVariables.MAINSAIL_API_EVM_RATE_LIMIT_DISABLED] = "1";

		const defaults = await load();

		assert.false(defaults.server.http.enabled);
		assert.true(defaults.server.https.enabled);
		assert.true(defaults.plugins.trustProxy);
		assert.false(defaults.plugins.rateLimit.enabled);
	});

	it("does not treat other values as true for boolean flags", async () => {
		process.env[EnvironmentVariables.MAINSAIL_API_EVM_DISABLED] = "yes";

		const defaults = await load();

		assert.true(defaults.server.http.enabled);
	});

	it("reads the http host and port from the environment as strings", async () => {
		process.env[EnvironmentVariables.MAINSAIL_API_EVM_HOST] = "0.0.0.0";
		process.env[EnvironmentVariables.MAINSAIL_API_EVM_PORT] = "1234";

		const defaults = await load();

		assert.equal(defaults.server.http.host, "0.0.0.0");
		assert.equal(defaults.server.http.port, "1234");
	});

	it("reads the ssl host, port, cert and key from the environment", async () => {
		process.env[EnvironmentVariables.MAINSAIL_API_EVM_SSL_HOST] = "example.com";
		process.env[EnvironmentVariables.MAINSAIL_API_EVM_SSL_PORT] = "9999";
		process.env[EnvironmentVariables.MAINSAIL_API_EVM_SSL_CERT] = "/path/to/cert";
		process.env[EnvironmentVariables.MAINSAIL_API_EVM_SSL_KEY] = "/path/to/key";

		const defaults = await load();

		assert.equal(defaults.server.https.host, "example.com");
		assert.equal(defaults.server.https.port, "9999");
		assert.equal(defaults.server.https.tls.cert, "/path/to/cert");
		assert.equal(defaults.server.https.tls.key, "/path/to/key");
	});

	it("reads the rate limit duration and points from the environment", async () => {
		process.env[EnvironmentVariables.MAINSAIL_API_EVM_RATE_LIMIT_USER_EXPIRES] = "120";
		process.env[EnvironmentVariables.MAINSAIL_API_EVM_RATE_LIMIT_USER_LIMIT] = "300";

		const defaults = await load();

		assert.equal(defaults.plugins.rateLimit.duration, "120");
		assert.equal(defaults.plugins.rateLimit.points, "300");
	});

	it("comma-splits the rate limit blacklist and whitelist", async () => {
		process.env[EnvironmentVariables.MAINSAIL_API_EVM_RATE_LIMIT_BLACKLIST] = "1.1.1.1,2.2.2.2";
		process.env[EnvironmentVariables.MAINSAIL_API_EVM_RATE_LIMIT_WHITELIST] = "3.3.3.3,4.4.4.4";

		const defaults = await load();

		assert.equal(defaults.plugins.rateLimit.blacklist, ["1.1.1.1", "2.2.2.2"]);
		assert.equal(defaults.plugins.rateLimit.whitelist, ["3.3.3.3", "4.4.4.4"]);
	});
});
