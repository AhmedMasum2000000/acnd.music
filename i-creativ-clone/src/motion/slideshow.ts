import gsap from 'gsap';
import { prefersReducedMotion } from '../lib/viewport';

let currentSlide = 0;
let isPlaying = true;
let autoplayTimeout: NodeJS.Timeout | null = null;

export function initSlideshow() {
  const slides = Array.from(document.querySelectorAll('[data-slide]'));
  const controls = document.querySelector('[data-slideshow-controls]');
  const playPauseBtn = controls?.querySelector('[data-play-pause]') as HTMLButtonElement | null;
  const counter = controls?.querySelector('[data-slide-counter]') as HTMLElement | null;

  if (slides.length === 0) return;

  // Initial setup
  updateCounter(0, slides.length, counter);

  if (playPauseBtn) {
    playPauseBtn.addEventListener('click', togglePlayPause);
  }

  if (isPlaying && !prefersReducedMotion()) {
    startAutoplay(slides);
  }
}

function showSlide(index: number, slides: Element[]) {
  const total = slides.length;
  index = ((index % total) + total) % total;
  currentSlide = index;

  if (prefersReducedMotion()) {
    slides.forEach((slide, i) => {
      slide.classList.toggle('is-active', i === index);
    });
    return;
  }

  slides.forEach((slide, i) => {
    if (i === index) {
      gsap.to(slide, { opacity: 1, pointerEvents: 'auto', duration: 0.6 });
      slide.classList.add('is-active');
    } else {
      gsap.to(slide, { opacity: 0, pointerEvents: 'none', duration: 0.6 });
      slide.classList.remove('is-active');
    }
  });
}

function updateCounter(current: number, total: number, element: Element | null | undefined) {
  if (element && element instanceof HTMLElement) {
    element.textContent = `${String(current + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;
  }
}

function startAutoplay(slides: Element[]) {
  autoplayTimeout = setInterval(() => {
    currentSlide = (currentSlide + 1) % slides.length;
    showSlide(currentSlide, slides);
    updateCounter(currentSlide, slides.length, document.querySelector('[data-slide-counter]'));
  }, 4000) as unknown as NodeJS.Timeout;
}

function stopAutoplay() {
  if (autoplayTimeout) {
    clearInterval(autoplayTimeout);
    autoplayTimeout = null;
  }
}

function togglePlayPause() {
  const slides = Array.from(document.querySelectorAll('[data-slide]'));
  const btn = document.querySelector('[data-play-pause]');

  isPlaying = !isPlaying;

  if (btn) {
    btn.classList.toggle('is-playing', isPlaying);
    btn.setAttribute('aria-pressed', String(isPlaying));
  }

  if (isPlaying) {
    startAutoplay(slides);
  } else {
    stopAutoplay();
  }
}

export function nextSlide() {
  const slides = Array.from(document.querySelectorAll('[data-slide]'));
  showSlide(currentSlide + 1, slides);
  updateCounter(currentSlide, slides.length, document.querySelector('[data-slide-counter]'));
  if (isPlaying) {
    stopAutoplay();
    isPlaying = false;
  }
}

export function prevSlide() {
  const slides = Array.from(document.querySelectorAll('[data-slide]'));
  showSlide(currentSlide - 1, slides);
  updateCounter(currentSlide, slides.length, document.querySelector('[data-slide-counter]'));
  if (isPlaying) {
    stopAutoplay();
    isPlaying = false;
  }
}
