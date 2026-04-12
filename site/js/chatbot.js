const evMap = {
  // TESLA
  "model 3": "tesla-model-3",
  "model y": "tesla-model-y",
  "model s": "tesla-model-s",
  "model x": "tesla-model-x",
  "tesla": "tesla-model-3",

  // NISSAN
  "leaf": "nissan-leaf",
  "ariya": "nissan-ariya",
  "nissan": "nissan-leaf",

  // BMW
  "bmw i3": "bmw-i3",
  "bmw i4": "bmw-i4",
  "bmw ix": "bmw-ix",
  "bmw": "bmw-i4",

  // AUDI
  "audi e-tron": "audi-etron",
  "etron": "audi-etron",
  "q4 e-tron": "audi-q4-etron",
  "audi": "audi-etron",

  // VW
  "id.3": "vw-id3",
  "id3": "vw-id3",
  "id.4": "vw-id4",
  "id4": "vw-id4",
  "vw": "vw-id3",

  // HYUNDAI
  "kona": "hyundai-kona",
  "kona electric": "hyundai-kona",
  "ioniq 5": "hyundai-ioniq5",
  "ioniq5": "hyundai-ioniq5",
  "hyundai": "hyundai-kona",

  // KIA
  "ev6": "kia-ev6",
  "niro": "kia-niro",
  "kia": "kia-ev6",

  // MERCEDES
  "eqa": "mercedes-eqa",
  "eqc": "mercedes-eqc",
  "mercedes": "mercedes-eqc"
};

function getBotReply(input) {
  const text = input.toLowerCase();

  let actions = [];
  let response = [];

  for (const key in evMap) {
    if (text.includes(key)) {

      selectOption("ev-select", evMap[key]);
      actions.push("ev");

      const caseEl = document.getElementById("bundle-case");
      const adapterEl = document.getElementById("bundle-adapter");

      const cleanNames = {
        "model y": "Tesla Model Y",
        "model s": "Tesla Model S",
        "model x": "Tesla Model X",
        "model 3": "Tesla Model 3",
        "leaf": "Nissan Leaf",
        "ariya": "Nissan Ariya",
        "bmw i3": "BMW i3",
        "bmw i4": "BMW i4",
        "bmw ix": "BMW iX",
        "audi e-tron": "Audi e-tron",
        "q4 e-tron": "Audi Q4 e-tron",
        "id.3": "VW ID.3",
        "id.4": "VW ID.4",
        "kona": "Hyundai Kona Electric",
        "ioniq 5": "Hyundai IONIQ 5",
        "ev6": "Kia EV6",
        "niro": "Kia Niro EV",
        "eqa": "Mercedes EQA",
        "eqc": "Mercedes EQC"
      };

      const label = cleanNames[key] || key.charAt(0).toUpperCase() + key.slice(1);
      response.push(label + " selected");

      if (caseEl && caseEl.checked) caseEl.click();
      if (adapterEl && adapterEl.checked) adapterEl.click();

      if (label.includes("Tesla")) {
        if (adapterEl && !adapterEl.checked) adapterEl.click();
        response.push("Tesla detected, adapter recommended for full compatibility.");
      } else {
        response.push("No adapter required, this vehicle is fully compatible with UK Type 2 charging.");
      }

      if (label.includes("BMW") || label.includes("Mercedes")) {
        response.push("This model works perfectly with standard UK Type 2 charging.");
      }

      const powerSelected = document.querySelector("#power-select .selected");
      if (!text.includes("kw") && !powerSelected) {
        selectOption("power-select", "7kw");
        response.push("7kW home charging selected (recommended)");
      }

      const lengthSelected = document.querySelector("#length-select .selected");

      if (text.includes("garage") && !lengthSelected) {
        selectOption("length-select", "7m");
        response.push("7m cable selected, ideal for garage setups");
      }
      else if ((text.includes("far") || text.includes("driveway") || text.includes("distance")) && !lengthSelected) {
        selectOption("length-select", "7m");
        response.push("7m cable selected for extra reach");
      }
      else if (!text.includes("m") && !lengthSelected) {
        selectOption("length-select", "5m");
        response.push("5m cable selected (recommended for most setups)");
      }

      break;
    }
  }

  if (text.includes("fast") || text.includes("22")) {
    selectOption("power-select", "22kw");
    actions.push("power");
    response.push("22kW fast charging selected");
  }

  if (text.includes("home") || text.includes("7kw")) {
    selectOption("power-select", "7kw");
    actions.push("power");
    response.push("7kW home charging selected");
  }

  if (text.includes("5m")) {
    selectOption("length-select", "5m");
    actions.push("length");
    response.push("5m cable selected");
  }

  if (text.includes("7m")) {
    selectOption("length-select", "7m");
    actions.push("length");
    response.push("7m cable selected");
  }

  if (text.includes("10m")) {
    selectOption("length-select", "10m");
    actions.push("length");
    response.push("10m cable selected");
  }

  if (text.includes("case") && !document.getElementById("bundle-case").checked) {
    const caseEl = document.getElementById("bundle-case");
    if (caseEl && !caseEl.checked) caseEl.click();
    response.push("Carry case added");
  }

  const evSelected = document.querySelector("#ev-select .selected");

    if (
    text.includes("adapter") &&
    evSelected &&
    evSelected.dataset.value.includes("tesla") &&
    !document.getElementById("bundle-adapter").checked
    ) {
    const adapterEl = document.getElementById("bundle-adapter");
    if (adapterEl && !adapterEl.checked) adapterEl.click();
    response.push("Tesla adapter added");
    }

  if (text.includes("recommend") || text.includes("best")) {
    selectOption("power-select", "7kw");
    selectOption("length-select", "5m");
    response.push("Recommended setup applied: 7kW + 5m");
  }

    if (text.includes("full setup") || text.includes("everything")) {

        const caseEl = document.getElementById("bundle-case");
        if (caseEl && !caseEl.checked) {
            caseEl.checked = true;
        }

        const adapterEl = document.getElementById("bundle-adapter");

        // ✅ ONLY enable adapter for Tesla
        const evSelected = document.querySelector("#ev-select .selected");

        if (
            evSelected &&
            evSelected.dataset.value.includes("tesla") &&
            adapterEl &&
            !adapterEl.checked
        ) {
            adapterEl.click();
        }

        response.push("Full setup added: cable and case");
    }

  if (text.includes("price") || text.includes("buy")) {
    document.getElementById("buy-btn")?.classList.remove("disabled");
    response.push("Your setup is ready to purchase");
  }

  if (response.length > 0) {
    return response.join(". ") + ".";
  }

  return handleUnknownQuery(text);
}

