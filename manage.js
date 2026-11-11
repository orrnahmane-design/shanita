(function () {
  'use strict';

  var d = document;
  var listEl = d.getElementById('list');
  var emptyEl = d.getElementById('empty');
  var exportBtn = d.getElementById('export');
  var clearBtn = d.getElementById('clear');
  var todayCountEl = d.getElementById('today-count');
  var weekCountEl = d.getElementById('week-count');
  var allCountEl = d.getElementById('all-count');
  var lastCheckEl = d.getElementById('last-check');
  var sentStateEl = d.getElementById('sent-state');

  function getBookings() {
    try {
      return JSON.parse(localStorage.getItem('shanita-bookings') || '[]');
    } catch (error) {
      return [];
    }
  }

  function formatDate(dateString) {
    if (!dateString) return '—';
    var date = new Date(dateString + 'T00:00:00');
    return isNaN(date.getTime()) ? dateString : date.toLocaleDateString('he-IL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  function formatTime(time) {
    return time || '—';
  }

  function normalizePhone(phone) {
    if (!phone) return '';
    var cleaned = String(phone).replace(/[^\d+]/g, '');
    if (!cleaned) return '';
    if (cleaned.indexOf('+') === 0) return cleaned;
    if (cleaned.indexOf('972') === 0) return '+' + cleaned;
    if (cleaned.indexOf('0') === 0) return '+972' + cleaned.slice(1);
    return '+' + cleaned;
  }

  function createMessageUrl(item, type) {
    var clean = normalizePhone(item.phone);
    if (!clean) return '';

    var text = 'היי ' + (item.name || 'לקוחה') + ',\n' +
      'שמחתי לקבל את הבקשה שלך לתור ב-Shanita.\n' +
      'תאריך: ' + (item.date || '—') + ', שעה: ' + (item.time || '—') + '.\n' +
      'זאת בקשה בלבד, וצריך לחכות לאישור התור.';

    if (type === 'wa') {
      var waNumber = clean.replace(/\D/g, '');
      if (waNumber.indexOf('972') === 0) {
        waNumber = waNumber.slice(3);
      }
      return 'https://wa.me/' + waNumber + '?text=' + encodeURIComponent(text);
    }

    return 'sms:' + clean + '?body=' + encodeURIComponent(text);
  }

  function sendVia(type, item) {
    var url = createMessageUrl(item, type);
    if (!url) {
      alert('אין מספר טלפון למשתמש זה.');
      return;
    }

    if (type === 'wa') {
      window.open(url, '_blank', 'noopener');
      return;
    }

    window.location.href = url;
  }

  function renderStats(items) {
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var weekFromNow = new Date(today);
    weekFromNow.setDate(weekFromNow.getDate() + 7);

    var todayCount = 0;
    var weekCount = 0;

    items.forEach(function (item) {
      if (!item.date) return;
      var itemDate = new Date(item.date + 'T00:00:00');
      if (itemDate.getTime() === today.getTime()) todayCount++;
      if (itemDate >= today && itemDate <= weekFromNow) weekCount++;
    });

    todayCountEl.textContent = String(todayCount);
    weekCountEl.textContent = String(weekCount);
    allCountEl.textContent = String(items.length);

    var last = items.length ? items[items.length - 1] : null;
    lastCheckEl.textContent = last ? new Date(last.createdAt || Date.now()).toLocaleString('he-IL') : '—';
    sentStateEl.textContent = items.length ? 'התקבלו תורים' : 'עוד לא נשלחו תורים';
  }

  function renderList(items) {
    if (!listEl) return;

    listEl.innerHTML = '';

    if (!items.length) {
      if (emptyEl) emptyEl.hidden = false;
      return;
    }

    if (emptyEl) emptyEl.hidden = true;

    items
      .slice()
      .reverse()
      .forEach(function (item) {
        var row = d.createElement('article');
        row.className = 'ev';

        var head = d.createElement('div');
        head.className = 'ev-head';

        var time = d.createElement('span');
        time.className = 'ev-time';
        time.textContent = formatTime(item.time);

        var name = d.createElement('h3');
        name.textContent = item.name || 'לקוחה ללא שם';

        head.appendChild(time);
        head.appendChild(name);

        var note = d.createElement('p');
        note.className = 'ev-note';
        note.textContent = formatDate(item.date) + ' · ' + (item.phone || '—') + (item.note ? ' · ' + item.note : '');

        var actions = d.createElement('div');
        actions.className = 'ev-actions';

        var wa = d.createElement('button');
        wa.type = 'button';
        wa.className = 'mini mini-primary';
        wa.textContent = 'WhatsApp';
        wa.addEventListener('click', function () {
          sendVia('wa', item);
        });

        var sms = d.createElement('button');
        sms.type = 'button';
        sms.className = 'mini';
        sms.textContent = 'SMS';
        sms.addEventListener('click', function () {
          sendVia('sms', item);
        });

        var del = d.createElement('button');
        del.type = 'button';
        del.className = 'mini mini-quiet';
        del.textContent = 'מחק';
        del.addEventListener('click', function () {
          var next = getBookings().filter(function (entry) { return entry.createdAt !== item.createdAt; });
          localStorage.setItem('shanita-bookings', JSON.stringify(next));
          render();
        });

        actions.appendChild(wa);
        actions.appendChild(sms);
        actions.appendChild(del);
        row.appendChild(head);
        row.appendChild(note);
        row.appendChild(actions);
        listEl.appendChild(row);
      });
  }

  function render() {
    var items = getBookings();
    renderStats(items);
    renderList(items);
  }

  exportBtn && exportBtn.addEventListener('click', function () {
    var items = getBookings();
    if (!items.length) return;

    var csv = 'name,phone,date,time,note\n';
    items.forEach(function (item) {
      csv += [
        '"' + (item.name || '').replace(/"/g, '""') + '"',
        '"' + (item.phone || '').replace(/"/g, '""') + '"',
        item.date || '',
        item.time || '',
        '"' + (item.note || '').replace(/"/g, '""') + '"'
      ].join(',') + '\n';
    });

    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var anchor = d.createElement('a');
    anchor.href = url;
    anchor.download = 'shanita-bookings.csv';
    d.body.appendChild(anchor);
    anchor.click();
    d.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  });

  clearBtn && clearBtn.addEventListener('click', function () {
    localStorage.removeItem('shanita-bookings');
    render();
  });

  render();
})();
