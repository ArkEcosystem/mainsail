import { injectable } from "@arkecosystem/core-container";
import { Kernel } from "@arkecosystem/core-contracts";

@injectable()
export class NullEventDispatcher implements Kernel.EventDispatcher {
	public listen(event: Kernel.EventName, listener: Kernel.EventListener): () => void {
		return () => {};
	}

	public listenMany(events: Array<[Kernel.EventName, Kernel.EventListener]>): Map<Kernel.EventName, () => void> {
		const map: Map<Kernel.EventName, () => void> = new Map<Kernel.EventName, () => void>();
		for (const [name] of events) {
			map.set(name, () => {});
		}
		return map;
	}

	public listenOnce(name: Kernel.EventName, listener: Kernel.EventListener): void {
		//
	}

	public forget(event: Kernel.EventName, listener?: Kernel.EventListener): void {}

	public forgetMany(events: Kernel.EventName[] | Array<[Kernel.EventName, Kernel.EventListener]>): void {
		//
	}

	public flush(): void {
		//
	}

	public getListeners(event?: Kernel.EventName): Kernel.EventListener[] {
		return [];
	}

	public hasListeners(event: Kernel.EventName): boolean {
		return false;
	}

	public countListeners(event?: Kernel.EventName): number {
		return 0;
	}

	public async dispatch<T = any>(event: Kernel.EventName, data?: T): Promise<void> {
		//
	}

	public async dispatchSeq<T = any>(event: Kernel.EventName, data?: T): Promise<void> {
		//
	}

	public dispatchSync<T = any>(event: Kernel.EventName, data?: T): void {
		//
	}

	public async dispatchMany<T = any>(events: Array<[Kernel.EventName, T]>): Promise<void> {
		//
	}

	public async dispatchManySeq<T = any>(events: Array<[Kernel.EventName, T]>): Promise<void> {
		//
	}

	public dispatchManySync<T = any>(events: Array<[Kernel.EventName, T]>): void {
		//
	}
}
