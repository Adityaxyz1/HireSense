/**
 * Client-side profile-picture optimizer.
 *
 * Goal: let a user pick almost any reasonable photo and have it automatically
 * conform to platform rules — square, ≥200px, ≤200KB — while preserving facial
 * clarity. Output is always a JPEG (PNG transparency is flattened onto white).
 *
 * Strategy (intelligent compression, not aggressive quality slashing):
 *   1. Validate format (JPG / JPEG / PNG only).
 *   2. Center-crop to a square (keeps the face centered).
 *   3. Render at 400×400 (the recommended display size).
 *   4. Step JPEG quality down from 0.92 until ≤200KB.
 *   5. Only if still too large, step the dimension down to 200px.
 */

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];
const MAX_BYTES = 200 * 1024;       // 200 KB
const TARGET_DIM = 400;             // recommended square display size
const MIN_DIM = 200;                // floor before giving up on dimension

const readAsDataURL = (file) =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Could not read the selected file.'));
        reader.readAsDataURL(file);
    });

const loadImage = (src) =>
    new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('That file does not appear to be a valid image.'));
        img.src = src;
    });

const toBlob = (canvas, quality) =>
    new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/jpeg', quality));

const drawSquare = (canvas, ctx, img, sx, sy, side, dim) => {
    canvas.width = dim;
    canvas.height = dim;
    ctx.fillStyle = '#ffffff';            // flatten any transparency
    ctx.fillRect(0, 0, dim, dim);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, sx, sy, side, side, 0, 0, dim, dim);
};

export function formatBytes(bytes) {
    if (bytes == null) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * @returns {Promise<{file: File, dataUrl: string, originalSize: number,
 *                    optimizedSize: number, wasOptimized: boolean}>}
 * @throws {Error} on unsupported format or unreadable image.
 */
export async function optimizeProfileImage(file) {
    if (!file || !ALLOWED_TYPES.includes(file.type)) {
        throw new Error('Unsupported format. Please upload a JPG, JPEG, or PNG image.');
    }

    const originalSize = file.size;
    const img = await loadImage(await readAsDataURL(file));

    // Center-crop to a square based on the shorter edge.
    const side = Math.min(img.width, img.height);
    const sx = (img.width - side) / 2;
    const sy = (img.height - side) / 2;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    let dim = TARGET_DIM;
    drawSquare(canvas, ctx, img, sx, sy, side, dim);

    // 1) Reduce quality first — best quality-per-byte.
    let quality = 0.92;
    let blob = await toBlob(canvas, quality);
    while (blob.size > MAX_BYTES && quality > 0.42) {
        quality = Math.max(0.4, quality - 0.08);
        blob = await toBlob(canvas, quality);
    }

    // 2) Still too big? Shrink the square in steps, holding decent quality.
    while (blob.size > MAX_BYTES && dim > MIN_DIM) {
        dim = Math.max(MIN_DIM, dim - 64);
        drawSquare(canvas, ctx, img, sx, sy, side, dim);
        blob = await toBlob(canvas, 0.82);
    }

    const optimizedFile = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
    const dataUrl = canvas.toDataURL('image/jpeg', quality);

    return {
        file: optimizedFile,
        dataUrl,
        originalSize,
        optimizedSize: blob.size,
        wasOptimized: blob.size < originalSize || file.type === 'image/png',
    };
}
