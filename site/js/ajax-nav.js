const containerSelector = "main";
const navLinks = document.querySelectorAll(".tabs a.tab");

function loadPage(url, push = true){

  const main = document.querySelector(containerSelector);

  if(main){
    main.classList.add("loading");
  }

  // FULL reload for complex / JS-heavy pages
  if(
    url.includes("market-intelligence") ||
    url.includes("the-hub") ||
    url.includes("about") ||
    url.includes("featured") ||
    url.includes("ev-history") ||
    url.includes("ev-evolution") ||
    url.includes("services") ||
    url.includes("contact")
  ){
    window.location.href = url;
    return;
  }

  fetch(url)
    .then(res => res.text())
    .then(html => {

      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");

      const newContent = doc.querySelector(containerSelector);
      const currentContent = document.querySelector(containerSelector);

      // fallback safety
      if(!newContent || !currentContent){
        window.location.href = url;
        return;
      }

      // swap content
      currentContent.innerHTML = newContent.innerHTML;

      // update body data-page
      const newPage = doc.body.getAttribute("data-page");

      if(newPage){
        document.body.setAttribute("data-page", newPage);
      } else {
        document.body.removeAttribute("data-page");
      }

      // update URL
      if(push){
        history.pushState({url}, "", url);
      }

      // scroll to top
      window.scrollTo({ top: 0 });

      if(main){
        main.classList.remove("loading");
      }

      // re-init core scripts
      initPage();

      /*  update page */
      if(window.updateActiveNav){
        updateActiveNav();
      }

    })
    .catch(err => {
      console.error("AJAX load error:", err);
      window.location.href = url;
    });
}


function initPage(){

  // always re-init nav (mobile toggle etc)
  if(window.initNav){
    window.initNav();
  }

  const page = document.body.dataset.page;

  // homepage only (this is the important one)
  if(page === "home" && window.initHome){
    window.initHome();
  }

  // Market Intelligence handled via full reload (no AJAX init needed)
}


// NAV CLICK HANDLING
navLinks.forEach(link => {

  link.addEventListener("click", e => {

    const url = link.getAttribute("href");

    if(!url) return;

    // ignore external links
    if(url.startsWith("http")) return;

    if(!url.endsWith(".html")) return;

    e.preventDefault();

    loadPage(url);

  });

});


// BACK / FORWARD SUPPORT
window.addEventListener("popstate", e => {

  if(e.state?.url){
    loadPage(e.state.url, false);
  }

});