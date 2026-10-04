import { createApp } from 'vue'
import { Socket } from './components/WebSocket';
import App from './App.vue'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'

const ws = new Socket;
const app = createApp(App);

app.mount('#app')

window.dispatchEvent(new CustomEvent('AppStart', {
    detail: {
        socket: ws
    }
}));

globalThis.Socket = ws