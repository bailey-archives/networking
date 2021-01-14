import { Transport } from './transport';
import { ServerConnectionTransport } from './transport.connection';

/**
 * A transport is used to send and receive data. The client and server will provide an instance of their target
 * transport, which they will use behind the scenes.
 *
 * Transports do not need to worry about serializing or parsing data. The client or server will handle those kinds of
 * operations. Instead, transports only need to worry about the actual sending and receiving of binary data.
 *
 * There are several things to consider when implementing a transport:
 *
 * - Transports are responsible for connecting to or starting a server.
 * - Transports must report their status using `emit()` events.
 * - Transports do not need to worry about authentication.
 * - Transports do not need to implement things like automatic reconnection.
 * - Transports can perform a handshake, but the library will automatically perform its own handshake as well.
 */
export abstract class ServerTransport extends Transport<EventSchema> {

	/**
	 * Starts the server. Returns a `Promise` which resolves once the server has finished starting, or rejects with a
	 * `TransportStartError` upon failure. If the server must start synchronously, the promise will resolve immediately.
	 *
	 * @throws {TransportStartError}
	 */
	public abstract start(): Promise<void>;

	/**
	 * Gracefully stops the server. Returns a `Promise` which resolves once complete. If the server is not active,
	 * then it does nothing and resolves immediately.
	 *
	 * The most important function of this method is that it gracefully disconnects all connected clients before
	 * stopping the server.
	 */
	public abstract stop(): Promise<void>;

	/**
	 * Forcefully closes the server. If the server is not active, then it does nothing.
	 *
	 * If the closure is due to an error, then the `error` parameter must be provided. This error will be emitted
	 * in the `stopped` event.
	 */
	public abstract close(error?: Error): void;

}

/**
 * This schema defines the types of events the client transport can emit.
 */
type EventSchema = {
	started: [];
	stopped: [error?: Error];
	connection: [connection: ServerConnectionTransport];
};
