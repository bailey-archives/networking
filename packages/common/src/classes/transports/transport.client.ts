import type { Buffer } from '../../utilities/buffer';
import { Transport } from './transport';

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
export abstract class ClientTransport extends Transport<EventSchema> {

	/**
	 * Attempts to connect to the server. Returns a `Promise` which resolves upon a successful connection, or rejects
	 * with a `TransportConnectError` upon failure.
	 *
	 * @throws {TransportConnectError}
	 */
	public abstract connect(): Promise<void>;

	/**
	 * Gracefully disconnects from the server. Returns a `Promise` which resolves once successfully disconnected.
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
	 * Sends data to the server. Returns a `Promise` which resolves once the data has been sent.
	 *
	 * This method will not be called if the transport is not currently connected. If sending data to the server does
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
	connected: [];
	disconnected: [error?: Error];
	data: [data: Uint8Array];
};
