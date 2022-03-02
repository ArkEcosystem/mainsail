import "jest-extended";

import { CurrentDelegateProcessAction } from "@packages/core-forger/source/process-actions/current-delegate";
import { Sandbox } from "@packages/core-test-framework/source";

let sandbox: Sandbox;
let action: CurrentDelegateProcessAction;

const mockForgerService = {
	getRound: jest.fn().mockReturnValue({
		currentForger: {
			delegate: {
				rank: 10,
				username: "dummy_username",
			},
		},
	}),
};

beforeEach(() => {
	sandbox = new Sandbox();

	sandbox.app.bind(Identifiers.ForgerService).toConstantValue(mockForgerService);

	action = sandbox.app.resolve(CurrentDelegateProcessAction);
});

describe("CurrentDelegateRemoteAction", () => {
	it("should return delegate username and rank", async () => {
		await expect(action.handler()).resolves.toEqual({
			rank: 10,
			username: "dummy_username",
		});
	});
});
