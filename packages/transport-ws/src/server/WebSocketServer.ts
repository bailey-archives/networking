import { ServerTransport } from '@networking/common';
import { Server, ServerOptions } from 'isomorphic-ws';
import { WebSocketConnection } from './WebSocketConnection';

export class WebSocketServer extends ServerTransport {

	private _options: ServerOptions;
	private _ws?: Server;

	public constructor(options: ServerOptions) {
		super();
		this._options = options;
	}

	public async start(): Promise<void> {
		if (!this._ws) {
			this._ws = new Server(this._options);
			this._listen(this._ws);
			this._ws.once('listening', () => {
				this._emit('started');
			});
		}
	}

	public async stop(): Promise<void> {
		if (this._ws) {
			return new Promise((resolve, reject) => {
				this._ws?.close(err => {
					this._ws = undefined;
					this._emit('stopped');
					err ? reject(err) : resolve();
				});
			});
		}
	}

	public close(error?: Error): void {
		if (this._ws) {
			this._ws.close();
			this._ws = undefined;
			this._emit('stopped', error);
		}
	}

	/**
	 * Listens for events on the server.
	 */
	private _listen(server: Server) {
		server.on('connection', (socket, request) => {
			const connection = new WebSocketConnection(socket, request);
			this._emit('connection', connection);
		});
	}

}
