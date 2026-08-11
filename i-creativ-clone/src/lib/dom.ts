export function setPageNamespace(namespace: string) {
  const container = document.querySelector('[data-barba="container"]');
  if (container) {
    container.setAttribute('data-barba-namespace', namespace);
  }
}

export function getPageNamespace(): string {
  const container = document.querySelector('[data-barba="container"]');
  return container?.getAttribute('data-barba-namespace') || 'home';
}

export function querySelectorAll<T extends Element>(selector: string): T[] {
  return Array.from(document.querySelectorAll(selector));
}

export function querySelector<T extends Element>(selector: string): T | null {
  return document.querySelector(selector);
}

export function isPageLoading(): boolean {
  return document.body.classList.contains('isLoading');
}

export function setPageLoading(loading: boolean) {
  if (loading) {
    document.body.classList.add('isLoading');
  } else {
    document.body.classList.remove('isLoading');
  }
}
