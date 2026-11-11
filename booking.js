(function () {
  'use strict';

  var SHANITA = window.SHANITA_CONFIG || {};
  var d = document;
  var form = d.getElementById('book');
  var dateInput = d.getElementById('b-date');
  var slotWrap = d.getElementById('b-slots');
  var errEl = d.getElementById('b-err');
  var nameInput = d.getElementById('b-name');
  var phoneInput = d.getElementById('b-phone');
  var noteInput = d.getElementById('b-note-text');

  if (!form || !dateInput || !slotWrap) return;

  var openHour = Number(SHANITA.openHour) || 9;
  var closeHour = Number(SHANITA.closeHour) || 17;
  var slotMinutes = Number(SHANITA.slotMinutes) || 30;
  var closedDays = Array.isArray(SHANITA.closedDays) ? SHANITA.closedDays : [];
  var daysAhead = Number(SHANITA.daysAhead) || 60;

  function pad(value) {
    return String(value).padStart(2, '0');
  }

  function toLocalDateString(date) {
    var year = date.getFullYear();
    var month = pad(date.getMonth() + 1);
    var day = pad(date.getDate());
    return year + '-' + month + '-' + day;
  }

  function addDays(date, days) {
    var clone = new Date(date);
    clone.setDate(clone.getDate() + days);
    return clone;
  }

  function isClosedDay(date) {
    return closedDays.indexOf(date.getDay()) !== -1;
  }

  function buildDateRange() {
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    dateInput.min = toLocalDateString(today);
    dateInput.max = toLocalDateString(addDays(today, daysAhead));
  }

  function getAvailableSlotsForDate(selectedDate) {
    var day = new Date(selectedDate + 'T00:00:00');
    if (isClosedDay(day)) {
      return [];
    }

    var slots = [];
    var startMinutes = Math.round(openHour * 60);
    var endMinutes = Math.round(closeHour * 60);
    var now = new Date();
    var nowMinutes = now.getHours() * 60 + now.getMinutes();
    var current = new Date(day);
    current.setHours(Math.floor(openHour), Math.round((openHour % 1) * 60), 0, 0);

    while (current.getTime() < new Date(day.getFullYear(), day.getMonth(), day.getDate(), Math.floor(closeHour), Math.round((closeHour % 1) * 60), 0, 0).getTime()) {
      var totalMinutes = current.getHours() * 60 + current.getMinutes();
      var isToday = toLocalDateString(day) === toLocalDateString(now);
      var tooSoon = isToday && (totalMinutes <= nowMinutes + 30);

      if (!tooSoon) {
        slots.push(new Date(current));
      }

      current = new Date(current.getTime() + slotMinutes * 60000);
    }

    return slots;
  }

  function renderSlots() {
    var selectedDate = dateInput.value;
    slotWrap.innerHTML = '';
    setError('');

    if (!selectedDate) {
      slotWrap.innerHTML = '<p class="hint">בחרי תאריך כדי לבחור שעה</p>';
      return;
    }

    var selectedDay = new Date(selectedDate + 'T00:00:00');
    if (Number.isNaN(selectedDay.getTime())) {
      slotWrap.innerHTML = '<p class="hint">תאריך לא תקין</p>';
      return;
    }

    var slots = getAvailableSlotsForDate(selectedDate);
    if (!slots.length) {
      var closedText = isClosedDay(selectedDay) ? 'הסלון סגור ביום הזה' : 'אין שעות זמינות בתאריך הנבחר';
      slotWrap.innerHTML = '<p class="hint">' + closedText + '</p>';
      return;
    }

    slots.forEach(function (slotDate) {
      var label = d.createElement('label');
      label.className = 'slot';

      var input = d.createElement('input');
      input.type = 'radio';
      input.name = 'chosen-slot';
      input.value = slotDate.toTimeString().slice(0, 5);
      input.setAttribute('aria-label', 'שעה ' + input.value);

      var text = d.createElement('span');
      text.textContent = input.value;

      label.appendChild(input);
      label.appendChild(text);
      slotWrap.appendChild(label);
    });
  }

  function setError(message) {
    if (!errEl) return;
    errEl.textContent = message || '';
  }

  function validateForm() {
    if (!nameInput.value.trim()) {
      setError('יש להזין שם');
      nameInput.focus();
      return false;
    }

    if (!phoneInput.value.trim()) {
      setError('יש להזין טלפון');
      phoneInput.focus();
      return false;
    }

    if (!dateInput.value) {
      setError('יש לבחור תאריך');
      dateInput.focus();
      return false;
    }

    var selectedTime = form.querySelector('input[name="chosen-slot"]:checked');
    if (!selectedTime) {
      setError('יש לבחור שעה');
      slotWrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      return false;
    }

    return true;
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    if (!validateForm()) return;

    var selectedTime = form.querySelector('input[name="chosen-slot"]:checked').value;
    var booking = {
      name: nameInput.value.trim(),
      phone: phoneInput.value.trim(),
      date: dateInput.value,
      time: selectedTime,
      note: noteInput.value.trim(),
      createdAt: new Date().toISOString()
    };

    var list = JSON.parse(localStorage.getItem('shanita-bookings') || '[]');
    list.push(booking);
    localStorage.setItem('shanita-bookings', JSON.stringify(list));

    if (window.ShanitaAlert) {
      window.ShanitaAlert(booking);
    }

    var done = d.getElementById('b-done');
    if (done) {
      done.hidden = false;
      var text = d.getElementById('b-done-text');
      if (text) {
        text.textContent = 'הבקשה נשלחה ל-Shanita. השעה ' + booking.time + ' ב-' + booking.date + ' נקלטה בהצלחה.';
      }
      done.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    form.reset();
    renderSlots();
    setError('');
  });

  dateInput.addEventListener('change', renderSlots);
  buildDateRange();
  renderSlots();
})();
