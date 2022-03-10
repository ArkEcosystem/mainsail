import { Container } from "@arkecosystem/core-container";
import { Application } from "@arkecosystem/core-kernel/source/application";
import { dirSync, setGracefulCleanup } from "tmp";

import { describe } from "../../core-test-framework";
import { dummyWebhook } from "../test/fixtures/assets";
import { Database } from "./database";
import { InternalIdentifiers } from "./identifiers";
import { Webhook } from "./interfaces";

describe<{
	database: Database;
}>("Database", ({ beforeEach, afterEach, it, assert }) => {
	beforeEach((context) => {
		const app = new Application(new Container());
		app.bind("path.cache").toConstantValue(dirSync().name);

		app.bind<Database>(InternalIdentifiers.Database).to(Database).inSingletonScope();

		const database = app.get<Database>(InternalIdentifiers.Database);
		database.boot();

		context.database = database;
	});

	afterEach(() => {
		setGracefulCleanup();
	});

	it("should boot second time", ({ database }) => {
		database.boot();
	});

	it("should return all webhooks", ({ database }) => {
		database.create(dummyWebhook);

		assert.length(database.all(), 1);
	});

	it("should has a webhook by its id", ({ database }) => {
		const webhook = database.create(dummyWebhook);

		assert.true(database.hasById(webhook.id));
	});

	it("should find a webhook by its id", ({ database }) => {
		const webhook = database.create(dummyWebhook);

		assert.equal(database.findById(webhook.id), webhook);
	});

	it("should return undefined if webhook not found", ({ database }) => {
		assert.undefined(database.findById(dummyWebhook.id));
	});

	it("should find webhooks by their event", ({ database }) => {
		const webhook: Webhook = database.create(dummyWebhook);

		const rows = database.findByEvent("event");

		assert.length(rows, 1);
		assert.equal(rows[0], webhook);
	});

	it("should return an empty array if there are no webhooks for an event", ({ database }) => {
		assert.length(database.findByEvent("event"), 0);
	});

	it("should create a new webhook", ({ database }) => {
		const webhook: Webhook = database.create(dummyWebhook);

		assert.equal(database.create(webhook), webhook);
	});

	it("should update an existing webhook", ({ database }) => {
		const webhook: Webhook = database.create(dummyWebhook);
		const updated: Webhook = database.update(webhook.id, dummyWebhook);

		assert.equal(database.findById(webhook.id), updated);
	});

	it("should delete an existing webhook", ({ database }) => {
		const webhook: Webhook = database.create(dummyWebhook);

		assert.equal(database.findById(webhook.id), webhook);

		database.destroy(webhook.id);

		assert.undefined(database.findById(webhook.id));
	});
});
