const $ = (s) => document.querySelector(s),
  text = (s, v) => {
    $(s).textContent = v;
  };
const data = {
  "chapa-2": {
    number: "2",
    title: "Somos Chapa 2",
    category: "Enfermeiros · Quadro I",
    headline: "Juntos por uma enfermagem mais forte.",
    description:
      "Mais proximidade, valorização e presença em todo o Amazonas. Conheça a chapa que representa os enfermeiros.",
    members: [
      "Aderlaine Sabino",
      "Carlem Gonçalves",
      "Amanda Picanço",
      "Maria Alex Sandra",
      "Eurides Souza",
      "Marcílio Viana",
      "Janaína Dias",
      "Maria José Dias",
    ],
    pdfs: [2],
  },
  "chapa-1": {
    number: "1",
    title: "Eu sou Chapa 1",
    category: "Técnicos e auxiliares · Quadros II e III",
    headline: "A força de quem cuida todos os dias.",
    description:
      "Representação para técnicos e auxiliares de enfermagem, com propostas de qualificação, valorização e melhores condições de trabalho.",
    members: [
      "Francisco Zambrano",
      "Ivan Damasceno",
      "Vitória Veras",
      "Rizete Santana",
      "Elizna Pinheiro",
      "Júlio Cunha",
    ],
    pdfs: [1],
  },
  "duas-chapas": {
    number: "2+1",
    title: "Chapa 2 + Chapa 1",
    category: "Enfermeiros, técnicos e auxiliares",
    headline: "Duas chapas. Um time pelo Amazonas.",
    description:
      "Chapa 2 para enfermeiros e Chapa 1 para técnicos e auxiliares. Na moldura conjunta, a sequência de apoio da campanha é 2 → 1, respeitando a representação de cada categoria.",
    members: [],
    pdfs: [2, 1],
  },
};
data["duas-chapas"].members = [
  ...data["chapa-2"].members.map((n) => `${n} · Chapa 2`),
  ...data["chapa-1"].members.map((n) => `${n} · Chapa 1`),
];
const proposals = [
  [
    "Mais perto de você",
    "Interiorização, presença nos rios e comunidades e atendimento humanizado.",
  ],
  [
    "Formação e valorização",
    "Cursos gratuitos, qualificação e defesa de condições dignas de trabalho.",
  ],
  [
    "Cuidado com quem cuida",
    "Saúde mental, combate à violência e ao assédio e rede solidária.",
  ],
  [
    "Serviços e transparência",
    "Atendimento digital, participação da categoria e prestação de contas.",
  ],
];
const canvas = $("#canvas"),
  ctx = canvas.getContext("2d"),
  API = "/api/campaign";
