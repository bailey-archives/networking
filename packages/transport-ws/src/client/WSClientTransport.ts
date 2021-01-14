import { Buffer, ClientTransport, TransportConnectError } from '@networking/common';
import WebSocket, { ClientOptions } from 'isomorphic-ws';
import type { ClientRequestArgs } from 'http';

export class WSClientTransport extends ClientTransport {

	private _state = ClientState.None;
	private _socket?: WebSocket;

	private _address: string;
	private _protocols?: string | string[];
	private _options?: ClientOptions | ClientRequestArgs;

	/**
	 * Constructs a new `WSClientTransport` instance with the given options.
	 *
	 * @param address The address to connect to.
	 * @param options The client options. Not used in web browsers.
	 */
	public constructor(address: string, options?: ClientOptions | ClientRequestArgs);

	/**
	 * Constructs a new `WSClientTransport` instance with the given protocols and options.
	 *
	 * @param address The address to connect to.
	 * @param protocols The protocol(s) to use for the connection.
	 * @param options The client options. Not used in web browsers.
	 */
	public constructor(address: string, protocols?: string | string[], options?: ClientOptions | ClientRequestArgs);
	public constructor(address: string, protocols?: string | string[] | ClientOptions | ClientRequestArgs, options?: ClientOptions | ClientRequestArgs) {
		super();

		this._socket;//TEMP
		this._address = address;
		if (typeof protocols === 'string' || Array.isArray(protocols)) {
			this._protocols = protocols;
			this._options = options;
		}
		else {
			this._options = protocols;
		}
	}

	public async connect(): Promise<void> {
		if (this._state !== ClientState.None) {
			return;
		}

		// Start the socket and wait for connection
		this._socket = await this._createSocket();
	}

	public async disconnect(): Promise<void> {
		throw new Error('Method not implemented.');
	}

	public close(error?: Error): void {
		error;
		throw new Error('Method not implemented.');
	}

	public async send(data: Buffer): Promise<void> {
		data;
		throw new Error('Method not implemented.');
	}

	private async _createSocket() {
		return new Promise<WebSocket>((resolve, reject) => {
			this._state = ClientState.Connecting;
			const socket = new WebSocket(this._address, this._protocols, this._options);

			// The socket client will emit the "open" event once a connection is established.
			socket.onopen = () => {
				socket.onclose = function() {};
				socket.onerror = function() {};
				this._state = ClientState.Connected;
				resolve(socket);
			};

			// If unable to connect, it will emit the "error" event followed by the "close" event.
			socket.onerror = (e) => {
				socket.onclose = function() {};
				this._state = ClientState.None;
				reject(new TransportConnectError(e.message));
			};
		});
	}

}

enum ClientState {
	None,
	Connecting,
	Connected,
	Disconnecting
}
