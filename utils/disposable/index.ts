/* eslint-disable @typescript-eslint/no-namespace */

import { isFunction, isObject } from "../utils";


export interface Disposable {
  dispose(): void;
}

export namespace Disposable {
  export function is(arg: unknown): arg is Disposable {
    return isObject<Disposable>(arg) && isFunction(arg.dispose);
  }

  export function create(func: () => void): Disposable {
    return { dispose: func };
  }

  export declare const NULL: Disposable;
}

/**
 * Ensures that every reference to {@link Disposable.NULL} returns a new object,
 * as sharing a disposable between multiple {@link DisposableCollection} can have unexpected side effects
 */
Object.defineProperty(Disposable, 'NULL', {
  configurable: false,
  enumerable: true,
  get(): Disposable {
      return { dispose: () => { } };
  }
});

export class DisposableCollection implements Disposable {
  protected readonly disposables: Disposable[] = [];
  
  constructor(...toDispose: Disposable[]) {
    toDispose.forEach(d => this.push(d));
  }
  
  get disposed(): boolean {
    return this.disposables.length === 0;
  }

  private disposingElements = false;
  dispose(): void {
    if (this.disposed || this.disposingElements) {
      return;
    }
    this.disposingElements = true;
    while (!this.disposed) {
      try {
        this.disposables.pop()!.dispose();
      } catch (e) {
        console.error(e);
      }
    }
    this.disposingElements = false;   
  }

  push(disposable: Disposable): Disposable {
    const disposables = this.disposables;
    disposables.push(disposable);
    const originalDispose = disposable.dispose.bind(disposable);
    const toRemove = Disposable.create(() => {
      const index = disposables.indexOf(disposable);
      if (index !== -1) {
        disposables.splice(index, 1);
      }
    });
    disposable.dispose = () => {
      toRemove.dispose();
      disposable.dispose = originalDispose;
      originalDispose();
    };
    return toRemove;
  }

  pushAll(disposables: Disposable[]): Disposable[] {
    return disposables.map(disposable => this.push(disposable));
  }
}