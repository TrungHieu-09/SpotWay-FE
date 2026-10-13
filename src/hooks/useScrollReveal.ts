import { useEffect, useRef } from 'react'

/**
 * Attaches an IntersectionObserver to a container element.
 * Every child matching `selector` gets `.sw-revealed` added when it enters view.
 */
export function useScrollReveal(
  selector = '[data-reveal]',
  options: IntersectionObserverInit = {},
) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = ref.current
    if (!root) return

    const targets = Array.from(root.querySelectorAll<HTMLElement>(selector))

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement
            const delay = el.dataset.revealDelay ?? '0'
            el.style.transitionDelay = `${delay}ms`
            el.classList.add('sw-revealed')
            observer.unobserve(el) // fire once
          }
        })
      },
      { threshold: 0.12, rootMargin: '0px 0px -60px 0px', ...options },
    )

    targets.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [selector, options])

  return ref
}
