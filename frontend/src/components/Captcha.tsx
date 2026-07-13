import React, { useEffect, useState } from 'react';
import { type CaptchaResponse } from '../types/captcha';
import axios from 'axios';
import API_BASE_URL from '../api/axios';

interface CaptchaProps {
    onCaptchaGenerated: (key: string) => void;
    triggerRefresh: boolean;
}

export const Captcha: React.FC<CaptchaProps> = ({ onCaptchaGenerated, triggerRefresh }) => {
    const [captcha, setCaptcha] = useState<CaptchaResponse | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const fetchCaptcha = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await axios.get(`${API_BASE_URL}/api/captcha/`);

            setCaptcha({
                captcha_key: response.data.captcha_key,
                captcha_image: response.data.captcha_image
            });

            onCaptchaGenerated(response.data.captcha_key);

        } catch (err) {
            console.error("Помилка завантаження капчі:", err);
            setError("Не вдалося завантажити капчу");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCaptcha();
    }, [triggerRefresh]);

    if (error) return <div style={{ fontSize: '14px', color: '#ef4444', marginTop: '5px' }}>{error}</div>;

    const getImageUrl = () => {
        if (!captcha?.captcha_image) return undefined;
        return captcha.captcha_image.startsWith('data:')
            ? captcha.captcha_image
            : `${API_BASE_URL}${captcha.captcha_image}`;
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', margin: '8px 0' }}>
            {loading && !captcha ? (
                <div style={{ fontSize: '14px', color: '#6b7280' }}>Завантаження капчі...</div>
            ) : (
                captcha?.captcha_image && (
                    <div
                        style={{ cursor: 'pointer', opacity: loading ? 0.5 : 1 }}
                        onClick={loading ? undefined : fetchCaptcha}
                        title="Клікніть, щоб оновити"
                    >
                        <img
                            src={getImageUrl()}
                            alt="CAPTCHA"
                            style={{ border: '1px solid #d1d5db', borderRadius: '4px', height: '48px' }}
                        />
                    </div>
                )
            )}

            <button
                type="button"
                disabled={loading}
                onClick={fetchCaptcha}
                style={{
                    padding: '6px 12px',
                    fontSize: '13px',
                    color: '#1d4ed8',
                    backgroundColor: '#e5e7eb',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: loading ? 'not-allowed' : 'pointer'
                }}
            >
                {loading ? 'Оновлення...' : 'Оновити картинку'}
            </button>
        </div>
    );
};