import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { CustomEase } from 'gsap/CustomEase'

gsap.registerPlugin(ScrollTrigger, CustomEase)

/*
  MoCo eases — modelled on motion-control camera moves:
  - "ramp": speed-ramp. Huge velocity at the start, then a long, slow, buttery stop.
  - "whip": accelerates hard into the cut (used for "out" moves).
  - "punch": tiny overshoot for button punch-ins.
*/
CustomEase.create('ramp', 'M0,0 C0.04,0.62 0.1,0.9 0.26,0.965 0.48,1.01 0.72,1 1,1')
CustomEase.create('whip', 'M0,0 C0.45,0 0.7,0.06 0.82,0.3 0.92,0.52 0.96,0.8 1,1')
CustomEase.create('punch', 'M0,0 C0.2,0 0.3,1.4 0.55,1.12 0.75,0.92 0.88,1 1,1')

gsap.defaults({ ease: 'ramp', duration: 0.9 })

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export const isTouch = () =>
  typeof window !== 'undefined' && window.matchMedia('(hover: none), (pointer: coarse)').matches

export { gsap, ScrollTrigger }
