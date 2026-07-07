import { defineConfig } from "vite"
import vue from "@vitejs/plugin-vue"
import { copyFileSync } from "node:fs"
import { resolve } from "node:path"

const isExt = process.env.BUILD_MODE === "extension"

export default defineConfig({
  plugins: [
    vue(),

    // 插件构建完成后自动复制 manifest.json
    isExt && {
      name: "copy-extension-assets",
      closeBundle() {
        const out = resolve(__dirname, "dist-extension")
        copyFileSync(resolve(__dirname, "manifest.json"), resolve(out, "manifest.json"))
      },
    },
  ].filter(Boolean),

  // 插件构建配置
  ...(isExt
    ? {
        build: {
          outDir: "dist-extension",
          emptyOutDir: true,
          sourcemap: false,
          rollupOptions: {
            input: {
              main: resolve(__dirname, "extension.html"),
              background: resolve(__dirname, "src/extension.ts"),
            },
            output: {
              entryFileNames: (chunk) => {
                if (chunk.name === "background") return "extension.js"
                return "assets/[name]-[hash].js"
              },
            },
          },
          minify: "esbuild",
        },
      }
    : {
        build: {
          outDir: "dist",
        },
        server: {
          host: true,
          proxy: {
            "/api": {
              target: "http://127.0.0.1:8787",
              changeOrigin: true,
              configure: (proxy) => {
                proxy.on("proxyRes", (proxyRes) => {
                  proxyRes.headers["cache-control"] = "no-cache, no-transform"
                })
              },
            },
          },
        },
      }),
})
