import { Identifiers } from "@mainsail/constants";
import { Application, Providers } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import dns from "dns";
import { AnySchema } from "joi";

import { defaults } from "./defaults";
import { ServiceProvider } from "./service-provider";

describe<{
	app: Application;
	serviceProvider: ServiceProvider;
}>("ServiceProvider", ({ it, beforeEach, assert, stub }) => {
	beforeEach((context) => {
		context.app = new Application();
		context.app.bind(Identifiers.Services.Log.Service).toConstantValue({ error: () => {}, info: () => {} });

		context.serviceProvider = context.app.resolve(ServiceProvider);
	});

	it("should register", async ({ serviceProvider }) => {
		await assert.resolves(() => serviceProvider.register());
	});

	it("should boot and execute the checker", async ({ app, serviceProvider }) => {
		app.bind(Identifiers.ServiceProvider.Configuration).toConstantValue({ getRequired: () => ["8.8.8.8"] });

		const lookupService = stub(dns, "lookupService").callsFake((host, port, callback: any) =>
			callback(null, "dns.google", "domain"),
		);

		await assert.resolves(() => serviceProvider.boot());

		lookupService.calledOnce();
	});

	it("should throw on boot when no host is reachable", async ({ app, serviceProvider }) => {
		app.bind(Identifiers.ServiceProvider.Configuration).toConstantValue({ getRequired: () => ["8.8.8.8"] });

		stub(dns, "lookupService").callsFake((host, port, callback: any) => callback(new Error("unreachable")));

		await assert.rejects(
			() => serviceProvider.boot(),
			"Please check your DNS connectivity, couldn't connect to any host.",
		);
	});

	it("should validate schema using defaults", ({ serviceProvider }) => {
		const result = (serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.undefined(result.error);
		assert.equal(result.value.hosts, defaults.hosts);
	});

	it("should allow configuration extension", ({ serviceProvider }) => {
		const result = (serviceProvider.configSchema() as AnySchema).validate({
			...defaults,
			customField: "dummy",
		});

		assert.undefined(result.error);
		assert.equal(result.value.customField, "dummy");
	});

	it("hosts is required && is array", ({ serviceProvider }) => {
		let result = (serviceProvider.configSchema() as AnySchema).validate({ hosts: false });

		assert.equal(result.error.message, '"hosts" must be an array');

		result = (serviceProvider.configSchema() as AnySchema).validate({});

		assert.equal(result.error.message, '"hosts" is required');
	});

	it("hosts items must be IP addresses", ({ serviceProvider }) => {
		let result = (serviceProvider.configSchema() as AnySchema).validate({ hosts: ["8.8.8.8", "::1"] });

		assert.undefined(result.error);

		result = (serviceProvider.configSchema() as AnySchema).validate({ hosts: ["dns.google"] });

		assert.defined(result.error);

		result = (serviceProvider.configSchema() as AnySchema).validate({ hosts: [53] });

		assert.defined(result.error);
	});
});
