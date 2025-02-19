export function getResizeCursorThreshold(widget) {
    return {
      x: Math.max(0.1 * widget.offsetWidth, 6),
      y: Math.max(0.1 * widget.offsetHeight, 6)
    }
}

export function pixelsToInt (pixels) {
    return parseInt(pixels.replace('px', ''))
}

export default {
    getResizeCursorThreshold,
    pixelsToInt
}