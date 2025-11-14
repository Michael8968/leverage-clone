diff --git a/Dockerfile b/Dockerfile
index 8f7c1a2..c3e9d4f 100644
--- a/Dockerfile
+++ b/Dockerfile
@@ -36,7 +36,15 @@ COPY . .
 RUN npm run build
 
 # Ensure `public` is packaged into the standalone output so runtime can serve
-# static assets (manifest, videos, icons) directly from the standalone artifact.
-# Some build/deploy environments (including TCB) run the standalone server
-# without copying repository `public` into the final image; copying here makes
-# the standalone artifact self-contained.
-RUN if [ -d public ]; then mkdir -p .next/standalone/public && cp -a public/. .next/standalone/public/; fi
+# static assets (manifest, videos, icons) directly from the standalone artifact.
+# Some build/deploy environments (including TCB) run the standalone server
+# without copying repository `public` into the final image; copying here makes
+# the standalone artifact self-contained.
+# 添加验证日志，确保复制成功（关键！）
+RUN if [ -d public ]; then \
+      mkdir -p .next/standalone/public && \
+      cp -a public/. .next/standalone/public/ && \
+      echo "Copied public/ to .next/standalone/public/ (success)" && \
+      ls -la .next/standalone/public/ | head -10; \
+    else \
+      echo "public/ directory not found!"; \
+    fi
 
 # ===== Runtime Stage =====
 FROM node:20-alpine AS runtime
@@ -54,12 +62,21 @@ RUN addgroup -g 1001 -S nodejs && \
     adduser -S nextjs -u 1001 -G nodejs
 
 # Copy only necessary runtime files
-# Copy the standalone app first (it contains server.js). Then copy the
-# repository `public` into the standalone's `public` directory so the
-# standalone artifact serves static files directly. This avoids creating
-# nested `public/public` if both places are copied to different targets.
+# Copy the standalone app first (it contains server.js)
 COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
-COPY --from=builder --chown=nextjs:nodejs /app/public ./.next/standalone/public
+
+# 修复：不再从原始 /app/public 覆盖（避免覆盖 standalone 内的 public）
+# standalone 模式下，Next.js 只从 .next/standalone/public/ 提供静态资源
+# 额外创建根目录 public/ 供兼容性访问（/site.webmanifest 等）
+RUN mkdir -p public && \
+    if [ -d .next/standalone/public ]; then \
+      cp -a .next/standalone/public/. public/ && \
+      echo "Extracted standalone public to root public/ (success)" && \
+      ls -la public/ | head -10; \
+    else \
+      echo "Error: .next/standalone/public not found!"; \
+    fi
+
 COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
 # Next.js standalone already contains the required node_modules in .next/standalone
 # Do NOT copy full node_modules to significantly reduce image size
 