import React, { useState, useRef } from 'react';
import { api } from '../api/axios';
import { Captcha } from './Captcha';
import { type UserProfile } from '../types/comment';

interface CommentFormProps {
    parentId?: number | null;
    onReplyCancel?: () => void;
    onCommentSuccess: () => void;
}

export const CommentForm: React.FC<CommentFormProps> = ({ parentId = null, onCommentSuccess, onReplyCancel }) => {
    const [user, setUser] = useState<UserProfile>({ username: '', email: '', homepage: '' });
    const [text, setText] = useState<string>('');
    const [captchaValue, setCaptchaValue] = useState<string>('');
    const [captchaKey, setCaptchaKey] = useState<string>('');
    const [file, setFile] = useState<File | null>(null);
    const [triggerCaptchaRefresh, setTriggerCaptchaRefresh] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [showPreview, setShowPreview] = useState<boolean>(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        if (name in user) {
            setUser((prev) => ({ ...prev, [name]: value }));
        } else if (name === 'text') {
            setText(value);
        } else if (name === 'captchaValue') {
            setCaptchaValue(value);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const insertTag = (tagType: 'i' | 'strong' | 'code' | 'a') => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const startPos = textarea.selectionStart;
        const endPos = textarea.selectionEnd;
        const currentText = textarea.value;

        let openTag = `<${tagType}>`;
        let closeTag = `</${tagType}>`;

        if (tagType === 'a') {
            openTag = '<a href="" title="">';
        }

        const selectedText = currentText.substring(startPos, endPos);
        const replacement = openTag + selectedText + closeTag;

        const newText = currentText.substring(0, startPos) + replacement + currentText.substring(endPos);
        setText(newText);

        setTimeout(() => {
            textarea.focus();
            const newCursorPos = startPos + openTag.length + selectedText.length + closeTag.length;
            textarea.setSelectionRange(newCursorPos, newCursorPos);
        }, 50);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const formData = new FormData();
            formData.append('user.username', user.username);
            formData.append('user.email', user.email);
            if (user.homepage) formData.append('user.homepage', user.homepage);
            formData.append('text', text);
            formData.append('captcha_key', captchaKey);
            formData.append('captcha_value', captchaValue);

            if (parentId) {
                formData.append('parent', parentId.toString());
            }

            if (fileInputRef.current?.files?.[0]) {
                formData.append('file', fileInputRef.current.files[0]);
            }

            const response = await api.post('comments/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            if (response.status === 201) {
                onCommentSuccess();
                setText('');
                setCaptchaValue('');
                setShowPreview(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
                setTriggerCaptchaRefresh(prev => !prev);

                if (onReplyCancel) onReplyCancel();
            }
        } catch (err: any) {
            console.error(err);
            if (err.response?.data) {
                const errors = err.response.data;
                if (errors.user?.username) setError(errors.user.username[0]);
                else if (errors.user?.email) setError(errors.user.email[0]);
                else if (errors.captcha_value) setError(errors.captcha_value[0]);
                else setError('Сталася помилка при збереженні коментаря.');
            } else {
                setError('Не вдалося зв’язатися з сервером.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '8px', maxWidth: '500px', margin: '10px 0', backgroundColor: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: '5px 0' }}>{parentId ? 'Відповісти на коментар' : 'Залишити коментар'}</h3>
                {parentId && (
                    <button type="button" onClick={onReplyCancel} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>
                        [Скасувати]
                    </button>
                )}
            </div>

            {error && <div style={{ color: 'red', marginBottom: '10px', fontSize: '14px' }}>{error}</div>}

            <div style={{ marginBottom: '10px' }}>
                <input type="text" name="username" placeholder="Ім'я користувача *" value={user.username} onChange={handleInputChange} required style={{ width: '100%', padding: '5px', boxSizing: 'border-box' }} />
            </div>

            <div style={{ marginBottom: '10px' }}>
                <input type="email" name="email" placeholder="Email *" value={user.email} onChange={handleInputChange} required style={{ width: '100%', padding: '5px', boxSizing: 'border-box' }} />
            </div>

            <div style={{ marginBottom: '10px' }}>
                <input type="url" name="homepage" placeholder="Домашня сторінка (HTTP/HTTPS)" value={user.homepage} onChange={handleInputChange} style={{ width: '100%', padding: '5px', boxSizing: 'border-box' }} />
            </div>

            <div style={{ marginBottom: '10px' }}>
                <div style={{ backgroundColor: '#f3f4f6', padding: '5px', border: '1px solid #ccc', borderBottom: 'none', display: 'flex', gap: '5px', borderRadius: '4px 4px 0 0' }}>
                    <button type="button" onClick={() => insertTag('i')} style={{ padding: '2px 8px', cursor: 'pointer', fontWeight: 'bold', fontStyle: 'italic' }}>[i]</button>
                    <button type="button" onClick={() => insertTag('strong')} style={{ padding: '2px 8px', cursor: 'pointer', fontWeight: 'bold' }}>[strong]</button>
                    <button type="button" onClick={() => insertTag('code')} style={{ padding: '2px 8px', cursor: 'pointer', fontFamily: 'monospace' }}>[code]</button>
                    <button type="button" onClick={() => insertTag('a')} style={{ padding: '2px 8px', cursor: 'pointer', color: '#2563eb' }}>[a]</button>
                </div>
                <textarea
                    ref={textareaRef}
                    name="text"
                    placeholder="Ваш коментар * (дозволено базові HTML теги)"
                    value={text}
                    onChange={handleInputChange}
                    required
                    rows={4}
                    style={{ width: '100%', padding: '5px', boxSizing: 'border-box', borderRadius: '0 0 4px 4px', border: '1px solid #ccc' }}
                />
            </div>

            {showPreview && text && (
                <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#fef08a', border: '1px dashed #eab308', borderRadius: '4px', fontSize: '14px' }}>
                    <strong>Попередній перегляд:</strong>
                    <div style={{ marginTop: '5px', wordBreak: 'break-word' }} dangerouslySetInnerHTML={{ __html: text }} />
                </div>
            )}

            <div style={{ marginBottom: '10px' }}>
                <label style={{ fontSize: '12px', display: 'block', marginBottom: '3px' }}>Прикріпити файл (Зображення JPG/GIF/PNG або текст TXT):</label>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".jpg,.jpeg,.png,.gif,.txt" />
            </div>

            <div style={{ marginBottom: '15px' }}>
                <label style={{ fontSize: '12px', display: 'block', marginBottom: '3px' }}>Введіть символи з картинки *:</label>
                <Captcha onCaptchaGenerated={setCaptchaKey} triggerRefresh={triggerCaptchaRefresh} />
                <input type="text" name="captchaValue" placeholder="Капча" value={captchaValue} onChange={handleInputChange} required style={{ width: '120px', padding: '5px', marginTop: '5px', display: 'block' }} />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" disabled={loading} style={{ padding: '8px 15px', backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                    {loading ? 'Відправка...' : 'Опублікувати'}
                </button>

                <button type="button" onClick={() => setShowPreview(!showPreview)} style={{ padding: '8px 15px', backgroundColor: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                    {showPreview ? 'Сховати прев’ю' : 'Попередній перегляд'}
                </button>
            </div>
        </form>
    );
};