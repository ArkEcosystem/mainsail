import { ChildProcess } from "child_process";
import { Requests } from "./handler";

export type SuccessReply = {
    id: number;
    result: any;
};

export type ErrorReply = {
    id: number;
    error: string;
};

export type Reply = SuccessReply | ErrorReply;

export type RequestCallback<T, K extends Requests<T>> = {
    // @ts-ignore
    resolve: (result: ReturnType<T[K]>) => void;
    reject: (error: Error) => void;
};

export type RequestCallbacks<T> = RequestCallback<T, Requests<T>>;

export class Subprocess<T> {
    private lastId = 1;
    private readonly subprocess: ChildProcess;
    private readonly callbacks = new Map<number, RequestCallbacks<T>>();

    public constructor(subprocess: ChildProcess) {
        this.subprocess = subprocess;
        this.subprocess.on("message", this.onSubprocessMessage.bind(this));
    }

    public kill(signal?: number | NodeJS.Signals): boolean {
        return this.subprocess.kill(signal);
    }

    public getQueueSize(): number {
        return this.callbacks.size;
    }

    // TODO: use type magic to infer args (didn't work when T is also using same signatures)
    public sendAction(method: string, ...args: any): void {
        // TODO: we have to make sure args are always serializable
        this.subprocess.send({ method, args });
    }

    // TODO: use type magic to infer args (didn't work when T is also using same signatures)
    public sendRequest(method: string, ...args: any): Promise<any> {
        return new Promise((resolve, reject) => {
            const id = this.lastId++;
            this.callbacks.set(id, { resolve, reject });
            // TODO: we have to make sure args are always serializable and ideally don't copy
            this.subprocess.send({ id, method, args });
        });
    }

    private onSubprocessMessage(message: Reply): void {
        try {
            if ("error" in message) {
                this.callbacks.get(message.id)?.reject(new Error(message.error));
            } else {
                this.callbacks.get(message.id)?.resolve(message.result);
            }
        } finally {
            this.callbacks.delete(message.id);
        }
    }
}