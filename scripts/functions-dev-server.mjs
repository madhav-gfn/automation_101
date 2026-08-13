// Local stand-in for the Nhost Functions runtime. Nhost Cloud deploys functions/**
// as individual serverless endpoints automatically (file path -> route, "_"-prefixed
// files/folders ignored) using real Express request/response objects; there's no
// local emulator available here (see README.md's "Why not the nhost/hasura CLI"),
// so this hand-rolls a minimal Express-compatible req/res shim around plain
// node:http and dispatches to the same handler files Nhost would deploy.
//
// Usage: node scripts/functions-dev-server.mjs
import "dotenv/config";
import http from "node:http";

const PORT = Number(process.env.FUNCTIONS_PORT || 3010);

const routes = {
  "/actions/trigger-workflow-run": () => import("../functions/actions/trigger-workflow-run.js"),
  "/actions/approve-step": () => import("../functions/actions/approve-step.js"),
  "/actions/webhook-trigger-run": () => import("../functions/actions/webhook-trigger-run.js"),
  "/events/on-external-event": () => import("../functions/events/on-external-event.js"),
  "/events/on-notify-step": () => import("../functions/events/on-notify-step.js"),
  "/cron/dispatch-scheduled-runs": () => import("../functions/cron/dispatch-scheduled-runs.js"),
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => (raw += chunk));
    req.on("end", () => resolve(raw));
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  const respond = (status, obj) => {
    res.writeHead(status, { "content-type": "application/json" });
    res.end(JSON.stringify(obj));
  };

  const loader = routes[url.pathname];
  if (!loader) return respond(404, { message: `no handler for ${url.pathname}` });

  let body = {};
  try {
    const raw = await readBody(req);
    body = raw ? JSON.parse(raw) : {};
  } catch {
    return respond(400, { message: "invalid JSON body" });
  }

  const shimReq = { headers: req.headers, body, query: Object.fromEntries(url.searchParams) };
  const shimRes = {
    status(code) {
      this._status = code;
      return this;
    },
    json(obj) {
      respond(this._status ?? 200, obj);
    },
  };

  try {
    const mod = await loader();
    await mod.default(shimReq, shimRes);
  } catch (err) {
    console.error(err);
    respond(500, { message: "internal error" });
  }
});

server.listen(PORT, () => {
  console.log(`functions dev server listening on http://localhost:${PORT}`);
  console.log(`routes: ${Object.keys(routes).join(", ")}`);
});
