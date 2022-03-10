import { Container } from "@arkecosystem/core-container";
import { Identifiers } from "@arkecosystem/core-contracts";
import { Application, Utils } from "@arkecosystem/core-kernel";
import { dirSync, setGracefulCleanup } from "tmp";

import { describe } from "../../core-test-framework/source";
import { dummyWebhook } from "../test/fixtures/assets";
import { conditions } from "./conditions";
import { Database } from "./database";
import { WebhookEvent } from "./events";
import { InternalIdentifiers } from "./identifiers";
import { Webhook } from "./interfaces";
import { Listener } from "./listener";

describe<{
	database: Database;
	listener: Listener;
}>("Listener", ({ beforeEach, afterAll, stub, it, assert }) => {
	let webhook: Webhook;

	const logger = {
		debug: () => {},
		error: () => {},
	};

	const eventDispatcher = {
		dispatch: () => {},
	};

	const expectFinishedEventData = ({ executionTime, webhook, payload }) => {
		assert.number(executionTime);
		assert.object(webhook);
		assert.defined(payload);
	};

	const expectFailedEventData = ({ executionTime, webhook, payload, error }) => {
		assert.number(executionTime);
		assert.object(webhook);
		assert.defined(payload);
		assert.object(error);
	};

	beforeEach((context) => {
		const app = new Application(new Container());
		app.bind("path.cache").toConstantValue(dirSync().name);

		app.bind(Identifiers.EventDispatcherService).toConstantValue(eventDispatcher);
		app.bind<Database>(InternalIdentifiers.Database).to(Database).inSingletonScope();

		app.bind(Identifiers.LogService).toConstantValue(logger);

		context.database = app.get<Database>(InternalIdentifiers.Database);
		context.database.boot();

		context.listener = app.resolve<Listener>(Listener);

		webhook = Object.assign({}, dummyWebhook);
	});

	afterAll(() => {
		setGracefulCleanup();
	});

	it("should broadcast to registered webhooks", async ({ database, listener }) => {
		const spyOnPost = stub(Utils.http, "post").resolvedValue({
			statusCode: 200,
		});
		const spyOnDebug = stub(logger, "debug");
		const spyOnDispatch = stub(eventDispatcher, "dispatch");

		database.create(webhook);

		await listener.handle({ data: "dummy_data", name: "event" });

		spyOnPost.calledOnce();
		spyOnDebug.calledOnce();
		spyOnDispatch.calledOnce();

		const spyOnDispatchArguments = spyOnDispatch.getCallArgs(0);
		assert.equal(spyOnDispatchArguments[0], WebhookEvent.Broadcasted);
		expectFinishedEventData(spyOnDispatchArguments[1]);
	});

	it("should log error if broadcast is not successful", async ({ database, listener }) => {
		const spyOnPost = stub(Utils.http, "post").callsFake(() => {
			throw new Error("dummy error");
		});
		const spyOnError = stub(logger, "error");
		const spyOnDispatch = stub(eventDispatcher, "dispatch");

		database.create(webhook);

		await listener.handle({ data: "dummy_data", name: "event" });

		spyOnPost.calledOnce();
		spyOnError.calledOnce();
		spyOnDispatch.calledOnce();
		const spyOnDispatchArguments = spyOnDispatch.getCallArgs(0);
		assert.equal(spyOnDispatchArguments[0], WebhookEvent.Failed);
		expectFailedEventData(spyOnDispatchArguments[1]);
	});

	it("#should not broadcast if webhook is disabled", async ({ database, listener }) => {
		const spyOnPost = stub(Utils.http, "post");

		webhook.enabled = false;
		database.create(webhook);

		await listener.handle({ data: "dummy_data", name: "event" });

		spyOnPost.neverCalled();
	});

	it("should not broadcast if event is webhook event", async ({ database, listener }) => {
		const spyOnPost = stub(Utils.http, "post");

		database.create(webhook);

		await listener.handle({ data: "dummy_data", name: WebhookEvent.Broadcasted });

		spyOnPost.neverCalled();
	});

	it("should broadcast if webhook condition is satisfied", async ({ database, listener }) => {
		const spyOnPost = stub(Utils.http, "post").resolvedValue({
			statusCode: 200,
		});
		const spyOnDispatch = stub(eventDispatcher, "dispatch");

		webhook.conditions = [
			{
				condition: "eq",
				key: "test",
				value: 1,
			},
		];
		database.create(webhook);

		await listener.handle({ data: { test: 1 }, name: "event" });

		spyOnPost.calledOnce();
		spyOnDispatch.calledOnce();
		const spyOnDispatchArguments = spyOnDispatch.getCallArgs(0);
		assert.equal(spyOnDispatchArguments[0], WebhookEvent.Broadcasted);
		expectFinishedEventData(spyOnDispatchArguments[1]);
	});

	it("should not broadcast if webhook condition is not satisfied", async ({ database, listener }) => {
		const spyOnPost = stub(Utils.http, "post");

		webhook.conditions = [
			{
				condition: "eq",
				key: "test",
				value: 1,
			},
		];
		database.create(webhook);

		await listener.handle({ data: { test: 2 }, name: "event" });

		spyOnPost.neverCalled();
	});

	it("should not broadcast if webhook condition throws error", async ({ database, listener }) => {
		const spyOnEq = stub(conditions, "eq").callsFake(() => {
			throw new Error("dummy error");
		});

		const spyOnPost = stub(Utils.http, "post");

		webhook.conditions = [
			{
				condition: "eq",
				key: "test",
				value: 1,
			},
		];
		database.create(webhook);

		await listener.handle({ data: { test: 2 }, name: "event" });

		spyOnEq.calledOnce();
		spyOnPost.neverCalled();
	});
});
