export class logger {
    private logMenu: HTMLDListElement;

    constructor(menu: HTMLDListElement) {
        this.logMenu = (menu != undefined) ? menu : document.getElementById("log") as HTMLDListElement;
    }

    public toggleVisibility = () => {
        this.logMenu.style.visibility = (this.logMenu.style.visibility == 'hidden' || !this.logMenu.style.visibility) ? 'visible' : 'hidden';
    }

    public log = (text: string, consoleLog: boolean = true): void => {
        if (consoleLog) console.log(text);
        const li = document.createElement('li');
        li.textContent = text;
        this.logMenu.appendChild(li);
    }
}