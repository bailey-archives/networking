import { MessageType } from '../../enums/network';
import { EventEmitter, EventEmitterSchema as Events } from '../../utilities/events';
import type { EmitOptions } from '../../interfaces/options';
import type { Json } from '../../types/json';
import type { Promisable } from '../../types/utilities';
import type {
	EventArgs,
	EventNames,
	BinaryEventArgs,
	BinaryEventNames,
	RequestArgs,
	RequestNames,
	RequestReturnType,
	SchematicGroup as Group
} from '../../interfaces/schematic';

/**
 * The `NetworkEmitter` class provides an interface to send and listen for data. It offers full intellisense and type
 * checking when provided the input and output `SchematicGroup` types as `<I>` and `<O>`.
 *
 * To use this class, you must extend it and implement the following methods:
 *
 * - `_dispatch()` – Dispatches data to the transport.
 * - `_listen()` – Binds a listener to incoming data from the transport.
 */
export abstract class NetworkEmitter<I extends Group, O extends Group, E extends Events> extends EventEmitter<E> {

	/**
	 * Dispatches data to the transport and resolves once it has been sent and ack'd. If the `type` is a request, then
	 * the resolved value will be the value returned from the remote. Otherwise, no value is returned.
	 *
	 * The dispatched data should be buffered. If the connection is lost before the data is acknowledged by the remote,
	 * the promise will be held until it is resent, and will eventually reject if the data is dropped.
	 *
	 * @param options
	 */
	protected abstract _dispatch(options: DispatchOptions): Promise<any>;

	/**
	 * Listens for incoming data from the transport.
	 *
	 * @param options
	 */
	protected abstract _listen(options: ListenOptions): void;

	/**
	 * Emits an event to the remote. Returns a `Promise` which resolves once the event has been received.
	 *
	 * @param channel
	 * @param args
	 */
	public sendEvent(options: EmitOptions): Promise<void>;
	public sendEvent<C extends EventNames<O>>(channel: C, ...args: EventArgs<O, C>): Promise<void>;
	public sendEvent(channelOrOptions: EmitOptions | string, ...args: any[]): Promise<void> {
		if (typeof channelOrOptions === 'string') {
			return this._dispatch({
				type: MessageType.Event,
				channel: channelOrOptions,
				arguments: args
			});
		}

		return this._dispatch({
			type: MessageType.Event,
			...channelOrOptions
		});
	}

	/**
	 * Listens for and handles events from the remote.
	 *
	 * @param channel
	 * @param callback
	 */
	public onEvent<C extends EventNames<I>>(channel: C, callback: (...args: EventArgs<I, C>) => void): void {
		this._listen({
			type: MessageType.Event,
			channel,
			callback
		});
	}

	/**
	 * Listens for and handles events from the remote, but removes the listener after the first invocation.
	 *
	 * @param channel
	 * @param callback
	 */
	public onceEvent<C extends EventNames<I>>(channel: C, callback: (...args: EventArgs<I, C>) => void): void {
		this._listen({
			type: MessageType.Event,
			once: true,
			channel,
			callback
		});
	}

	/**
	 * Emits an event to the remote with raw binary data. Returns a `Promise` which resolves once the event has been
	 * received.
	 *
	 * @param channel
	 * @param data
	 * @param args
	 */
	public sendBinary(options: EmitOptions): Promise<void>;
	public sendBinary<C extends BinaryEventNames<O>>(channel: C, data: Uint8Array, ...args: BinaryEventArgs<O, C>): Promise<void>;
	public sendBinary(channelOrOptions: string | EmitOptions, data?: Uint8Array, ...args: any[]): Promise<void> {
		if (typeof channelOrOptions === 'string') {
			return this._dispatch({
				type: MessageType.Binary,
				channel: channelOrOptions,
				arguments: args,
				binary: data
			});
		}

		return this._dispatch({
			type: MessageType.Binary,
			...channelOrOptions
		});
	}

	/**
	 * Listens for and handles events from the remote that include raw binary data.
	 *
	 * @param channel
	 * @param callback
	 */
	public onBinary<C extends BinaryEventNames<I>>(channel: C, callback: (data: Uint8Array, ...args: BinaryEventArgs<I, C>) => void): void {
		this._listen({
			type: MessageType.Binary,
			channel,
			callback
		});
	}

	/**
	 * Listens for and handles events from the remote that include raw binary data, but removes the listener after the
	 * first invocation.
	 *
	 * @param channel
	 * @param callback
	 */
	public onceBinary<C extends BinaryEventNames<I>>(channel: C, callback: (data: Uint8Array, ...args: BinaryEventArgs<I, C>) => void): void {
		this._listen({
			type: MessageType.Binary,
			once: true,
			channel,
			callback
		});
	}

	/**
	 * Sends a request to the remote and resolves with the returned value.
	 *
	 * @param channel
	 * @param args
	 */
	public sendRequest(options: EmitOptions): Promise<Json>;
	public sendRequest<C extends RequestNames<O>>(channel: C, ...args: RequestArgs<O, C>): Promise<RequestReturnType<O, C>>;
	public sendRequest(channelOrOptions: string | EmitOptions, ...args: any[]): Promise<Json> {
		if (typeof channelOrOptions === 'string') {
			return this._dispatch({
				type: MessageType.Request,
				channel: channelOrOptions,
				arguments: args
			});
		}

		return this._dispatch({
			type: MessageType.Request,
			...channelOrOptions
		});
	}

	/**
	 * Listens for requests from the remote and handles them. The value returned by the callback will be sent to the
	 * requester.
	 *
	 * @param channel
	 * @param callback
	 */
	public onRequest<C extends RequestNames<I>>(channel: C, callback: (...args: RequestArgs<I, C>) => Promisable<RequestReturnType<I, C>>): void {
		this._listen({
			type: MessageType.Request,
			channel,
			callback
		});
	}

	/**
	 * Listens for requests from the remote and handles them. The value returned by the callback will be sent to the
	 * requester. Removes the listener after the first invocation.
	 *
	 * @param channel
	 * @param callback
	 */
	public onceRequest<C extends RequestNames<I>>(channel: C, callback: (...args: RequestArgs<I, C>) => Promisable<RequestReturnType<I, C>>): void {
		this._listen({
			type: MessageType.Request,
			once: true,
			channel,
			callback
		});
	}

}

/**
 * Internal options used to build and dispatch a message.
 */
export interface DispatchOptions extends EmitOptions {

	/**
	 * The type of message we want to build and dispatch.
	 */
	type: MessageType;

}

/**
 * Internal options used to bind a callback to incoming data.
 */
export interface ListenOptions {

	/**
	 * The name of the channel to listen for.
	 */
	channel: string;

	/**
	 * The type of message to listen for.
	 */
	type: MessageType;

	/**
	 * The callback to invoke when new data is available.
	 */
	callback: (...args: any[]) => any;

	/**
	 * Whether or not we should unbind the callback after its first invocation.
	 */
	once?: boolean;

}
