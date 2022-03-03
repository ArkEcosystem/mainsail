import { injectable } from "@arkecosystem/core-container";
import { Contracts } from "@arkecosystem/core-contracts";

@injectable()
export class NullEventDispatcher implements Contracts.Kernel.EventDispatcher {
	public listen(event: Contracts.Kernel.EventName, listener: Contracts.Kernel.EventListener): () => void {
		return () => {};
	}

	public listenMany(
		events: Array<[Contracts.Kernel.EventName, Contracts.Kernel.EventListener]>,
	): Map<Contracts.Kernel.EventName, () => void> {
		const map: Map<Contracts.Kernel.EventName, () => void> = new Map<Contracts.Kernel.EventName, () => void>();
		for (const [name] of events) {
			map.set(name, () => {});
		}
		return map;
	}

	public listenOnce(name: Contracts.Kernel.EventName, listener: Contracts.Kernel.EventListener): void {
		//
	}

	public forget(event: Contracts.Kernel.EventName, listener?: Contracts.Kernel.EventListener): void {}

	public forgetMany(
		events: Contracts.Kernel.EventName[] | Array<[Contracts.Kernel.EventName, Contracts.Kernel.EventListener]>,
	): void {
		//
	}

	public flush(): void {
		//
	}

	public getListeners(event?: Contracts.Kernel.EventName): Contracts.Kernel.EventListener[] {
		return [];
	}

	public hasListeners(event: Contracts.Kernel.EventName): boolean {
		return false;
	}

	public countListeners(event?: Contracts.Kernel.EventName): number {
		return 0;
	}

	public async dispatch<T = any>(event: Contracts.Kernel.EventName, data?: T): Promise<void> {
		//
	}

	public async dispatchSeq<T = any>(event: Contracts.Kernel.EventName, data?: T): Promise<void> {
		//
	}

	public dispatchSync<T = any>(event: Contracts.Kernel.EventName, data?: T): void {
		//
	}

	public async dispatchMany<T = any>(events: Array<[Contracts.Kernel.EventName, T]>): Promise<void> {
		//
	}

	public async dispatchManySeq<T = any>(events: Array<[Contracts.Kernel.EventName, T]>): Promise<void> {
		//
	}

	public dispatchManySync<T = any>(events: Array<[Contracts.Kernel.EventName, T]>): void {
		//
	}
}