const state = {
  frame: "chapa-2",
  photo: null,
  frames: {},
  zoom: 1,
  x: 500,
  y: 277,
  base: 1,
  revision: 0,
  ready: null,
  timer: null,
  loadId: 0,
  busy: false,
};
const saved = {
  get(k, fallback) {
    try {
      return JSON.parse(localStorage.getItem(k)) ?? fallback;
    } catch {
      return fallback;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch {}
  },
};
let owners = saved.get("coren-wall-owners", {}),
  registered = new Set(),
  pendingRecords = new Map();
let counts = null;
function showSelectedCount() {
  text(
    "#selected-download-count",
    counts
      ? `${new Intl.NumberFormat("pt-BR").format(counts[state.frame] || 0)} downloads desta moldura`
      : "Contador desta moldura indisponível",
  );
}
function status(message, error = false) {
  text("#action-status", message);
  $("#action-status").classList.toggle("error", error);
}
function setEnabled() {
  const yes = !!state.ready && !state.busy;
  $("#download").disabled = !yes;
  $("#share").disabled = !yes;
  $("#adjustments").disabled = !state.photo;
}
function draw() {
  ctx.fillStyle = "#edf1eb";
  ctx.fillRect(0, 0, 1000, 1000);
  if (state.photo) {
    const w = state.photo.width * state.base * state.zoom,
      h = state.photo.height * state.base * state.zoom;
    ctx.drawImage(state.photo, state.x - w / 2, state.y - h / 2, w, h);
  } else {
    ctx.strokeStyle = "#dce5da";
    ctx.lineWidth = 1;
    for (let x = 0; x < 1000; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 550);
      ctx.stroke();
    }
    for (let y = 0; y < 550; y += 50) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1000, y);
      ctx.stroke();
    }
  }
  if (state.frames[state.frame])
    ctx.drawImage(state.frames[state.frame], 0, 0, 1000, 1000);
}
function invalidate() {
  state.revision++;
  state.ready = null;
  clearTimeout(state.timer);
  draw();
  setEnabled();
  if (state.photo && state.frames[state.frame]) {
    const rev = state.revision;
    state.timer = setTimeout(() => prepare(rev), 150);
  }
}
function toBlob(c) {
  return new Promise((resolve, reject) =>
    c.toBlob(
      (b) =>
        b
          ? resolve(b)
          : reject(new Error("Não foi possível preparar a imagem.")),
      "image/png",
    ),
  );
}
async function prepare(rev) {
  try {
    const copy = document.createElement("canvas");
    copy.width = copy.height = 1000;
    copy.getContext("2d").drawImage(canvas, 0, 0);
    const thumbnail = document.createElement("canvas");
    thumbnail.width = thumbnail.height = 320;
    thumbnail.getContext("2d").drawImage(copy, 0, 0, 320, 320);
    const blob = await toBlob(copy);
    if (rev !== state.revision) return;
    const frame = state.frame;
    state.ready = {
      id: crypto.randomUUID(),
      frame,
      blob,
      file: new File([blob], `apoio-${frame}-coren-am-2026.png`, {
        type: "image/png",
      }),
      thumbnail: thumbnail.toDataURL("image/jpeg", 0.82),
    };
    setEnabled();
  } catch (e) {
    status(e.message, true);
  }
}
function reset() {
  state.zoom = 1;
  state.x = 500;
  state.y = 500;
  state.base = state.photo
    ? Math.max(
        1000 / state.photo.width,
        1000 / state.photo.height,
      )
    : 1;
  $("#zoom").value = 100;
  text("#zoom-value", "100%");
  invalidate();
}
function choose(frame) {
  if (!data[frame]) frame = "chapa-2";
  state.frame = frame;
  saved.set("coren-frame", frame);
  const d = data[frame];
  document.querySelectorAll("[data-frame]").forEach((b) => {
    const yes = b.dataset.frame === frame;
    b.classList.toggle("selected", yes);
    b.setAttribute("aria-pressed", yes);
  });
  text("#selected-category", d.category.toUpperCase());
  text("#selected-title", d.headline);
  text("#selected-description", d.description);
  text("#download-title", d.title);
  text("#download-category", d.category);
  showSelectedCount();
  text("#about-number", d.number);
  text("#about-category", d.category.toUpperCase());
  text("#about-title", d.title);
  text("#about-description", d.description);
  $("#members").replaceChildren(
    ...d.members.map((n) => {
      const el = document.createElement("li");
      el.textContent = n;
      return el;
    }),
  );
  $("#pdf-links").replaceChildren(
    ...d.pdfs.map((n) => {
      const a = document.createElement("a");
      a.href = `assets/propostas-chapa-${n}.pdf`;
      a.target = "_blank";
      a.rel = "noopener";
      a.textContent = `Ver panfleto da Chapa ${n} ↗`;
      return a;
    }),
  );
  $("#upload-overlay").style.height = frame === "duas-chapas" ? "51%" : "55.4%";
  invalidate();
}
$("#proposal-grid").replaceChildren(
  ...proposals.map(([title, description]) => {
    const a = document.createElement("article"),
      h = document.createElement("strong"),
      p = document.createElement("p");
    h.textContent = title;
    p.textContent = description;
    a.append(h, p);
    return a;
  }),
);
document
  .querySelectorAll("[data-frame]")
  .forEach((b) => b.addEventListener("click", () => choose(b.dataset.frame)));
