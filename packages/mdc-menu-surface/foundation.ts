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

// tslint:disable:no-bitwise object-literal-sort-keys

import MDCFoundation from '@material/base/foundation';
import {
  MDCMenuSurfaceAdapter,
  MenuDimensions,
  MenuPosition,
} from './adapter';
import {Corner, CornerBit, cssClasses, numbers, strings} from './constants';

interface AutoLayoutMeasurements {
  viewportSize: MenuDimensions;
  viewportDistance: MenuPosition;
  anchorSize: MenuDimensions;
  surfaceSize: MenuDimensions;
  bodySize: MenuDimensions;
  windowScroll: DOMPointInit;
}

class MDCMenuSurfaceFoundation extends MDCFoundation<MDCMenuSurfaceAdapter> {
  static get cssClasses() {
    return cssClasses;
  }

  static get strings() {
    return strings;
  }

  static get numbers() {
    return numbers;
  }

  static get Corner() {
    return Corner;
  }

  /**
   * {@see MDCMenuSurfaceAdapter} for typing information on parameters and return types.
   */
  static get defaultAdapter(): MDCMenuSurfaceAdapter {
    return {
      addClass: () => undefined,
      removeClass: () => undefined,
      hasClass: () => false,
      hasAnchor: () => false,

      isElementInContainer: () => false,
      isFocused: () => false,
      isFirstElementFocused: () => false,
      isLastElementFocused: () => false,
      isRtl: () => false,

      getInnerDimensions: () => null,
      getAnchorDimensions: () => null,
      getWindowDimensions: () => null,
      getBodyDimensions: () => null,
      getWindowScroll: () => null,
      setPosition: () => undefined,
      setMaxHeight: () => undefined,
      setTransformOrigin: () => undefined,

      saveFocus: () => undefined,
      restoreFocus: () => undefined,
      focusFirstElement: () => undefined,
      focusLastElement: () => undefined,

      notifyClose: () => undefined,
      notifyOpen: () => undefined,
    };
  }

  private isOpen_: boolean;
  private openAnimationEndTimerId_: number;
  private closeAnimationEndTimerId_: number;
  private animationRequestId_: number;
  private dimensions_: MenuDimensions;
  private anchorCorner_: Corner;
  private anchorMargin_: MenuPosition;
  private measurements_: AutoLayoutMeasurements;
  private isQuickOpen_: boolean;
  private isHoistedElement_: boolean;
  private isFixedPosition_: boolean;
  private position_: DOMPointInit;

  constructor(adapter: MDCMenuSurfaceAdapter) {
    super(Object.assign(MDCMenuSurfaceFoundation.defaultAdapter, adapter));

    this.isOpen_ = false;
    this.openAnimationEndTimerId_ = 0;
    this.closeAnimationEndTimerId_ = 0;
    this.animationRequestId_ = 0;
    this.anchorCorner_ = Corner.TOP_START;
    this.anchorMargin_ = {top: 0, right: 0, bottom: 0, left: 0};
    this.measurements_ = null;
    this.isQuickOpen_ = false;
    this.isHoistedElement_ = false;
    this.isFixedPosition_ = false;
    this.position_ = {x: 0, y: 0};
  }

  init() {
    const {ROOT, OPEN} = MDCMenuSurfaceFoundation.cssClasses;

    if (!this.adapter_.hasClass(ROOT)) {
      throw new Error(`${ROOT} class required in root element.`);
    }

    if (this.adapter_.hasClass(OPEN)) {
      this.isOpen_ = true;
    }
  }

  destroy() {
    clearTimeout(this.openAnimationEndTimerId_);
    clearTimeout(this.closeAnimationEndTimerId_);
    // Cancel any currently running animations.
    cancelAnimationFrame(this.animationRequestId_);
  }

  /**
   * @param corner Default anchor corner alignment of top-left menu surface corner.
   */
  setAnchorCorner(corner: Corner) {
    this.anchorCorner_ = corner;
  }

  /**
   * @param margin Set of margin values from anchor.
   */
  setAnchorMargin(margin: MenuPosition) {
    this.anchorMargin_.top = margin.top || 0;
    this.anchorMargin_.right = margin.right || 0;
    this.anchorMargin_.bottom = margin.bottom || 0;
    this.anchorMargin_.left = margin.left || 0;
  }

  /** Used to indicate if the menu-surface is hoisted to the body. */
  setIsHoisted(isHoisted: boolean) {
    this.isHoistedElement_ = isHoisted;
  }