function handleUnknownQuery(text) {
  if (
    text.includes("compatible") ||
    text.includes("fit") ||
    text.includes("work") ||
    text.includes("difference") ||
    text.includes("which") ||
    text.includes("how")
  ) {
    return "That’s a great question. I can help with general setup, but for detailed compatibility or technical advice, our team can confirm for you. Would you like me to send your question to our specialists?";
  }

  if (text.length < 5) {
    return "Tell me your EV or what you’re trying to achieve, I’ll set everything up for you instantly.";
  }

  return "I can help you choose the perfect cable. Tell me your EV, charging type, or cable length.";
}

function selectOption(groupId, value) {
  const group = document.getElementById(groupId);
  if (!group) return;

  const options = group.querySelectorAll(".selector-option");

  options.forEach(opt => {
    opt.classList.remove("selected");

    if (opt.dataset.value === value) {
      opt.classList.add("selected");
      opt.click();
    }
  });
}

function checkIfReadyToBuy() {
  const ev = document.querySelector("#ev-select .selected");
  const power = document.querySelector("#power-select .selected");
  const length = document.querySelector("#length-select .selected");
  return ev && power && length;
}

function triggerCheckoutFlow() {
  const buyBtn = document.getElementById("buy-btn");
  if (!buyBtn) return;

  const evSelected = document.querySelector("#ev-select .selected");
  const adapterEl = document.getElementById("bundle-adapter");

  // 🚨 HARD ENFORCEMENT (final source of truth)
  if (adapterEl) {

    const isTesla = evSelected && evSelected.dataset.value.includes("tesla");

    // Always reset first
    if (adapterEl.checked) {
      adapterEl.click();
    }

    // Only enable for Tesla
    if (isTesla && !adapterEl.checked) {
      adapterEl.click();
    }
  }

  // Enable button
  buyBtn.classList.remove("disabled");

  // Scroll to product panel
  document.querySelector(".product-panel")?.scrollIntoView({
    behavior: "smooth",
    block: "center"
  });

  // Highlight CTA
  buyBtn.classList.add("pulse");

  setTimeout(() => {
    buyBtn.classList.remove("pulse");
  }, 2000);

  // Urgency message
  setTimeout(() => {
    const messages = document.getElementById("chatbot-messages");
    if (messages) {
      addMessage("Stratum EV", "Limited availability on this configuration, we recommend securing it now.");
      messages.scrollTop = messages.scrollHeight;
    }
  }, 2500);
}

