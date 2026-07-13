import React, { useState, useRef, useEffect } from 'react';
import { Captcha } from './Captcha';
import { type UserProfile } from '../types/comment';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';

interface CommentFormProps {
    parentId?: number | null;
    onReplyCancel?: () => void;
    onCommentSuccess: () => void;
}

interface JWTUserData {
    user_id: number;
    username: string;
    email: string;
    exp: number;
}

export const CommentForm: React.FC<CommentFormProps> = ({ parentId = null, onCommentSuccess, onReplyCancel }) => {
    const [user, setUser] = useState<UserProfile>({ username: '', email: '', homepage: '' });
    const [captchaValue, setCaptchaValue] = useState<string>('');
    const [captchaKey, setCaptchaKey] = useState<string>('');
    const [_file, setFile] = useState<File | null>(null);
    const [triggerCaptchaRefresh, setTriggerCaptchaRefresh] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [showPreview, setShowPreview] = useState<boolean>(false);
    const [previewContent, setPreviewContent] = useState<string>('');

    const fileInputRef = useRef<HTMLInputElement>(null);
    const editorRef = useRef<HTMLDivElement>(null);
    const apiUrl = import.meta.env.VITE_API_URL || '';

    const API_BASE_URL = window.location.hostname === 'localhost'
        ? 'http://localhost:8000'
        : 'https://comments-backend-0p8a.onrender.com';

    useEffect(() => {
        const accessToken = localStorage.getItem('access_token');
        if (accessToken) {
            try {
                const decoded = jwtDecode<JWTUserData>(accessToken);

                if (decoded.exp * 1000 > Date.now()) {
                    setUser({
                        username: decoded.username,
                        email: decoded.email,
                        homepage: localStorage.getItem('user_homepage') || ''
                    });
                    console.log('Дані користувача автоматично підтягнуто з JWT у стейт user!');
                } else {
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('refresh_token');
                }
            } catch (error) {
                console.error('Помилка декодування JWT:', error);
            }
        }
    }, []);

    const handleFormatting = (command: 'bold' | 'italic' | 'createLink' | 'formatBlock') => {
        const selection = window.getSelection();

        if (command === 'createLink') {
            const url = prompt('Введіть URL адресу (наприклад, http://example.com):');
            if (!url) return;
            document.execCommand(command, false, url);
        } else if (command === 'formatBlock') {
            if (!selection || selection.toString() === '' || selection.rangeCount === 0) {
                alert('Будь ласка, виділіть текст, який хочете зробити кодом!');
                return;
            }

            const selectedText = selection.toString();
            const range = selection.getRangeAt(0);

            range.deleteContents();

            const codeElement = document.createElement('code');

            codeElement.style.fontFamily = "'Courier New', Courier, monospace";
            codeElement.style.fontSize = '14px';
            codeElement.style.display = 'inline';

            codeElement.style.background = 'none';
            codeElement.style.backgroundColor = 'transparent';
            codeElement.style.color = 'inherit';
            codeElement.style.padding = '0';
            codeElement.style.border = 'none';

            codeElement.innerText = selectedText;

            range.insertNode(codeElement);

            range.setStartAfter(codeElement);
            range.setEndAfter(codeElement);

            selection.removeAllRanges();
            selection.addRange(range);
            selection.collapseToEnd();
        } else {
            document.execCommand(command, false);
        }

        editorRef.current?.focus();
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;

        setLoading(false);
        setError(null);

        if (name in user) {
            setUser((prev) => ({ ...prev, [name]: value }));
        } else if (name === 'captchaValue') {
            setCaptchaValue(value);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const togglePreview = () => {
        if (!showPreview) {
            setPreviewContent(editorRef.current?.innerHTML || '');
        }
        setShowPreview(!showPreview);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        let htmlText = editorRef.current?.innerHTML || '';

        if (htmlText === '<br>' || !htmlText.trim()) {
            setError('Поле коментаря не може бути порожнім.');
            return;
        }

        const usernameRegex = /^[a-zA-Z0-9]+$/;
        if (!usernameRegex.test(user.username)) {
            setError('Username може містити лише латинські літери та цифри');
            return;
        }

        if (fileInputRef.current?.files?.[0]) {
            const selectedFile = fileInputRef.current.files[0];
            const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase();

            if (fileExtension === 'txt' && selectedFile.size > 100 * 1024) {
                setError('Текстовий файл не повинен перевищувати 100 Кб');
                return;
            }
        }

        setLoading(true);

        htmlText = htmlText.replace(/<b>/g, '<strong>').replace(/<\/b>/g, '</strong>');
        htmlText = htmlText.replace(/<em>/g, '<i>').replace(/<\/em>/g, '</i>');

        try {
            const formData = new FormData();
            formData.append('user.username', user.username);
            formData.append('user.email', user.email);
            if (user.homepage) {
                formData.append('user.homepage', user.homepage);
                localStorage.setItem('user_homepage', user.homepage);
            }

            formData.append('text', htmlText);
            formData.append('captcha_key', captchaKey);
            formData.append('captcha_value', captchaValue);

            if (parentId) {
                formData.append('parent', parentId.toString());
            }

            if (fileInputRef.current?.files?.[0]) {
                formData.append('file', fileInputRef.current.files[0]);
            }

            const response = await axios.post(`${API_BASE_URL}/api/comments/`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                },
            });

            if (response.status === 201) {
                if (response.data && response.data.tokens) {
                    localStorage.setItem('access_token', response.data.tokens.access);
                    localStorage.setItem('refresh_token', response.data.tokens.refresh);
                }

                onCommentSuccess();

                if (editorRef.current) {
                    editorRef.current.innerHTML = '';
                    editorRef.current.focus();
                }

                setCaptchaValue('');
                setShowPreview(false);
                setPreviewContent('');
                if (fileInputRef.current) fileInputRef.current.value = '';
                setFile(null);

                setTriggerCaptchaRefresh(prev => !prev);

                if (onReplyCancel) onReplyCancel();
            }
        } catch (err: any) {
            console.error(err);
            if (err.response && err.response.data) {
                console.log("Реальна помилка від бекенду:", err.response.data);
                const errors = err.response.data;
                if (errors.user?.username) setError(errors.user.username[0]);
                else if (errors.user?.email) setError(errors.user.email[0]);
                else if (errors.captcha_key) setError("Помилка сесії капчі. Оновіть картинку.");
                else if (errors.captcha_value) setError(errors.captcha_value[0]);
                else if (errors.text) setError(errors.text[0]);
                else setError('Сталася помилка при збереженні коментаря.');
            } else {
                setError('Не вдалося зв’язатися з сервером.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '8px', maxWidth: '500px', margin: '40px auto', backgroundColor: '#fff' }}>
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
                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
                    <button type="button" onMouseDown={(e) => { e.preventDefault(); handleFormatting('bold'); }} style={{ padding: '6px 12px', fontSize: '13px', fontWeight: 'bold', color: '#1d4ed8', backgroundColor: 'rgb(163, 163, 163)', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Жирний</button>
                    <button type="button" onMouseDown={(e) => { e.preventDefault(); handleFormatting('italic'); }} style={{ padding: '6px 12px', fontSize: '13px', fontStyle: 'italic', color: '#1d4ed8', backgroundColor: 'rgb(163, 163, 163)', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Курсив</button>
                    <button type="button" onMouseDown={(e) => { e.preventDefault(); handleFormatting('formatBlock'); }} style={{ padding: '6px 12px', fontSize: '13px', fontFamily: 'monospace', color: '#1d4ed8', backgroundColor: 'rgb(163, 163, 163)', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Код</button>
                    <button type="button" onMouseDown={(e) => { e.preventDefault(); handleFormatting('createLink'); }} style={{ padding: '6px 12px', fontSize: '13px', color: '#1d4ed8', backgroundColor: 'rgb(163, 163, 163)', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Посилання</button>
                </div>

                <div
                    ref={editorRef}
                    contentEditable
                    style={{
                        width: '100%',
                        minHeight: '120px',
                        padding: '10px',
                        borderRadius: '6px',
                        border: '1px solid #d1d5db',
                        fontFamily: 'sans-serif',
                        boxSizing: 'border-box',
                        fontSize: '14px',
                        backgroundColor: '#fff',
                        outline: 'none',
                        overflowY: 'auto',
                        textAlign: 'left',
                        display: 'block',
                    }}
                />
            </div>

            {showPreview && previewContent && (
                <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#fef08a', border: '1px dashed #eab308', borderRadius: '4px', fontSize: '14px' }}>
                    <strong>Попередній перегляд:</strong>
                    <div style={{ marginTop: '5px', wordBreak: 'break-word' }} dangerouslySetInnerHTML={{ __html: previewContent }} />
                </div>
            )}

            <div style={{ marginBottom: '10px' }}>
                <label style={{ fontSize: '12px', display: 'block', marginBottom: '3px' }}>Прикріпити файл (Зображення JPG/GIF/PNG або текст TXT):</label>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".jpg,.jpeg,.png,.gif,.txt" />
            </div>

            <div style={{ marginBottom: '15px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <label style={{ fontSize: '12px', display: 'block', marginBottom: '3px', textAlign: 'center' }}>Введіть символи з картинки *:</label>
                <Captcha onCaptchaGenerated={setCaptchaKey} triggerRefresh={triggerCaptchaRefresh} />
                <input type="text" name="captchaValue" placeholder="Капча" value={captchaValue} onChange={handleInputChange} required style={{ width: '120px', padding: '5px', marginTop: '5px', display: 'block', textAlign: 'center', boxSizing: 'border-box' }} />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" disabled={loading} style={{ padding: '8px 15px', backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                    {loading ? 'Відправка...' : 'Опублікувати'}
                </button>

                <button type="button" onClick={togglePreview} style={{ padding: '8px 15px', backgroundColor: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', marginLeft: 'auto' }}>
                    {showPreview ? 'Сховати прев’ю' : 'Попередній перегляд'}
                </button>
            </div>
        </form>
    );
};