/**
 * A utility to help work with configuration objects.
 */
export class Configuration {

	/**
	 * Resolves the full value of a configuration object with the given `defaults` applied. This performs a deep,
	 * recursive scan of the object and applies defaults in nested objects as well.
	 *
	 * - Note that arrays are considered a value and will not be overwritten or appended to if set.
	 *
	 * @param config
	 * @param defaults
	 */
	public static resolve<T extends Object, R extends T = T>(config: T | undefined, defaults: Partial<T>): R {
		// Return the defaults if the object is undefined
		if (typeof config === 'undefined') {
			return Object.assign({}, defaults) as R;
		}

		// Make a copy of the original object to avoid mutating it
		const resolved: T = Object.assign({}, config);

		// Recurse over the defaults and apply them to the config object
		for (const key in defaults) {
			const value = defaults[key]!;

			// If the value is an object, copy it recursively
			if (typeof value === 'object' && !Array.isArray(value)) {
				resolved[key] = this.resolve(config[key], value);
			}

			// If it's any other type, copy the value directly if needed
			else if (typeof config[key] === 'undefined') {
				resolved[key] = value;
			}
		}

		return resolved as R;
	}

	/**
	 * Asserts that something is true, and throws an `Error` containing the given message if not.
	 *
	 * @param result
	 * @param message
	 */
	public static assert(result: boolean, message: string) {
		if (!result) {
			throw new Error(message);
		}
	}

}
