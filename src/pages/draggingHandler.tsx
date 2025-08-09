const handleDrag = (el: HTMLIonItemSlidingElement | null, onDelete: () => void) => {
  if (!el) return;

  let previousRatio = 0;
  
  el.addEventListener("ionDrag", (event: any) => {
    const ratio = event.detail.ratio;
    
    // Only trigger delete if dragged past threshold and not already deleted
    if (ratio >= 0.75 && previousRatio < 0.75) {
      el.closeOpened();
      onDelete();
    }
    
    previousRatio = ratio;
  });

  // Set a reasonable offset for the sliding item
  el.style.setProperty('--offset', '100%');
};

export default handleDrag;
