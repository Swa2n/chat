import { messageData } from "./interface";

let lastUser: string = "";
let lastSentMessage: HTMLLIElement;

export function addMessage(mes: messageData): void {
    if (mes.messageId == "-1") return;

    if (lastUser == mes.author.userId) {
        const newText = (document.getElementById("chat_text_clone") as HTMLSpanElement).cloneNode(true) as HTMLSpanElement;
        newText.textContent = mes.message;
        newText.id = mes.messageId;
        lastSentMessage.append(newText);
        return;
    }
    let chatTextBox = document.getElementById("chat_clone") as HTMLLIElement;

    lastUser = mes.author.userId;
    lastSentMessage = chatTextBox.cloneNode(true) as HTMLLIElement;
    lastSentMessage.id = "-1";
    Array.from(lastSentMessage.children).forEach(async element => {
        if (element.id == "chat_pfp_clone") {
            (element as HTMLImageElement).src = await globalThis.Socket.getProfile(mes.author.userId);
        } else if (element.id == "chat_name_clone") {
            element.textContent = mes.author.name;
            element.id = "name";
        } else if (element.id == "chat_text_clone") {
            element.textContent = mes.message;
            element.id = mes.messageId;
        }
    });
    (document.getElementById('chat') as HTMLDListElement).prepend(lastSentMessage);
}