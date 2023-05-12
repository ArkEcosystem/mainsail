import { describe } from "../index";
import { FactoryBuilder } from "./factory-builder";

describe<{
	factoryBuilder: FactoryBuilder;
}>("FactoryBuilder", ({ beforeEach, it, assert }) => {
	beforeEach((context) => {
		context.factoryBuilder = new FactoryBuilder();
	});

	it("should create a new entity", async ({ factoryBuilder }) => {
		factoryBuilder.set("Transaction", async () => ({
			valid: true,
		}));

		assert.equal(await factoryBuilder.get("Transaction").make(), { valid: true });
	});

	it("should create a new entity and apply the mutators", async ({ factoryBuilder }) => {
		factoryBuilder.set("Transaction", async () => ({
			valid: true,
		}));

		factoryBuilder.get("Transaction").state("verified", ({ entity }) => {
			entity.verified = true;

			return entity;
		});

		factoryBuilder.get("Transaction").state("expired", ({ entity }) => {
			entity.expired = true;

			return entity;
		});

		assert.equal(await factoryBuilder.get("Transaction").withStates("verified", "expired").make(), {
			expired: true,
			valid: true,
			verified: true,
		});
	});

	it("should create a new entity and merge the given attributes", async ({ factoryBuilder }) => {
		factoryBuilder.set("Transaction", async () => ({
			valid: true,
		}));

		assert.equal(await factoryBuilder.get("Transaction").withAttributes({ another: "value" }).make(), {
			another: "value",
			valid: true,
		});
	});

	it("should create a new entity and add attributes through a hook", async ({ factoryBuilder }) => {
		factoryBuilder.set("Transaction", async () => ({
			valid: true,
		}));

		factoryBuilder.get("Transaction").afterMaking(({ entity }) => (entity.hooked = true));

		assert.equal(await factoryBuilder.get("Transaction").make(), {
			hooked: true,
			valid: true,
		});
	});

	it("should create a new entity and add attributes through a state hook", async ({ factoryBuilder }) => {
		factoryBuilder.set("Transaction", async () => ({
			valid: true,
		}));

		factoryBuilder.get("Transaction").state("invalid", async () => ({
			valid: false,
		}));

		factoryBuilder.get("Transaction").afterMakingState("invalid", ({ entity }) => (entity.hooked = false));

		assert.equal(await factoryBuilder.get("Transaction").withStates("invalid").make(), {
			hooked: false,
			valid: false,
		});

		factoryBuilder.get("Transaction").afterMakingState("invalid", ({ entity }) => (entity.hooked = true));

		assert.equal(await factoryBuilder.get("Transaction").withStates("invalid").make(), {
			hooked: true,
			valid: false,
		});
	});

	it("should create a new entity and respect the passed in options", async ({ factoryBuilder }) => {
		factoryBuilder.set("Transaction", async ({ options }) => ({
			valid: options.valid,
		}));

		assert.equal(await factoryBuilder.get("Transaction").withOptions({ valid: "no" }).make(), {
			valid: "no",
		});
	});

	it("should create multiple entities", async ({ factoryBuilder }) => {
		factoryBuilder.set("Transaction", async () => ({
			valid: true,
		}));

		assert.equal(
			await factoryBuilder.get("Transaction").makeMany(5),
			Array.from({ length: 5 }).fill({ valid: true }),
		);
	});

	it("should throw if an unknown factory is tried to be accessed", ({ factoryBuilder }) => {
		assert.throws(() => factoryBuilder.get("Transaction"), "The \\[Transaction\\] factory is unknown.");
	});

	it("should throw if a hook is tried to be set for an unknown state", async ({ factoryBuilder }) => {
		factoryBuilder.set("Transaction", async () => ({}));

		assert.throws(
			() => factoryBuilder.get("Transaction").afterMakingState("invalid", () => ({})),
			"The \\[invalid\\] state is unknown.",
		);
	});
});
