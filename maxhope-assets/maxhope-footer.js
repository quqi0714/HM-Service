(function () {
  "use strict";

  var SAFE_EDGE = 12;
  var PREFERRED_ARROW_FROM_RIGHT = 42;
  var ARROW_EDGE_GUARD = 16;
  var roots = [];
  var resizeFrame = 0;

  function viewportMetrics() {
    var visual = window.visualViewport;
    return {
      left: visual ? visual.offsetLeft : 0,
      width: visual ? visual.width : document.documentElement.clientWidth
    };
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function positionCard(root) {
    var card = root.querySelector(".mhk-card");
    var lockup = root.querySelector(".mhk-lockup");
    if (!card || !lockup) return;

    var viewport = viewportMetrics();
    var viewportLeft = viewport.left + SAFE_EDGE;
    var viewportRight = viewport.left + viewport.width - SAFE_EDGE;
    var cardWidth = Math.min(306, Math.max(0, viewport.width - SAFE_EDGE * 2));
    var rootRect = root.getBoundingClientRect();
    var lockupRect = lockup.getBoundingClientRect();

    card.style.width = cardWidth + "px";

    /* offsetLeft is intentionally read as the CSS-only fallback anchor. */
    var fallbackArrowX = rootRect.left + card.offsetLeft + cardWidth - PREFERRED_ARROW_FROM_RIGHT;
    var targetX = lockupRect.width
      ? lockupRect.left + lockupRect.width / 2
      : fallbackArrowX;
    var preferredLeft = targetX - (cardWidth - PREFERRED_ARROW_FROM_RIGHT);
    var cardLeft = clamp(preferredLeft, viewportLeft, viewportRight - cardWidth);
    var arrowLeft = clamp(targetX - cardLeft, ARROW_EDGE_GUARD, cardWidth - ARROW_EDGE_GUARD);

    card.style.setProperty("--mhk-card-left", cardLeft - rootRect.left + "px");
    card.style.setProperty("--mhk-arrow-left", arrowLeft + "px");
    root.classList.add("mhk--positioned");
  }

  function positionAll() {
    roots.forEach(positionCard);
  }

  function schedulePositionAll() {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(positionAll);
  }

  function init() {
    roots = Array.prototype.slice.call(document.querySelectorAll(".mhk"));
    roots.forEach(function (root) {
      root.addEventListener("pointerenter", function () {
        positionCard(root);
      });
      root.addEventListener("focusin", function () {
        positionCard(root);
      });
    });

    positionAll();
    window.addEventListener("resize", schedulePositionAll, { passive: true });
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", schedulePositionAll, { passive: true });
      window.visualViewport.addEventListener("scroll", schedulePositionAll, { passive: true });
    }
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(positionAll);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