function sendToEmail(message) {
  const subject = encodeURIComponent("Customer Query from Stratum EV Chatbot");
  const body = encodeURIComponent("Customer question:\n\n" + message);
  window.location.href = `mailto:info@stratumev.com?subject=${subject}&body=${body}`;
}

document.addEventListener("DOMContentLoaded", () => {

  function runUpsellLogic(text) {
    if (
      (text.includes("tesla") || text.includes("model y") || text.includes("model 3")) &&
      !document.getElementById("bundle-adapter")?.checked
    ) {
      setTimeout(() => {
        addMessage("Stratum EV", "Most Tesla drivers add the adapter for full compatibility.");
      }, 1200);
    }

    if (text.includes("5m") || text.includes("7m") || text.includes("10m")) {
      setTimeout(() => {
        addMessage("Stratum EV", "Tip: A carry case keeps your cable protected and extends its lifespan.");
      }, 1500);
    }

    if (text.includes("fast") || text.includes("22")) {
      setTimeout(() => {
        addMessage("Stratum EV", "Good choice, 22kW is ideal for faster turnaround charging.");
      }, 1000);
    }

    if (text.includes("buy") || text.includes("price")) {
      setTimeout(() => {
        addMessage("Stratum EV", "You can save more by adding a case or adapter before checkout.");
      }, 1200);
    }
  }

  const toggleBtn = document.getElementById("chatbot-toggle");
  const container = document.getElementById("chatbot-container");
  const closeBtn = document.getElementById("chatbot-close");
  const sendBtn = document.getElementById("chatbot-send");
  const input = document.getElementById("chatbot-input");
  const messages = document.getElementById("chatbot-messages");
  const resetBtn = document.getElementById("chatbot-reset");

  if (!toggleBtn || !container) return;

  toggleBtn.onclick = () => {
    container.style.display = "flex";
    container.classList.add("chat-open");
  };

  if (resetBtn) {
    resetBtn.onclick = resetChatbot;
  }

  closeBtn.onclick = () => container.style.display = "none";

  sendBtn.onclick = handleSend;
  input.addEventListener("keypress", e => {
    if (e.key === "Enter") handleSend();
  });

  function resetChatbot() {
    messages.innerHTML = "";

    document.querySelectorAll(".selector-option").forEach(opt => {
      opt.classList.remove("selected");
    });

    const caseEl = document.getElementById("bundle-case");
    const adapterEl = document.getElementById("bundle-adapter");

    if (caseEl && caseEl.checked) caseEl.click();
    if (adapterEl && adapterEl.checked) adapterEl.click();

    const buyBtn = document.getElementById("buy-btn");
    if (buyBtn) buyBtn.classList.add("disabled");

    window.awaitingEmailConsent = false;
    window.lastUserQuestion = null;

    addMessage("Stratum EV", "Let’s start fresh. What EV do you drive?");
  }

  function handleSend() {
    const userText = input.value.trim();
    if (!userText) return;

    addMessage("You", userText);
    input.value = "";

    if (window.awaitingEmailConsent && (userText.toLowerCase().includes("yes"))) {
      window.awaitingEmailConsent = false;
      sendToEmail(window.lastUserQuestion || userText);
      addMessage("Stratum EV", "Perfect, your question has been sent to our team. We prioritise active customers, so you’ll receive a response shortly.");
      return;
    }

    const reply = getBotReply(userText);

    if (reply.includes("Would you like me to send your question")) {
      window.awaitingEmailConsent = true;
      window.lastUserQuestion = userText;
    }

    setTimeout(() => {
      addMessage("Stratum EV", reply);
      runUpsellLogic(userText);

      if (checkIfReadyToBuy()) {
        addMessage("Stratum EV", "Your setup is ready. You can complete your purchase now.");
        triggerCheckoutFlow();
      }
    }, 400);
  }

  function addMessage(sender, text) {
    const div = document.createElement("div");

    const isBot = sender === "Stratum EV";

    div.className = isBot ? "chat-row bot" : "chat-row user";

    div.innerHTML = `
      <div class="chat-bubble">
        ${isBot ? '<span class="chat-label">Stratum EV</span>' : ''}
        ${text}
      </div>
    `;

    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  }

  setTimeout(() => {
    container.style.display = "flex";
    addMessage("Stratum EV", "Hi, I can set up your perfect cable in seconds. What EV do you drive?");
  }, 3000);

});