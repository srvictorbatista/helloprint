// content.js
/*/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
Este script solicita ao service worker que execute o arquivo empacotado "update.js" como um pacote adicional na aba atual: 
Envia a ação "injectPackaged", ao service worker, que recebe o 0pedido, localiza o tabId do remetente, e usa 
chrome.scripting.executeScript para inserir "update.js" no contexto da página, permitindo manipulação direta do DOM
respeitando CSP, sem uso de eval, inject, import ou execução dinâmica de strings (conforme as regras do Chrome Manifest V3).
/**/
chrome.runtime.sendMessage({action:"injectPackaged"}, res=>{
  if(!res){ console.error("Falha: resposta indefinida (service worker pode ter hibernado)"); return; }
  if(!res.ok){ console.error("Erro ao adicionar script empacotado:", res.error); return; }
  // console.log("update bem sucedido, em execução."); // suprimido para evitar verbosidade excessiva.
});
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////