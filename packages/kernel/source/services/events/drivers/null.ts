import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

@injectable()
export class NullEventDispatcher implements Contracts.Kernel.EventDispatcher {
	public listen(event: string, listener: Contracts.Kernel.EventListener): () => void {
		return () => {};
	}

	public listenMany(events: Array<[string, Contracts.Kernel.EventListener]>): Map<string, () => void> {
		const map: Map<string, () => void> = new Map<string, () => void>();
		for (const [name] of events) {
			map.set(name, () => {});
		}
		return map;
	}

	public listenOnce(name: string, listener: Contracts.Kernel.EventListener): void {
		//
	}

	public forget(event: string, listener?: Contracts.Kernel.EventListener): void {}

	public forgetMany(events: string[] | Array<[string, Contracts.Kernel.EventListener]>): void {
		//
	}

	public flush(): void {
		//
	}

	public getListeners(event?: string): Contracts.Kernel.EventListener[] {
		return [];
	}

	public hasListeners(event: string): boolean {
		return false;
	}

	public countListeners(event?: string): number {
		return 0;
	}

	public async dispatch<T = any>(event: string, data?: T): Promise<void> {
		//
	}

	public async dispatchSeq<T = any>(event: string, data?: T): Promise<void> {
		//
	}

	public dispatchSync<T = any>(event: string, data?: T): void {
		//
	}

	public async dispatchMany<T = any>(events: Array<[string, T]>): Promise<void> {
		//
	}

	public async dispatchManySeq<T = any>(events: Array<[string, T]>): Promise<void> {
		//
	}

	public dispatchManySync<T = any>(events: Array<[string, T]>): void {
		//
	}
}
