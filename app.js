(function () {
  'use strict';

  var d = document;
  var buttons = d.querySelectorAll('.js-book');

  buttons.forEach(function (button) {
    button.addEventListener('click', function (event) {
      var target = d.getElementById('contact');
      if (target) {
        event.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
})();
