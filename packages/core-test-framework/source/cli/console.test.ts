import { Commands, Container } from "@arkecosystem/core-cli";
import Joi from "joi";

import { describe } from "../index";
import { Console } from "./console";

describe("Console", ({ beforeEach, it, assert, spyFn }) => {
	let spyOnGetFlag;
	let spyOnGetFlagToken;
	let spyOnGetFlagNetwork;
	let spyOnGetArgument;

	@Container.injectable()
	class Command extends Commands.Command {
		/**
		 * The console command signature.
		 *
		 * @type {string}
		 * @memberof Command
		 */
		public signature = "core:test";

		/**
		 * The console command description.
		 *
		 * @type {string}
		 * @memberof Command
		 */
		public description = "Test command.";

		/**
		 * Configure the console command.
		 *
		 * @returns {void}
		 * @memberof Command
		 */
		public configure(): void {
			this.definition.setFlag("flagName", "The test message.", Joi.string().default("flagValue"));

			this.definition.setArgument("argumentName", "The test argument.", Joi.string().default("argumentValue"));
		}

		/**
		 * Execute the console command.
		 *
		 * @returns {Promise<void>}
		 * @memberof Command
		 */
		public async execute(): Promise<void> {
			spyOnGetFlag.call(this.getFlag("flagName"));
			spyOnGetFlagToken.call(this.getFlag("token"));
			spyOnGetFlagNetwork.call(this.getFlag("network"));
			spyOnGetArgument.call(this.getArgument("argumentName"));
		}
	}

	beforeEach(() => {
		spyOnGetFlag = spyFn();
		spyOnGetFlagToken = spyFn();
		spyOnGetFlagNetwork = spyFn();
		spyOnGetArgument = spyFn();
	});

	it("should execute - with default flags", async () => {
		const console = new Console();

		await assert.resolves(() => console.execute(Command));
		spyOnGetFlag.calledWith("flagValue");
		spyOnGetFlagToken.calledWith("ark");
		spyOnGetFlagNetwork.calledWith("testnet");
		spyOnGetArgument.calledWith("argumentValue");
	});

	it("should execute with flags - with default flags", async () => {
		const console = new Console();

		await assert.resolves(() => console.withFlags({ flagName: "flag_test" }).execute(Command));
		spyOnGetFlag.calledWith("flag_test");
		spyOnGetFlagToken.calledWith("ark");
		spyOnGetFlagNetwork.calledWith("testnet");
		spyOnGetArgument.calledWith("argumentValue");
	});

	it("should execute with arguments - with default flags", async () => {
		const console = new Console();

		await assert.resolves(() => console.withArgs(["test_arg"]).execute(Command));
		spyOnGetFlag.calledWith("flagValue");
		spyOnGetFlagToken.calledWith("ark");
		spyOnGetFlagNetwork.calledWith("testnet");
		spyOnGetArgument.calledWith("test_arg");
	});

	it("should reject due missing flags - without default flags", async () => {
		const console = new Console(false);

		await assert.rejects(() => console.execute(Command));
		spyOnGetFlag.neverCalled();
	});

	it("should execute with flags - without default flags", async () => {
		const console = new Console(false);

		await assert.resolves(() =>
			console
				.withFlags({ flagName: "flag_test", network: "dummy_network", token: "dummy_token" })
				.execute(Command),
		);

		spyOnGetFlag.calledWith("flag_test");
		spyOnGetFlagToken.calledWith("dummy_token");
		spyOnGetFlagNetwork.calledWith("dummy_network");
		spyOnGetArgument.calledWith("argumentValue");

		it("should execute with arguments - without default flags", async () => {
			const console = new Console(false);

			await assert.resolves(() =>
				console
					.withFlags({ network: "dummy_network", token: "dummy_token" })
					.withArgs(["test_arg"])
					.execute(Command),
			);

			spyOnGetFlag.calledWith("flagValue");
			spyOnGetFlagToken.calledWith("dummy_token");
			spyOnGetFlagNetwork.calledWith("dummy_network");
			spyOnGetArgument.calledWith("test_arg");
		});
	});
});
