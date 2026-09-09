import { logger } from "./logger";

export class WebSocketer {
    public connection: WebSocket;

    constructor(log: logger) {
        let Log = log.log;
        this.connection = new WebSocket('ws://localhost:3000', 'echo-protocol');

        let sendButton: HTMLButtonElement = document.getElementById('sendButton') as HTMLButtonElement;

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
            Log('WebSocket error occurred.');
            console.error(error);
        };

        sendButton.addEventListener('click', () => {
            const messageInput: HTMLInputElement = document.getElementById('messageInput') as HTMLInputElement;
            const text = messageInput.value.trim();
            if (text && this.connection.readyState === WebSocket.OPEN) {
                this.connection.send(text);
                Log('Sent: ' + text);
                messageInput.value = '';
            } else {
                Log('WebSocket is not connected.');
            }
        });
    }


    
}