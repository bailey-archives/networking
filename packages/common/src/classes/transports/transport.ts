import { EventEmitter, EventEmitterSchema } from '../../utilities/events';

/**
 * A transport is used to send and receive data. The client and server will provide an instance of their target
 * transport, which they will use behind the scenes.
 *
 * Transports do not need to worry about serializing or parsing data. The client or server will handle those kinds of
 * operations. Instead, transports only need to worry about the actual sending and receiving of binary data.
 *
 * There are several things to consider when implementing a transport:
 *
 * - Transports are responsible for connecting to or starting a server.
 * - Transports must report their status using `emit()` events.
 * - Transports do not need to worry about authentication.
 * - Transports do not need to implement things like automatic reconnection.
 * - Transports can perform a handshake, but the library will automatically perform its own handshake as well.
 */
export abstract class Transport<S extends EventEmitterSchema> extends EventEmitter<S> {

}
