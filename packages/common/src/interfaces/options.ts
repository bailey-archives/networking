import { Json } from '../types/json';

export interface ConnectionOptions {
	/**
	 * The number of milliseconds we should wait for an ack from the other side before timing out. If a timeout does
	 * occur, the connection will be closed with an error.
	 *
	 * When `resumptionEnabled` is set to true (which it is by default), any messages that fail due to an ack timeout
	 * will be resent when the connection is resumed.
	 *
	 * Default: `15000`
	 */
	ackTimeout?: number;

	/**
	 * The default number of milliseconds the connection should wait for data during operations, such as requests or
	 * streams, before timing out. If the timeout is reached, the request will reject with an error. Set to `0` to
	 * disable.
	 *
	 * The timeout applies to the following scenarios which will be cancelled with an error:
	 *
	 * - If a request is not answered within this time.
	 * - If a stream does not have activity within this time.
	 *
	 * Note that this does not mean streams must complete within the timeout. They can actually take as much time as
	 * they need to complete. But if a stream does not send any chunks for this time, it will be dropped.
	 *
	 * This can be customized each time you send an event, request, or stream.
	 *
	 * Default: `0`
	 */
	defaultOperationTimeout?: number;

	/**
	 * The number of milliseconds we can be disconnected before the stored session token is erased. In effect, this
	 * means that after loss of connection, we can only resume an existing session if reconnected within this time.
	 * Setting this to `0` means that sessions can be resumed at any time.
	 *
	 * Default: `900000` (15 minutes)
	 */
	resumptionTimeout?: number;

	/**
	 * Whether or not session resumption is allowed. This must be enabled on both the client and server for session
	 * resumption to work.
	 *
	 * When enabled (on both the client and server), any outgoing data that was sent while disconnected, or that was
	 * not successfully delivered before the disconnection, will be resent once a connection is re-established. The
	 * server will also re-use the existing client connection, instead of spawning a new connection.
	 *
	 * When disabled, all outgoing data that could not be delivered is dropped entirely.
	 *
	 * Default: `true`
	 */
	resumptionEnabled?: boolean;

	/**
	 * The number of milliseconds we should wait for heartbeats to be returned from the other side before timing out
	 * and closing the connection.
	 *
	 * Setting this to `0` will disable heartbeats entirely. This is not recommended, as it could result in zombie
	 * connections. If `ackTimeout` is also set to 0, then it will be impossible to detect loss of connection.
	 *
	 * Default: `15000`
	 */
	heartbeatTimeout?: number;
}

/**
 * These options can substitute an event name in send methods to access additional configuration.
 */
export interface EmitOptions {
	/**
	 * The channel name to emit over.
	 */
	channel: string;

	/**
	 * An array of arguments to send. Defaults to `[]`.
	 */
	arguments?: Json[];

	/**
	 * Raw binary to send. If this is provided, the arguments option must not be set. This is only applicable when
	 * using `sendBinary`.
	 */
	binary?: Uint8Array;

	/**
	 * The number of milliseconds to wait for the operation to complete. For example, this can limit how long a stream
	 * or request can take to finish. Defaults to `0` (unlimited).
	 */
	timeout?: number;
}
