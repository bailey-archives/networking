/**
 * Defines the type of message being sent or received.
 */
export enum MessageType {
	/**
	 * This message is a system message (such as a ping or ack).
	 */
	System,

	/**
	 * This message is an event.
	 */
	Event,

	/**
	 * This message is a binary event.
	 */
	Binary,

	/**
	 * This message is a request.
	 */
	Request,

	/**
	 * This message is a response.
	 */
	Response,

	/**
	 * This message is a stream.
	 */
	Stream
}

/**
 * Defines the special flags of a payload within a message.
 */
export enum MessagePayloadType {
	/**
	 * This payload should be delivered as raw binary.
	 */
	Binary,

	/**
	 * This payload is JSON serializable and should be encoded over the network.
	 */
	Json
}
