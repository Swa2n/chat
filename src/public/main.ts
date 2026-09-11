import { createApp, ref } from 'vue'
import { Socket } from './components/WebSocket';
import App from './App.vue'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'

const ws = new Socket;
const app = createApp(App);

const setUserName = (data: string) => {}

const sendMessageToServer = (data: string) => { ws.SendMessage(data); }
app.provide('sendMessageToServer', sendMessageToServer)

app.mount('#app')

window.dispatchEvent(new CustomEvent('AppStart', {
    detail: {
        socket: ws
    }
}));