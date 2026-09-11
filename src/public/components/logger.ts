import { LogData } from "./interface";
type Nullable<T> = T | null;

export class logger {
    private logMenu: HTMLDListElement;

    constructor(menu: HTMLDListElement) {
        this.logMenu = (menu != undefined) ? menu : document.getElementById("log") as HTMLDListElement;
        window.addEventListener('log', (event) => {
            const customEvent = event as CustomEvent;
            const data = customEvent.detail as LogData;
            this.log(data.message, data.args);
        })
    }

    public toggleVisibility = () => {
        this.logMenu.style.visibility = (this.logMenu.style.visibility == 'hidden' || !this.logMenu.style.visibility) ? 'visible' : 'hidden';
    }

    public log = (text: string, args: Nullable<any[]> = null, consoleLog: boolean = true): void => {
        if (consoleLog) if (args != null) console.log(text, args);
            else console.log(text)
        let message: string = text;
        args?.forEach(arg => {message += `, ${arg}`})
        const li = document.createElement('li');
        li.textContent = message;
        this.logMenu.appendChild(li);
    }
}