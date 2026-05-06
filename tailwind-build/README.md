# Tailwind CSS 构建

生产环境的 Tailwind CSS 编译目录。**正常情况不需要手动运行**——`css/tailwind.min.css` 已经是构建好的产物。

## 何时需要重新构建

- 在 HTML 中新增了**之前从未用过**的 Tailwind 类（例如 `text-purple-500`、`grid-cols-7`）
- 升级 Tailwind 版本

## 重新构建步骤

```bash
cd tailwind-build
npm install                 # 首次需要
./node_modules/.bin/tailwindcss -i input.css -o ../css/tailwind.min.css --minify
```

或加 `--watch` 持续监听：

```bash
./node_modules/.bin/tailwindcss -i input.css -o ../css/tailwind.min.css --minify --watch
```

## 配置说明

- `tailwind.config.js` 的 `content: ["../*.html"]` 扫描所有上级 html 文件，自动 tree-shake
- `input.css` 是 Tailwind 三大入口指令（base / components / utilities）
- 输出是上级 `css/tailwind.min.css`（约 47KB）

## 体积对比

- 旧 dev 版 `js/tailwind.js`：407KB（运行时编译）
- 新 prod 版 `css/tailwind.min.css`：47KB（-88%）
