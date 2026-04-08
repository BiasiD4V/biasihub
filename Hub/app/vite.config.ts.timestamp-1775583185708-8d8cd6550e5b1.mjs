// vite.config.ts
import { defineConfig } from "file:///C:/Users/paulo/BIASI/BE%20-%20FILESERVER/10%20-%20DOCUMENTOS%20PADR%C3%83O/21%20-%20BIASIHUB/Hub/app/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/paulo/BIASI/BE%20-%20FILESERVER/10%20-%20DOCUMENTOS%20PADR%C3%83O/21%20-%20BIASIHUB/Hub/app/node_modules/@vitejs/plugin-react/dist/index.js";
import { VitePWA } from "file:///C:/Users/paulo/BIASI/BE%20-%20FILESERVER/10%20-%20DOCUMENTOS%20PADR%C3%83O/21%20-%20BIASIHUB/Hub/app/node_modules/vite-plugin-pwa/dist/index.js";
import { writeFileSync } from "fs";
var buildVersion = Date.now().toString();
var vite_config_default = defineConfig({
  plugins: [
    react(),
    {
      name: "version-file",
      buildStart() {
        writeFileSync("public/version.json", JSON.stringify({ v: buildVersion }));
      }
    },
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["logo-biasi.svg", "logo-biasi.png", "pwa-icon.svg"],
      manifest: {
        name: "Bias\xEDHub \u2014 Portal",
        short_name: "Bias\xEDHub",
        description: "Portal central Biasi Engenharia",
        theme_color: "#1e2a5e",
        background_color: "#1e2a5e",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "pwa-icon.svg", sizes: "192x192", type: "image/svg+xml", purpose: "any" },
          { src: "pwa-icon.svg", sizes: "512x512", type: "image/svg+xml", purpose: "any" },
          { src: "pwa-icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/vzaabtzcilyoknksvhrc\.supabase\.co\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-cache",
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 }
            }
          }
        ]
      }
    })
  ],
  define: {
    __BUILD_VERSION__: JSON.stringify(buildVersion)
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    chunkSizeWarningLimit: 1e3,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
          supabase: ["@supabase/supabase-js"]
        }
      }
    }
  },
  server: {
    port: 5174,
    proxy: {
      "/api": {
        target: "http://localhost:3002",
        changeOrigin: true
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxwYXVsb1xcXFxCSUFTSVxcXFxCRSAtIEZJTEVTRVJWRVJcXFxcMTAgLSBET0NVTUVOVE9TIFBBRFJcdTAwQzNPXFxcXDIxIC0gQklBU0lIVUJcXFxcSHViXFxcXGFwcFwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxccGF1bG9cXFxcQklBU0lcXFxcQkUgLSBGSUxFU0VSVkVSXFxcXDEwIC0gRE9DVU1FTlRPUyBQQURSXHUwMEMzT1xcXFwyMSAtIEJJQVNJSFVCXFxcXEh1YlxcXFxhcHBcXFxcdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzL3BhdWxvL0JJQVNJL0JFJTIwLSUyMEZJTEVTRVJWRVIvMTAlMjAtJTIwRE9DVU1FTlRPUyUyMFBBRFIlQzMlODNPLzIxJTIwLSUyMEJJQVNJSFVCL0h1Yi9hcHAvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJ1xuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0J1xuaW1wb3J0IHsgVml0ZVBXQSB9IGZyb20gJ3ZpdGUtcGx1Z2luLXB3YSdcbmltcG9ydCB7IHdyaXRlRmlsZVN5bmMgfSBmcm9tICdmcydcblxuY29uc3QgYnVpbGRWZXJzaW9uID0gRGF0ZS5ub3coKS50b1N0cmluZygpO1xuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICBwbHVnaW5zOiBbXG4gICAgcmVhY3QoKSxcbiAgICB7XG4gICAgICBuYW1lOiAndmVyc2lvbi1maWxlJyxcbiAgICAgIGJ1aWxkU3RhcnQoKSB7XG4gICAgICAgIHdyaXRlRmlsZVN5bmMoJ3B1YmxpYy92ZXJzaW9uLmpzb24nLCBKU09OLnN0cmluZ2lmeSh7IHY6IGJ1aWxkVmVyc2lvbiB9KSk7XG4gICAgICB9LFxuICAgIH0sXG4gICAgVml0ZVBXQSh7XG4gICAgICByZWdpc3RlclR5cGU6ICdhdXRvVXBkYXRlJyxcbiAgICAgIGluY2x1ZGVBc3NldHM6IFsnbG9nby1iaWFzaS5zdmcnLCAnbG9nby1iaWFzaS5wbmcnLCAncHdhLWljb24uc3ZnJ10sXG4gICAgICBtYW5pZmVzdDoge1xuICAgICAgICBuYW1lOiAnQmlhc1x1MDBFREh1YiBcdTIwMTQgUG9ydGFsJyxcbiAgICAgICAgc2hvcnRfbmFtZTogJ0JpYXNcdTAwRURIdWInLFxuICAgICAgICBkZXNjcmlwdGlvbjogJ1BvcnRhbCBjZW50cmFsIEJpYXNpIEVuZ2VuaGFyaWEnLFxuICAgICAgICB0aGVtZV9jb2xvcjogJyMxZTJhNWUnLFxuICAgICAgICBiYWNrZ3JvdW5kX2NvbG9yOiAnIzFlMmE1ZScsXG4gICAgICAgIGRpc3BsYXk6ICdzdGFuZGFsb25lJyxcbiAgICAgICAgc3RhcnRfdXJsOiAnLycsXG4gICAgICAgIGljb25zOiBbXG4gICAgICAgICAgeyBzcmM6ICdwd2EtaWNvbi5zdmcnLCBzaXplczogJzE5MngxOTInLCB0eXBlOiAnaW1hZ2Uvc3ZnK3htbCcsIHB1cnBvc2U6ICdhbnknIH0sXG4gICAgICAgICAgeyBzcmM6ICdwd2EtaWNvbi5zdmcnLCBzaXplczogJzUxMng1MTInLCB0eXBlOiAnaW1hZ2Uvc3ZnK3htbCcsIHB1cnBvc2U6ICdhbnknIH0sXG4gICAgICAgICAgeyBzcmM6ICdwd2EtaWNvbi5zdmcnLCBzaXplczogJ2FueScsIHR5cGU6ICdpbWFnZS9zdmcreG1sJywgcHVycG9zZTogJ21hc2thYmxlJyB9LFxuICAgICAgICBdLFxuICAgICAgfSxcbiAgICAgIHdvcmtib3g6IHtcbiAgICAgICAgZ2xvYlBhdHRlcm5zOiBbJyoqLyoue2pzLGNzcyxodG1sLGljbyxwbmcsc3ZnLHdvZmYyfSddLFxuICAgICAgICBydW50aW1lQ2FjaGluZzogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIHVybFBhdHRlcm46IC9eaHR0cHM6XFwvXFwvdnphYWJ0emNpbHlva25rc3ZocmNcXC5zdXBhYmFzZVxcLmNvXFwvLiovaSxcbiAgICAgICAgICAgIGhhbmRsZXI6ICdOZXR3b3JrRmlyc3QnLFxuICAgICAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgICAgICBjYWNoZU5hbWU6ICdzdXBhYmFzZS1jYWNoZScsXG4gICAgICAgICAgICAgIGV4cGlyYXRpb246IHsgbWF4RW50cmllczogNTAsIG1heEFnZVNlY29uZHM6IDYwICogNjAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgIH0sXG4gICAgfSksXG4gIF0sXG4gIGRlZmluZToge1xuICAgIF9fQlVJTERfVkVSU0lPTl9fOiBKU09OLnN0cmluZ2lmeShidWlsZFZlcnNpb24pLFxuICB9LFxuICBidWlsZDoge1xuICAgIG91dERpcjogJ2Rpc3QnLFxuICAgIHNvdXJjZW1hcDogZmFsc2UsXG4gICAgY2h1bmtTaXplV2FybmluZ0xpbWl0OiAxMDAwLFxuICAgIHJvbGx1cE9wdGlvbnM6IHtcbiAgICAgIG91dHB1dDoge1xuICAgICAgICBtYW51YWxDaHVua3M6IHtcbiAgICAgICAgICB2ZW5kb3I6IFsncmVhY3QnLCAncmVhY3QtZG9tJywgJ3JlYWN0LXJvdXRlci1kb20nXSxcbiAgICAgICAgICBzdXBhYmFzZTogWydAc3VwYWJhc2Uvc3VwYWJhc2UtanMnXSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgfSxcbiAgfSxcbiAgc2VydmVyOiB7XG4gICAgcG9ydDogNTE3NCxcbiAgICBwcm94eToge1xuICAgICAgJy9hcGknOiB7XG4gICAgICAgIHRhcmdldDogJ2h0dHA6Ly9sb2NhbGhvc3Q6MzAwMicsXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgIH0sXG4gICAgfSxcbiAgfSxcbn0pXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQTBjLFNBQVMsb0JBQW9CO0FBQ3ZlLE9BQU8sV0FBVztBQUNsQixTQUFTLGVBQWU7QUFDeEIsU0FBUyxxQkFBcUI7QUFFOUIsSUFBTSxlQUFlLEtBQUssSUFBSSxFQUFFLFNBQVM7QUFFekMsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsU0FBUztBQUFBLElBQ1AsTUFBTTtBQUFBLElBQ047QUFBQSxNQUNFLE1BQU07QUFBQSxNQUNOLGFBQWE7QUFDWCxzQkFBYyx1QkFBdUIsS0FBSyxVQUFVLEVBQUUsR0FBRyxhQUFhLENBQUMsQ0FBQztBQUFBLE1BQzFFO0FBQUEsSUFDRjtBQUFBLElBQ0EsUUFBUTtBQUFBLE1BQ04sY0FBYztBQUFBLE1BQ2QsZUFBZSxDQUFDLGtCQUFrQixrQkFBa0IsY0FBYztBQUFBLE1BQ2xFLFVBQVU7QUFBQSxRQUNSLE1BQU07QUFBQSxRQUNOLFlBQVk7QUFBQSxRQUNaLGFBQWE7QUFBQSxRQUNiLGFBQWE7QUFBQSxRQUNiLGtCQUFrQjtBQUFBLFFBQ2xCLFNBQVM7QUFBQSxRQUNULFdBQVc7QUFBQSxRQUNYLE9BQU87QUFBQSxVQUNMLEVBQUUsS0FBSyxnQkFBZ0IsT0FBTyxXQUFXLE1BQU0saUJBQWlCLFNBQVMsTUFBTTtBQUFBLFVBQy9FLEVBQUUsS0FBSyxnQkFBZ0IsT0FBTyxXQUFXLE1BQU0saUJBQWlCLFNBQVMsTUFBTTtBQUFBLFVBQy9FLEVBQUUsS0FBSyxnQkFBZ0IsT0FBTyxPQUFPLE1BQU0saUJBQWlCLFNBQVMsV0FBVztBQUFBLFFBQ2xGO0FBQUEsTUFDRjtBQUFBLE1BQ0EsU0FBUztBQUFBLFFBQ1AsY0FBYyxDQUFDLHNDQUFzQztBQUFBLFFBQ3JELGdCQUFnQjtBQUFBLFVBQ2Q7QUFBQSxZQUNFLFlBQVk7QUFBQSxZQUNaLFNBQVM7QUFBQSxZQUNULFNBQVM7QUFBQSxjQUNQLFdBQVc7QUFBQSxjQUNYLFlBQVksRUFBRSxZQUFZLElBQUksZUFBZSxLQUFLLEdBQUc7QUFBQSxZQUN2RDtBQUFBLFVBQ0Y7QUFBQSxRQUNGO0FBQUEsTUFDRjtBQUFBLElBQ0YsQ0FBQztBQUFBLEVBQ0g7QUFBQSxFQUNBLFFBQVE7QUFBQSxJQUNOLG1CQUFtQixLQUFLLFVBQVUsWUFBWTtBQUFBLEVBQ2hEO0FBQUEsRUFDQSxPQUFPO0FBQUEsSUFDTCxRQUFRO0FBQUEsSUFDUixXQUFXO0FBQUEsSUFDWCx1QkFBdUI7QUFBQSxJQUN2QixlQUFlO0FBQUEsTUFDYixRQUFRO0FBQUEsUUFDTixjQUFjO0FBQUEsVUFDWixRQUFRLENBQUMsU0FBUyxhQUFhLGtCQUFrQjtBQUFBLFVBQ2pELFVBQVUsQ0FBQyx1QkFBdUI7QUFBQSxRQUNwQztBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUFBLEVBQ0EsUUFBUTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sT0FBTztBQUFBLE1BQ0wsUUFBUTtBQUFBLFFBQ04sUUFBUTtBQUFBLFFBQ1IsY0FBYztBQUFBLE1BQ2hCO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
