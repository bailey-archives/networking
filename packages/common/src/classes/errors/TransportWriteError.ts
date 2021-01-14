import { TransportError } from './TransportError';

/**
 * Represents an intentional error that occurred when a transport was writing data to the remote.
 */
export class TransportWriteError extends TransportError {
	public constructor(message: string) {
		super(message);
		this.name = 'TransportWriteError';
	}
}
