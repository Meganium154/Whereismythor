const API_URL = "https://script.google.com/macros/s/AKfycbzXfnpKed8FaJrghrjzPoKUu-0XbDXDT77lBtAoCk8E-rSWGXp9X2D59fqtgrpeClyHGA/exec";

const form = document.getElementById("shippingForm");
const modelSelect = document.getElementById("model");
const orderInput = document.getElementById("orderNumber");
const submitButton = document.getElementById("submitButton");
const statusBox = document.getElementById("status");
const resultBox = document.getElementById("result");
const disclaimerOverlay = document.getElementById("disclaimerOverlay");
const acceptDisclaimerButton = document.getElementById("acceptDisclaimer");

function setStatus(message, type = "") {
  statusBox.textContent = message;
  statusBox.className = type ? `status ${type}` : "status";
}

function resetButton() {
  submitButton.disabled = false;
  submitButton.textContent = "Estimate my shipping";
}

function showError(message) {
  setStatus(message, "error");
  resultBox.classList.remove("visible");
}

function showResult(data) {
  resetButton();

  if (!data || !data.success) {
    showError(data && data.message ? data.message : "The estimate could not be calculated.");
    return;
  }

  setStatus("");
  document.getElementById("shipDate").textContent = data.shipDate || "Not available";
  document.getElementById("dhlDate").textContent = data.dhlDate || "Not available";
  document.getElementById("fourPxDate").textContent = data.fourPxDate || "Not available";
  document.getElementById("ordersAhead").textContent =
    (Number(data.ordersAhead || 0) * 1000).toLocaleString();
  document.getElementById("averageRate").textContent =
    `${Math.round(Number(data.averagePerDay || 0)).toLocaleString()} units shipped per day`;

  const notice = document.getElementById("notice");
  if (data.alreadyReached) {
    notice.textContent =
      "Your order number is at or below the latest reported shipped order. Check your email or AYN account because it may already be processing or shipped.";
  } else {
    const days = Number(data.daysUntilShipping || 0);
    notice.textContent =
      `At the current reported rate, your order is estimated to ship in about ${days} day${days === 1 ? "" : "s"}.`;
  }

  resultBox.classList.add("visible");
  resultBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

async function loadModels() {
  try {
    const response = await fetch(`${API_URL}?action=models`);
    if (!response.ok) throw new Error("The model list could not be loaded.");

    const data = await response.json();
    if (!data || !Array.isArray(data.models) || data.models.length === 0) {
      throw new Error("No Thor models are currently available.");
    }

    modelSelect.innerHTML = '<option value="">Select your model</option>';
    data.models.forEach((model) => {
      const option = document.createElement("option");
      option.value = model;
      option.textContent = model;
      modelSelect.appendChild(option);
    });
  } catch (error) {
    modelSelect.innerHTML = '<option value="">Unable to load models</option>';
    showError(error.message || "Unable to load Thor models.");
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const model = modelSelect.value.trim();
  const orderNumber = orderInput.value.trim();

  if (!model) {
    showError("Select your Thor model.");
    modelSelect.focus();
    return;
  }

  if (!/^\d{4}$/.test(orderNumber)) {
    showError("Enter exactly the first 4 digits of your order number.");
    orderInput.focus();
    return;
  }

  resultBox.classList.remove("visible");
  setStatus("Calculating your estimate…");
  submitButton.disabled = true;
  submitButton.textContent = "Calculating…";

  try {
    const requestUrl =
      `${API_URL}?action=estimate&model=${encodeURIComponent(model)}` +
      `&orderNumber=${encodeURIComponent(orderNumber)}`;

    const response = await fetch(requestUrl);
    if (!response.ok) throw new Error("The server returned an error.");

    const data = await response.json();
    showResult(data);
  } catch (error) {
    resetButton();
    showError(error.message || "An unexpected error occurred.");
  }
});

if (sessionStorage.getItem("thorDisclaimerAccepted") === "true") {
  disclaimerOverlay.hidden = true;
}

acceptDisclaimerButton.addEventListener("click", () => {
  sessionStorage.setItem("thorDisclaimerAccepted", "true");
  disclaimerOverlay.hidden = true;
});

loadModels();