  /** Used to set the menu-surface calculations based on a fixed position menu. */
  setFixedPosition(isFixedPosition: boolean) {
    this.isFixedPosition_ = isFixedPosition;
  }

  /** Sets the menu-surface position on the page. */
  setAbsolutePosition(x: number, y: number) {
    this.position_.x = this.typeCheckisFinite_(x) ? x : 0;
    this.position_.y = this.typeCheckisFinite_(y) ? y : 0;
  }

  setQuickOpen(quickOpen: boolean) {
    this.isQuickOpen_ = quickOpen;
  }

  isOpen() {
    return this.isOpen_;
  }

  /**
   * Open the menu surface.
   */
  open() {
    this.adapter_.saveFocus();

    if (!this.isQuickOpen_) {
      this.adapter_.addClass(MDCMenuSurfaceFoundation.cssClasses.ANIMATING_OPEN);
    }

    this.animationRequestId_ = requestAnimationFrame(() => {
      this.adapter_.addClass(MDCMenuSurfaceFoundation.cssClasses.OPEN);
      this.dimensions_ = this.adapter_.getInnerDimensions();
      this.autoPosition_();
      if (this.isQuickOpen_) {
        this.adapter_.notifyOpen();
      } else {
        this.openAnimationEndTimerId_ = setTimeout(() => {
          this.openAnimationEndTimerId_ = 0;
          this.adapter_.removeClass(MDCMenuSurfaceFoundation.cssClasses.ANIMATING_OPEN);
          this.adapter_.notifyOpen();
        }, numbers.TRANSITION_OPEN_DURATION);
      }
    });

    this.isOpen_ = true;
  }

  /**
   * Closes the menu surface.
   */
  close() {
    if (!this.isQuickOpen_) {
      this.adapter_.addClass(MDCMenuSurfaceFoundation.cssClasses.ANIMATING_CLOSED);
    }

    requestAnimationFrame(() => {
      this.adapter_.removeClass(MDCMenuSurfaceFoundation.cssClasses.OPEN);
      if (this.isQuickOpen_) {
        this.adapter_.notifyClose();
      } else {
        this.closeAnimationEndTimerId_ = setTimeout(() => {
          this.closeAnimationEndTimerId_ = 0;
          this.adapter_.removeClass(MDCMenuSurfaceFoundation.cssClasses.ANIMATING_CLOSED);
          this.adapter_.notifyClose();
        }, numbers.TRANSITION_CLOSE_DURATION);
      }
    });

    this.isOpen_ = false;
    this.maybeRestoreFocus_();
  }

  /** Handle clicks and close if not within menu-surface element. */
  handleBodyClick(evt: MouseEvent) {
    const el = evt.target as HTMLElement;
    if (this.adapter_.isElementInContainer(el)) {
      return;
    }
    this.close();
  }

  /** Handle keys that close the surface. */
  handleKeydown(evt: KeyboardEvent) {
    const {keyCode, key, shiftKey} = evt;

    const isEscape = key === 'Escape' || keyCode === 27;
    const isTab = key === 'Tab' || keyCode === 9;

    if (isEscape) {
      this.close();
    } else if (isTab) {
      if (this.adapter_.isLastElementFocused() && !shiftKey) {
        this.adapter_.focusFirstElement();
        evt.preventDefault();
      } else if (this.adapter_.isFirstElementFocused() && shiftKey) {
        this.adapter_.focusLastElement();
        evt.preventDefault();
      }
    }
  }

  /**
   * @return Measurements used to position menu surface popup.
   */
  private getAutoLayoutMeasurements_(): AutoLayoutMeasurements {
    let anchorRect = this.adapter_.getAnchorDimensions();
    const bodySize = this.adapter_.getBodyDimensions();
    const viewportSize = this.adapter_.getWindowDimensions();
    const windowScroll = this.adapter_.getWindowScroll();

    if (!anchorRect) {
      anchorRect = {
        top: this.position_.y,
        right: this.position_.x,
        bottom: this.position_.y,
        left: this.position_.x,
        width: 0,
        height: 0,
      };
    }

    return {
      bodySize,
      viewportSize,
      windowScroll,
      viewportDistance: {
        top: anchorRect.top,
        right: viewportSize.width - anchorRect.right,
        left: anchorRect.left,
        bottom: viewportSize.height - anchorRect.bottom,
      },
      anchorSize: anchorRect,
      surfaceSize: this.dimensions_,
    };
  }

