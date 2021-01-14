/**
 * Represents an intentional error that occurred inside a transport.
 */
export class TransportError extends Error {
	public constructor(message: string) {
		super(message);
		this.name = 'TransportError';
	}
}
