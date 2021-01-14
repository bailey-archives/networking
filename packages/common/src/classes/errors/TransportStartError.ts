import { TransportError } from './TransportError';

/**
 * Represents an intentional error that occurred when a transport was starting a local server.
 */
export class TransportStartError extends TransportError {
	public constructor(message: string) {
		super(message);
		this.name = 'TransportStartError';
	}
}
