export class logger {
    private logMenu: HTMLUListElement;

    constructor(menu: HTMLUListElement) { 
        this.logMenu = menu; 
    }

    public toggleVisibility() {
        this.logMenu.style.visibility = (this.logMenu.style.visibility == 'hidden') ? 'visible' : 'hidden';
    }

    public log(text: string): void {
        const li = document.createElement('li');
        li.textContent = text;
        this.logMenu.appendChild(li);
    }
}