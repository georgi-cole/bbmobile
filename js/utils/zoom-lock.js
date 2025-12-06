// Lightweight ES module to prevent pinch/gesture zoom on an element or the whole document.
// Usage:
// import { ZoomLock } from '../utils/zoom-lock.js';
// const lock = ZoomLock.forElement(document.getElementById('introhub'));
// lock.attach();
// lock.detach();

export const ZoomLock = (() => {
  function createFor(element = document) {
    function onTouchStart(e) {
      if (e.touches && e.touches.length > 1) {
        e.preventDefault();
      }
    }

    function onTouchMove(e) {
      if (e.touches && e.touches.length > 1) {
        e.preventDefault();
      }
    }

    function onGestureStart(e) {
      if (e && typeof e.preventDefault === 'function') {
        e.preventDefault();
      }
    }

    let attached = false;

    return {
      attach() {
        if (attached) return;
        element.addEventListener('touchstart', onTouchStart, { passive: false });
        element.addEventListener('touchmove', onTouchMove, { passive: false });
        window.addEventListener('gesturestart', onGestureStart);
        attached = true;
      },
      detach() {
        if (!attached) return;
        element.removeEventListener('touchstart', onTouchStart, { passive: false });
        element.removeEventListener('touchmove', onTouchMove, { passive: false });
        window.removeEventListener('gesturestart', onGestureStart);
        attached = false;
      },
      isAttached() {
        return attached;
      }
    };
  }

  return {
    forElement: createFor,
    lockDocument() {
      const inst = createFor(document);
      inst.attach();
      return inst;
    }
  };
})();
