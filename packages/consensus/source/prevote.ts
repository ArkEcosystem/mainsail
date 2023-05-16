export class Prevote {
	#height: number;
	#round: number;
	#blockId: string | undefined;
	#signature: string;

	constructor(height: number, round: number, blockId: string | undefined, signature: string) {
		this.#height = height;
		this.#round = round;
		this.#blockId = blockId;
		this.#signature = signature;
	}

	toString(): string {
		return JSON.stringify({
			blockId: this.#blockId,
			height: this.#height,
			round: this.#round,
		});
	}

	toData(): { blockId: string | undefined; height: number; round: number; signature: string } {
		return {
			blockId: this.#blockId,
			height: this.#height,
			round: this.#round,
			signature: this.#signature,
		};
	}
}
