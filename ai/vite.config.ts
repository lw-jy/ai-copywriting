import { defineConfig } from "vite"
import vue from "@vitejs/plugin-vue"
import { copyFileSync } from "node:fs"
import { resolve } from "node:path"

const isExt = process.env.BUILD_MODE === "extension"

export default defineConfig({
  plugins: [
    vue(),

    // 插件构建完成后自动复制 manifest.json 和 icon
    isExt && {
      name: "copy-extension-assets",
      closeBundle() {
        const out = resolve(__dirname, "dist-extension")
        // 复制 manifest.json
        copyFileSync(resolve(__dirname, "manifest.json"), resolve(out, "manifest.json"))
      },
    },
  ].filter(Boolean),

  // 插件构建配置
  ...(isExt
    ? {
        root: __dirname,
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
                // background 入口需要输出为 extension.js（manifest 里引用这个路径）
                if (chunk.name === "background") return "extension.js"
                return "assets/[name]-[hash].js"
              },
            },
          },
          // 不压缩 extension.js（manifest V3 要求）
          minify: "esbuild",
        },
        define: {
          __IS_EXTENSION__: "true",
        },
      }
    : {
        // 标准 Web 构建 — 不变
        build: {
          outDir: "dist",
        },
        define: {
          __IS_EXTENSION__: "false",
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
