import React, { useRef, useState } from 'react';
import { Camera, Info, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { optimizeProfileImage, formatBytes } from '../../lib/imageOptimizer';

/**
 * Reusable profile-picture uploader with live preview + automatic client-side
 * optimization. Emits the optimized File via onChange; the parent decides when
 * to actually upload (immediately in profile settings, post-signup at register).
 *
 * Props:
 *   currentUrl   existing avatar URL (shown until a new one is picked)
 *   initial      single-letter fallback for the placeholder
 *   busy         parent is uploading — disables the control + shows spinner
 *   size         preview diameter in px (default 104)
 *   onChange     (optimizedFile, previewDataUrl) => void
 *   compact      hide the long guidance blocks (used in tight signup layouts)
 */
export default function AvatarUpload({ currentUrl, initial = 'S', busy = false, size = 104, onChange, compact = false }) {
    const inputRef = useRef(null);
    const [preview, setPreview] = useState(null);
    const [info, setInfo] = useState(null);   // { originalSize, optimizedSize, wasOptimized }
    const [error, setError] = useState('');
    const [working, setWorking] = useState(false);

    const pick = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = '';                   // allow re-picking the same file
        if (!file) return;
        setError(''); setInfo(null); setWorking(true);
        try {
            const result = await optimizeProfileImage(file);
            setPreview(result.dataUrl);
            setInfo({ originalSize: result.originalSize, optimizedSize: result.optimizedSize, wasOptimized: result.wasOptimized });
            onChange?.(result.file, result.dataUrl);
        } catch (err) {
            setError(err.message);
        } finally {
            setWorking(false);
        }
    };

    const shown = preview || currentUrl;
    const disabled = busy || working;

    return (
        <div style={{ fontFamily: 'var(--font)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
                {/* Circular preview */}
                <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
                    <div style={{
                        width: size, height: size, borderRadius: '50%', overflow: 'hidden',
                        border: '1.5px solid var(--border2)', background: 'var(--bg3)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        {shown
                            ? <img src={shown} alt="Profile picture preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <span style={{ fontSize: size * 0.4, fontWeight: 800, color: 'var(--text3)' }}>{initial}</span>}
                    </div>
                    {(working || busy) && (
                        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Loader2 size={22} color="#fff" style={{ animation: 'spin .8s linear infinite' }} />
                        </div>
                    )}
                </div>

                {/* Action + status */}
                <div style={{ flex: 1, minWidth: 180 }}>
                    <input ref={inputRef} type="file" accept="image/jpeg,image/jpg,image/png" onChange={pick} style={{ display: 'none' }} aria-hidden="true" tabIndex={-1} />
                    <button
                        type="button"
                        onClick={() => inputRef.current?.click()}
                        disabled={disabled}
                        aria-label="Upload profile picture"
                        className="nb"
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: 9, padding: '10px 18px',
                            border: '1.5px solid var(--border2)', borderRadius: 9, cursor: disabled ? 'not-allowed' : 'pointer',
                            background: 'var(--btn)', color: 'var(--btn-fg)', fontSize: 11, fontWeight: 700,
                            letterSpacing: '.1em', textTransform: 'uppercase', opacity: disabled ? 0.6 : 1, fontFamily: 'var(--font)',
                        }}
                    >
                        <Camera size={15} /> {shown ? 'Change Photo' : 'Upload Photo'}
                    </button>

                    {info && (
                        <div style={{ marginTop: 10, fontSize: 11.5, color: 'var(--text2)', lineHeight: 1.6 }}>
                            {info.wasOptimized && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#7f9153', marginBottom: 2 }}>
                                    <CheckCircle2 size={13} /> Your image was automatically optimized to meet platform requirements.
                                </div>
                            )}
                            <span style={{ color: 'var(--text3)' }}>
                                Original {formatBytes(info.originalSize)} → Optimized <strong style={{ color: 'var(--text2)' }}>{formatBytes(info.optimizedSize)}</strong>
                            </span>
                        </div>
                    )}

                    {error && (
                        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: '#c0563a' }}>
                            <AlertCircle size={13} /> {error}
                        </div>
                    )}
                </div>
            </div>

            {!compact && (
                <>
                    {/* Requirements box */}
                    <div style={{ marginTop: 16, border: '1.5px solid var(--border)', borderRadius: 10, padding: '14px 16px', background: 'var(--tag)' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text2)', marginBottom: 8 }}>
                            Profile Picture Requirements
                        </div>
                        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: 'var(--text2)', lineHeight: 1.85 }}>
                            <li>Professional photograph only</li>
                            <li>JPG, JPEG, or PNG format</li>
                            <li>Maximum file size: 200&nbsp;KB <span style={{ color: 'var(--text3)' }}>(auto-optimized for you)</span></li>
                            <li>Clear face visibility and good lighting</li>
                            <li>No filters, stickers, or group photos</li>
                        </ul>
                    </div>

                    {/* Guidelines informational alert */}
                    <div role="note" style={{ marginTop: 12, display: 'flex', gap: 11, border: '1.5px solid rgba(59,130,246,0.35)', background: 'rgba(59,130,246,0.07)', borderRadius: 10, padding: '13px 15px' }}>
                        <Info size={16} style={{ color: '#9a7b4a', flexShrink: 0, marginTop: 1 }} />
                        <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.65 }}>
                            <strong style={{ color: 'var(--text)' }}>Profile Picture Guidelines:</strong> Please upload a clear, professional-looking photograph with good lighting and a neutral background. Avoid group photos, selfies with filters, sunglasses, or casual/social-media-style images. This photo may be visible to recruiters and administrators.
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
