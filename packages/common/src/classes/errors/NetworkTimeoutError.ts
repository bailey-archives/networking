import { NetworkError } from './NetworkError';

/**
 * Represents an intentional error that occurred when a transport was connecting to the remote server.
 */
export class NetworkTimeoutError extends NetworkError {
	public constructor(message: string) {
		super(message);
		this.name = 'NetworkTimeoutError';
	}
}
