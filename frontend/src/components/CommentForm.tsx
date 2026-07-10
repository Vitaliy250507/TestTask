import React, { useState, useRef } from 'react';
import { api } from '../api/axios';
import { Captcha } from './Captcha';
import { type UserProfile } from '../types/comment';

interface CommentFormProps {
    parentId?: number | null;
    onCommentSuccess: () => void;
}

export const CommentForm: React.FC<CommentFormProps> = ({ parentId = null, onCommentSuccess }) => {
    const [user, setUser] = useState<UserProfile>({ username: '', email: '', homepage: '' });
    const [text, setText] = useState<string>('');
    const [captchaValue, setCaptchaValue] = useState<string>('');
    const [captchaKey, setCaptchaKey] = useState<string>('');
    const [file, setFile] = useState<File | null>(null);
    const [triggerCaptchaRefresh, setTriggerCaptchaRefresh] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(false);

        if (!user.username || !user.email || !text || !captchaValue) {
            setError('Будь ласка, заповніть усі обов’язкові поля та капчу.');
            return;
        }

        setLoading(true);

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
        if (file) {
            formData.append('file', file);
        }

        try {
            await api.post('comments/', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            setText('');
            setCaptchaValue('');
            setFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';

            setTriggerCaptchaRefresh((prev) => !prev);

            onCommentSuccess();
        } catch (err: any) {
            console.error(err);
            if (err.response?.data) {
                const backendErrors = Object.entries(err.response.data)
                    .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(', ') : val}`)
                    .join(' | ');
                setError(backendErrors || 'Сталася помилка при відправці.');
            } else {
                setError('Не вдалося зв’язатися з сервером.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '8px', maxWidth: '500px', margin: '10px 0' }}>
            <h3>{parentId ? 'Відповісти на коментар' : 'Залишити коментар'}</h3>

            {error && <div style={{ color: 'red', marginBottom: '10px', fontSize: '14px' }}>{error}</div>}

            <div style={{ marginBottom: '10px' }}>
                <input type="text" name="username" placeholder="Ім'я користувача *" value={user.username} onChange={handleInputChange} required style={{ width: '100%', padding: '5px' }} />
            </div>

            <div style={{ marginBottom: '10px' }}>
                <input type="email" name="email" placeholder="Email *" value={user.email} onChange={handleInputChange} required style={{ width: '100%', padding: '5px' }} />
            </div>

            <div style={{ marginBottom: '10px' }}>
                <input type="url" name="homepage" placeholder="Домашня сторінка (HTTP/HTTPS)" value={user.homepage} onChange={handleInputChange} style={{ width: '100%', padding: '5px' }} />
            </div>

            <div style={{ marginBottom: '10px' }}>
                <textarea name="text" placeholder="Ваш коментар * (дозволено базові HTML теги)" value={text} onChange={handleInputChange} required rows={4} style={{ width: '100%', padding: '5px' }} />
            </div>

            <div style={{ marginBottom: '10px' }}>
                <label style={{ fontSize: '12px', display: 'block' }}>Прикріпити файл (Зображення JPG/GIF/PNG або текст TXT):</label>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".jpg,.jpeg,.png,.gif,.txt" />
            </div>

            <div style={{ marginBottom: '10px' }}>
                <label style={{ fontSize: '12px', display: 'block' }}>Введіть символи з картинки *:</label>
                <Captcha onCaptchaGenerated={setCaptchaKey} triggerRefresh={triggerCaptchaRefresh} />
                <input type="text" name="captchaValue" placeholder="Капча" value={captchaValue} onChange={handleInputChange} required style={{ width: '120px', padding: '5px', marginTop: '5px' }} />
            </div>

            <button type="submit" disabled={loading} style={{ padding: '8px 15px', backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                {loading ? 'Відправка...' : 'Опублікувати'}
            </button>
        </form>
    );
};