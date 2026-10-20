import { Validator } from "@mainsail/validation/source/validator";

import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { makeFormats } from "./formats";

describe<{
	validator: Validator;
	app: Application;
}>("format", ({ it, assert, beforeEach }) => {
	beforeEach((context) => {
		context.app = new Application();
		context.validator = context.app.resolve(Validator);

		const formats = makeFormats();

		context.validator.addFormat("validPeer", formats.validPeer);
		context.validator.addFormat("publicHttpUrl", formats.publicHttpUrl);
	});

	it("#peer - should be ok", (context) => {
		const schema = {
			$id: "test",
			format: "validPeer",
			type: "string",
		};
		context.validator.addSchema(schema);

		assert.undefined(context.validator.validate("test", "192.168.178.0").error);
		assert.undefined(context.validator.validate("test", "5.196.105.32").error);
	});

	it("#peer - should not be ok", (context) => {
		const schema = {
			$id: "test",
			format: "validPeer",
			type: "string",
		};
		context.validator.addSchema(schema);

		assert.defined(context.validator.validate("test", "aaaa").error);
		assert.defined(context.validator.validate("test", "127.0.0.1").error);
		assert.defined(context.validator.validate("test", null).error);
		assert.defined(context.validator.validate("test", {}).error);
		assert.defined(context.validator.validate("test").error);
	});

	it("#publicHttpUrl - should be ok", (context) => {
		const schema = {
			$id: "test",
			format: "publicHttpUrl",
			type: "string",
		};
		context.validator.addSchema(schema);

		for (const url of [
			"http://1.2.3.4:4003/",
			"https://1.2.3.4/api",
			"http://[2606:4700::1111]:4003/",
			"https://api.example.com/api",
			"http://example",
			"http://node.local/",
			"http://node.internal/",
		]) {
			assert.undefined(context.validator.validate("test", url).error, url);
		}
	});

	it("#publicHttpUrl - should not be ok", (context) => {
		const schema = {
			$id: "test",
			format: "publicHttpUrl",
			type: "string",
		};
		context.validator.addSchema(schema);

		for (const url of [
			"",
			"not a url",
			"1.2.3.4:4003",
			// wrong scheme
			"ftp://1.2.3.4/",
			"ws://1.2.3.4:4003/",
			"file:///etc/passwd",
			"javascript:alert(1)",
			"data:text/plain,hi",
			"mailto:a@b.c",
			// localhost
			"http://localhost:4003/",
			"http://api.localhost/",
			// non-public ip literals
			"http://127.0.0.1:4003/",
			"http://10.0.0.5:4003/",
			"http://172.16.0.1/",
			"http://192.168.1.1/",
			"http://169.254.169.254/latest/meta-data",
			"http://100.64.0.1/",
			"http://0.0.0.0:4003/",
			"http://224.0.0.1/",
			"http://[::1]:4003/",
			"http://[::]/",
			"http://[fe80::1]/",
			"http://[fd00::1]/",
			"http://[::ffff:10.0.0.1]/",
			"http://[2001:db8::1]/",
		]) {
			assert.defined(context.validator.validate("test", url).error, url);
		}

		assert.defined(context.validator.validate("test", null).error);
		assert.defined(context.validator.validate("test", {}).error);
		assert.defined(context.validator.validate("test").error);
	});
});
