import { logger } from "./logger";
type Nullable<T> = T | null;

export class WebSocketer {
    public connection: WebSocket;
    private _logger: Nullable<logger> = null;

    constructor() { this.connection = new WebSocket('ws://localhost:3000', 'echo-protocol'); }

    set logger(log: logger) {
        this._logger = log;

        let Log = log.log;

        this.connection.onopen = (): void => {
            Log('Connected to the WebSocket server');
        };

        this.connection.onmessage = (event: MessageEvent): void => {
            Log('Received from server: ' + event.data);
        };

        this.connection.onclose = (event: CloseEvent): void => {
            Log('Connection closed: ' + event.reason);
        };

        this.connection.onerror = (error: Event): void => {
            Log('WebSocket error occurred.', false);
            console.error(error);
        };
    }

    public SendMessage(text: string): void {
        text = text.trim();
        if (text && this.connection.readyState === WebSocket.OPEN) {
            this.connection.send(text);
            if (this._logger != null) this._logger.log('Sent: ' + text);
        } else {
            if (this._logger != null) this._logger.log('WebSocket is not connected.');
        }
    }
}