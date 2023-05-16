export class Prevote {
	#height: number;
	#round: number;
	#blockId: string | undefined;
	#signature: string;

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
