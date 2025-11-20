// background.js (Manifest V3 service worker)
// Ao clicar no ícone da extensão, abre http://localhost:3380/ em nova aba.

// service worker (Manifest V3)
"use strict"; // Isto aplica modo de código "estrito" ao projeto (mais seguro e estável)

// ---------------------------
// CONFIGURAÇÃO: habilita/desabilita clique no ícone
// ---------------------------
// Para DESABILITAR a navegação ao clicar no ícone, configure ENABLE_ICON_CLICK para false.
// Alternativamente, remova o listener (ver comentários abaixo) ou remova o "background" do manifest.
const ENABLE_ICON_CLICK = true;
// ---------------------------














// ================= Configurações =================
const PORT_HELLO = 1952;           // porta do servidor de impressão
const POLL_MS = 5000;              // intervalo do polling
const PORT_NAME = "printer-port";

let firstPrint = undefined;
let pollInterval = null;
const ports = new Set();

// ================= Polling =================
async function fetchPrintersOnce() {
  try {
    const resp = await fetch(`http://localhost:${PORT_HELLO}/pull`, { cache: "no-store" });
    if (!resp.ok) throw new Error(`Status ${resp.status}`);
    const data = await resp.json();
    const candidate = Array.isArray(data) ? data[0] : Object.values(data)[0];
    if (candidate) {
      firstPrint = candidate;
      if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
    }
  } catch (e) {
    console.warn("background: falha ao consultar HELLO PRINT:", String(e));
  }
  notifyPorts();
}

function startPollingIfNeeded() {
  if (firstPrint) return;
  if (!pollInterval) {
    fetchPrintersOnce();
    pollInterval = setInterval(fetchPrintersOnce, POLL_MS);
  }
}

// Notifica todos os ports conectados
function notifyPorts() {
  for (const port of ports) {
    try { port.postMessage({ type: "update", data: firstPrint }); } 
    catch (_) {}
  }
}

// Inicializa polling
startPollingIfNeeded();

// ================= Conexão persistente via Port =================
chrome.runtime.onConnect.addListener(port => {
  if (port.name !== PORT_NAME) return;
  ports.add(port);
  port.postMessage({ type: "update", data: firstPrint });

  port.onMessage.addListener(async (msg) => {
    try {
      if (!msg || !msg.action) return;

      if (msg.action === 'requestNow') {
        fetchPrintersOnce();
        return;
      }

      if (msg.action === 'print') {
        const printPOS = msg.printPOS || firstPrint || "";
        const body = `texto=${encodeURIComponent(msg.texto || "")}&printPOS=${encodeURIComponent(printPOS)}`;

        try {
          const resp = await fetch(`http://localhost:${PORT_HELLO}/pull`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body
          });
          const data = await resp.json().catch(() => ({ ok: resp.ok, status: resp.status }));
          port.postMessage({ type: "printResult", ok: true, data });
        } catch (err) {
          port.postMessage({ type: "printResult", ok: false, error: String(err) });
        }
      }
    } catch (e) {
      try { port.postMessage({ type: "printResult", ok: false, error: String(e) }); } catch (_) {}
    }
  });

  port.onDisconnect.addListener(() => ports.delete(port));
  startPollingIfNeeded();
});

// ================= Mensagens diretas (opcional) =================
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || !msg.action) return;

  if (msg.action === "getFirstPrinter") {
    sendResponse({ ok: !!firstPrint, data: firstPrint });
    return;
  }
});





/*//////////////////////////////////////////////////////////////////////////////@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
Adiciona o pacote "update.js" na aba que enviou a mensagem: 
O content.js envia {action:"injectPackaged"} ao service worker, que obtém o tabId a partir de sender.tab.id
executa "update.js" usando chrome.scripting.executeScript, permitindo execução no contexto da página
/**/
chrome.runtime.onMessage.addListener((m,s,send)=>{
  if(!m || m.action!=="injectPackaged") return;
  const id=s?.tab?.id; if(!id){ send({ok:false,error:"tabId indefinido"}); return; }
  (async()=>{ try{ await chrome.scripting.executeScript({target:{tabId:id},files:["update.js"]}); send({ok:true}); } catch(e){ send({ok:false,error:String(e)}); } })(); return true;
});
///////////////////////////////////////////////////////////////////////////////@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@