  /**
   * Computes the corner of the anchor from which to animate and position the menu surface.
   */
  private getOriginCorner_(): Corner {
    // Defaults: open from the top left.
    let corner = Corner.TOP_LEFT;

    const {viewportDistance, anchorSize, surfaceSize} = this.measurements_;
    const isBottomAligned = Boolean(this.anchorCorner_ & CornerBit.BOTTOM);
    const availableTop = isBottomAligned ? viewportDistance.top + anchorSize.height + this.anchorMargin_.bottom
      : viewportDistance.top + this.anchorMargin_.top;
    const availableBottom = isBottomAligned ? viewportDistance.bottom - this.anchorMargin_.bottom
      : viewportDistance.bottom + anchorSize.height - this.anchorMargin_.top;

    const topOverflow = surfaceSize.height - availableTop;
    const bottomOverflow = surfaceSize.height - availableBottom;
    if (bottomOverflow > 0 && topOverflow < bottomOverflow) {
      corner |= CornerBit.BOTTOM;
    }

    const isRtl = this.adapter_.isRtl();
    const isFlipRtl = Boolean(this.anchorCorner_ & CornerBit.FLIP_RTL);
    const avoidHorizontalOverlap = Boolean(this.anchorCorner_ & CornerBit.RIGHT);
    const isAlignedRight = (avoidHorizontalOverlap && !isRtl) ||
      (!avoidHorizontalOverlap && isFlipRtl && isRtl);
    const availableLeft = isAlignedRight ? viewportDistance.left + anchorSize.width + this.anchorMargin_.right :
      viewportDistance.left + this.anchorMargin_.left;
    const availableRight = isAlignedRight ? viewportDistance.right - this.anchorMargin_.right :
      viewportDistance.right + anchorSize.width - this.anchorMargin_.left;

    const leftOverflow = surfaceSize.width - availableLeft;
    const rightOverflow = surfaceSize.width - availableRight;

    if ((leftOverflow < 0 && isAlignedRight && isRtl) ||
        (avoidHorizontalOverlap && !isAlignedRight && leftOverflow < 0) ||
        (rightOverflow > 0 && leftOverflow < rightOverflow)) {
      corner |= CornerBit.RIGHT;
    }

    return corner;
  }

  /**
   * @param corner Origin corner of the menu surface.
   * @return Horizontal offset of menu surface origin corner from corresponding anchor corner.
   */
  private getHorizontalOriginOffset_(corner: Corner): number {
    const {anchorSize} = this.measurements_;

    // isRightAligned corresponds to using the 'right' property on the surface.
    const isRightAligned = Boolean(corner & CornerBit.RIGHT);
    const avoidHorizontalOverlap = Boolean(this.anchorCorner_ & CornerBit.RIGHT);

    if (isRightAligned) {
      const rightOffset =
          avoidHorizontalOverlap ? anchorSize.width - this.anchorMargin_.left : this.anchorMargin_.right;

      // For hoisted or fixed elements, adjust the offset by the difference between viewport width and body width so
      // when we calculate the right value (`adjustPositionForHoistedElement_`) based on the element position,
      // the right property is correct.
      if (this.isHoistedElement_ || this.isFixedPosition_) {
        return rightOffset - (this.measurements_.viewportSize.width - this.measurements_.bodySize.width);
      }

      return rightOffset;
    }

    return avoidHorizontalOverlap ? anchorSize.width - this.anchorMargin_.right : this.anchorMargin_.left;
  }

  /**
   * @param corner Origin corner of the menu surface.
   * @return Vertical offset of menu surface origin corner from corresponding anchor corner.
   */
  private getVerticalOriginOffset_(corner: Corner): number {
    const {anchorSize} = this.measurements_;
    const isBottomAligned = Boolean(corner & CornerBit.BOTTOM);
    const avoidVerticalOverlap = Boolean(this.anchorCorner_ & CornerBit.BOTTOM);

    let y = 0;
    if (isBottomAligned) {
      y = avoidVerticalOverlap ? anchorSize.height - this.anchorMargin_.top : -this.anchorMargin_.bottom;
    } else {
      y = avoidVerticalOverlap ? (anchorSize.height + this.anchorMargin_.bottom) : this.anchorMargin_.top;
    }
    return y;
  }

