const { pullAllBy } = require("../dist");
const lodash = require("lodash/pullAllBy");

exports["utils"] = () =>
	pullAllBy(
		[
			{
				x: 1,
			},
			{
				x: 2,
			},
			{
				x: 3,
			},
			{
				x: 1,
			},
		],
		[
			{
				x: 1,
			},
			{
				x: 3,
			},
		],
		(o) => o.x,
	);

exports["lodash"] = () =>
	lodash(
		[
			{
				x: 1,
			},
			{
				x: 2,
			},
			{
				x: 3,
			},
			{
				x: 1,
			},
		],
		[
			{
				x: 1,
			},
			{
				x: 3,
			},
		],
		(o) => o.x,
	);