function imageLoad(url) {
  return new Promise((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = reject;
    im.src = url;
  });
}
$("#photo").addEventListener("change", async (e) => {
  const f = e.target.files?.[0];
  if (!f) return;
  const loadId = ++state.loadId;
  if (f.size > 35 * 1024 * 1024) {
    text("#photo-status", "Escolha uma foto de até 35 MB.");
    return;
  }
  text("#photo-status", "Abrindo sua foto…");
  state.ready = null;
  setEnabled();
  let original;
  try {
    try {
      original = await createImageBitmap(f, { imageOrientation: "from-image" });
    } catch {
      const url = URL.createObjectURL(f);
      try {
        original = await imageLoad(url);
      } finally {
        URL.revokeObjectURL(url);
      }
    }
    if (loadId !== state.loadId) {
      original.close?.();
      return;
    }
    const source = document.createElement("canvas");
    const factor = Math.min(
      1,
      2400 / Math.max(original.width, original.height),
    );
    source.width = Math.round(original.width * factor);
    source.height = Math.round(original.height * factor);
    source
      .getContext("2d")
      .drawImage(original, 0, 0, source.width, source.height);
    original.close?.();
    state.photo = source;
    $("#upload-overlay").hidden = true;
    text(
      "#photo-status",
      "Foto carregada. Arraste, use dois dedos ou ajuste nos controles.",
    );
    status("");
    reset();
  } catch {
    text(
      "#photo-status",
      "Não foi possível abrir essa foto. Tente JPG, PNG ou WebP; fotos HEIC dependem do navegador.",
    );
    invalidate();
  } finally {
    e.target.value = "";
  }
});
function zoom(value) {
  state.zoom = Math.max(0.3, Math.min(3, value));
  $("#zoom").value = Math.round(state.zoom * 100);
  text("#zoom-value", `${Math.round(state.zoom * 100)}%`);
  invalidate();
}
$("#zoom").addEventListener("input", (e) => zoom(Number(e.target.value) / 100));
$("#zoom-in").onclick = () => zoom(state.zoom + 0.1);
$("#zoom-out").onclick = () => zoom(state.zoom - 0.1);
$("#reset").onclick = reset;
function move(direction, amount = 25) {
  if (!state.photo) return;
  const delta = {
    up: [0, -amount],
    down: [0, amount],
    left: [-amount, 0],
    right: [amount, 0],
  }[direction];
  state.x += delta[0];
  state.y += delta[1];
  invalidate();
}
document
  .querySelectorAll("[data-move]")
  .forEach((b) => (b.onclick = () => move(b.dataset.move)));
canvas.addEventListener("keydown", (e) => {
  const dir = {
    ArrowUp: "up",
    ArrowDown: "down",
    ArrowLeft: "left",
    ArrowRight: "right",
  }[e.key];
  if (dir && state.photo) {
    e.preventDefault();
    move(dir, e.shiftKey ? 50 : 10);
  }
});
const pointers = new Map();
let gesture = null;
function startGesture() {
  const p = [...pointers.values()];
  gesture =
    p.length >= 2
      ? {
          distance: Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y),
          zoom: state.zoom,
        }
      : null;
}
canvas.addEventListener("pointerdown", (e) => {
  if (!state.photo) return;
  canvas.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  startGesture();
});
canvas.addEventListener("pointermove", (e) => {
  if (!pointers.has(e.pointerId)) return;
  const prev = pointers.get(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size >= 2) {
    const p = [...pointers.values()];
    if (gesture?.distance)
      zoom(
        (gesture.zoom * Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y)) /
          gesture.distance,
      );
  } else {
    const ratio = 1000 / canvas.getBoundingClientRect().width;
    state.x += (e.clientX - prev.x) * ratio;
    state.y += (e.clientY - prev.y) * ratio;
    invalidate();
  }
});
for (const type of ["pointerup", "pointercancel", "lostpointercapture"])
  canvas.addEventListener(type, (e) => {
    pointers.delete(e.pointerId);
    startGesture();
  });
