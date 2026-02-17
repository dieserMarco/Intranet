const btn = document.getElementById("btn");
const out = document.getElementById("out");

btn.addEventListener("click", () => {
  out.textContent = "Button wurde geklickt: " + new Date().toLocaleTimeString();
});
