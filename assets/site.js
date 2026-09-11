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

  var MONTH_FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var WEEKDAY_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  // Open Tue/Thu/Fri/Sat/Sun — closed Mon(1) and Wed(3), matching the hours
  // shown on the homepage and contact page.
  var CLOSED_WEEKDAYS = [1, 3];
  var MAX_MONTHS_AHEAD = 6;

  function isClosedDay(date) {
    return CLOSED_WEEKDAYS.indexOf(date.getDay()) !== -1;
  }

  function toISODate(date) {
    return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
  }

  function initWizard() {
    var root = document.querySelector("[data-wizard]");
    if (!root) return;

    // Chair time in hours by length — shoulder-length work goes fastest,
    // waist-length takes longest, matching the segmented control in step 1.
    // Set per style rather than one flat offset so a quick shoulder-length
    // style can free up a second (or third) slot in the day while a long
    // one still takes the whole chair regardless of length.
    var STYLES = {
      knotless: { label: "Knotless Braids", hrs: { "Shoulder": 4, "Mid-back": 6.5, "Waist": 9 }, price: 220 },
      box: { label: "Box Braids", hrs: { "Shoulder": 3.5, "Mid-back": 5.5, "Waist": 7.5 }, price: 180 },
      micro: { label: "Micro Braids", hrs: { "Shoulder": 5.5, "Mid-back": 8, "Waist": 10.5 }, price: 320 },
      senegalese: { label: "Senegalese Twist", hrs: { "Shoulder": 3, "Mid-back": 5, "Waist": 7 }, price: 180 },
      fauxlocs: { label: "Faux Locs", hrs: { "Shoulder": 3.5, "Mid-back": 5.5, "Waist": 7.5 }, price: 220 },
      butterfly: { label: "Butterfly Locs", hrs: { "Shoulder": 3.5, "Mid-back": 5.5, "Waist": 7.5 }, price: 200 },
      other: { label: "Something else", hrs: { "Shoulder": 3, "Mid-back": 5, "Waist": 7 }, price: 180 }
    };
    var OPEN_MIN = 10 * 60 + 30; // 10:30 AM, in minutes since midnight
    var CLOSE_MIN = 18 * 60; // 6:00 PM

    function durationFor(styleKey, lengthLabel) {
      var s = STYLES[styleKey] || STYLES.knotless;
      return s.hrs[lengthLabel] || s.hrs["Mid-back"];
    }

    function formatHours(h) {
      var rounded = Math.round(h * 2) / 2;
      return (rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)) + " hrs";
    }

    function minutesToLabel(min) {
      var h24 = Math.floor(min / 60);
      var m = min % 60;
      var period = h24 >= 12 ? "PM" : "AM";
      var h12 = h24 % 12;
      if (h12 === 0) h12 = 12;
      return h12 + ":" + String(m).padStart(2, "0") + " " + period;
    }

    // Sequential, non-overlapping start times for one chair: the first slot
    // always opens at 10:30 (even for a style that runs past close, so long
    // styles are never blocked out entirely); each slot after that is only
    // offered if it both starts and finishes before close, so shorter
    // styles unlock more bookable times in the same day.
    function computeSlots(durationHours) {
      var durMin = Math.round(durationHours * 60);
      var slots = [];
      var candidate = OPEN_MIN;
      var first = true;
      while (candidate < CLOSE_MIN) {
        var end = candidate + durMin;
        if (end <= CLOSE_MIN || first) {
          slots.push(candidate);
        } else {
          break;
        }
        first = false;
        candidate = end;
      }
      return slots;
    }

    var today = new Date();
    today.setHours(0, 0, 0, 0);

    var state = {
      step: 1,
      styleKey: "knotless",
      length: "Mid-back",
      date: null, // Date object for the selected day, set once the calendar builds
      time: "10:30 AM",
      hair: "own"
    };

    // The month currently on screen — starts on today's month, independent
    // of which day (if any) is selected.
    var viewYear = today.getFullYear();
    var viewMonth = today.getMonth();

    var steps = Array.prototype.slice.call(root.querySelectorAll(".wizard-step"));
    var progressEls = Array.prototype.slice.call(root.querySelectorAll(".wizard-progress span"));
    var calGrid = root.querySelector("#calGrid");
    var calLabel = root.querySelector("#calMonthLabel");
    var calPrev = root.querySelector("#calPrev");
    var calNext = root.querySelector("#calNext");
    var timeRow = root.querySelector("#timeRow");

    // The per-style hour hints in the step-1 list (e.g. "6–8 hrs") update
    // live as the length segment changes, since length is picked on the
    // same screen as the style.
    function updateStyleHours() {
      root.querySelectorAll("[data-hrs-for]").forEach(function (el) {
        el.textContent = formatHours(durationFor(el.dataset.hrsFor, state.length));
      });
    }

    // Rebuilds the start-time options for whatever style + length is
    // currently selected. Resets the chosen time to the first slot whenever
    // the set of slots changes, since a previously-picked time may no
    // longer exist.
    function renderTimeSlots() {
      if (!timeRow) return;
      var duration = durationFor(state.styleKey, state.length);
      var slots = computeSlots(duration);
      timeRow.innerHTML = "";
      slots.forEach(function (min, i) {
        var label = minutesToLabel(min);
        var wrap = document.createElement("label");
        wrap.className = "seg-opt" + (i === 0 ? " blueprint" : "");
        if (i === 0) {
          wrap.innerHTML = '<i class="corner tl"></i><i class="corner tr"></i><i class="corner bl"></i><i class="corner br"></i>';
        }
        var input = document.createElement("input");
        input.type = "radio";
        input.name = "bk-time";
        input.value = label;
        if (i === 0) input.checked = true;
        wrap.appendChild(input);
        wrap.appendChild(document.createTextNode(label));
        timeRow.appendChild(wrap);
      });
      state.time = slots.length ? minutesToLabel(slots[0]) : state.time;
    }
    if (timeRow) {
      timeRow.addEventListener("change", function (e) {
        if (e.target && e.target.name === "bk-time") {
          state.time = e.target.value;
          syncSummaries();
        }
      });
    }

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
        renderTimeSlots();
        syncSummaries();
      });
    });
    root.querySelectorAll('input[name="bk-len"]').forEach(function (input) {
      input.addEventListener("change", function () {
        state.length = input.value;
        updateStyleHours();
        renderTimeSlots();
        syncSummaries();
      });
    });
    root.querySelectorAll('input[name="bk-hair"]').forEach(function (input) {
      input.addEventListener("change", function () {
        state.hair = input.value;
        syncSummaries();
      });
    });

    // ── Calendar ──────────────────────────────────────────────────────────
    // Built fresh for whichever month is in view: real weekday math, days
    // from adjacent months grayed out, closed weekdays and past dates
    // disabled. Clicking a valid day selects it without changing the month.

    function monthsFromToday(year, month) {
      return (year - today.getFullYear()) * 12 + (month - today.getMonth());
    }

    function renderCalendar() {
      if (!calGrid) return;
      calLabel.textContent = MONTH_FULL[viewMonth] + " " + viewYear;

      var firstOfMonth = new Date(viewYear, viewMonth, 1);
      var startOffset = (firstOfMonth.getDay() + 6) % 7; // Monday-first grid
      var daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
      var totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

      calGrid.innerHTML = "";
      for (var i = 0; i < totalCells; i++) {
        var cellDate = new Date(viewYear, viewMonth, 1 - startOffset + i);
        var btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = String(cellDate.getDate());

        var otherMonth = cellDate.getMonth() !== viewMonth;
        var isPast = cellDate < today;
        var closed = isClosedDay(cellDate);

        if (otherMonth || isPast || closed) {
          btn.className = "muted";
          btn.disabled = true;
        } else {
          btn.dataset.date = toISODate(cellDate);
          if (state.date && toISODate(state.date) === btn.dataset.date) {
            btn.classList.add("selected");
          }
        }
        calGrid.appendChild(btn);
      }

      if (calPrev) calPrev.disabled = monthsFromToday(viewYear, viewMonth) <= 0;
      if (calNext) calNext.disabled = monthsFromToday(viewYear, viewMonth) >= MAX_MONTHS_AHEAD;
    }

    if (calGrid) {
      calGrid.addEventListener("click", function (e) {
        var btn = e.target.closest("button[data-date]");
        if (!btn || btn.disabled) return;
        calGrid.querySelectorAll("button.selected").forEach(function (b) {
          b.classList.remove("selected");
        });
        btn.classList.add("selected");
        var parts = btn.dataset.date.split("-").map(Number);
        state.date = new Date(parts[0], parts[1] - 1, parts[2]);
        syncSummaries();
      });
    }
    if (calPrev) {
      calPrev.addEventListener("click", function () {
        if (calPrev.disabled) return;
        viewMonth -= 1;
        if (viewMonth < 0) { viewMonth = 11; viewYear -= 1; }
        renderCalendar();
      });
    }
    if (calNext) {
      calNext.addEventListener("click", function () {
        if (calNext.disabled) return;
        viewMonth += 1;
        if (viewMonth > 11) { viewMonth = 0; viewYear += 1; }
        renderCalendar();
      });
    }

    // Auto-pick the earliest bookable day (today, if open, else the next
    // open day) so the wizard starts with a sensible default like before.
    function firstBookableDate() {
      var d = new Date(today);
      for (var i = 0; i < 60; i++) {
        if (!isClosedDay(d)) return new Date(d);
        d.setDate(d.getDate() + 1);
      }
      return new Date(today);
    }
    state.date = firstBookableDate();
    viewYear = state.date.getFullYear();
    viewMonth = state.date.getMonth();
    renderCalendar();

    function syncSummaries() {
      var s = STYLES[state.styleKey] || STYLES.knotless;
      var duration = durationFor(state.styleKey, state.length);
      var durationLabel = formatHours(duration);
      var d = state.date;
      var weekday = d ? WEEKDAY_FULL[d.getDay()] : "";
      var monthShort = d ? MONTH_ABBR[d.getMonth()] : "";
      var dayNum = d ? d.getDate() : "";

      root.querySelectorAll("[data-sum-style]").forEach(function (el) {
        el.textContent = s.label + (state.styleKey === "other" ? "" : ", " + state.length.toLowerCase());
      });
      root.querySelectorAll("[data-sum-hrs]").forEach(function (el) {
        el.textContent = "about " + durationLabel + " in the chair";
      });
      root.querySelectorAll("[data-sum-hair]").forEach(function (el) {
        el.textContent = state.hair === "own" ? "own hair" : "needs hair";
      });
      root.querySelectorAll("[data-sum-day]").forEach(function (el) {
        el.textContent = weekday + ", " + monthShort + " " + dayNum + " · " + state.time;
      });
      root.querySelectorAll("[data-sum-daylabel]").forEach(function (el) {
        el.textContent = (weekday + ", " + MONTH_FULL[d ? d.getMonth() : 0] + " " + dayNum + " · START TIME").toUpperCase();
      });
      root.querySelectorAll("[data-sum-length]").forEach(function (el) {
        el.textContent = durationLabel;
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

    updateStyleHours();
    renderTimeSlots();
    syncSummaries();
    showStep(1);
  }

  document.addEventListener("DOMContentLoaded", function () {
    initNav();
    initWizard();
  });
})();
