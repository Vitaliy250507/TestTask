import React, { useState } from 'react';
import { CommentForm } from './CommentForm';
import { API_BASE_URL } from '../api/axios';

interface User {
    username: string;
    email: string;
    homepage?: string;
}

interface Comment {
    id: number;
    user: User;
    text: string;
    file: string | null;
    created_at: string;
    parent?: number | null;
    parent_id?: number | null;
    replies?: Comment[];
}

interface CommentNodeProps {
    comment: Comment;
    activeReplyId: number | null;
    setActiveReplyId: (id: number | null) => void;
    onCommentSuccess: () => void;
}

export const CommentNode: React.FC<CommentNodeProps> = ({ comment, activeReplyId, setActiveReplyId, onCommentSuccess }) => {
    const isReplyingThis = activeReplyId === comment.id;
    const [activeLightboxImage, setActiveLightboxImage] = useState<string | null>(null);
    return (
        <div style={{
            borderLeft: '3px solid #3b82f6',
            paddingLeft: '15px',
            margin: '15px 0',
            backgroundColor: '#ffffff',
            padding: '15px',
            borderRadius: '6px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>
                <div>
                    <span style={{ fontWeight: 'bold', color: '#1f2937', fontSize: '14px' }}>{comment.user.username}</span>
                    <span style={{ margin: '0 8px' }}>|</span>
                    <span>{comment.user.email}</span>
                </div>
                <span>{new Date(comment.created_at).toLocaleString('uk-UA')}</span>
            </div>

            <p style={{ color: '#374151', margin: '0 0 10px 0', fontSize: '15px' }} dangerouslySetInnerHTML={{ __html: comment.text }} />

            {comment.file && (
                <div style={{ marginBottom: '10px' }}>
                    {comment.file.match(/\.(jpeg|jpg|gif|png)$/i) ? (
                        <img
                            src={comment.file.startsWith('http') ? comment.file : `${API_BASE_URL}${comment.file}`}
                            alt="attachment"
                            onClick={() => comment.file && setActiveLightboxImage(comment.file.startsWith('http') ? comment.file : `${API_BASE_URL}${comment.file}`)}
                            style={{
                                maxHeight: '120px',
                                borderRadius: '4px',
                                display: 'block',
                                cursor: 'pointer',
                                transition: 'transform 0.15s ease'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.03)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        />
                    ) : (
                        <a
                            href={comment.file.startsWith('http') ? comment.file : `${API_BASE_URL}${comment.file}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{ fontSize: '12px', color: '#2563eb' }}
                        >
                            Завантажити TXT
                        </a>
                    )}
                </div>
            )}

            <button
                onClick={() => setActiveReplyId(comment.id)}
                style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', padding: 0 }}
            >
                Відповісти
            </button>

            {isReplyingThis && (
                <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#f9fafb', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                    <CommentForm
                        parentId={comment.id}
                        onReplyCancel={() => setActiveReplyId(null)}
                        onCommentSuccess={onCommentSuccess}
                    />
                </div>
            )}

            {comment.replies && comment.replies.length > 0 && (
                <div style={{ marginTop: '10px', marginLeft: '20px', borderLeft: '2px dashed #e5e7eb', paddingLeft: '15px' }}>
                    {comment.replies.map((reply) => (
                        <CommentNode
                            key={reply.id}
                            comment={reply}
                            activeReplyId={activeReplyId}
                            setActiveReplyId={setActiveReplyId}
                            onCommentSuccess={onCommentSuccess}
                        />
                    ))}
                </div>
            )}
            {activeLightboxImage && (
                <div
                    onClick={() => setActiveLightboxImage(null)}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100vw',
                        height: '100vh',
                        backgroundColor: 'rgba(0, 0, 0, 0.85)',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        zIndex: 9999,
                        cursor: 'zoom-out'
                    }}
                >
                    <button
                        onClick={() => setActiveLightboxImage(null)}
                        style={{
                            position: 'absolute',
                            top: '20px',
                            right: '25px',
                            background: 'none',
                            border: 'none',
                            color: '#fff',
                            fontSize: '35px',
                            cursor: 'pointer',
                            fontWeight: 'bold'
                        }}
                    >
                        &times;
                    </button>

                    <img
                        src={activeLightboxImage}
                        alt="Повний розмір"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            maxWidth: '90%',
                            maxHeight: '90%',
                            borderRadius: '4px',
                            boxShadow: '0px 4px 20px rgba(0,0,0,0.5)',
                            cursor: 'default'
                        }}
                    />
                </div>
            )}
        </div>
    );
};