/* =========================================
   HUB INTERACTIONS
========================================= */

const revealItems = document.querySelectorAll(
  ".hub-copy, .method-card, .roadmap-card, .hub-visual-wrap"
);

const revealObserver = new IntersectionObserver(

(entries)=>{

  entries.forEach((entry)=>{

    if(entry.isIntersecting){
      entry.target.classList.add("revealed");
    }

  });

},

{
  threshold:0.12
}

);

revealItems.forEach((item)=>{
  revealObserver.observe(item);
});

/* =========================================
   ACTIVE NAV HIGHLIGHT
========================================= */

const sections = document.querySelectorAll("section[id]");
const navLinks = document.querySelectorAll(".hub-anchor-nav a");

window.addEventListener("scroll", ()=>{

  let current = "";

  sections.forEach((section)=>{

    const sectionTop = section.offsetTop - 180;

    if(scrollY >= sectionTop){
      current = section.getAttribute("id");
    }

  });

  navLinks.forEach((link)=>{

    link.classList.remove("active-anchor");

    if(link.getAttribute("href").includes(current)){
      link.classList.add("active-anchor");
    }

  });

});

/* =========================================
   PARALLAX HERO
========================================= */

const heroBg = document.querySelector(".hub-hero-bg");

window.addEventListener("scroll", ()=>{

  const offset = window.scrollY * 0.08;

  heroBg.style.transform =
  `translate3d(0, ${offset}px, 0) scale(1.02)`;

});

/*========================================
PROGESS BAR
===========================================*/

const progressBar =
document.querySelector(".hub-progress-bar");

window.addEventListener("scroll", ()=>{

  const scrollTop =
  document.documentElement.scrollTop;

  const scrollHeight =
  document.documentElement.scrollHeight -
  document.documentElement.clientHeight;

  const progress =
  (scrollTop / scrollHeight) * 100;

  progressBar.style.width =
  `${progress}%`;

});