canvas.addEventListener(
  "wheel",
  (e) => {
    if (!state.photo) return;
    e.preventDefault();
    zoom(state.zoom + (e.deltaY < 0 ? 0.05 : -0.05));
  },
  { passive: false },
);
async function request(path = "", options = {}) {
  const response = await fetch(API + path, {
    ...options,
    signal: AbortSignal.timeout(15000),
  });
  let json;
  try {
    json = await response.json();
  } catch {
    throw new Error("Conexão com o mural indisponível.");
  }
  if (!response.ok) throw new Error(json.error || "Não foi possível conectar.");
  return json;
}
async function record(item, publish) {
  if (registered.has(item.id) && (!publish || owners[item.id]?.public)) return;
  let payload = pendingRecords.get(item.id);
  if (!payload) {
    const token =
      owners[item.id]?.token || crypto.randomUUID() + crypto.randomUUID();
    payload = {
      id: item.id,
      frame: item.frame,
      deleteToken: token,
      thumbnail: publish ? item.thumbnail : null,
    };
    pendingRecords.set(item.id, payload);
  }
  payload.thumbnail = publish ? item.thumbnail : null;
  try {
    const response = await request("", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    registered.add(item.id);
    owners[item.id] = { token: payload.deleteToken, public: response.public };
    saved.set("coren-wall-owners", owners);
    pendingRecords.delete(item.id);
    await refresh();
    status(
      response.public
        ? "Sua moldura está pronta e sua foto foi fixada no mural."
        : "Sua moldura está pronta. A foto não foi publicada no mural.",
    );
  } catch {
    status(
      "Sua imagem está pronta, mas o contador e o mural não puderam ser atualizados. Tente baixar novamente para repetir o registro.",
      true,
    );
  }
}
function downloadFile(item) {
  const url = URL.createObjectURL(item.blob),
    a = document.createElement("a");
  a.href = url;
  a.download = item.file.name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
$("#download").onclick = () => {
  if (!state.ready) return;
  const item = state.ready,
    publish = $("#publish-wall").checked;
  downloadFile(item);
  status(
    "Download iniciado. Confira Downloads ou use a opção de salvar abaixo.",
  );
  void record(item, publish);
};
let dialogURL;
$("#share").onclick = async () => {
  if (!state.ready) return;
  const item = state.ready,
    publish = $("#publish-wall").checked;
  state.busy = true;
  setEnabled();
  try {
    if (navigator.canShare?.({ files: [item.file] })) {
      await navigator.share({ files: [item.file] });
      await record(item, publish);
    } else {
      if (dialogURL) URL.revokeObjectURL(dialogURL);
      dialogURL = URL.createObjectURL(item.blob);
      $("#save-image").src = dialogURL;
      $("#save-link").href = dialogURL;
      $("#save-link").download = item.file.name;
      $("#save-link").onclick = () => void record(item, publish);
      $("#save-dialog").showModal();
      status(
        "Toque e segure para salvar. Para registrar o download e publicar no mural, use o botão Baixar PNG.",
      );
    }
  } catch (e) {
    if (e.name === "AbortError")
      status("Compartilhamento cancelado. Sua foto continua pronta.");
    else
      status("O compartilhamento não abriu. Use “Baixar minha moldura”.", true);
  } finally {
    state.busy = false;
    setEnabled();
  }
};
$("#close-dialog").onclick = () => $("#save-dialog").close();
async function refresh() {
  try {
    const result = await request();
    counts = result.counts;
    showSelectedCount();
    text("#total-count", new Intl.NumberFormat("pt-BR").format(result.total));
    text("#counter-label", "molduras baixadas");
    $("#wall").replaceChildren(
      ...result.supporters.map((entry) => {
        const fig = document.createElement("figure"),
          im = document.createElement("img"),
          caption = document.createElement("figcaption");
        im.src = entry.thumbnail;
        im.alt = `Foto de apoio · ${data[entry.frame]?.title || "Campanha"}`;
        im.loading = "lazy";
        caption.textContent = data[entry.frame]?.title || "Campanha";
        fig.append(im, caption);
        if (owners[entry.id]) {
          const remove = document.createElement("button");
          remove.textContent = "Retirar minha foto";
          remove.onclick = async () => {
            remove.disabled = true;
            try {
              await request("", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  id: entry.id,
                  token: owners[entry.id].token,
                }),
              });
              owners[entry.id].public = false;
              saved.set("coren-wall-owners", owners);
              await refresh();
            } catch {
              remove.disabled = false;
              status(
                "Não foi possível retirar a foto agora. Tente novamente.",
                true,
              );
            }
          };
          fig.append(remove);
        }
        return fig;
      }),
    );
    text(
      "#wall-status",
      result.supporters.length
        ? ""
        : "Seu apoio pode ser o primeiro por aqui. Crie sua foto e participe.",
    );
    $("#wall-status").hidden = !!result.supporters.length;
  } catch {
    text("#total-count", "—");
    text("#counter-label", "contador indisponível");
    text(
      "#wall-status",
      "O mural está temporariamente indisponível. Você pode criar e baixar sua moldura normalmente.",
    );
  }
}
async function init() {
  choose(saved.get("coren-frame", "chapa-2"));
  await Promise.all(
    Object.keys(data).map(async (frame) => {
      try {
        state.frames[frame] = await imageLoad(`assets/${frame}.png`);
      } catch {
        status("Uma moldura não carregou. Atualize a página.", true);
      }
    }),
  );
  invalidate();
  void refresh();
}
init();

document.querySelectorAll("label[for=photo]").forEach((label) =>
  label.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      $("#photo").click();
    }
  }),
);
