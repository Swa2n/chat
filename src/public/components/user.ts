export class user {
    public readonly userId: string;
    public readonly name: string;
    public readonly password: string;
    public readonly isGuest: boolean;

    constructor(userId: string = "-1", name: string = "guest", password: string = "123") {
        this.userId = userId;
        this.name = name;
        this.password = password
        if (userId == "-1") this.isGuest = true;
        else this.isGuest = false; 
    }
}