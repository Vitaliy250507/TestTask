import React from 'react';

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
    replies?: Comment[];
}

interface CommentNodeProps {
    comment: Comment;
    onReplyClick?: (commentId: number) => void;
}

export const CommentNode: React.FC<CommentNodeProps> = ({ comment, onReplyClick }) => {
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
                    {comment.user.homepage && (
                        <>
                            <span style={{ margin: '0 8px' }}>|</span>
                            <a href={comment.user.homepage} target="_blank" rel="noreferrer" style={{ color: '#2563eb', textDecoration: 'none' }}>
                                {comment.user.homepage}
                            </a>
                        </>
                    )}
                </div>
                <span>{new Date(comment.created_at).toLocaleString('uk-UA')}</span>
            </div>

            <p
                style={{ textWrap: 'wrap', color: '#374151', margin: '0 0 10px 0', fontSize: '15px', lineHeight: '1.5' }}
                dangerouslySetInnerHTML={{ __html: comment.text }}
            />

            {comment.file && (
                <div style={{ marginBottom: '10px' }}>
                    {comment.file.match(/\.(jpeg|jpg|gif|png)$/i) ? (
                        <img src={comment.file} alt="attachment" style={{ maxHeight: '120px', borderRadius: '4px', border: '1px solid #e5e7eb' }} />
                    ) : (
                        <a href={comment.file} target="_blank" rel="noreferrer" style={{ fontSize: '12px', color: '#2563eb', textDecoration: 'underline' }}>
                            Переглянути вкладений файл [TXT]
                        </a>
                    )}
                </div>
            )}

            {onReplyClick && (
                <button
                    onClick={() => onReplyClick(comment.id)}
                    style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '12px', padding: '0', fontWeight: 'bold' }}
                >
                    Відповісти
                </button>
            )}

            {comment.replies && comment.replies.length > 0 && (
                <div style={{ marginTop: '10px', marginLeft: '20px', borderLeft: '1px solid #e5e7eb', paddingLeft: '10px' }}>
                    {comment.replies.map((reply) => (
                        <CommentNode key={reply.id} comment={reply} onReplyClick={onReplyClick} />
                    ))}
                </div>
            )}
        </div>
    );
};