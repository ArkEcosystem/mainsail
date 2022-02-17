import "jest-extended";

import { Container } from "@arkecosystem/core-kernel";
import { Sandbox } from "@packages/core-test-framework/source";
import { LastForgedBlockRemoteAction } from "@packages/core-forger/source/process-actions/last-forged-block";

let sandbox: Sandbox;
let action: LastForgedBlockRemoteAction;

const mockBlock = {
	data: {
		id: "123",
	},
};

const mockForgerService = {
	getLastForgedBlock: jest.fn().mockReturnValue(mockBlock),
};

beforeEach(() => {
	sandbox = new Sandbox();

	sandbox.app.bind(Container.Identifiers.ForgerService).toConstantValue(mockForgerService);

	action = sandbox.app.resolve(LastForgedBlockRemoteAction);
});

describe("LastForgedBlockProcessAction", () => {
	it("should return last forged block", async () => {
		await expect(action.handler()).resolves.toEqual(mockBlock.data);
	});
});
