/**
 * Represents an error that occurred when handling a request. If this error type is thrown from a request handler,
 * its message will be sent verbatim to the requester. Otherwise, a generic message will be used.
 */
export class RequestError extends Error {
	public constructor(message: string) {
		super(message);
		this.name = 'RequestError';
	}
}
