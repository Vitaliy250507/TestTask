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
            const response = await api.get<CaptchaResponse>('captcha/');
            if (response.data && response.data.captcha_image) {
                setCaptcha(response.data);
                onCaptchaGenerated(response.data.captcha_key);
            } else {
                throw new Error('Бекенд повернув пусту або невірну структуру капчі');
            }
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

    if (error) return <div className="text-sm text-red-500">{error}</div>;

    const getImageUrl = () => {
        if (!captcha?.captcha_image) return undefined;
        return captcha.captcha_image.startsWith('data:')
            ? captcha.captcha_image
            : `http://localhost:8000${captcha.captcha_image}`;
    };

    return (
        <div className="flex items-center gap-4 my-2">
            {loading && !captcha ? (
                <div className="text-sm text-gray-500">Завантаження капчі...</div>
            ) : (
                captcha?.captcha_image && (
                    <div
                        className={`cursor-pointer ${loading ? 'opacity-50' : ''}`}
                        onClick={loading ? undefined : fetchCaptcha}
                        title="Клікніть, щоб оновити"
                    >
                        <img
                            src={getImageUrl()}
                            alt="CAPTCHA"
                            className="border rounded h-12"
                        />
                    </div>
                )
            )}

            <button
                type="button"
                disabled={loading}
                onClick={fetchCaptcha}
                className={`text-xs text-blue-500 hover:underline ${loading ? 'text-gray-400 cursor-not-allowed' : ''}`}
            >
                {loading ? 'Оновлення...' : 'Оновити картинку'}
            </button>
        </div>
    );
};