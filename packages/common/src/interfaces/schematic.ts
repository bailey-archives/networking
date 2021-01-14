import type { Json } from '../types/json';
import type { Key } from '../types/utilities';

/**
 * This interface is used to describe the types of data that the server and its clients can transfer in a TypeScript
 * project. It is important to ensure that the client and server always share the same exact version of the schematic.
 */
export interface Schematic {

	/**
	 * Describes the type of data that clients can send for authentication.
	 */
	authentication?: Json;

	/**
	 * Describes the data that clients can receive and handle. This enables autocompletion of events on both the client
	 * and server.
	 */
	client?: SchematicGroup;

	/**
	 * Describes the data that the server can receive and handle. This enables autocompletion of events on both the
	 * client and server.
	 */
	server?: SchematicGroup;

}

/**
 * This interface describes a group of events, streams, and other data that a connection can handle.
 */
export interface SchematicGroup {

	/**
	 * Describes the events that this group knows how to handle.
	 *
	 * The name of each property in this object is the channel of the event. The value can be any array or tuple type.
	 * If the value is an array, the channel will accept any number of parameters of the array's type.
	 *
	 * If the value is a tuple, the channel will accept the exact values in that tuple. You can also use named tuples
	 * to give names to the parameters.
	 */
	events?: {
		[name: string]: Json[];
	};

	/**
	 * Describes the raw events that this group knows how to handle. These events always accept raw binary data as
	 * their first parameter.
	 *
	 * The name of each property in this object is the channel of the event. The value can be any array or tuple type.
	 * If the value is an array, the channel will accept any number of parameters of the array's type.
	 *
	 * If the value is a tuple, the channel will accept the exact values in that tuple. You can also use named tuples
	 * to give names to the parameters.
	 */
	rawEvents?: {
		[name: string]: Json[];
	};

	/**
	 * Describes the streams that this group knows how to handle.
	 *
	 * The name of each property in this object is the channel of the stream. The value can be any array or tuple type.
	 * If the value is an array, the channel will accept any number of parameters of the array's type.
	 *
	 * If the value is a tuple, the channel will accept the exact values in that tuple. You can also use named tuples
	 * to give names to the parameters.
	 */
	streams?: {
		[name: string]: Json[];
	};

	/**
	 * Describes the requests that this group knows how to handle.
	 *
	 * The name of each property in this object is the channel of the request. The value must be an arrow function
	 * which defines the required parameters and the return value.
	 *
	 * The return values specified here will be automatically converted into a `Promisable` type to ensure that request
	 * handlers can run asynchronously.
	 */
	requests?: {
		[name: string]: (...args: Json[]) => Json;
	};

}

/**
 * Extracts the names of events from a `SchematicGroup`.
 */
export type EventNames<G extends SchematicGroup> = Key<G['events']>;

/**
 * Extracts the arguments of an event from a `SchematicGroup`.
 */
export type EventArgs<G extends SchematicGroup, K extends keyof NonNullable<G['events']>> =
	G extends undefined ? Json[] : (G['events'] extends undefined ? Json[] : NonNullable<G['events']>[K]);

/**
 * Extracts the names of raw events from a `SchematicGroup`.
 */
export type BinaryEventNames<G extends SchematicGroup> = Key<G['rawEvents']>;

/**
 * Extracts the arguments of a raw event from a `SchematicGroup`.
 */
export type BinaryEventArgs<G extends SchematicGroup, K extends keyof NonNullable<G['rawEvents']>> =
	G extends undefined ? Json[] : (G['rawEvents'] extends undefined ? Json[] : NonNullable<G['rawEvents']>[K]);

/**
 * Extracts the names of requests from a `SchematicGroup`.
 */
export type RequestNames<G extends SchematicGroup> = Key<G['requests']>;

/**
 * Extracts the arguments of a request from a `SchematicGroup`.
 */
export type RequestArgs<G extends SchematicGroup, K extends keyof NonNullable<G['requests']>> =
	G extends undefined ? Json[] : (G['requests'] extends undefined ? Json[] : Parameters<NonNullable<G['requests']>[K]>);

/**
 * Extracts the return type of a request from a `SchematicGroup`.
 */
export type RequestReturnType<G extends SchematicGroup, K extends keyof NonNullable<G['requests']>> =
	G extends undefined ? Json[] : (G['requests'] extends undefined ? Json[] : ReturnType<NonNullable<G['requests']>[K]>);

/**
 * Extracts the names of streams from a `SchematicGroup`.
 */
export type StreamNames<G extends SchematicGroup> = Key<G['streams']>;

/**
 * Extracts the arguments of a stream from a `SchematicGroup`.
 */
export type StreamArgs<G extends SchematicGroup, K extends keyof NonNullable<G['streams']>> =
	G extends undefined ? Json[] : (G['streams'] extends undefined ? Json[] : NonNullable<G['streams']>[K]);

