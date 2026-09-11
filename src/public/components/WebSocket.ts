import { logger } from "./logger";
import { MessageData, socketMessageData } from "./interface"
import { json } from "stream/consumers";
type Nullable<T> = T | null;

export class Socket {
    public connection: WebSocket;
    private _logger: Nullable<logger> = null;

    constructor() {
        const isSecure = window.location.protocol == "https:";
        const protocol = isSecure ? "wss:" : "ws:";
        const host = window.location.host;
        const socketUrl = `${protocol}//${host}`;
        this.connection = new WebSocket(socketUrl, 'echo-protocol'); 
    }

    set logger(log: logger) {
        this._logger = log;

        let Log = log.log;

        this.connection.onopen = (): void => { Log('Connected to the WebSocket server'); };

        this.connection.onmessage = (event: MessageEvent): void => {
            const messageData = JSON.parse(event.data) as socketMessageData;
            if (messageData.type == "sendMessage"){
                const mesData = messageData.data as MessageData;

                const chat = document.getElementById('chat') as HTMLDListElement;
                console.log(event);

                const author = document.createElement('li');
                author.textContent = mesData.author;
                author.classList.add("col-sm-3");
                chat.appendChild(author);

                const message = document.createElement('li');
                message.textContent = mesData.message;
                message.classList.add("col-sm-9");
                chat.appendChild(message);
                Log('Received from server: ' + event.data); 
            }
        };

        this.connection.onclose = (event: CloseEvent): void => { Log('Connection closed: ' + event.reason); };

        this.connection.onerror = (error: Event): void => {
            Log('WebSocket error occurred, check browser console for more infomation.');
            console.error(error);
        };
    }

    public setUserName(name: string): void {
        name = name.trim();
        if (name && this.connection.readyState == WebSocket.OPEN) {
            this.connection.send(name);
        }
    }

    public SendMessage(text: string): void {
        text = text.trim();
        if (text && this.connection.readyState == WebSocket.OPEN) {
            const data: socketMessageData = { type: "sendMessage", data: { author: "cool", message: text }};
            this.connection.send(JSON.stringify(data));
            if (this._logger != null) this._logger.log('Sent: ' + text);
        } else {
            if (this._logger != null) this._logger.log('WebSocket is not connected.');
        }
    }
}