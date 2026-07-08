// Mobile navigation drawer toggle — same behaviour on every page
document.addEventListener('DOMContentLoaded', function () {
  var header = document.querySelector('.site-header');
  var toggle = document.querySelector('.hamburger');

  if (toggle && header) {
    toggle.addEventListener('click', function () {
      header.classList.toggle('open');
      var expanded = header.classList.contains('open');
      toggle.setAttribute('aria-expanded', expanded);
    });

    // close drawer when a link inside it is tapped
    header.querySelectorAll('.mobile-drawer a').forEach(function (link) {
      link.addEventListener('click', function () {
        header.classList.remove('open');
      });
    });

    // close drawer on resize back to desktop width
    window.addEventListener('resize', function () {
      if (window.innerWidth > 880) header.classList.remove('open');
    });
  }
});