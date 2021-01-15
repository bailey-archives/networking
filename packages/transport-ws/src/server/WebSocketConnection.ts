import { Buffer, ServerConnectionTransport } from '@networking/common';
import { IncomingMessage } from 'http';
import WebSocket from 'isomorphic-ws';

export class WebSocketConnection extends ServerConnectionTransport {

	private _socket: WebSocket;
	private _request: IncomingMessage;

	public constructor(socket: WebSocket, request: IncomingMessage) {
		super();

		this._socket = socket;
		this._request = request;

		this._listen();
	}

	public get remoteAddress(): string {
		return this._request.socket.remoteAddress ?? '';
	}

	public async disconnect(): Promise<void> {
		this._socket.close(1000);
		this._emit('disconnected', true);
	}

	public close(error?: Error): void {
		this._socket.close(error ? 1011 : 1000);
		this._emit('disconnected', !error, error);
	}

	public send(data: Buffer): Promise<void> {
		return new Promise((resolve, reject) => {
			this._socket.send(data, err => {
				err ? reject(err) : resolve();
			});
		});
	}

	/**
	 * Listens for incoming message, error, and close events on the socket.
	 *
	 * @param socket
	 */
	private _listen() {
		this._socket.onmessage = event => {
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

		this._socket.onerror = event => {
			this._emit('disconnected', false, event.error);

			this._socket.onclose = () => {};
			this._socket.onerror = () => {};
		};

		this._socket.onclose = event => {
			this._emit('disconnected', event.code === 1000);

			this._socket.onclose = () => {};
			this._socket.onerror = () => {};
		};
	}

}
