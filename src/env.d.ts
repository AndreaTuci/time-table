/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const componente: DefineComponent<{}, {}, any>
  export default componente
}