  /**
   * @param corner Origin corner of the menu surface.
   * @return Maximum height of the menu surface, based on available space. 0 indicates should not be set.
   */
  private getMenuSurfaceMaxHeight_(corner: Corner): number {
    let maxHeight = 0;
    const {viewportDistance} = this.measurements_;

    const isBottomAligned = Boolean(corner & CornerBit.BOTTOM);
    const {MARGIN_TO_EDGE} = MDCMenuSurfaceFoundation.numbers;

    // When maximum height is not specified, it is handled from css.
    if (isBottomAligned) {
      maxHeight = viewportDistance.top + this.anchorMargin_.top - MARGIN_TO_EDGE;
      if (!(this.anchorCorner_ & CornerBit.BOTTOM)) {
        maxHeight += this.measurements_.anchorSize.height;
      }
    } else {
      maxHeight =
          viewportDistance.bottom - this.anchorMargin_.bottom + this.measurements_.anchorSize.height - MARGIN_TO_EDGE;
      if (this.anchorCorner_ & CornerBit.BOTTOM) {
        maxHeight -= this.measurements_.anchorSize.height;
      }
    }

    return maxHeight;
  }

  private autoPosition_() {
    // Compute measurements for autoposition methods reuse.
    this.measurements_ = this.getAutoLayoutMeasurements_();

    const corner = this.getOriginCorner_();
    const maxMenuSurfaceHeight = this.getMenuSurfaceMaxHeight_(corner);
    const verticalAlignment = (corner & CornerBit.BOTTOM) ? 'bottom' : 'top';
    let horizontalAlignment = (corner & CornerBit.RIGHT) ? 'right' : 'left';
    const horizontalOffset = this.getHorizontalOriginOffset_(corner);
    const verticalOffset = this.getVerticalOriginOffset_(corner);
    const {anchorSize, surfaceSize} = this.measurements_;

    const position: MenuPosition = {
      [horizontalAlignment]: horizontalOffset ? horizontalOffset : 0,
      [verticalAlignment]: verticalOffset ? verticalOffset : 0,
    };

    // Center align when anchor width is comparable or greater than menu surface, otherwise keep corner.
    if (anchorSize.width / surfaceSize.width > numbers.ANCHOR_TO_MENU_SURFACE_WIDTH_RATIO) {
      horizontalAlignment = 'center';
    }

    // If the menu-surface has been hoisted to the body, it's no longer relative to the anchor element
    if (this.isHoistedElement_ || this.isFixedPosition_) {
      this.adjustPositionForHoistedElement_(position);
    }

    this.adapter_.setTransformOrigin(`${horizontalAlignment} ${verticalAlignment}`);
    this.adapter_.setPosition(position);
    this.adapter_.setMaxHeight(maxMenuSurfaceHeight ? maxMenuSurfaceHeight + 'px' : '');

    // Clear measures after positioning is complete.
    this.measurements_ = null;
  }

  /** Calculates the offsets for positioning the menu-surface when the menu-surface has been hoisted to the body. */
  private adjustPositionForHoistedElement_(position: MenuPosition) {
    const {windowScroll, viewportDistance} = this.measurements_;

    const props = Object.keys(position) as Array<keyof MenuPosition>;

    props.forEach((prop) => {
      // Hoisted surfaces need to have the anchor elements location on the page added to the
      // position properties for proper alignment on the body.
      if (viewportDistance.hasOwnProperty(prop)) {
        position[prop] += viewportDistance[prop];
      }

      // Surfaces that are absolutely positioned need to have additional calculations for scroll
      // and bottom positioning.
      if (!this.isFixedPosition_) {
        if (prop === 'top') {
          position[prop] += windowScroll.y;
        } else if (prop === 'bottom') {
          position[prop] -= windowScroll.y;
        } else if (prop === 'left') {
          position[prop] += windowScroll.x;
        } else if (prop === 'right') {
          position[prop] -= windowScroll.x;
        }
      }
    });
  }

  /**
   * The last focused element when the menu surface was opened should regain focus, if the user is
   * focused on or within the menu surface when it is closed.
   */
  private maybeRestoreFocus_() {
    if (this.adapter_.isFocused() || this.adapter_.isElementInContainer(document.activeElement as HTMLElement)) {
      this.adapter_.restoreFocus();
    }
  }

  /**
   * isFinite that doesn't force conversion to number type.
   * Equivalent to Number.isFinite in ES2015, which is not supported in IE.
   */
  private typeCheckisFinite_(num: number): boolean {
    return typeof num === 'number' && isFinite(num);
  }
}

// TODO(acdvorak): Should `MenuPosition` be exported here?
export {MDCMenuSurfaceFoundation, MenuPosition};