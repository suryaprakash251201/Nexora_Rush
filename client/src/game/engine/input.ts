import { create } from 'zustand';
import type { Controls } from './types';

/**
 * Input manager — keyboard state merged with touch controls into one
 * Controls object. Touch state lives in a tiny store so React buttons
 * can drive it without re-rendering the 3D scene.
 */

interface TouchState {
  throttle: boolean;
  brake: boolean;
  left: boolean;
  right: boolean;
  handbrake: boolean;
  nitro: boolean;
  set: (k: keyof Omit<TouchState, 'set'>, v: boolean) => void;
}

export const useTouchControls = create<TouchState>((set) => ({
  throttle: false,
  brake: false,
  left: false,
  right: false,
  handbrake: false,
  nitro: false,
  set: (k, v) => set({ [k]: v } as any),
}));

export class InputManager {
  private keys = new Set<string>();
  private touch = useTouchControls.getState();
  private unsubscribe?: () => void;
  onPause?: () => void;
  onReset?: () => void;
  onCamera?: () => void;
  steerSensitivity = 1;

  attach() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.clear);
    this.unsubscribe = useTouchControls.subscribe((s) => {
      this.touch = s;
    });
  }

  detach() {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.clear);
    this.unsubscribe?.();
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (e.repeat) return;
    const k = e.key.toLowerCase();
    if (k === 'escape') this.onPause?.();
    if (k === 'r') this.onReset?.();
    if (k === 'c') this.onCamera?.();
    if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
    this.keys.add(k);
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.key.toLowerCase());
  };

  private clear = () => {
    this.keys.clear();
    useTouchControls.setState({
      throttle: false,
      brake: false,
      left: false,
      right: false,
      handbrake: false,
      nitro: false,
    });
  };

  /** Smoothed steering (digital keys ramp, touch buttons ramp too). */
  private steerSmooth = 0;

  sample(dt: number): Controls {
    const k = this.keys;
    const kbThrottle = k.has('w') || k.has('arrowup');
    const kbBrake = k.has('s') || k.has('arrowdown');
    const kbLeft = k.has('a') || k.has('arrowleft');
    const kbRight = k.has('d') || k.has('arrowright');
    const target = (kbLeft ? -1 : 0) + (kbRight ? 1 : 0) + (this.touch.left ? -1 : 0) + (this.touch.right ? 1 : 0);
    const rate = 8 * this.steerSensitivity;
    // ease toward target, snap back to 0 fast
    if (target !== 0) this.steerSmooth += (target - this.steerSmooth) * Math.min(1, rate * dt);
    else this.steerSmooth += (0 - this.steerSmooth) * Math.min(1, 12 * dt);

    return {
      throttle: kbThrottle || this.touch.throttle ? 1 : 0,
      brake: kbBrake || this.touch.brake ? 1 : 0,
      steer: Math.max(-1, Math.min(1, this.steerSmooth)),
      handbrake: k.has(' ') || this.touch.handbrake,
      nitro: k.has('shift') || this.touch.nitro,
    };
  }
}
