(function () {
  const lightbox = document.getElementById("lightbox");
  const lightboxImg = document.getElementById("lightboxImg");

  if (!lightbox || !lightboxImg) return;

  const selector = ".project-content img, .image-grid img, figure img";
  const imgs = document.querySelectorAll(selector);

  function open(src, alt) {
    lightboxImg.src = src;
    lightboxImg.alt = alt || "";
    lightbox.classList.add("is-open");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function close() {
    lightbox.classList.remove("is-open");
    lightbox.setAttribute("aria-hidden", "true");
    lightboxImg.src = "";
    document.body.style.overflow = "";
  }

  imgs.forEach(img => {
    if (img.closest("a")) return; // don’t hijack linked images
    img.addEventListener("click", () => open(img.src, img.alt));
  });

  lightbox.addEventListener("click", close);
  window.addEventListener("keydown", e => {
    if (e.key === "Escape") close();
  });
})();
