# Ufly 上線準備清單 (Launch Readiness)

最後更新：2026-05-31

## ✅ 已完成並驗證（this work）

| 項目 | 狀態 | 驗證方式 |
|---|---|---|
| 司機↔客戶即時流程（上線→派單→接單→取件→送達） | ✅ | Playwright 端對端實跑 |
| 客戶即時追蹤地圖（司機位置即時移動） | ✅ | 移動司機 GPS，客戶地圖同步 |
| 搶單原子性（多司機同搶不會重複接單） | ✅ | 併發測試 6 司機×5 輪，每輪剛好 1 勝 |
| 地圖服務改 Mapbox（key-ready） | ✅ | build 通過；無 token 時 fallback OSM |
| 後端地址座標只算一次、存進訂單 | ✅ | serializer 回 pickup_lat/lng（省 API） |
| 逾時派單改「離取件點最近的司機」 | ✅ | code review；逾時 45s fallback |
| 代墊金額 (advance_amount) | ✅ | 欄位 + 序列化 + 建單可帶 |
| PWA（可加到主畫面） | ✅ | manifest + service worker + icon |
| Wake Lock（開著 App 時 GPS 不斷） | ✅ | useWakeLock hook，online/配送中啟用 |
| Admin 後台 API | ✅ | /admin/orders、/admin/drivers、/admin/stats → 200 |

## 🔑 上線前你要做的（只有你能做）

1. **填 Mapbox token**（地圖才會用商用服務，不再依賴免費 demo）
   - 前端：`.env` → `VITE_MAPBOX_TOKEN=pk....`（建議綁網域限制）
   - 後端：`backend/.env` → `MAPBOX_TOKEN=pk....`（運費距離 + 派單用）
   - 範本見 `.env.example` / `backend/.env.example`
   - 沒填也能跑（fallback 免費 OSM/Nominatim/OSRM），但**正式流量會被限流，務必填**

2. **金流 ECPay**：需要你的正式/測試商店代號與金鑰，並走一次真實付款 sandbox。本次未測。

3. **登入 OAuth（Google / LINE）**：需要正式 client id/secret + redirect URI 設定，需互動式登入測試。本次未測。

4. **背景定位（硬限制）**：目前已用 Wake Lock 緩解「App 開著時」不斷線。但手機**鎖屏/切到背景**時，純網頁仍會停止回傳位置。若司機需要鎖屏接單，必須包成**原生 App（Capacitor + 背景定位外掛）**——這需要你的 Apple/Google 開發者帳號與上架流程。

5. **真機實測**：本次用模擬 GPS。上線前請用真實手機（HTTPS 下）走一遍司機定位與客戶追蹤。

## 🟡 建議（非阻擋）

- OSM/OSRM/Nominatim 的免費備援保留著當 fallback，但填了 Mapbox 後主要走 Mapbox。
- 地圖載入是 Mapbox 主要成本來源；已做「座標後端只算一次、前端用存好的座標」降低呼叫量。
- 監控/錯誤追蹤（Sentry 等）、正式環境的 WSS（socket.io over HTTPS）請確認已就緒。

## 📌 環境變數總表

```
# backend/.env
MAPBOX_TOKEN=            # Mapbox 私有/公開 token（geocoding + directions）
GOOGLE_MAPS_API_KEY=     # 選用，Distance Matrix 優先於 Mapbox
DATABASE_URL=...
JWT_SECRET=...
PORT=4010
FRONTEND_URL=https://ufly.crownai.ink
GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET   # OAuth

# .env (frontend)
VITE_MAPBOX_TOKEN=       # pk.... 綁網域限制
```
