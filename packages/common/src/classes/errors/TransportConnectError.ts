import { TransportError } from './TransportError';

/**
 * Represents an intentional error that occurred when a transport was connecting to the remote server.
 */
export class TransportConnectError extends TransportError {
	public constructor(message: string) {
		super(message);
		this.name = 'TransportConnectError';
	}
}
