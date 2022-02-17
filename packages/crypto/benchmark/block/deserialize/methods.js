const { Blocks } = require("../../../dist");

exports.deserialize = (data) => {
	return Blocks.Deserializer.deserialize(data);
};
