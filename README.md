# SSR Store

A small product catalogue that is rendered **on the server on every request**, built with the
Next.js App Router, TypeScript and Tailwind CSS on top of the free
[FakeStoreAPI](https://fakestoreapi.com).

Three pages, as specified:

| Route            | What it does                                                                  |
| ---------------- | ----------------------------------------------------------------------------- |
| `/products`      | Catalogue list, paginated through a `?page=` query param resolved on the server |
| `/products/[id]` | Product detail with metadata generated from the real product data              |
| `/admin`         | Protected area — the session cookie is verified on the server, never in the browser |

`/` redirects to `/products`, and `/login` exists to obtain a session.

---

## Stack

- **Next.js 16.3.5** (App Router) — the task asks for 14 or newer
- **React 19**, **TypeScript** in strict mode across the whole project (no `any`)
- **Tailwind CSS v4** — every component is hand-written; no UI library
- **No state manager, no client data fetching.** The only Client Components are the two error
  boundaries and the login form, and they exist purely for interactivity.

## Running it

```bash
npm install
cp .env.example .env.local   # then set AUTH_SECRET
npm run dev                  # http://localhost:3000
```

```bash
npm run build && npm run start   # production build
```

### Environment variables

| Variable         | Required                | Purpose                                                             |
| ---------------- | ----------------------- | ------------------------------------------------------------------- |
| `AUTH_SECRET`    | **yes in production**   | HMAC-SHA256 key that signs the session cookie (`openssl rand -base64 32`) |
| `ADMIN_EMAIL`    | no                      | Demo account, defaults to `admin@example.com`                        |
| `ADMIN_PASSWORD` | no                      | Demo account, defaults to `admin123`                                 |
| `API_BASE_URL`   | no                      | Defaults to `https://fakestoreapi.com`                               |

In development a fallback secret is used so the app runs with zero configuration. In production the
app **refuses** to sign a session without `AUTH_SECRET` — a known signing key would mean anyone
could forge an admin cookie.

---

## SSR decisions

| Page             | Type                                            | Reason                                                                                                                                                                                                     |
| ---------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `/products`      | **SSR** (dynamic, `no-store`)                   | Prices and stock are the kind of data that is wrong the moment it is stale, and the page is driven by `?page=`, which is request data. Every request performs a fresh read and a fresh render.               |
| `/products/[id]` | **SSR** (dynamic render + 300 s data cache)     | The page is rendered per request — it must be able to answer 404 for an unknown id and build its metadata from live data — but one product payload barely changes, so the *upstream call* may be reused for 5 minutes. Render is dynamic; only the fetch is amortised. |
| `/admin`         | **SSR** (dynamic, `no-store`, never cacheable)  | The output depends on a cookie. A cached response here would mean serving one user's authenticated page to somebody else. `force-dynamic` plus an uncached fetch makes that impossible.                      |

The root layout deliberately reads **no** cookies and **no** headers, so it stays static and each
route decides its own rendering behaviour on its own merits.

### Caching decision (the one explicit decision)

**`/products` uses `cache: "no-store"`.**

```ts
const response = await apiFetch("/products", { cache: "no-store" });
```

Why not the alternatives:

- **`force-cache`** would freeze the catalogue at the first request. A price change or a new product
  would never appear — and for a shop that is a correctness bug, not a performance trade-off.
- **`revalidate: N`** is the tempting middle ground, but it only pays off when many users hit the
  same rendered output. Here the task explicitly asks for a fresh read on every request, and the
  catalogue is a single small JSON document (~20 items, a few kB), so the saving would be a few
  milliseconds in exchange for serving data that is knowably out of date.
- **`no-store`** keeps the page honest: what the server sends is what the API says *now*. The
  timestamp printed under the page title makes this visible — reload and it changes.

Worth noting: since Next.js 15 `fetch` is **not** cached by default, so `no-store` is not what makes
this work — it is there to state the intent explicitly, so that nobody later "optimises" it by
adding a `revalidate` without thinking about what it costs.

The detail page takes the opposite decision on purpose (`next: { revalidate: 300 }`), to show that
the two questions — *when do we re-render?* and *when do we re-fetch?* — are separate.

---

## The deliberate cache bug

The task ships a data-fetching function with a cache-related defect. In this repository the defect,
its detection and its fix are visible in the git history:

- `feat(api): add FakeStoreAPI data layer with server-side pagination` introduces it
- `fix(cache): stop force-caching the product list` removes it

**The defect:** `getAllProducts()` fetched the catalogue with `cache: "force-cache"`.

**Why it is wrong:** `force-cache` puts the response in Next's persistent Data Cache with no
expiry. On Vercel that cache survives across requests, across users and across deployments-worth of
traffic, so:

1. the list page would keep serving the very first snapshot of the catalogue forever — new products
   and price changes never show up;
2. it silently contradicts the entire point of this page. The route still *renders* per request
   (`force-dynamic` and `searchParams` make sure of that), so the page looks dynamic — the
   timestamp under the heading keeps ticking — while the data behind it is frozen. That is the
   nastiest kind of caching bug: it is invisible in the UI and invisible in the route table, which
   still prints `ƒ (Dynamic)`.

**How it was found:** the route table showing `ƒ` for `/products` is not proof that the *data* is
fresh; pagination kept working (the slice is computed in our own code) so the symptom only appears
when the upstream data changes. Reading the fetch options is what exposes it.

**The fix:** `cache: "no-store"`, with a comment above it recording the decision, so the next person
to touch it has to make the decision consciously.

---

## Loading and error UI

Both are real files, not decoration, and both can be triggered on demand:

| URL                       | What happens                                                                             |
| ------------------------- | ---------------------------------------------------------------------------------------- |
| `/products?slow=1`        | the fetcher waits 2.5 s, so `app/products/loading.tsx` streams in first                   |
| `/products?fail=1`        | the fetcher throws, so `app/products/error.tsx` takes over with a "Try again" reset button |

`/products/[id]` has the same pair of boundaries.

## The 404 path

`/products/9999` and `/products/abc` are handled entirely on the server: `getProductById()` returns
`null`, the page calls `notFound()`, rendering of the segment stops and
`app/products/[id]/not-found.tsx` is what the browser receives. There is no client-side redirect and
no flash of an empty product layout.

FakeStoreAPI does not answer 404 for a missing id — it answers **200 with an empty body**, which
makes `response.json()` throw. The fetcher reads the body as text and treats empty, `null` or
id-less payloads as "not found".

### Why the 404 page answers with HTTP 200

Because this route streams (it has a `loading.tsx` boundary, and metadata is streamed), Next.js has
already committed to `200 OK` by the time `notFound()` fires, and injects
`<meta name="robots" content="noindex">` into the streamed HTML instead. This is documented
behaviour: *"Next.js will return a 200 HTTP status code for streamed responses, and 404 for
non-streamed responses"* (`not-found.js` API reference, Next.js 16).

A hard `404` status would require rejecting the request **before** the response body starts
streaming — i.e. an existence check in `proxy.ts`. I chose not to: it would add a blocking upstream
round-trip to *every* product page just to change a status code, while the page is already
`noindex`, so search engines do not index it. It is a deliberate trade-off, not an oversight, and
the alternative is a ten-line change if the requirement ever becomes "must answer 404".

---

## Authentication

- The session is a compact token — `base64url(payload).base64url(HMAC-SHA256)` — stored in an
  **httpOnly, sameSite=lax, secure-in-production** cookie with an 8-hour expiry.
- `src/lib/session.ts` uses **only Web Crypto and `TextEncoder`**, so the exact same verification
  code runs in the proxy and in Server Components. No `Buffer`, no Node-only API.
- `src/proxy.ts` (Next.js 16 renamed the `middleware.ts` convention to `proxy.ts`; the behaviour is
  identical) verifies the signature on every `/admin` request and redirects anonymous or tampered
  traffic to `/login?next=…` **before the page renders**. An invalid cookie is deleted on the way
  out.
- `/admin` then calls `requireSession()` and verifies the cookie **again**. The proxy is an
  optimisation; a protected page that trusts something outside itself to have done the check is one
  refactor away from leaking.
- The `?next=` target is validated, so `?next=https://evil.example` cannot turn the login form into
  an open redirect.

Sign in with `admin@example.com` / `admin123`.

---

## Architecture notes

```
src/
  app/
    layout.tsx              static shell — no request data read here
    page.tsx                redirect to /products
    not-found.tsx           app-wide 404
    products/
      page.tsx              SSR list, ?page= pagination, no-store
      loading.tsx           streamed skeleton
      error.tsx             error boundary (Client Component)
      [id]/
        page.tsx            SSR detail + generateMetadata + notFound()
        not-found.tsx       route-level custom 404
        loading.tsx / error.tsx
    login/
      page.tsx              redirects away if already signed in
      login-form.tsx        the only interactive form (useActionState)
      actions.ts            Server Actions: login / logout
    admin/page.tsx          protected, re-verifies the session itself
  components/               presentational, all Server Components
  lib/
    api.ts                  every upstream call lives here
    session.ts              runtime-agnostic sign/verify
    auth.ts                 cookie + guard helpers (server only)
  proxy.ts                  route protection before render
```

Decisions worth calling out:

- **One data layer.** No component fetches anything itself; `src/lib/api.ts` owns the base URL,
  the caching options, the error shape (`ApiError`) and the defensive parsing. Changing a caching
  decision means editing one line in one file.
- **Pagination is computed on the server.** FakeStoreAPI has no offset parameter, only `?limit=`, so
  the catalogue is read and sliced server-side. The browser receives only the six items it renders,
  and the page number is a URL — shareable, bookmarkable, crawlable, and it survives a hard reload.
- **Errors are normalised.** A network failure, a non-2xx response and a malformed payload all end
  up as the same `ApiError`, so `error.tsx` never has to guess what it is looking at.
- **Client Components are the exception.** Three in the whole app, each with a reason.

## Hardest part

Getting the *status code* of the 404 path right, and understanding why it could not be — described
above. It is the point where Next.js' streaming model stops being an implementation detail: the
response headers are gone before your `notFound()` runs, so "just return 404" is not a thing you can
decide inside the page. Working that out (and confirming it against the framework's own docs rather
than guessing) took longer than building the three pages.

Second place: making session verification work identically in the proxy and in a Server Component.
The proxy runs in a stripped-down runtime, so the usual `crypto`/`Buffer` reflexes do not apply —
hence the Web Crypto-only implementation in `src/lib/session.ts`.

## What I would add next

Caching by tag (`revalidateTag`) so an admin edit can invalidate exactly the affected product;
a real user store instead of an env-var account; and Suspense-per-section on the detail page so the
shell paints before the description arrives.

---

## ملخص بالعربية

**جدول قرارات SSR**

| الصفحة           | النوع                                      | السبب                                                                                                                       |
| ---------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| `/products`      | SSR — ديناميكي بالكامل، `no-store`         | الأسعار وقائمة المنتجات تتغيّر، والصفحة تعتمد على `?page=` وهي بيانات طلب. كل طلب = جلب جديد ورسم جديد على السيرفر.            |
| `/products/[id]` | SSR — رسم لكل طلب + تخزين بيانات ٥ دقائق    | الرسم يتم لكل طلب (لازم لإرجاع 404 ولبناء الميتاداتا من بيانات حقيقية)، لكن بيانات منتج واحد نادرة التغيّر فيُعاد استخدام نداء الـ API لخمس دقائق. |
| `/admin`         | SSR — ديناميكي، لا يُخزَّن إطلاقاً          | المخرجات تعتمد على الكوكي؛ أي تخزين هنا يعني تقديم صفحة مستخدم مُسجَّل لمستخدم آخر.                                            |

**مبرر قرار الـ Caching:** صفحة القائمة تستخدم `no-store`. الـ `force-cache` كان سيُجمّد الكتالوج عند
أول طلب فلا تظهر أي منتجات أو أسعار جديدة، والـ `revalidate` لا يُجدي هنا لأن الملف المطلوب صغير جداً
(~٢٠ عنصراً) فالمكسب أجزاء من الثانية مقابل بيانات نعلم أنها قديمة. أما صفحة التفاصيل فأخذت القرار
المعاكس عمداً (`revalidate: 300`) لإظهار أن سؤال «متى نُعيد الرسم؟» منفصل عن سؤال «متى نُعيد الجلب؟».

**الخطأ المقصود المرتبط بالـ Cache:** دالة `getAllProducts()` كانت تجلب الكتالوج بـ `force-cache`،
فتبقى الصفحة تبدو ديناميكية (الطابع الزمني يتغيّر، وجدول المسارات يعرض `ƒ`) بينما البيانات مُجمّدة
إلى الأبد. الإصلاح في الـ commit المسمّى `fix(cache)` مع توثيق السبب فوق السطر نفسه.

**أهم صعوبة:** رمز الحالة 404. بسبب الـ streaming يكون Next قد أرسل ترويسة `200 OK` قبل تنفيذ
`notFound()`، فيكتفي بحقن `noindex`؛ الحصول على 404 حقيقي يتطلّب رفض الطلب في `proxy.ts` قبل بدء
البث، وهو ما تجنّبته لأنه يضيف نداءً شبكياً حاجباً لكل صفحة منتج. التفاصيل في قسم
"Why the 404 page answers with HTTP 200" أعلاه.
