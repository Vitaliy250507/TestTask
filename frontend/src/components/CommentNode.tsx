import React from 'react';
import { CommentForm } from './CommentForm';

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
                            src={comment.file.startsWith('http') ? comment.file : `http://localhost:8000${comment.file}`}
                            alt="attachment"
                            style={{ maxHeight: '120px', borderRadius: '4px', display: 'block' }}
                        />
                    ) : (
                        <a
                            href={comment.file.startsWith('http') ? comment.file : `http://localhost:8000${comment.file}`}
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
        </div>
    );
};