import { EventDispatcher as EventDispatcherContract, EventListener, EventName } from "../../../contracts/kernel/events";
import { injectable } from "../../../ioc";

@injectable()
export class NullEventDispatcher implements EventDispatcherContract {
	public listen(event: EventName, listener: EventListener): () => void {
		return () => {};
	}

	public listenMany(events: Array<[EventName, EventListener]>): Map<EventName, () => void> {
		const map: Map<EventName, () => void> = new Map<EventName, () => void>();
		for (const [name] of events) {
			map.set(name, () => {});
		}
		return map;
	}

	public listenOnce(name: EventName, listener: EventListener): void {
		//
	}

	public forget(event: EventName, listener?: EventListener): void {}

	public forgetMany(events: EventName[] | Array<[EventName, EventListener]>): void {
		//
	}

	public flush(): void {
		//
	}

	public getListeners(event?: EventName): EventListener[] {
		return [];
	}

	public hasListeners(event: EventName): boolean {
		return false;
	}

	public countListeners(event?: EventName): number {
		return 0;
	}

	public async dispatch<T = any>(event: EventName, data?: T): Promise<void> {
		//
	}

	public async dispatchSeq<T = any>(event: EventName, data?: T): Promise<void> {
		//
	}

	public dispatchSync<T = any>(event: EventName, data?: T): void {
		//
	}

	public async dispatchMany<T = any>(events: Array<[EventName, T]>): Promise<void> {
		//
	}

	public async dispatchManySeq<T = any>(events: Array<[EventName, T]>): Promise<void> {
		//
	}

	public dispatchManySync<T = any>(events: Array<[EventName, T]>): void {
		//
	}
}
