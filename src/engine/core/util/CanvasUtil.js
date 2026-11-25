
export default class CanvasUtil {
  /**
   * Returns an OffscreenCanvas, if available, otherwise it returns
   * an HTMLCanvasElement.
   * @param {number} width - The width of the temporary canvas
   * @param {number} height - The height of the temporary canvas
   * @returns {OffscreenCanvas|HTMLCanvasElement} The temporary canvas
   */
  static getTemporaryCanvas(width, height) {
    if (typeof self['OffscreenCanvas'] !== 'undefined') {
      return new OffscreenCanvas(width, height);
    }

    // TODO: For fallbacks, we should probably come up with a function queue at shutdown to clean these kinds of thing up
    const c = document.createElement('canvas');
    c.width = width;
    c.height = height;
    return c;
  }

  /**
   * Extract the image data from the provided image.  The image can either be an HTML &lt;img&gt; element,
   * or it can be another render context.  This method currently only works with the canvas context.
   * 
   * @param {HTMLImageElement|HTMLCanvasElement|ImageBitmap|OffscreenCanvas} image - Image or context
   * @param {Array<number>} cropRect - Optional rectangle to crop to.  If not provided, the entire image is used.
   * @returns {ImageData} Image data object with "width", "height", and an Array of each pixel, represented as
   *     RGBA data where each element is represented by an integer 0-255.
   */
  static extractImageData(image, cropRect, settings) {
    // Get the temporary context
    if (!cropRect) {
      // entire image
      cropRect = [0, 0, image.width, image.height];
    }

    const temp = CanvasUtil.getTemporaryCanvas(cropRect[2], cropRect[3]);
    temp.getContext('2d').drawImage(image, cropRect[0], cropRect[1], cropRect[2], cropRect[3], 0, 0, croprect[2], cropRect[3]);

    // Return the image data from the temp context
    return temp.getContext('2d').getImageData(cropRect[0], cropRect[1], cropRect[2], cropRect[3], settings);
  }

  /**
   * Create a mask of the provided image where non-transparent pixels (alpha != 0) are masked 
   * fully (R:255, G:255, B:255, A:255) and transparent pixels are fully transparent (R:0, G:0, B:0, A:0). 
   * If `respectTransparency` is `true`, alpha values above zero will be respected (R:255, G:255, B:255, A:preserved)
   *
   * @param {HTMLImageElement|HTMLCanvasElement|ImageBitmap|OffscreenCanvas} image - Image or context
   * @param {Array<number>} cropRect - Optional rectangle to crop to.  If not provided, the entire image is used.
   * @param {boolean} respectTransparency - If `true` transparent pixels will retain their alpha value
   * @returns {Blob} A data blob in image/png format
   */
  static async getImageMask(image, cropRect, respectTransparency = false) {
      if (!cropRect) {
          // entire image
          cropRect = [0, 0, image.width, image.height];
      }

      // get an ImageData from the image
      const imgData = CanvasUtil.extractImageData(image, cropRect);

      // Modify the image data so each pixel is either fully on or off
      for (var pix = 0; pix < imgData.data.length; pix += 4) {
          let alpha = 255;
          if (respectTransparency)
              alpha = imgData.data[pix + 3];

          if (imgData.data[pix + 3] != 0) {
              imgData.data[pix] = 255;
              imgData.data[pix + 1] = 255;
              imgData.data[pix + 2] = 255;
              imgData.data[pix + 3] = alpha;
          } else {
              imgData.data[pix] = 0;
              imgData.data[pix + 1] = 0;
              imgData.data[pix + 2] = 0;
              imgData.data[pix + 3] = 0;
          }
      }

      // Get a temporary canvas
      const ctx = CanvasUtil.getTemporaryCanvas(cropRect[2], cropRect[3]);
      ctx.getContext('2d').putImageData(imgData, 0, 0);

      // Extract the image data
      return await ctx.convertToBlob();
  }

  /**
   * Get a screen shot of the renderer's surface, optionally cropped to specific dimensions.
   * 
   * @param {Renderer} renderer - The context to get a screenshot of
   * @param {Array<number>} cropRect - Optional rectangle to crop to
   * @return {String} The data URL of the screen shot
   */
  static async screenShot(renderer, cropRect) {
      // cropRect = cropRect || renderContext.getViewport();

      // // Render the screenshot to the temp context
      // var ctx = R.util.RenderUtil.getTempContext(renderContext.constructor, renderContext.getViewport().w, renderContext.getViewport().h);
      // ctx.drawImage(renderContext.getViewport(), renderContext.getSurface(), cropRect);

      // // Return the image data
      // return ctx.getDataURL();
  }
}