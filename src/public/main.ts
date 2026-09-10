import { createApp, ref } from 'vue'
import App from './App.vue'
import { WebSocketer } from './components/WebSocket';

const ws = new WebSocketer;
const app = createApp(App);

const handleDataFromVue = (data: string) => {
  console.log('Received in .ts file:', data)
}

app.provide('sendToTs', handleDataFromVue)

app.mount('#app')

window.dispatchEvent(new CustomEvent('AppStart', {
    detail: {
        websocket: ws
    }
}));