const variantMap = {
  "7kw": {
    "5m": { id: "61503874957642", price: 159 },
    "7m": { id: "61503874990410", price: 169 },
    "10m": { id: "61503875023178", price: 189 }
  },
  "22kw": {
    "5m": { id: "61503875055946", price: 189 },
    "7m": { id: "61503875088714", price: 199 },
    "10m": { id: "61503875121482", price: 219 }
  }
};

const bundleVariants = {
  case: {
    "5m": { id: "61527904223562", price: 19.99 },
    "7m": { id: "61527904256330", price: 24.99 },
    "10m": { id: "61527904256330", price: 24.99 }
  },
  adapter: {
    id: "61526968107338",
    price: 31.99
  }
};


let selectedConfig = {
  ev: null,
  power: null,
  length: null
};


function updateStepFlow() {
  const steps = ["ev-select", "power-select", "length-select"];

  steps.forEach((id, index) => {
    const el = document.getElementById(id);

    if (index === 0) {
      el.classList.add("active-step");
      return;
    }

    const prevValue = Object.values(selectedConfig)[index - 1];

    if (prevValue) {
      el.classList.add("active-step");
      el.classList.remove("incomplete");
    } else {
      el.classList.remove("active-step");
      el.classList.add("incomplete");
    }
  });
}

document.querySelectorAll(".selector-group").forEach(group => {

  const options = group.querySelectorAll(".selector-option");

  options.forEach(option => {
    option.addEventListener("click", () => {

      // remove active
      options.forEach(o => o.classList.remove("active"));

      // add active
      option.classList.add("active");

      // set value
      const value = option.dataset.value;

      if (group.id === "ev-select") selectedConfig.ev = value;
      if (group.id === "power-select") selectedConfig.power = value;
      if (group.id === "length-select") selectedConfig.length = value;

      updateProduct();

      if (group.id === "ev-select") {
        if (value === "other") {
          selectedConfig.ev = "generic";
        } else {
          selectedConfig.ev = value;
        }
      }

    });
  });

 

});


let quantity = 1;


const evProfiles = {
  tesla: {
    reason: "Includes compatibility for Tesla charging setups",
    image: "./assets/img/products/cable-tesla.webp"
  },
  bmw: {
    reason: "Optimised for BMW onboard charging systems",
    image: "./assets/img/products/cable-bmw.webp"
  },
  audi: {
    reason: "Designed for Audi e-tron charging performance",
    image: "./assets/img/products/cable-audi.webp"
  },
  default: {
    reason: "Optimised for UK charging networks",
    image: "./assets/img/products/cable.webp"
  }
};

window.addEventListener("scroll", () => {

  const sticky = document.getElementById("sticky-checkout");
  const mainBtn = document.getElementById("buy-btn");

  if (!sticky || !mainBtn) return;

  const rect = mainBtn.getBoundingClientRect();

  if (rect.top < 0) {
    sticky.classList.add("visible");
  } else {
    sticky.classList.remove("visible");
  }

});

