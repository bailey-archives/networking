import type { ClientTransport, ConnectionOptions } from '@networking/common';

export interface ClientOptions extends ConnectionOptions {

	/**
	 * The transport to use when connecting to the server. The server must be using a compatible transport in order
	 * for a connection to be established.
	 */
	transport: ClientTransport;

	/**
	 * The number of milliseconds to wait before attempting to reconnect after a connection attempt fails or the
	 * connection is lost.
	 *
	 * Default: `1000`
	 */
	reconnectDelay?: number;

}
