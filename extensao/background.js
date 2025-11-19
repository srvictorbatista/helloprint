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

/*
  IMPLEMENTAÇÃO:
  - Se ENABLE_ICON_CLICK for true, registramos o listener chrome.action.onClicked.
  - Ao clicar, abrimos uma nova aba com a URL desejada. Se já existir uma aba com a mesma URL
    e quiser focá-la em vez de abrir nova, podemos pesquisar por abas (requer perms).
*/

/*
if (ENABLE_ICON_CLICK) {
  chrome.action.onClicked.addListener(() => {
    // Abre nova aba apontando para o serviço local
    chrome.tabs.create({ url: "http://localhost:3380/" });
  });
}
/**/




/*
  Formas de DESABILITAR a ação de clique (comentadas / alternativas):

  1) Desabilitar via variável:
     - Alterar ENABLE_ICON_CLICK para false (linha de configuração acima).
     - Vantagem: simples, sem alteração do manifest.
     - Comportamento: listener não será registrado.

  2) Remover o listener:
     - Substituir o bloco acima por:
         const onClick = () => chrome.tabs.create({ url: "http://localhost:3380/" });
         chrome.action.onClicked.addListener(onClick);
       Para remover em runtime:
         chrome.action.onClicked.removeListener(onClick);
     - Remover o listener impede o comportamento.

  3) Remover/alterar o background do manifest:
     - Excluir o campo "background" no manifest (ou apontar para arquivo vazio).
     - Sem service worker, não há código respondendo ao clique — porém
       isso impede qualquer outra lógica de background que precise existir.

  4) Definir um popup em vez de navegação direta:
     - Em vez de abrir a URL diretamente, use "action.default_popup": "popup.html" no manifest.
     - O popup pode conter um botão/link para abrir http://localhost:3380/ e permitir controle do usuário.
     - Para desabilitar, basta remover o botão/link do popup.

  Escolha a opção que mais se adequa ao seu fluxo. A forma mais rápida é alterar
  ENABLE_ICON_CLICK para false ou remover o bloco que registra o listener.
*/














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







