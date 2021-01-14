import type { Buffer } from '../../utilities/buffer';
import { Transport } from './transport';

/**
 * The `ServerConnectionTransport` acts as an interface for communication between the server and a client.
 *
 * When implementing this transport, you do not need to worry about connection resumption. When a client resumes an
 * existing connection, they will still generate a completely new `ServerConnectionTransport` instance.
 */
export abstract class ServerConnectionTransport extends Transport<EventSchema> {

	/**
	 * The remote address of the client. The format might differ by transport, and in some transports the remote
	 * address may be unavailable, in which case this will be a blank string.
	 */
	public abstract get remoteAddress(): string;

	/**
	 * Gracefully disconnects the client. Returns a `Promise` which resolves once successfully disconnected.
	 * If there is currently no active connection, then nothing is changed and the promise resolves immediately.
	 */
	public abstract disconnect(): Promise<void>;

	/**
	 * Forcefully closes the connection. If there is currently no active connection, then no actions are performed.
	 *
	 * If the disconnection is due to an error, then the `error` parameter must be provided. This error will be emitted
	 * in the `disconnected` event.
	 */
	public abstract close(error?: Error): void;

	/**
	 * Sends data to the client. Returns a `Promise` which resolves once the data has been sent.
	 *
	 * This method will not be called if the transport is not currently connected. If sending data to the client does
	 * not need to be asynchronous, the promise will be resolved immediately.
	 *
	 * If there is an error when sending the data, the promise will reject with a `TransportWriteError`. Please note
	 * that if this method rejects for any reason, the transport will be forcefully closed.
	 *
	 * @param data
	 * @throws {TransportWriteError}
	 */
	public abstract send(data: Buffer): Promise<void>;

}

/**
 * This schema defines the types of events the client transport can emit.
 */
type EventSchema = {
	reconnected: [];
	disconnected: [error?: Error];
	data: [data: Uint8Array];
};
