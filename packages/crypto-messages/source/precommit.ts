import { Contracts } from "@mainsail/contracts";

export class Precommit implements Contracts.Crypto.IPrecommit {
	#height: number;
	#round: number;
	#blockId: string | undefined;
	#validatorIndex: number;
	#signature: string;

	constructor({ height, round, blockId, validatorIndex, signature }: Contracts.Crypto.IPrecommitData) {
		this.#height = height;
		this.#round = round;
		this.#blockId = blockId;
		this.#validatorIndex = validatorIndex;
		this.#signature = signature;
	}

	get type(): Contracts.Crypto.MessageType {
		return Contracts.Crypto.MessageType.Precommit;
	}

	get height(): number {
		return this.#height;
	}

	get round(): number {
		return this.#round;
	}

	get blockId(): string | undefined {
		return this.#blockId;
	}

	get validatorIndex(): number {
		return this.#validatorIndex;
	}

	get signature(): string {
		return this.#signature;
	}

	toString(): string {
		return JSON.stringify({
			blockId: this.#blockId,
			height: this.#height,
			round: this.#round,
			signature: this.#signature,
			validatorIndex: this.#validatorIndex,
		});
	}

	toSignatureData(): Contracts.Crypto.ISignaturePrecommitData {
		return {
			blockId: this.#blockId,
			height: this.#height,
			round: this.#round,
			type: this.type,
		};
	}

	toData(): Contracts.Crypto.IPrecommitData {
		return {
			blockId: this.#blockId,
			height: this.#height,
			round: this.#round,
			signature: this.#signature,
			type: this.type,
			validatorIndex: this.#validatorIndex,
		};
	}
}
