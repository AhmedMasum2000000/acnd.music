import gsap from 'gsap';
import Flip from 'gsap/Flip';
import { prefersReducedMotion } from '../lib/viewport';

gsap.registerPlugin(Flip);

export function initProjectFilter() {
  const filterBtns = Array.from(document.querySelectorAll('[data-filter-btn]'));
  const projectList = document.querySelector('[data-project-list]');

  if (!filterBtns.length || !projectList) return;

  filterBtns.forEach((btn) => {
    const htmlBtn = btn as HTMLElement;
    htmlBtn.addEventListener('click', () => {
      const category = htmlBtn.getAttribute('data-filter-value');
      if (category) {
        filterProjects(category, projectList, filterBtns as HTMLElement[]);
      }
    });
  });
}

function filterProjects(category: string, container: Element, buttons: HTMLElement[]) {
  const projects = Array.from(container.querySelectorAll('[data-project-item]'));

  // Update active state
  buttons.forEach((btn) => {
    btn.classList.toggle('is-active', btn.getAttribute('data-filter-value') === category);
  });

  if (prefersReducedMotion()) {
    projects.forEach((project) => {
      const tags = (project.getAttribute('data-tags') || '').split(',');
      project.classList.toggle('hidden', category !== 'all' && !tags.includes(category));
    });
    return;
  }

  // Save current state
  const state = Flip.getState(projects);

  // Update DOM
  projects.forEach((project) => {
    const tags = (project.getAttribute('data-tags') || '').split(',');
    const isMatch = category === 'all' || tags.includes(category);
    project.classList.toggle('hidden', !isMatch);
  });

  // Animate to new state
  Flip.from(state, {
    duration: 0.6,
    ease: 'power2.out',
    stagger: 0.05,
  });
}
