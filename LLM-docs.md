# imeji-server :: LLM CONTEXT SPEC

PURPOSE: backend API for a brainstorming / knowledge-visualization app. User brainstorms a topic; concepts are stored as a tree; frontend renders the tree as (a) markmap mindmap and (b) force-directed knowledge graph (obsidian-style). This file is the contract for the FRONTEND. All facts below are derived from source; do not infer beyond.

STACK: Bun + Hono. DB=Neon Postgres + Drizzle. Auth=better-auth (+bearer plugin). AI=Vercel AI SDK v6 (OpenAI). Validation=zod.

BASE_URL: env `BETTER_AUTH_URL` (dev: http://localhost:3000)
CONTENT_TYPE: request bodies MUST be `application/json` (non-json mutating requests → 403 CSRF).
RESPONSE: JSON unless noted. Errors: `{ "error": string }`.
TIMESTAMPS: ISO-8601 strings (Date serialized).
IDS: mindmap.id / concept.id = uuid v4. user.id = better-auth string id.

---

## AUTH (bearer)

MODE: stateless bearer token in header `Authorization: Bearer <token>`. Cookies also work but FRONTEND SHOULD USE BEARER.

TOKEN ACQUISITION: on sign-up/sign-in, token is in response header `set-auth-token` AND body field `token`. Persist it. Attach to every protected call.

```
POST /api/auth/sign-up/email   body {email,password,name}  -> {token,user}
POST /api/auth/sign-in/email   body {email,password}       -> {token,user} ; header set-auth-token
POST /api/auth/sign-out
GET  /api/auth/*               (full better-auth surface)
GET  /me                       -> {user, session}  (null,null if unauthenticated)
```

PROTECTED = every `/api/mindmaps/*` and `/api/chat`. Missing/invalid token → 401.

---

## DATA MODEL

```ts
type Mastery = 'unknown' | 'learning' | 'known'   // default 'learning'

type Mindmap = {
  id: string            // uuid
  userId: string        // owner (better-auth id)
  title: string         // 1..200
  createdAt: string
  updatedAt: string
}

type Concept = {
  id: string            // uuid
  mapId: string         // FK Mindmap.id
  parentId: string | null   // FK Concept.id ; null = root
  label: string         // 1..500
  detail: string | null // 0..5000
  mastery: Mastery
  position: number      // int >=0, sibling order (ascending)
  createdAt: string
  updatedAt: string
}

type ConceptNode = Concept & { children: ConceptNode[] }  // tree form, children sorted by position asc
```

OWNERSHIP: every concept belongs to a mindmap; every mindmap belongs to one user. Cross-user access → 404 (existence hidden, not 403).
CASCADE: delete mindmap → its concepts deleted. delete concept → its descendant concepts deleted.

---

## ENDPOINTS (all require Bearer)

```
GET    /api/mindmaps?limit=&offset=
       limit 1..100 (def 20), offset >=0 (def 0)
       -> { items: Array<{ id, title, conceptCount:number, createdAt, updatedAt }> }
       ORDER: updatedAt desc

POST   /api/mindmaps
       body { title }                    -> 201 Mindmap

GET    /api/mindmaps/:mapId              -> Mindmap & { concepts: ConceptNode[] }   // TREE

PATCH  /api/mindmaps/:mapId
       body { title }                    -> Mindmap

DELETE /api/mindmaps/:mapId              -> { ok: true }

GET    /api/mindmaps/:mapId/markdown     -> text/markdown   (FEED TO markmap)
GET    /api/mindmaps/:mapId/graph        -> { nodes, links } (FEED TO force-graph)

POST   /api/mindmaps/:mapId/concepts
       body { label, detail?, parentId?, mastery?, position? }   -> 201 Concept
       parentId (if set) MUST exist in same map else 400

PATCH  /api/mindmaps/:mapId/concepts/:conceptId
       body partial { label?, detail?|null, parentId?|null, mastery?, position? }   -> Concept
       >=1 field required (else 400)
       parentId rules: != self, must exist in map, must not create cycle (else 400)
       parentId:null = move to root

DELETE /api/mindmaps/:mapId/concepts/:conceptId   -> { ok: true }
```

STATUS CODES: 200 ok / 201 created / 400 validation|bad-parent|cycle / 401 unauth / 403 csrf(non-json) / 404 not-found|not-owned / 413 body>1MB / 429 rate-limited / 500 server.
RATE LIMIT: ~100 req/60s per IP global; auth endpoints stricter. On 429 read `RateLimit` header.

---

## GRAPH PAYLOAD (/graph)

```ts
{
  nodes: Array<{ id: string; name: string; group: Mastery }>   // id=concept.id, name=label, group=mastery
  links: Array<{ source: string; target: string }>            // one per concept with parentId: source=parentId target=concept.id
}
```
NOTE: links are derived from the tree (parent->child). No cross-tree links exist in current schema.

---

## RENDER: markmap (mindmap view)

INPUT = GET /:mapId/markdown (a markdown string: `# <title>` then nested `- <label>` bullets; each detail is a child `- <detail>`).

```ts
import { Transformer } from 'markmap-lib'
import { Markmap } from 'markmap-view'

const md = await fetch(`${BASE}/api/mindmaps/${mapId}/markdown`, {
  headers: { Authorization: `Bearer ${token}` },
}).then(r => r.text())

const { root } = new Transformer().transform(md)
Markmap.create(svgElement, undefined, root)   // svgElement: an <svg> in DOM
```
markmap is READ-ONLY visualization. To change the map, call the concept CRUD endpoints, then refetch markdown and re-create.

---

## RENDER: force-graph (knowledge graph view, obsidian-style)

INPUT = GET /:mapId/graph -> { nodes, links }. Color nodes by `group` (mastery).

```ts
import ForceGraph2D from 'react-force-graph-2d'

const data = await fetch(`${BASE}/api/mindmaps/${mapId}/graph`, {
  headers: { Authorization: `Bearer ${token}` },
}).then(r => r.json())

<ForceGraph2D
  graphData={data}
  nodeLabel="name"
  nodeAutoColorBy="group"   // unknown|learning|known => distinct colors
/>
```
MASTERY->COLOR SUGGESTION: known=solid/green, learning=amber, unknown=gray. Map in node paint or via nodeAutoColorBy.

---

## CLIENT FLOW (typical)

```
1. auth: sign-in -> store token (set-auth-token)
2. create map: POST /api/mindmaps {title} -> mapId
3. add concepts: POST /api/mindmaps/:mapId/concepts {label, parentId?, mastery?}
   (root concept: omit parentId; child: pass parent's id)
4. view: GET /:mapId (tree) | /:mapId/markdown (markmap) | /:mapId/graph (force-graph)
5. edit: PATCH concept (label/detail/mastery/parentId/position)
6. reorder siblings: PATCH concept { position }
7. delete: DELETE concept | DELETE map
```

INVARIANTS FRONTEND MUST RESPECT:
- always send Authorization: Bearer on protected calls
- always set Content-Type: application/json on POST/PATCH/DELETE with body
- treat 404 as "not found OR not yours" (do not distinguish)
- parentId edits: never point a node into its own subtree (server rejects with 400)
- after any mutation, re-fetch the affected view (no client-side source of truth assumed)

NOT IMPLEMENTED (do not call): cross-tree concept links, AI auto-extraction endpoint, sharing/collaboration, realtime. If needed, request backend changes first.
