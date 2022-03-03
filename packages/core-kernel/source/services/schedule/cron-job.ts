import { inject, injectable } from "@arkecosystem/core-container";
import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import { CronCommand, CronJob as Cron } from "cron";
import { performance } from "perf_hooks";

import { ScheduleEvent } from "../../enums";
import { Job } from "./interfaces";

@injectable()
export class CronJob implements Job {
	@inject(Identifiers.EventDispatcherService)
	private readonly events!: Contracts.Kernel.EventDispatcher;

	protected expression = "* * * * *";

	public execute(callback: CronCommand): void {
		const onCallback: CronCommand = () => {
			const start = performance.now();
			// @ts-ignore
			callback();

			this.events.dispatch(ScheduleEvent.CronJobFinished, {
				executionTime: performance.now() - start,
				expression: this.expression,
			});
		};

		new Cron(this.expression, onCallback).start();
	}

	public cron(expression: string): this {
		this.expression = expression;

		return this;
	}

	public everyMinute(): this {
		return this.setMinute("*");
	}

	public everyFiveMinutes(): this {
		return this.setMinute("*/5");
	}

	public everyTenMinutes(): this {
		return this.setMinute("*/10");
	}

	public everyFifteenMinutes(): this {
		return this.setMinute("*/15");
	}

	public everyThirtyMinutes(): this {
		return this.setMinute("*/30");
	}

	public hourly(): this {
		return this.setMinute("0");
	}

	public hourlyAt(minute: string): this {
		return this.setMinute(minute);
	}

	public daily(): this {
		return this.setMinute("0").setHour("0");
	}

	public dailyAt(hour: string, minute: string): this {
		return this.setMinute(minute).setHour(hour);
	}

	public weekdays(): this {
		return this.setMinute("0").setHour("0").setDayWeek("1-5");
	}

	public weekends(): this {
		return this.setMinute("0").setHour("0").setDayWeek("6,0");
	}

	public mondays(): this {
		return this.setMinute("0").setHour("0").setDayWeek("MON");
	}

	public tuesdays(): this {
		return this.setMinute("0").setHour("0").setDayWeek("TUE");
	}

	public wednesdays(): this {
		return this.setMinute("0").setHour("0").setDayWeek("WED");
	}

	public thursdays(): this {
		return this.setMinute("0").setHour("0").setDayWeek("THU");
	}

	public fridays(): this {
		return this.setMinute("0").setHour("0").setDayWeek("FRI");
	}

	public saturdays(): this {
		return this.setMinute("0").setHour("0").setDayWeek("SAT");
	}

	public sundays(): this {
		return this.setMinute("0").setHour("0").setDayWeek("SUN");
	}

	public weekly(): this {
		return this.setMinute("0").setHour("0").setDayWeek("0");
	}

	public weeklyOn(day: string, hour: string, minute: string): this {
		return this.setMinute(minute).setHour(hour).setDayWeek(day);
	}

	public monthly(): this {
		return this.setMinute("0").setHour("0").setDayMonth("1");
	}

	public monthlyOn(day: string, hour: string, minute: string): this {
		return this.setMinute(minute).setHour(hour).setDayMonth(day);
	}

	public quarterly(): this {
		return this.setMinute("0").setHour("0").setDayMonth("1").setMonth("*/3");
	}

	public yearly(): this {
		return this.setMinute("0").setHour("0").setDayMonth("1").setMonth("1");
	}

	private setMinute(value: string): this {
		return this.spliceIntoPosition(0, value);
	}

	private setHour(value: string): this {
		return this.spliceIntoPosition(1, value);
	}

	private setDayMonth(value: string): this {
		return this.spliceIntoPosition(2, value);
	}

	private setMonth(value: string): this {
		return this.spliceIntoPosition(3, value);
	}

	private setDayWeek(value: string): this {
		return this.spliceIntoPosition(4, value);
	}

	private spliceIntoPosition(position: number, value: string): this {
		const segments: string[] = this.expression.split(" ");
		segments[position] = value;

		return this.cron(segments.join(" "));
	}
}
