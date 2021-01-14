import { MessageType } from '../../enums/network';
import { ConnectionOptions } from '../../interfaces/options';
import { Json } from '../../types/json';
import { EventEmitter } from '../../utilities/events';
import { PromiseCompletionSource } from '../../utilities/promises';
import { NetworkTimeoutError } from '../errors/NetworkTimeoutError';
import { Message } from '../messages/Message';
import { ClientTransport } from '../transports/transport.client';
import { ServerConnectionTransport } from '../transports/transport.connection';

/**
 * The `NetworkWriter` class helps manage outgoing messages.
 *
 * When a message is provided to the writer, it adds the message to a buffer, stores the promise, attempts to send it
 * through the transport. Once it is informed of an ack, it will resolve the promise (for non-requests). For requests,
 * once a response received, the promise is resolved with the value.
 *
 * For all messages, if an ack is not received within the configured timeout, the message is dropped and rejected.
 * For requests, if a response is not received within the required time, the message is also dropped and rejected.
 *
 * If the connection is lost, the writer will be notified. In this case, all pending operations will be halted (this
 * includes timeouts being cancelled). When the connection is regained, the writer will retry all outstanding tasks.
 *
 * During a loss of connection, a timer is started for the connection's `bufferTimeout`, after which time, if
 * connection is not regained, all pending data is dropped.
 */
export class NetworkWriter extends EventEmitter<Events> {

	/**
	 * The connection emitter.
	 */
	private _connection: ConnectionEmitter;

	/**
	 * The transport to use.
	 */
	private _transport: ClientTransport | ServerConnectionTransport;

	/**
	 * A map of messages in the buffer which are still pending.
	 */
	private _messages: Map<number, OutgoingMessage>;

	/**
	 * A map of messages and their corresponding ack timeouts.
	 */
	private _ackTimeouts: Map<Message, any>;

	/**
	 * A map of messages with operations and their corresponding timeouts.
	 */
	private _operationTimeouts: Map<Message, any>;

	/**
	 * Whether or not we are currently connected.
	 */
	private _connected: boolean;

	/**
	 * Constructs a new `NetworkWriter` for the given connection emitter.
	 *
	 * @param connection
	 */
	public constructor(connection: ConnectionEmitter) {
		super();

		this._connection = connection;
		this._transport = connection.options.transport;
		this._connected = false;

		this._messages = new Map();
		this._ackTimeouts = new Map();
		this._operationTimeouts = new Map();
	}

	/**
	 * Sends a message to the other side immediately if possible, otherwise does nothing. The message will not be
	 * queued and will not be resent if delivery fails. The writer also will not wait for an ack from the remote for
	 * messages sent in this manner.
	 *
	 * @param message
	 * @returns `true` if sent
	 */
	public send(message: Message) {
		if (this._connected) {
			this._transport.send(message.serialize()).catch(error => {
				this._emit('error', error);
			});

			return true;
		}

		return false;
	}

	/**
	 * Queues a message to be sent to the other side. The message will be resent when possible if disconnected or
	 * if delivery fails.
	 *
	 * @param message
	 */
	public queue(message: Message, options: WriteOptions): Promise<any> {
		const source = new PromiseCompletionSource<any>();
		const data: OutgoingMessage = {
			acknowledged: false,
			resolveOnAck: message.type !== MessageType.Request,
			sent: false,
			message,
			source,
			options
		};

		// Add the message to the buffer
		this._messages.set(message.id, data);

		// Send the message over the transport
		this._sendMessage(data);

		return source.promise;
	}

	/**
	 * Sends a message in the background.
	 *
	 * @param message
	 */
	private _sendMessage(data: OutgoingMessage) {
		if (this._connected) {
			console.log('Writer: Sending message %d.', data.message.id);

			data.sent = true;
			data.acknowledged = false;

			this._setTimeouts(data);

			this._transport.send(data.message.serialize()).catch(error => {
				this._emit('error', error);
			});
		}
	}

