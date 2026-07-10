import React, { useEffect, useState } from 'react';
import { api } from '../api/axios';
import { type CaptchaResponse } from '../types/captcha';

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
            const response = await api.get<CaptchaResponse>('comments/captcha/');
            setCaptcha(response.data);
            onCaptchaGenerated(response.data.captcha_key);
        } catch (err) {
            setError('Не вдалося завантажити капчу');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCaptcha();
    }, [triggerRefresh]);

    if (loading) return <div className="text-sm text-gray-500">Завантаження капчі...</div>;
    if (error) return <div className="text-sm text-red-500">{error}</div>;

    return (
        <div className="flex items-center gap-4 my-2">
            {captcha && (
                <div className="cursor-pointer" onClick={fetchCaptcha} title="Клікніть, щоб оновити">
                    <img
                        src={captcha.image_url.startsWith('data:') ? captcha.image_url : `http://localhost:8000${captcha.image_url}`}
                        alt="CAPTCHA"
                        className="border rounded h-12"
                    />
                </div>
            )}
            <button
                type="button"
                onClick={fetchCaptcha}
                className="text-xs text-blue-500 hover:underline"
            >
                Оновити картинку
            </button>
        </div>
    );
};