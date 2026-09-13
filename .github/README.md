# Mây Vàng 🌾

Game nông trại nhỏ (trồng cây, chăn nuôi, thả cá) — canvas 2D, chạy hoàn toàn
trên trình duyệt, không cần server hay tài khoản. Lưu game bằng `localStorage`.

## Chạy thử local

```bash
npm install
npm run dev        # dev server, http://localhost:5173
npm run build      # build ra thư mục dist/
npm run preview    # xem thử bản build tĩnh
```

## Deploy lên GitHub Pages (tự động)

Repo đã có sẵn `.github/workflows/deploy-pages.yml`. Chỉ cần:

1. Push repo này lên GitHub.
2. Vào **Settings → Pages** → mục **Source**, chọn **GitHub Actions**.
3. Push lên nhánh `main` (hoặc bấm **Run workflow** thủ công) — Action sẽ tự
   `npm ci && npm run build:pages` rồi deploy thư mục `dist/`.

Build dùng đường dẫn tương đối (`base: "./"`), nên chạy đúng ở cả hai kiểu
deploy mà không cần sửa gì thêm:

- Site gốc: `https://<username>.github.io/`
- Site theo project: `https://<username>.github.io/<ten-repo>/`

## Deploy thủ công (không dùng Actions)

```bash
npm run build
# rồi đẩy nội dung thư mục dist/ lên nhánh gh-pages hoặc /docs của nhánh main
```

## Cấu trúc

```
index.html              entry point
src/main.tsx            mount thẳng <GameApp />, không router/SSR
src/components/game/    UI + canvas của game
src/lib/game/           logic thuần: world, save, audio, renderer...
public/game/            sprite + tile assets
```
