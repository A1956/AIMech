import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

export default defineConfig({
  plugins: [
    vue(),
    Components({
      dts: false,
      resolvers: [ElementPlusResolver({ importStyle: 'css' })],
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  // 现阶段仅本机联调：dev/preview 绑定回环地址，不对外暴露。
  // 未来部署只依赖 build 产物 + 环境变量，不必改业务代码；上线时可把 host 改为 true 或 0.0.0.0。
  server: {
    host: '127.0.0.1',
    port: 5280,
    strictPort: false,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/llm': {
        target: 'http://127.0.0.1:3002',
        changeOrigin: true,
      },
      // 国内免费百度 TTS，规避浏览器跨域
      '/tts-baidu': {
        target: 'https://tts.baidu.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/tts-baidu/, '/text2audio'),
      },
    },
  },
  preview: {
    host: '127.0.0.1',
    port: 4180,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/llm': {
        target: 'http://127.0.0.1:3002',
        changeOrigin: true,
      },
      '/tts-baidu': {
        target: 'https://tts.baidu.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/tts-baidu/, '/text2audio'),
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    assetsDir: 'assets',
  },
})
