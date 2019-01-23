/**
 * @license
 * Copyright 2018 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

/**
 * Adapter for MDCMenuSurface. Provides an interface for managing
 * - classes
 * - dom
 * - focus
 * - position
 * - dimensions
 * - event handlers
 *
 * Additionally, provides type information for the adapter to the Closure
 * compiler.
 *
 * Implement this adapter for your framework of choice to delegate updates to
 * the component in your framework of choice. See architecture documentation
 * for more details.
 * https://github.com/material-components/material-components-web/blob/master/docs/code/architecture.md
 */
interface MDCMenuSurfaceAdapter {
  addClass(className: string): void;
  removeClass(className: string): void;
  hasClass(className: string): boolean;
  hasAnchor(): boolean;

  isElementInContainer(el: HTMLElement): boolean;
  isFocused(): boolean;
  isFirstElementFocused(): boolean;
  isLastElementFocused(): boolean;
  isRtl(): boolean;

  getInnerDimensions(): MenuDimensions;
  getAnchorDimensions(): ClientRect | null;
  getWindowDimensions(): MenuDimensions;
  getBodyDimensions(): MenuDimensions;
  getWindowScroll(): DOMPointInit;
  setPosition(position: MenuPosition): void;
  setMaxHeight(height: string): void;
  setTransformOrigin(origin: string): void;

  /** Saves the element that was focused before the menu surface was opened. */
  saveFocus(): void;

  /** Restores focus to the element that was focused before the menu surface was opened. */
  restoreFocus(): void;

  /** Focuses the first focusable element in the menu-surface. */
  focusFirstElement(): void;

  /** Focuses the first focusable element in the menu-surface. */
  focusLastElement(): void;

  /** Emits an event when the menu surface is closed. */
  notifyClose(): void;

  /** Emits an event when the menu surface is opened. */
  notifyOpen(): void;
}

interface MenuPosition {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
}

interface MenuDimensions {
  width: number;
  height: number;
}

export {
  MDCMenuSurfaceAdapter,
  MenuDimensions,
  MenuPosition,
};