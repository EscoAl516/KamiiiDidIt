// KamiDidIt — nav toggle (shared by every page) + booking wizard (book.html only).
(function () {
  "use strict";

  function initNav() {
    var nav = document.querySelector(".site-nav");
    var toggle = document.getElementById("navToggle");
    if (!nav || !toggle) return;
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    document.addEventListener("click", function (e) {
      if (nav.classList.contains("is-open") && !nav.contains(e.target)) {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  function initWizard() {
    var root = document.querySelector("[data-wizard]");
    if (!root) return;

    var STYLES = {
      knotless: { label: "Knotless Braids", hrs: "6–8 hrs", price: 220 },
      box: { label: "Box Braids", hrs: "5–7 hrs", price: 180 },
      micro: { label: "Micro Braids", hrs: "8+ hrs", price: 320 },
      senegalese: { label: "Senegalese Twist", hrs: "5–6 hrs", price: 180 },
      fauxlocs: { label: "Faux Locs", hrs: "6–7 hrs", price: 220 },
      butterfly: { label: "Butterfly Locs", hrs: "6 hrs", price: 200 },
      other: { label: "Something else", hrs: "ask in notes", price: 180 }
    };

    var state = {
      step: 1,
      styleKey: "knotless",
      length: "Mid-back",
      day: 10,
      time: "10:30 AM",
      hair: "own"
    };

    var steps = Array.prototype.slice.call(root.querySelectorAll(".wizard-step"));
    var progressEls = Array.prototype.slice.call(root.querySelectorAll(".wizard-progress span"));

    function showStep(n) {
      state.step = n;
      steps.forEach(function (el) {
        el.hidden = Number(el.dataset.step) !== n;
      });
      progressEls.forEach(function (el, i) {
        el.classList.toggle("done", i < n);
      });
      root.scrollIntoView({ block: "start", behavior: "smooth" });
    }

    root.querySelectorAll("[data-next]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var next = Number(btn.dataset.next);
        if (next === 5) {
          submitBooking();
          return;
        }
        showStep(next);
      });
    });
    root.querySelectorAll("[data-back]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        showStep(Number(btn.dataset.back));
      });
    });

    root.querySelectorAll('input[name="bk-style"]').forEach(function (input) {
      input.addEventListener("change", function () {
        state.styleKey = input.value;
        syncSummaries();
      });
    });
    root.querySelectorAll('input[name="bk-len"]').forEach(function (input) {
      input.addEventListener("change", function () {
        state.length = input.value;
        syncSummaries();
      });
    });
    root.querySelectorAll('input[name="bk-hair"]').forEach(function (input) {
      input.addEventListener("change", function () {
        state.hair = input.value;
        syncSummaries();
      });
    });
    root.querySelectorAll(".cal-grid button[data-day]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (btn.disabled) return;
        root.querySelectorAll(".cal-grid button.selected").forEach(function (b) {
          b.classList.remove("selected");
        });
        btn.classList.add("selected");
        state.day = Number(btn.dataset.day);
        syncSummaries();
      });
    });
    root.querySelectorAll('input[name="bk-time"]').forEach(function (input) {
      input.addEventListener("change", function () {
        if (input.disabled) return;
        state.time = input.value;
        syncSummaries();
      });
    });

    // The calendar grid is fixed to October 2026 with Oct 1 in the Thursday
    // column, so a day-of-month maps to a weekday with no Date math needed.
    var WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    function weekdayFor(day) {
      return WEEKDAYS[(3 + (day - 1)) % 7];
    }

    function syncSummaries() {
      var s = STYLES[state.styleKey] || STYLES.knotless;
      var weekday = weekdayFor(state.day);
      root.querySelectorAll("[data-sum-style]").forEach(function (el) {
        el.textContent = s.label + (state.styleKey === "other" ? "" : ", " + state.length.toLowerCase());
      });
      root.querySelectorAll("[data-sum-hrs]").forEach(function (el) {
        el.textContent = "about " + s.hrs.replace("+", "+ ") + " — only full-day slots show";
      });
      root.querySelectorAll("[data-sum-hair]").forEach(function (el) {
        el.textContent = state.hair === "own" ? "own hair" : "needs hair";
      });
      root.querySelectorAll("[data-sum-day]").forEach(function (el) {
        el.textContent = weekday + ", Oct " + state.day + " · " + state.time;
      });
      root.querySelectorAll("[data-sum-daylabel]").forEach(function (el) {
        el.textContent = weekday.toUpperCase() + ", OCTOBER " + state.day + " · START TIME";
      });
      root.querySelectorAll("[data-sum-length]").forEach(function (el) {
        el.textContent = s.hrs;
      });
    }

    function submitBooking() {
      // Static prototype — nothing is sent anywhere. A real deployment would
      // POST this to a booking/payment backend here instead of showing the
      // local confirmation panel.
      steps.forEach(function (el) { el.hidden = true; });
      var confirm = root.querySelector(".confirm-panel");
      if (confirm) confirm.hidden = false;
      progressEls.forEach(function (el) { el.classList.add("done"); });
    }

    syncSummaries();
    showStep(1);
  }

  document.addEventListener("DOMContentLoaded", function () {
    initNav();
    initWizard();
  });
})();
