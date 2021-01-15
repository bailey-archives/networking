import type { ClientOptions } from './interfaces/options';
import {
	ClientTransport,
	Configuration,
	DispatchOptions,
	Fallback,
	Json,
	ListenOptions,
	Message,
	MessagePayloadType,
	MessageType,
	NetworkEmitter,
	NetworkReader,
	NetworkWriter,
	RequestError,
	Schematic,
	SchematicGroup
} from '@networking/common';

export class Client<
	T extends Schematic = Schematic,
	I extends SchematicGroup = Fallback<T['client'], SchematicGroup>,
	O extends SchematicGroup = Fallback<T['server'], SchematicGroup>
> extends NetworkEmitter<I, O, Events> {

	/**
	 * The options with defaults applied.
	 */
	private _options: InternalClientOptions;

	/**
	 * The writer for this client.
	 */
	private _writer: NetworkWriter;

	/**
	 * The reader for this client.
	 */
	private _reader: NetworkReader;

	/**
	 * The internal message id tracker.
	 */
	private _nextMessageId: number = 0;

	/**
	 * Whether or not we are currently connected to the server.
	 */
	private _isConnected = false;

	/**
	 * Whether or not the connection should be persistent (automatic reconnection upon loss).
	 */
	private _isPersistent = false;

	/**
	 * A map containing all registered request handlers on the client.
	 */
	private _requestHandlers: Map<string, EventListener>;

	/**
	 * A map containing all registered event handlers on the client.
	 */
	private _eventHandlers: Map<MessageType, Map<string, Set<EventListener>>>;

	/**
	 * Constructs a new `Client` instance.
	 *
	 * @param options
	 */
	public constructor(options: ClientOptions) {
		super();

		this._options = this._getFullOptions(options);
		this._writer = new NetworkWriter(this);
		this._reader = new NetworkReader();

		this._requestHandlers = new Map();
		this._eventHandlers = new Map();

		this._options.transport.on('connected', () => this._onConnectedTransportEvent());
		this._options.transport.on('disconnected', (i, error) => this._onDisconnectedTransportEvent(i, error));
		this._options.transport.on('data', data => this._onDataTransportEvent(data));

		// Bind writer events
		this._writer.on('error', error => this._onErrorWriterEvent(error));

		// Bind reader events
		this._reader.on('message', message => this._onMessageReaderEvent(message));
		this._reader.on('error', error => this._onErrorReaderEvent(error));
	}

	/**
	 * Equals `true` if the client is currently connected to the server, or `false` if the connection was lost or has
	 * not yet been started or established.
	 */
	public get connected() {
		return this._isConnected;
	}

	/**
	 * Returns a copy of the given options with default values applied. It also validates the options a little. :D
	 *
	 * @param options
	 */
	private _getFullOptions(options: ClientOptions): InternalClientOptions {
		// Resolve full options with defaults
		const resolved = Configuration.resolve<ClientOptions, InternalClientOptions>(options, {
			ackTimeout: 15000,
			defaultOperationTimeout: 0,
			heartbeatTimeout: 15000,
			resumptionEnabled: true,
			resumptionTimeout: 0,
			reconnectDelay: 1000
		});

		// Assertions
		Configuration.assert(resolved.transport instanceof ClientTransport, 'Option "transport" is missing or invalid');
		Configuration.assert(typeof resolved.heartbeatTimeout === 'number', 'Option "heartbeatTimeout" must be a number');
		Configuration.assert(resolved.heartbeatTimeout >= 0, 'Option "heartbeatTimeout" must be at least 0');
		Configuration.assert(resolved.ackTimeout > 0, 'Option "ackTimeout" must be greater than 0');
		Configuration.assert(resolved.defaultOperationTimeout >= 0, 'Option "requestTimeout" must be at least 0');
		Configuration.assert(resolved.reconnectDelay >= 0, 'Option "requestTimeout" must be at least 0');
		Configuration.assert(resolved.resumptionTimeout >= 0, 'Option "resumptionTimeout" must be at least 0');

		return resolved;
	}

	/**
	 * The options with defaults applied.
	 */
	public get options(): ClientOptions {
		return this._options;
	}

	/**
	 * Starts the client. The client will automatically try to connect until it is successful. If the connection is
	 * lost, the client will also continuously attempt to reconnect.
	 *
	 * If you wish to make a single connection attempt that does not automatically reconnect, use the `connect()`
	 * method instead.
	 */
	public start() {
		this._isPersistent = true;
		this._connectPersistently();
	}

	/**
	 * Connects to the server, but does not retry or automatically reconnect if the connection is lost like with the
	 * `start()` method.
	 */
	public connect() {
		this._isPersistent = false;
		return this._connectOnce();
	}

	/**
	 * Connects to the server.
	 */
	private async _connectOnce() {
		try {
			await this._options.transport.connect();
		}
		catch (error) {
			this._emit('connectError', error);
			throw error;
		}
	}

	/**
	 * Attempts to connect in the background, and retries upon error.
	 */
	private _connectPersistently() {
		if (!this._isPersistent) {
			return;
		}

		this._connectOnce().catch(() => {
			setTimeout(() => this._connectPersistently(), this._options.reconnectDelay);
		});
	}

	/**
	 * Disconnects from the server.
	 */
	public disconnect() {
		this._isPersistent = false;
		return this.options.transport.disconnect();
	}

	/**
	 * Creates a new `Message` instance with the ID automatically set.
	 *
	 * @param type
	 * @param channel
	 */
	private _createMessage(type: MessageType, channel: string): Message {
		return new Message(this._nextMessageId++, type, channel);
	}

	/**
	 * Dispatches data from the `NetworkEmitter`.
	 *
	 * @param options
	 */
	protected _dispatch(options: DispatchOptions): Promise<any> {
		// Create a message instance
		const message = this._createMessage(options.type, options.channel);

		// Add the arguments payload
		message.addPayload(MessagePayloadType.Json, options.arguments ?? []);

		// Add the binary payload if applicable
		if (options.type === MessageType.Binary) {
			if (!options.binary) {
				throw new Error('Missing binary payload');
			}

			message.addPayload(MessagePayloadType.Binary, options.binary);
		}

		// Send the message
		return this._writer.queue(message, {
			ackTimeout: this._options.ackTimeout,
			operationTimeout: options.timeout ?? this._options.defaultOperationTimeout
		});
	}

	/**
	 * Listens for data from the `NetworkEmitter`.
	 *
	 * @param options
	 */
	protected _listen(options: ListenOptions): void {
		// Requests are special as they can only have a single active listener (handler) at one time
		// When a listener is set, it should override any existing handler on the same type and channel
		if (options.type === MessageType.Request) {
			this._requestHandlers.set(options.channel, {
				callback: options.callback,
				once: options.once ?? false,
			});
		}

		// Events are different in that there can be several listeners at once
		// All listeners are grouped by message type, then by channel name.
		else {
			if (!this._eventHandlers.has(options.type)) {
				this._eventHandlers.set(options.type, new Map());
			}

			const channels = this._eventHandlers.get(options.type)!;
			if (!channels.has(options.channel)) {
				channels.set(options.channel, new Set());
			}

			const listeners = channels.get(options.channel)!;
			listeners.add({
				callback: options.callback,
				once: options.once ?? false
			});
		}
	}

	/**
	 * Handles the `connected` event from the transport.
	 */
	private _onConnectedTransportEvent() {
		this._isConnected = true;
		this._writer.setConnectionOpened(true);
		this._emit('connected', false);
	}

	/**
	 * Handles the `disconnected` event from the transport.
	 *
	 * @param error
	 */
	private _onDisconnectedTransportEvent(intentional: boolean, error?: Error) {
		// Clear the reader
		this._reader.clear();

		// Update internal state
		this._isConnected = false;

		// If there was an error, consider this a loss of connection
		// We can also consider the connection lost if intentional is set to false
		if (error || !intentional) {
			this._writer.setConnectionLost();

			if (this._isPersistent) {
				setTimeout(() => this._connectPersistently(), this._options.reconnectDelay);
			}
		}

		// Otherwise, the connection was closed
		else {
			this._writer.setConnectionClosed();
		}

		// Emit an event
		this._emit('disconnected', error);
	}

	/**
	 * Handles the `data` event from the transport.
	 *
	 * @param data
	 */
	private _onDataTransportEvent(data: Uint8Array) {
		this._reader.write(data);
	}

	/**
	 * Handles the `message` event from the reader.
	 *
	 * @param message
	 */
	private _onMessageReaderEvent(message: Message) {
		// Handle system messages
		if (message.type === MessageType.System) {
			if (message.channel === 'ack') {
				const ackMessageId = message.getJsonPayload<number>(0);
				this._writer.setMessageAcknowledged(ackMessageId);
			}
		}

		// Handle responses to requests
		else if (message.type === MessageType.Response) {
			throw new Error('Response logic not implemented');
		}

		// Dispatch events
		else {
			this._dispatchIncomingMessage(message);
		}

		// Emit non-system messages
		if (message.type !== MessageType.System) {
			this._emit('message', message);
		}
	}

	/**
	 * Handles the `error` event from the reader.
	 *
	 * @param error
	 */
	private _onErrorReaderEvent(error: Error) {
		this._options.transport.close(error);
	}

	/**
	 * Handles the `error` event from the writer.
	 *
	 * @param error
	 */
	private _onErrorWriterEvent(error: Error) {
		this._options.transport.close(error);
	}

	/**
	 * Dispatches an incoming message.
	 *
	 * @param message
	 */
	private _dispatchIncomingMessage(message: Message) {
		this._sendAck(message);

		// Get the arguments from the message
		// These will always be the first payload
		const args: any[] = message.getJsonPayload<Json[]>(0);

		// Handle requests
		if (message.type === MessageType.Request) {
			const handler = this._requestHandlers.get(message.channel);

			if (handler) {
				// Wait for and send the response or error
				this._invokeRequestHandler(handler.callback, args).then(value => {
					this._sendResponse(message, undefined, value);
				}, error => {
					if (error instanceof RequestError) {
						this._sendResponse(message, error.message);
					}
					else {
						this._sendResponse(message, 'An error occurred when handling this request');
						this._emit('error', error);
					}
				});

				// If the handler is one-time, remove it
				if (handler.once) {
					this._requestHandlers.delete(message.channel);
				}
			}
		}

		// Handle events
		else {
			// If this is a binary message, prepend the binary to the arguments
			if (message.type === MessageType.Binary) {
				args.unshift(message.getBinaryPayload(1));
			}

			// Fetch event handlers
			if (this._eventHandlers.get(message.type)?.has(message.channel)) {
				const handlers = this._eventHandlers.get(message.type)?.get(message.channel)!;

				// Execute handlers
				for (const handler of handlers) {
					this._invokeEventListener(handler.callback, args);

					// Remove the handler if it's one-time
					// Note: You can reliably delete from a set while iterating over it in JS
					if (handler.once) {
						handlers.delete(handler);
					}
				}
			}
		}
	}

	/**
	 * Sends an ack to the remote for the given message.
	 *
	 * @param message
	 */
	private _sendAck(message: Message) {
		const ack = this._createMessage(MessageType.System, 'ack');
		ack.addPayload(MessagePayloadType.Json, message.id);

		this._writer.send(ack);
	}

	/**
	 * Sends a response to the given request message.
	 *
	 * @param request
	 * @param error
	 * @param value
	 */
	private _sendResponse(request: Message, error?: string, value?: Json) {
		const response = this._createMessage(MessageType.Response, request.channel);

		// If there was an error, send the error message
		if (error) {
			response.addPayload(MessagePayloadType.Json, {
				requestId: request.id,
				success: false,
				error
			});
		}

		// Otherwise, send the return value
		else {
			response.addPayload(MessagePayloadType.Json, {
				requestId: request.id,
				success: true,
				value
			});
		}

		// Add the message to queue
		this._writer.queue(response, {
			ackTimeout: this._options.ackTimeout
		});
	}

	/**
	 * Invokes a request handler and returns a `Promise` that is resolved with the return value once complete, or
	 * rejected with the error if failed.
	 *
	 * @param handler
	 * @param args
	 */
	private _invokeRequestHandler(handler: (...args: Json[]) => any, args: Json[]): Promise<any> {
		try {
			const res = handler(...args);

			// Check if the return type is a promise
			if (typeof res === 'object' && typeof res.then === 'function') {
				return new Promise((resolve, reject) => {
					res.then(resolve, reject);
				});
			}

			return Promise.resolve(res);
		}
		catch (error) {
			return Promise.reject(error);
		}
	}

	/**
	 * Invokes an event listener and emits any errors on the client.
	 *
	 * @param handler
	 * @param args
	 */
	private _invokeEventListener(handler: (...args: Json[]) => any, args: Json[]) {
		try {
			const res = handler(...args);

			// Check if the return type is a promise
			if (typeof res === 'object' && typeof res.then === 'function') {
				res.catch((error: any) => {
					this._emit('error', error);
				});
			}
		}
		catch (error) {
			this._emit('error', error);
		}
	}

}

/**
 * The client options type to use with defaults applied.
 */
interface InternalClientOptions extends ClientOptions {
	ackTimeout: number;
	defaultOperationTimeout: number;
	heartbeatTimeout: number;
	resumptionEnabled: boolean;
	reconnectDelay: number;
	resumptionTimeout: number;
}

/**
 * The events that the client can emit.
 */
type Events = {
	connected: [isResumed: boolean];
	reconnected: [isResumed: boolean];
	connectError: [error?: Error];
	disconnected: [error?: Error];
	message: [message: Message];
	error: [error?: Error];
}

/**
 * A listener (or handler) for incoming messages.
 */
interface EventListener {
	once: boolean;
	callback: (...args: any[]) => any;
}
