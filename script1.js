document.querySelectorAll('.rc-menu-row').forEach(row => {
  const scrollArea = row.querySelector('.rc-menu-scroll');
  if (!scrollArea) return;
 
  scrollArea.addEventListener('scroll', () => {
    if (scrollArea.scrollLeft > 12) {
      row.classList.add('rc-label-hidden');
    } else {
      row.classList.remove('rc-label-hidden');
    }
  });
});