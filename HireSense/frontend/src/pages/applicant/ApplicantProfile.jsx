import React, { useState, useEffect } from 'react';
import { Save, CheckCircle2 } from 'lucide-react';
import { api } from '../../lib/api';
import AvatarUpload from '../../components/ui/AvatarUpload';
import { useAuth } from '../../contexts/AuthContext';

const fieldWrap = { marginBottom: 18 };
const labelStyle = { display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text2)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 8, fontFamily: 'var(--font)' };
const inputStyle = { width: '100%', padding: '12px 14px', background: 'var(--input)', border: '1.5px solid var(--border)', borderRadius: 'var(--r-sm)', color: 'var(--text)', fontSize: 14, fontFamily: 'var(--font)', outline: 'none', boxSizing: 'border-box' };

export default function ApplicantProfile() {
    const { refreshProfile } = useAuth();
    const [form, setForm] = useState({ full_name: '', major: '', graduation_year: '', skills_json: [] });
    const [skillsText, setSkillsText] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [avatarBusy, setAvatarBusy] = useState(false);
    const [avatarMsg, setAvatarMsg] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        api.getApplicantProfile()
            .then(({ profile }) => {
                setForm({
                    full_name: profile.full_name || '',
                    major: profile.major || '',
                    graduation_year: profile.graduation_year || '',
                    skills_json: profile.skills_json || [],
                });
                setSkillsText((profile.skills_json || []).join(', '));
                setAvatarUrl(profile.avatar_url || '');
            })
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, []);

    const handleAvatar = async (optimizedFile) => {
        setAvatarBusy(true); setAvatarMsg('');
        try {
            const { avatar_url } = await api.uploadApplicantAvatar(optimizedFile);
            setAvatarUrl(avatar_url);
            setAvatarMsg('Profile picture updated.');
            refreshProfile?.();   // refresh the navbar avatar (profiles table)
        } catch (e) {
            setAvatarMsg(e.message);
        } finally {
            setAvatarBusy(false);
        }
    };

    const save = async () => {
        setSaving(true); setError(''); setSaved(false);
        try {
            const skills = skillsText.split(',').map(s => s.trim()).filter(Boolean);
            await api.updateApplicantProfile({ ...form, skills_json: skills });
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
        } catch (e) {
            setError(e.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <p style={{ color: 'var(--text3)', fontSize: 13, fontFamily: 'var(--font)' }}>Loading…</p>;

    return (
        <div className="up" style={{ fontFamily: 'var(--font)', maxWidth: 560 }}>
            <div className="section-head" style={{ marginBottom: 28 }}>
                <h2 className="title" style={{ fontSize: 25, fontWeight: 700, color: 'var(--text)', letterSpacing: '-.02em', marginBottom: 6 }}>Applicant Profile</h2>
                <p className="subtitle" style={{ fontSize: 13, color: 'var(--text3)' }}>Recruiters see this alongside your applications</p>
            </div>

            {/* Profile picture */}
            <div className="card-modern" style={{ padding: 24, marginBottom: 18 }}>
                <label style={labelStyle}>Profile Picture</label>
                <AvatarUpload
                    currentUrl={avatarUrl}
                    initial={(form.full_name || 'S')[0]?.toUpperCase()}
                    busy={avatarBusy}
                    onChange={handleAvatar}
                />
                {avatarMsg && (
                    <p style={{ marginTop: 12, fontSize: 12, color: avatarMsg.includes('updated') ? '#22c55e' : '#ef4444' }}>{avatarMsg}</p>
                )}
            </div>

            <div className="card-modern" style={{ padding: 24 }}>
                <div style={fieldWrap}>
                    <label style={labelStyle}>Full Name</label>
                    <input className="focusable" style={inputStyle} value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} placeholder="Jane Doe" />
                </div>
                <div style={fieldWrap}>
                    <label style={labelStyle}>Major / Field</label>
                    <input className="focusable" style={inputStyle} value={form.major} onChange={e => setForm({ ...form, major: e.target.value })} placeholder="Computer Science" />
                </div>
                <div style={fieldWrap}>
                    <label style={labelStyle}>Graduation Year</label>
                    <input className="focusable" style={inputStyle} value={form.graduation_year} onChange={e => setForm({ ...form, graduation_year: e.target.value })} placeholder="2026" />
                </div>
                <div style={fieldWrap}>
                    <label style={labelStyle}>Skills (comma separated)</label>
                    <input className="focusable" style={inputStyle} value={skillsText} onChange={e => setSkillsText(e.target.value)} placeholder="Python, React, SQL" />
                </div>

                {error && <p style={{ fontSize: 12, color: '#ef4444', marginBottom: 12 }}>{error}</p>}

                <button onClick={save} disabled={saving} className="nb" style={{
                    background: saved ? '#22c55e' : 'var(--btn)', color: saved ? '#fff' : 'var(--btn-fg)',
                    border: '1.5px solid var(--border2)', borderRadius: 999, padding: '12px 24px', fontSize: 11,
                    fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', cursor: saving ? 'not-allowed' : 'pointer',
                    opacity: saving ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 9, transition: 'all .15s',
                }}>
                    {saved ? <CheckCircle2 size={15} /> : <Save size={15} />}
                    {saved ? 'Saved' : (saving ? 'Saving…' : 'Save Profile')}
                </button>
            </div>
        </div>
    );
}
