const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const assert = require("node:assert/strict");
const { test } = require("node:test");
const root = path.resolve(__dirname, "../..");
function load(file, mocks) {
  const module = { exports: {} };
  const code = ts.transpileModule(
    fs.readFileSync(path.join(root, file), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
  vm.runInNewContext(code, {
    module,
    exports: module.exports,
    require: (id) =>
      id in mocks
        ? mocks[id]
        : id.endsWith(".css")
          ? { default: {} }
          : require(id),
    sessionStorage: { getItem: () => "player" },
    setTimeout,
    clearTimeout,
    Date,
  });
  return module.exports;
}
const getRoomView = load("src/lib/roomView.ts", {}).getRoomView;
function render(file, status, options = {}) {
  const state = {
    room: { id: "ABCD", status, closed: options.closed },
    round: { id: "r", status, prompt: "cat", frozenPlayerIds: ["player"] },
  };
  const effects = [],
    setters = [],
    navigation = [];
  let calls = 0;
  const component = load(`src/routes/${file}.tsx`, {
    react: {
      useState: (value) => {
        const set = (next) => setters.push(next);
        calls++;
        return [
          file === "JoinRoom" && calls === 1
            ? "Player"
            : options.waiting && calls === 1
              ? true
              : value,
          set,
        ];
      },
      useRef: (current) => ({ current }),
      useEffect: (fn) => effects.push(fn),
    },
    "react-router-dom": {
      useParams: () => ({ roomId: "ABCD" }),
      useNavigate:
        () =>
        (...args) =>
          navigation.push(args),
    },
    "../hooks/useAsync": {
      useAsync: () => ({
        data: state,
        loading: false,
        error: options.error ?? null,
      }),
    },
    "../hooks/useAsyncAction": {
      useAsyncAction: () => ({ run: () => {}, loading: false, error: null }),
    },
    "../hooks/useCountdown": {
      useCountdown: () => ({ secondsLeft: 30, isExpired: false }),
    },
    "../lib/roomView": { getRoomView },
    "../lib/viewer": { getViewerRole: () => "PLAYER" },
    "../lib/session": {},
    "../lib/playersApi": {},
    "../lib/roomsApi": {},
    "../lib/submissionsApi": {},
    "@vercel/blob/client": {},
    "../components/DrawingCanvas/DrawingCanvas": {},
    "../components/GameError": { GameErrorPage: "ErrorPage" },
    "../components/GameLoading/GameLoading": { GameLoading: "Loading" },
    "./views/HostLobbyView": { HostLobbyView: "HostLobby" },
    "./views/HostDrawingView": { HostDrawingView: "HostDrawing" },
    "./views/PlayerDrawingView": { PlayerDrawingView: "PlayerDrawing" },
    "./views/PhaseMessageView": { PhaseMessageView: "PhaseMessage" },
  }).default;
  return { tree: component(), effects, setters, navigation };
}
function types(tree) {
  if (!tree || typeof tree !== "object") return [];
  if (Array.isArray(tree)) return tree.flatMap(types);
  return [tree.type, ...types(tree.props?.children)];
}
test("closed and lobby phases take precedence over stale round status", () => {
  assert.equal(
    getRoomView({ room: { status: "LOBBY" }, round: { status: "DONE" } }),
    "LOBBY",
  );
  assert.equal(
    getRoomView({
      room: { status: "DRAWING", closed: true },
      round: { status: "DRAWING" },
    }),
    "CLOSED",
  );
});
for (const status of ["SCORING", "SCORING_FAILED", "LOBBY", "DONE"]) {
  test(`player canvas is absent during ${status}`, () => {
    assert.ok(
      !types(render("JoinRoom", status).tree).includes("PlayerDrawing"),
    );
  });
}
test("player drawing phase mounts the canvas", () => {
  assert.ok(
    types(render("JoinRoom", "DRAWING").tree).includes("PlayerDrawing"),
  );
});
test("host polling error preserves an existing drawing view", () => {
  const tree = render("HostRoom", "DRAWING", {
    error: new Error("ROOM_LOAD_FAILED"),
  }).tree;
  assert.ok(types(tree).includes("HostDrawing"));
  assert.ok(!types(tree).includes("ErrorPage"));
});
test("host starting flag cannot hide scoring failure when drawing was missed", () => {
  const result = render("HostRoom", "SCORING_FAILED", { waiting: true });
  assert.ok(types(result.tree).includes("PhaseMessage"));
  result.effects.forEach((effect) => effect());
  assert.ok(result.setters.includes(false));
});
test("opening the player game in lobby navigates to the avatar route", () => {
  const result = render("JoinRoom", "LOBBY");
  result.effects.forEach((effect) => effect());
  assert.equal(result.navigation[0][0], "/room/ABCD/lobby");
});

test("round phase wins when polling catches a room transition between writes", () => {
  assert.equal(
    getRoomView({ room: { status: "DRAWING" }, round: { status: "SCORING" } }),
    "SCORING",
  );
});
