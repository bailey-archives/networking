import type { Json } from '../types/json';

/**
 * Represents a response to a request.
 */
export interface Response {
	/**
	 * The ID of the request that we're responding to.
	 */
	requestId: number;

	/**
	 * Whether or not the request was handled successfully.
	 */
	success: boolean;

	/**
	 * The value returned from the request handler. If `success` is true, this is guaranteed to be set (but note that
	 * the `Json` type permits undefined as a value).
	 */
	value?: Json;

	/**
	 * The message of the error that was thrown from the request handler. If `success` is false, this is guaranteed to
	 * be a valid string.
	 */
	error?: string;
}
