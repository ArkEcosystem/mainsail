const { Blocks } = require("../../dist");

const data = require("../helpers").getJSONFixture("block/deserialized/no-transactions");

exports["core"] = () => {
	return Blocks.Serializer.serialize(data);
};
