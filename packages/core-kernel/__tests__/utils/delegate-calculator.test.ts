import "jest-extended";

import { Managers, Utils } from "@arkecosystem/crypto";
import { Services } from "@packages/core-kernel";
import { calculateApproval, calculateForgedTotal } from "@packages/core-kernel/source/utils/delegate-calculator";
import { Wallets } from "@packages/core-state";
import { Sandbox } from "@packages/core-test-framework/source";

let sandbox: Sandbox;

beforeAll(() => {
	sandbox = new Sandbox();

	sandbox.app
		.bind<Services.Attributes.AttributeSet>(Identifiers.WalletAttributes)
		.to(Services.Attributes.AttributeSet)
		.inSingletonScope();

	sandbox.app.get<Services.Attributes.AttributeSet>(Identifiers.WalletAttributes).set("delegate");
	sandbox.app.get<Services.Attributes.AttributeSet>(Identifiers.WalletAttributes).set("delegate.voteBalance");

	Managers.configManager.set("genesisBlock.totalAmount", 1_000_000 * 1e8);
});

const createWallet = (address: string): Contracts.State.Wallet =>
	new Wallets.Wallet(
		address,
		new Services.Attributes.AttributeMap(
			sandbox.app.get<Services.Attributes.AttributeSet>(Identifiers.WalletAttributes),
		),
	);

describe("Delegate Calculator", () => {
	describe("calculateApproval", () => {
		it("should calculate correctly with a height", () => {
			const delegate = createWallet("D61xc3yoBQDitwjqUspMPx1ooET6r1XLt7");

			delegate.setAttribute("delegate", {
				producedBlocks: 0,
				voteBalance: Utils.BigNumber.make(10_000 * 1e8),
			});

			expect(calculateApproval(delegate, 1)).toBe(1);
		});

		it("should calculate correctly with default height 1", () => {
			const delegate = createWallet("D61xc3yoBQDitwjqUspMPx1ooET6r1XLt7");

			delegate.setAttribute("delegate", {
				producedBlocks: 0,
				voteBalance: Utils.BigNumber.make(10_000 * 1e8),
			});

			expect(calculateApproval(delegate)).toBe(1);
		});

		it("should calculate correctly with 2 decimals", () => {
			const delegate = createWallet("D61xc3yoBQDitwjqUspMPx1ooET6r1XLt7");

			delegate.setAttribute("delegate", {
				producedBlocks: 0,
				voteBalance: Utils.BigNumber.make(16_500 * 1e8),
			});

			expect(calculateApproval(delegate, 1)).toBe(1.65);
		});
	});

	describe("calculateForgedTotal", () => {
		it("should calculate correctly", () => {
			const delegate = createWallet("D61xc3yoBQDitwjqUspMPx1ooET6r1XLt7");

			delegate.setAttribute("delegate", {
				forgedFees: Utils.BigNumber.make(10),
				forgedRewards: Utils.BigNumber.make(100),
				producedBlocks: 0,
			});

			expect(calculateForgedTotal(delegate)).toBe("110");
		});
	});
});