	/**
	 * Sets the timeouts for the given message data, where applicable.
	 *
	 * @param data
	 */
	private _setTimeouts(data: OutgoingMessage) {
		const { ackTimeout, operationTimeout } = data.options;
		const { message } = data;

		// If there is an ack timeout, start it now
		if (ackTimeout > 0) {
			this._ackTimeouts.set(message, setTimeout(() => {
				if (!data.acknowledged) {
					this._ackTimeouts.delete(message);

					this._emit('error', new NetworkTimeoutError('Ack timed out after ' + ackTimeout + ' milliseconds'));
				}
			}, ackTimeout));
		}

		// If there is an operation timeout, start it now
		if (message.type === MessageType.Request) {
			if ((operationTimeout ?? 0) > 0) {
				this._operationTimeouts.set(message, setTimeout(() => {
					if (!data.source.isFinished) {
						this._messages.delete(message.id);
						this._ackTimeouts.delete(message);

						data.source.setError(
							new NetworkTimeoutError('Operation timed out after ' + operationTimeout + ' milliseconds')
						);
					}
				}, operationTimeout));
			}
		}
	}

	/**
	 * Clears all timeouts in the writer.
	 */
	private _clearAllTimeouts() {
		// Clear all ack timeouts
		for (const timeout of this._ackTimeouts.values()) {
			clearTimeout(timeout);
		}

		// Clear all operation timeouts
		for (const timeout of this._operationTimeouts.values()) {
			clearTimeout(timeout);
		}

		this._ackTimeouts.clear();
		this._operationTimeouts.clear();

		console.log('Writer: All timeouts cleared.');
	}

	/**
	 * Notifies the writer that the connection has been lost. All outgoing messages will be preserved in case of
	 * reconnection.
	 */
	public setConnectionLost() {
		console.log('Writer: Connection lost.');
		if (this._connected) {
			this._connected = false;
			this._clearAllTimeouts();
		}
	}

	/**
	 * Notifies the writer that the connection has been opened.
	 *
	 * @param isResumed Whether or not the connection is resumed.
	 * @param lastMessageId The last message identifier received by the remote if the connection is resumed.
	 */
	public setConnectionOpened(isResumed?: boolean, lastMessageId?: number) {
		console.log('Writer: Connection opened.');

		if (!this._connected) {
			this._connected = true;

			// TODO: Rework all of this shit.

			// Send all messages in the buffer that have not been sent
			// Also, if this is not a resumed session, we should resend any previously sent messages
			for (const data of this._messages.values()) {
				if (!data.sent || isResumed) {
					this._sendMessage(data);
				}
			}
		}
	}

	/**
	 * Notifies the writer that the connection has been intentionally closed. Resumption is no longer possible, so
	 * all outgoing messages are dropped.
	 */
	public setConnectionClosed() {
		console.log('Writer: Connection closed.');
		if (this._connected) {
			this._connected = false;
			this._clearAllTimeouts();
			this._messages.clear();
		}
	}

	/**
	 * Notifies the writer that a message has been acknowledged by the remote.
	 *
	 * @param id
	 */
	public setMessageAcknowledged(id: number) {
		const task = this._messages.get(id);

		console.debug('Got ack for %d.', id);

		if (task && !task.acknowledged) {
			task.acknowledged = true;

			// Remove the ack timeout
			const timeout = this._ackTimeouts.get(task.message);
			if (timeout) {
				clearTimeout(timeout);
				this._ackTimeouts.delete(task.message);
			}

			// Resolve the promise
			if (task.resolveOnAck) {
				task.source.setResult(true);
			}
		}
	}

	/**
	 * Notifies the writer that a message has been responded to by the remote.
	 *
	 * @param id The message identifier.
	 * @param value The value of the response.
	 */
	public setMessageResponse(id: number, value: Json) {
		const task = this._messages.get(id);

		console.debug('Got response for %d: %s', id, value);

		if (task) {
			// Remove the message from the buffer, it's done
			this._ackTimeouts.delete(task.message);
			this._operationTimeouts.delete(task.message);
			this._messages.delete(id);

			// Resolve the promise
			task.source.setResult(value);
		}
	}

}

type Events = {
	error: [error: Error];
};

type ConnectionEmitter = {
	options: ConnectionOptions & {
		transport: ClientTransport | ServerConnectionTransport;
	}
}

interface WriteOptions {
	ackTimeout: number;
	operationTimeout?: number;
}

interface OutgoingMessage {
	message: Message;
	acknowledged: boolean;
	resolveOnAck: boolean;
	sent: boolean;
	source: PromiseCompletionSource<any>;
	options: WriteOptions;
}
