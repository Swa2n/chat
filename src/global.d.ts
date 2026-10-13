declare module '*.css';
declare module '*.vue';

declare module '*.webp' {
  const value: string;
  export default value;
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

var Socket: import("./public/components/WebSocket").Socket;
var User: import("./public/components/interface").user;
var Call: import("./public/components/interface").Nullable<import("./public/components/rtcConnection").Call>;
var StartUserCamera: Function;

var allUserData: Record<string, import("./server/serverInterface").userData>;
var sentMessages: [import("./public/components/interface").messageData];
