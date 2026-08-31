// Throws at module-evaluation time (not ERR_MODULE_NOT_FOUND) so discover() must rethrow.
throw new Error("broken defaults module");
