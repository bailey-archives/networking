import { Buffer, ClientTransport, TransportConnectError, TransportWriteError } from '@networking/common';
import WebSocket, { ClientOptions } from 'isomorphic-ws';
import { ClientRequestArgs } from 'http';

export class WebSocketClient extends ClientTransport {

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

		this._address = address;

		if (typeof protocols === 'string' || Array.isArray(protocols)) {
			this._protocols = protocols;
			this._options = options;
		}
		else {
			this._options = protocols;
		}
	}

	/**
	 * The URL of the target web socket server.
	 */
	public get address() {
		return this._address;
	}

	public async connect(): Promise<void> {
		if (this._state !== ClientState.None) {
			throw new Error('Cannot start client because it is already in an active state');
		}

		// Start the socket and wait for connection
		this._socket = await this._createSocket();
	}

	public async disconnect(): Promise<void> {
		return this.close();
	}

	public close(error?: Error): void {
		if (this._socket) {
			this._socket.close(error ? 1011 : 1000);
			this._socket = undefined;
			this._state = ClientState.None;
			this._emit('disconnected', !error, error);
		}
	}

	public async send(data: Buffer): Promise<void> {
		if (this._state !== ClientState.Connected || !this._socket) {
			throw new TransportWriteError('Cannot send data because the client is not active');
		}

		this._socket.send(data);
	}

	private async _createSocket() {
		return new Promise<WebSocket>((resolve, reject) => {
			this._state = ClientState.Connecting;
			const socket = new WebSocket(this._address, this._protocols, this._options);

			// The socket client will emit the "open" event once a connection is established.
			socket.onopen = () => {
				this._listen(socket);
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

	/**
	 * Listens for incoming message, error, and close events on the socket.
	 *
	 * @param socket
	 */
	private _listen(socket: WebSocket) {
		socket.onmessage = event => {
			const { data } = event;

			if (data instanceof Uint8Array) {
				this._emit('data', Buffer.from(data));
			}
			else if (typeof data === 'string') {
				this._emit('data', Buffer.from(data));
			}
			else {
				this.close(new Error('Unknown data type'));
			}
		};

		socket.onerror = event => {
			this._socket = undefined;
			this._state = ClientState.None;
			this._emit('disconnected', false, event.error);

			socket.onclose = () => {};
			socket.onerror = () => {};
		};

		socket.onclose = event => {
			this._socket = undefined;
			this._state = ClientState.None;
			this._emit('disconnected', event.code === 1000);

			socket.onclose = () => {};
			socket.onerror = () => {};
		};
	}

}

enum ClientState {
	None,
	Connecting,
	Connected,
	Disconnecting
}
