import { Identifiers } from "@arkecosystem/core-contracts";
import moment from "moment-timezone";

import { describe, Sandbox } from "../../../../core-test-framework";
import { Enums } from "../../index";
import { CronJob } from "./cron-job";

const days: Record<string, string> = {
	friday: "2019-08-23 00:00:00",
	monday: "2019-08-19 00:00:00",
	saturday: "2019-08-24 00:00:00",
	sunday: "2019-08-25 00:00:00",
	thursday: "2019-08-22 00:00:00",
	tuesday: "2019-08-20 00:00:00",
	wednesday: "2019-08-21 00:00:00",
};
describe<{
	sandbox: Sandbox;
	job: CronJob;
	timeFaker: any;
	mockEventDispatcher: any;
}>("CronJob", ({ assert, beforeEach, clock, it, spy, spyFn, match }) => {
	const expectExecutionAfterDelay = (context: any, callback: CronJob, minutes: number): void => {
		const dispatchSpy = spy(context.mockEventDispatcher, "dispatch");

		const fakeTimers = clock({
			now: 0,
		});

		const function_ = spyFn();

		callback.execute(() => {
			function_.call();
		});

		function_.neverCalled();

		const delay: number = minutes * 60 * 1000;
		for (let index = 0; index < 3; index++) {
			fakeTimers.tick(delay);
		}

		function_.calledTimes(3);

		dispatchSpy.calledWith(
			Enums.ScheduleEvent.CronJobFinished,
			match({
				executionTime: match.number,
				expression: match.string,
			}),
		);
	};

	const expectExecutionOnDate = (context: any, callback: CronJob, day: string): void => {
		const dispatchSpy = spy(context.mockEventDispatcher, "dispatch");

		const fakeTimers = clock({
			now: moment(day).subtract(1, "second").valueOf(),
		});

		const function_ = spyFn();

		callback.execute(() => {
			function_.call();
		});

		function_.neverCalled();

		for (let index = 0; index < 3; index++) {
			fakeTimers.tick(1000);
		}

		function_.calledOnce();

		dispatchSpy.calledWith(
			Enums.ScheduleEvent.CronJobFinished,
			match({
				executionTime: match.number,
				expression: match.string,
			}),
		);
	};

	beforeEach((context) => {
		context.mockEventDispatcher = {
			dispatch: () => {},
		};

		context.sandbox = new Sandbox();

		context.sandbox.app.bind(Identifiers.EventDispatcherService).toConstantValue(context.mockEventDispatcher);

		context.job = context.sandbox.app.resolve<CronJob>(CronJob);
	});

	it("should execute on cron", (context) => {
		expectExecutionAfterDelay(context, context.job.cron("*/3 * * * *"), 3);
	});

	it("should execute every minute", (context) => {
		expectExecutionAfterDelay(context, context.job.everyMinute(), 1);
	});

	it("should execute every five minutes", (context) => {
		expectExecutionAfterDelay(context, context.job.everyFiveMinutes(), 5);
	});

	it("should execute every ten minutes", (context) => {
		expectExecutionAfterDelay(context, context.job.everyTenMinutes(), 10);
	});

	it("should execute every fifteen minutes", (context) => {
		expectExecutionAfterDelay(context, context.job.everyFifteenMinutes(), 15);
	});

	it("should execute every thirty minutes", (context) => {
		expectExecutionAfterDelay(context, context.job.everyThirtyMinutes(), 30);
	});

	it("should execute hourly", (context) => {
		expectExecutionAfterDelay(context, context.job.hourly(), 60);
	});

	it("should execute hourly at", (context) => {
		expectExecutionAfterDelay(context, context.job.hourlyAt("30"), 60);
	});

	it("should execute daily", (context) => {
		expectExecutionAfterDelay(context, context.job.daily(), 1440);
	});

	it("should execute daily at", (context) => {
		expectExecutionAfterDelay(context, context.job.dailyAt("12", "00"), 1440);
	});

	it("should execute on weekdays", (context) => {
		expectExecutionOnDate(context, context.job.weekdays(), days.monday);
	});

	it("should execute on weekends", (context) => {
		expectExecutionOnDate(context, context.job.weekends(), days.saturday);
	});

	it("should execute on mondays", (context) => {
		expectExecutionOnDate(context, context.job.mondays(), days.monday);
	});

	it("should execute on tuesdays", (context) => {
		expectExecutionOnDate(context, context.job.tuesdays(), days.tuesday);
	});

	it("should execute on wednesdays", (context) => {
		expectExecutionOnDate(context, context.job.wednesdays(), days.wednesday);
	});

	it("should execute on thursdays", (context) => {
		expectExecutionOnDate(context, context.job.thursdays(), days.thursday);
	});

	it("should execute on fridays", (context) => {
		expectExecutionOnDate(context, context.job.fridays(), days.friday);
	});

	it("should execute on saturdays", (context) => {
		expectExecutionOnDate(context, context.job.saturdays(), days.saturday);
	});

	it("should execute on sundays", (context) => {
		expectExecutionOnDate(context, context.job.sundays(), days.sunday);
	});

	it("should execute weekly", (context) => {
		expectExecutionAfterDelay(context, context.job.weekly(), 10_080);
	});

	it("should execute weekly on", (context) => {
		expectExecutionOnDate(context, context.job.weeklyOn("THU", "12", "30"), "2019-08-22 12:30:00");
	});

	it("should execute monthly", (context) => {
		expectExecutionAfterDelay(context, context.job.monthly(), 43_200);
	});

	it("should execute monthly on", (context) => {
		expectExecutionOnDate(context, context.job.monthlyOn("22", "12", "30"), "2019-08-22 12:30:00");
	});

	it("should execute quarterly", (context) => {
		expectExecutionAfterDelay(context, context.job.quarterly(), 43_200 * 4);
	});

	it("should execute yearly", (context) => {
		expectExecutionAfterDelay(context, context.job.yearly(), 525_600);
	});
});
