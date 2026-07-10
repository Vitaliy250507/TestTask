export interface UserProfile {
    username: string;
    email: string;
    homepage?: string;
}

export interface Comment {
    id: number;
    user: UserProfile;
    text: string;
    file?: string;
    created_at: string;
    replies?: Comment[];
}

export interface CommentCreatePayload {
    parent: number | null;
    text: string;
    file?: File | null;
    user: UserProfile;
    captcha_key: string;
    captcha_value: string;
}