function updateProduct() {
  const ev = selectedConfig.ev;
  const power = selectedConfig.power;
  const length = selectedConfig.length;

  const caseEl = document.getElementById("bundle-case");
  const adapterEl = document.getElementById("bundle-adapter");

  let newButtonRef = null;

  if (caseEl) caseEl.checked = false;
  if (adapterEl) adapterEl.checked = false;

  // AUTO BUNDLES
  // FORCE SMART DEFAULTS
  if (adapterEl) adapterEl.checked = false;
  if (caseEl) caseEl.checked = false;

  if (ev?.includes("tesla")) {
    if (adapterEl) adapterEl.checked = true;
  }

  if (ev?.includes("bmw") || ev?.includes("audi")) {
    if (caseEl) caseEl.checked = true;
  }

  // 🔥 HIGH VALUE: DEFAULT BOTH FOR PREMIUM FEEL
  if (ev?.includes("tesla") || ev?.includes("bmw")) {
    if (adapterEl) adapterEl.checked = true;
    if (caseEl) caseEl.checked = true;
  }

  if ((ev?.includes("bmw") || ev?.includes("audi")) && caseEl) caseEl.checked = true;

  if (!power || !length) return;

  const variant = variantMap?.[power]?.[length];
  if (!variant) return;

  // STOCK (number fix)
  let stockLevel = Number(sessionStorage.getItem("stockLevel"));

  if (!stockLevel) {
    stockLevel = Math.floor(Math.random() * 8) + 3;
    sessionStorage.setItem("stockLevel", stockLevel);
  }

  if (ev === "generic") {
    profile = {
      reason: "Compatible with all Type 2 electric vehicles in the UK",
      image: "./assets/img/products/cable.webp"
    };
  }

  const summary = document.getElementById("selection-summary");

  if (summary) {
    summary.innerText = `${ev || "Select EV"} • ${power?.toUpperCase() || "Select Power"} • ${length || "Select Length"}`;
  }

  const output = document.getElementById("product-output");
  const button = document.getElementById("buy-btn");

  if (!output || !button) return;

  const caseChecked = caseEl?.checked;
  const adapterChecked = adapterEl?.checked;

  const caseVariant = bundleVariants.case[length] || bundleVariants.case["7m"];


  // PERSONALISATION
  let profile = evProfiles.default;

  if (ev?.includes("tesla")) profile = evProfiles.tesla;
  else if (ev?.includes("bmw")) profile = evProfiles.bmw;
  else if (ev?.includes("audi")) profile = evProfiles.audi;

    if (window.innerWidth < 900) {
      document.querySelector(".product-panel")?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }

  // PRICE
  let basePrice = variant.price + 40;
  let totalPrice = basePrice;

  if (caseChecked && caseVariant) totalPrice += caseVariant.price;
  if (adapterChecked) totalPrice += bundleVariants.adapter.price;

  if (caseChecked && adapterChecked) totalPrice -= 10;

  // CART
  let cartItems = `${variant.id}:${quantity}`;

  if (caseChecked && caseVariant) {
    cartItems += `,${caseVariant.id}:1`;
  }

  if (adapterChecked) {
    cartItems += `,${bundleVariants.adapter.id}:1`;
  }

  const checkoutLink = `https://shop.stratumev.com/cart/${cartItems}`;

  // FADE OUT
  output.classList.remove("fade-in");
  output.style.opacity = 0;
  output.style.transform = "translateY(10px)";


 const bundleText = (caseChecked && adapterChecked)
    ? `<div class="bundle-save">Includes essential accessories · £10 bundle saving applied</div>`
    : "";

  setTimeout(() => {

    output.innerHTML = `
      <div class="product-content">

        <div class="product-visual">
          <img id="product-image" src="./assets/img/products/cable.webp" alt="EV Charging Cable">
        </div>

        <h4>Type 2 Charging Cable</h4>

         <div class="setup-badge">
            Optimised setup for your vehicle
         </div>

        <div class="product-reason">
          ✔ ${profile.reason}<br>
          ✔ Fully compatible with UK Type 2 charging<br>
          ✔ No overheating, weather-resistant build<br>
        </div>

        <div class="specs">
          <div><strong>Power:</strong> ${power.toUpperCase()}</div>
          <div><strong>Length:</strong> ${length}</div>
        </div>

        <div class="price-block">
          <div class="price-current">£${totalPrice.toFixed(2)}</div>
          <div class="price-compare">£${totalPrice + 40}.00 typical retail</div>
          <div class="price-save">Premium UK-tested cable · Fast dispatch</div>
          <div class="micro-trust">✓ Used by 1,200+ UK EV drivers</div>
        </div>

        ${bundleText}

        ${adapterChecked ? `<div class="bundle-added">✓ Tesla adapter included</div>` : ""}
        ${caseChecked ? `<div class="bundle-added">✓ Carry case included</div>` : ""}

        <div class="stock-warning">
          Only ${stockLevel} left in UK stock · Ships in 2–3 days
        </div>

        <div class="product-meta">
          <div class="meta-item">
            <span class="pulse-dot"></span>
            3 sold in last hour
          </div>
        </div>


        <!-- ✅ ADD IT HERE -->
        <div class="decision-bar">
          ✔ Guaranteed compatibility with your EV
        </div>


      </div>
    `;

    output.classList.add("fade-in");
    setTimeout(() => output.classList.remove("fade-in"), 400);

    const imgEl = document.getElementById("product-image");
    if (imgEl) {
      imgEl.src = profile.image;
      imgEl.onerror = () => {
        imgEl.src = "./assets/img/products/cable.webp";
      };
    }

    // BUTTON
    button.replaceWith(button.cloneNode(true));
    const newButton = document.getElementById("buy-btn");
    newButtonRef = newButton;

    newButton.classList.remove("disabled");
    newButton.classList.add("active");
    newButton.disabled = false;
    newButton.innerText = `Get My Setup • £${totalPrice.toFixed(2)}`;

    newButton.addEventListener("click", () => {

      if (newButton.classList.contains("loading")) return;

      newButton.innerText = "Adding...";
      newButton.classList.add("loading");

      setTimeout(() => {
        newButton.innerText = "Added ✓";
        newButton.classList.add("success");
      }, 400);

      setTimeout(() => {
        window.location.href = checkoutLink;
      }, 900);

    });

    // FADE IN
    output.style.opacity = 1;
    output.style.transform = "translateY(0)";

  }, 150);

  const sticky = document.getElementById("sticky-checkout");
  const stickyPrice = document.getElementById("sticky-price");
  const stickyMeta = document.getElementById("sticky-meta");
  const stickyBtn = document.getElementById("sticky-btn");

  if (sticky && stickyPrice && stickyMeta && stickyBtn) {
    sticky.classList.add("visible");

    stickyPrice.innerText = `£${totalPrice.toFixed(2)}`;
    let bundleLabel = "";

    if (caseChecked && adapterChecked) {
      bundleLabel = " • Full Setup";
    }

    stickyMeta.innerText = `${power.toUpperCase()} • ${length}${bundleLabel}`;

        stickyBtn.onclick = () => {
          if (newButtonRef) {
            newButtonRef.click();
          }
        };
      }
    }


// INITIAL LOAD
document.addEventListener("DOMContentLoaded", () => {

  selectedConfig.ev = "tesla-model-3";
  selectedConfig.power = "7kw";
  selectedConfig.length = "7m";

  document.querySelector(`[data-value="tesla-model-3"]`)?.classList.add("active");
  document.querySelector(`[data-value="7kw"]`)?.classList.add("active");
  document.querySelector(`[data-value="7m"]`)?.classList.add("active");

  updateProduct();
});


// QUANTITY
const qtyValue = document.getElementById("qty-value");
const minusBtn = document.getElementById("qty-minus");
const plusBtn = document.getElementById("qty-plus");

if (minusBtn && plusBtn && qtyValue) {
  minusBtn.addEventListener("click", () => {
    if (quantity > 1) {
      quantity--;
      qtyValue.innerText = quantity;
      updateProduct();
    }
  });

  plusBtn.addEventListener("click", () => {
    quantity++;
    qtyValue.innerText = quantity;
    updateProduct();
  });
}

