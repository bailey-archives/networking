import type { Key } from '../types/utilities';

/**
 * A simple, cross-platform event emitter with a familiar interface.
 */
export class EventEmitter<S extends EventEmitterSchema = EventEmitterSchema> {

	private _onListeners = new Map<string, Set<Callback>>();
	private _onceListeners = new Map<string, Set<Callback>>();

	/**
	 * Listens for an event.
	 *
	 * @param event
	 * @param callback
	 */
	public on<E extends Key<S>>(event: E, callback: (...args: S[E]) => void): this {
		if (!this._onListeners.has(event)) {
			this._onListeners.set(event, new Set());
		}

		this._onListeners.get(event)!.add(callback);

		return this;
	}

	/**
	 * Listens for an event once.
	 *
	 * @param event
	 * @param callback
	 */
	public once<E extends Key<S>>(event: E, callback: (...args: S[E]) => void): this {
		if (!this._onceListeners.has(event)) {
			this._onceListeners.set(event, new Set());
		}

		this._onceListeners.get(event)!.add(callback);

		return this;
	}

	/**
	 * Removes the listener for an event.
	 *
	 * @param event
	 * @param callback
	 */
	public removeListener<E extends Key<S>>(event: E, callback: (...args: S[E]) => void): void {
		if (this._onListeners.has(event)) {
			this._onListeners.get(event)!.delete(callback);
		}

		if (this._onceListeners.has(event)) {
			this._onceListeners.get(event)!.delete(callback);
		}
	}

	/**
	 * Removes all listeners for an event, or all listeners on the entire object if an event is not provided.
	 *
	 * @param event
	 */
	public removeAllListeners<E extends Key<S>>(event?: E) {
		if (typeof event === 'string') {
			this._onListeners.delete(event);
			this._onceListeners.delete(event);
		}

		else if (typeof event === 'undefined' || event === null) {
			this._onListeners.clear();
			this._onceListeners.clear();
		}

		else {
			throw new Error('Expected string or undefined, got ' + typeof event);
		}
	}

	/**
	 * Emits an event to listeners.
	 *
	 * @param event
	 * @param args
	 */
	protected _emit<E extends Key<S>>(event: E, ...args: S[E]) {
		// Aggregate all matching callbacks
		const callbacks = [
			...(this._onListeners.has(event) ? this._onListeners.get(event)! : []),
			...(this._onceListeners.has(event) ? this._onceListeners.get(event)! : [])
		];

		// Remove once listeners
		this._onceListeners.delete(event);

		// Execute all callbacks
		for (const callback of callbacks) {
			callback.apply(this, args);
		}

		// Throw errors with no listeners
		if (callbacks.length === 0 && event === 'error') {
			throw args[0];
		}
	}

}

type Callback = (...args: any) => void;

/**
 * A schematic for describing the events that can be emitted by an `EventEmitter`.
 */
export interface EventEmitterSchema {
	[name: string]: any[];
}
