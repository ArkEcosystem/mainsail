import type { Dayjs } from "dayjs";

export interface State {
	resetLastMessageTime(): void;
	getLastMessageTime(): Dayjs;
}
