import { EventEmitter } from 'events';

// Use a global event emitter to communicate between data-fetching hooks and the error overlay.
class FirebaseErrorEmitter extends EventEmitter {}

export const errorEmitter = new FirebaseErrorEmitter();
