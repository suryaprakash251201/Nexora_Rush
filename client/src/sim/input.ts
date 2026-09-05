import { create } from 'zustand';
import type { Controls } from './types';
import { NEUTRAL } from './types';

/** Touch button state (drives the same Controls as the keyboard). */
interface TouchStore {
  gas: boolean;
  brake: boolean;
  left: boolean;
  right: boolean;
  drift: boolean;
  boost: boolean;
  set: (k: keyof Omit<TouchStore, 'set'>, v: boolean) => void;
  clear: () => void;
}

export const useTouch = create<TouchStore>((set) => ({
  gas: false,
  brake: false,
  left: false,
  right: false,
  drift: false,
  boost: false,
  set: (k, v) => set({ [k]: v } as any),
  clear: () => set({ gas: false, brake: false, left: false, right: false, drift: false, boost: false }),
}));

export class Input {
  private keys = new Set<string>();
  private steer = 0;
  private unsub: (() => void) | null = null;
  sensitivity = 1;
  onPause: (() => void) | null = null;
  onReset: (() => void) | null = null;

  attach() {
    window.addEventListener('keydown', this.down);
    window.addEventListener('keyup', this.up);
    window.addEventListener('blur', this.lost);
  }

  detach() {
    window.removeEventListener('keydown', this.down);
    window.removeEventListener('keyup', this.up);
    window.removeEventListener('blur', this.lost);
    this.unsub?.();
    this.unsub = null;
  }

  private down = (e: KeyboardEvent) => {
    if (e.repeat) return;
    const k = e.key.toLowerCase();
    if (k === 'escape') this.onPause?.();
    if (k === 'r') this.onReset?.();
    if (k === ' ' || k.startsWith('arrow')) e.preventDefault();
    this.keys.add(k);
  };

  private up = (e: KeyboardEvent) => {
    this.keys.delete(e.key.toLowerCase());
  };

  private lost = () => {
    this.keys.clear();
    useTouch.getState().clear();
  };

  sample(dt: number): Controls {
    const k = this.keys;
    const t = useTouch.getState();
    const want = (k.has('a') || k.has('arrowleft') || t.left ? -1 : 0) + (k.has('d') || k.has('arrowright') || t.right ? 1 : 0);
    if (want !== 0) this.steer += (want - this.steer) * Math.min(1, 8 * this.sensitivity * dt);
    else this.steer += (0 - this.steer) * Math.min(1, 12 * dt);
    return {
      throttle: k.has('w') || k.has('arrowup') || t.gas ? 1 : 0,
      brake: k.has('s') || k.has('arrowdown') || t.brake ? 1 : 0,
      steer: Math.max(-1, Math.min(1, this.steer)),
      handbrake: k.has(' ') || t.drift,
      nitro: k.has('shift') || t.boost,
    };
  }
}
