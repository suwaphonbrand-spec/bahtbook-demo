/* Service worker ของ Budget & Finance
   หน้าที่มีสองอย่าง: ทำให้ติดตั้งลงเครื่องได้ และเปิดใช้ได้ตอนไม่มีเน็ต

   กฎที่ห้ามพลาด: ข้อมูลของผู้ใช้กับขั้นตอนล็อกอินต้องไม่ถูกแคชเลย
   คำขอไปยัง googleapis.com และ accounts.google.com จึงปล่อยผ่านทั้งหมด
   ไม่แตะต้อง ไม่เก็บสำเนา                                                  */
const VERSION = "20261126183145";
const CACHE = "budget-finance-" + VERSION;
const SHELL = ["./", "./index.html", "./manifest.webmanifest",
  "./icon-192.png", "./icon-512.png", "./icon-maskable-512.png", "./icon-180.png"];

self.addEventListener("install", e => {
  // addAll ล้มทั้งชุดถ้าไฟล์ใดไฟล์หนึ่งพลาด จึงเก็บทีละไฟล์แบบยอมให้ขาดได้
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await Promise.all(SHELL.map(u => c.add(u).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE && k.indexOf("budget-finance-") === 0).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

async function networkFirst(req) {
  try {
    const res = await fetch(req);
    if (res && res.ok) { const c = await caches.open(CACHE); c.put(req, res.clone()); }
    return res;
  } catch (e) {
    const hit = await caches.match(req) || await caches.match("./index.html") || await caches.match("./");
    if (hit) return hit;
    throw e;
  }
}

async function cacheFirst(req) {
  const hit = await caches.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res && res.ok && res.type !== "opaque") { const c = await caches.open(CACHE); c.put(req, res.clone()); }
  return res;
}

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  let url;
  try { url = new URL(req.url); } catch (err) { return; }

  if (url.origin !== self.location.origin) {
    // ฟอนต์เก็บได้ เพราะไม่เปลี่ยนและช่วยให้เปิดออฟไลน์แล้วหน้าตายังถูกต้อง
    if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") e.respondWith(cacheFirst(req));
    return;   // ที่เหลือ โดยเฉพาะ Google Drive และการล็อกอิน ปล่อยผ่านตามปกติ
  }

  // ตัวหน้าแอพใช้ของใหม่ก่อนเสมอ ผู้ใช้จะได้เวอร์ชันล่าสุดโดยไม่ต้องกดอะไร
  if (req.mode === "navigate") { e.respondWith(networkFirst(req)); return; }
  e.respondWith(cacheFirst(req));
});
