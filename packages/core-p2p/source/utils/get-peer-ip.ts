import { FastifyRequest } from "fastify";

export const getPeerIp = (request: FastifyRequest) =>
	(request.headers["x-forwarded-for"] as string).split(",")[0]?.trim() ?? request.ip;
