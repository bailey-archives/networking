/**
 * Represents an error that occurred when sending or receiving data.
 */
export class NetworkError extends Error {
	public constructor(message: string) {
		super(message);
		this.name = 'NetworkError';
	}
}
