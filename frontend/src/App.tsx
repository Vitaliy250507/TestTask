import { useEffect, useState } from 'react';
import { CommentForm } from './components/CommentForm';
import { CommentNode } from './components/CommentNode'
import { api } from './api/axios';

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
  parent_id?: number | null;
  replies: Comment[];
}

function App() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [ordering, setOrdering] = useState<string>('-created_at');

  const updateCommentReplies = (items: Comment[], newReply: Comment): Comment[] => {
    return items.map((item) => {
      if (item.id === newReply.parent_id) {
        return {
          ...item,
          replies: item.replies ? [...item.replies, newReply] : [newReply]
        };
      } else if (item.replies && item.replies.length > 0) {
        return {
          ...item,
          replies: updateCommentReplies(item.replies, newReply)
        };
      }
      return item;
    });
  };

  const loadComments = async (currentOrdering = ordering) => {
    try {
      const response = await api.get<Comment[]>(`comments/?ordering=${currentOrdering}`);
      setComments(response.data);
    } catch (err) {
      console.error('Не вдалося завантажити коментарі:', err);
    }
  };

  const toggleSort = (field: string) => {
    const newOrdering = ordering === field ? `-${field}` : field;
    setOrdering(newOrdering);
    loadComments(newOrdering);
  };

  useEffect(() => {
    loadComments();

    const socket = new WebSocket('ws://localhost:8000/ws/comments/');

    socket.onopen = () => {
      console.log('Успішно підключено до WebSocket коментарів (Daphne)');
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'new_comment' && data.comment) {
        const newComment = data.comment;

        if (!newComment.parent_id) {
          setComments((prev) => [newComment, ...prev]);
        } else {
          setComments((prev) => updateCommentReplies(prev, newComment));
        }
      }
    };

    socket.onclose = () => {
      console.log('WebSocket з’єднання закрите');
    };

    return () => socket.close();
  }, []);

  const handleCommentSuccess = () => {
    loadComments();
  };

  return (
    <div style={{ padding: '40px 20px', fontFamily: 'sans-serif', backgroundColor: '#f3f4f6', minHeight: '100vh' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ marginBottom: '5px', color: '#111827' }}>Система коментарів</h1>
        <p style={{ color: '#6b7280', marginTop: '0', marginBottom: '30px' }}>Тестування форми та капчі з Django API</p>

        <CommentForm onCommentSuccess={handleCommentSuccess} />

        <hr style={{ margin: '40px 0', border: '0', borderTop: '1px solid #e5e7eb' }} />

        <div style={{ backgroundColor: '#ffffff', padding: '12px 20px', borderRadius: '6px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', gap: '20px', alignItems: 'center', marginBottom: '15px' }}>
          <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#374151' }}>Сортувати заглавні:</span>
          <button
            onClick={() => toggleSort('user__username')}
            style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '14px', fontWeight: ordering.includes('user__username') ? 'bold' : 'normal' }}
          >
            User Name {ordering === 'user__username' ? '▲' : ordering === '-user__username' ? '▼' : ''}
          </button>
          <button
            onClick={() => toggleSort('user__email')}
            style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '14px', fontWeight: ordering.includes('user__email') ? 'bold' : 'normal' }}
          >
            E-mail {ordering === 'user__email' ? '▲' : ordering === '-user__email' ? '▼' : ''}
          </button>
          <button
            onClick={() => toggleSort('created_at')}
            style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '14px', fontWeight: ordering.includes('created_at') ? 'bold' : 'normal' }}
          >
            Дата {ordering === 'created_at' ? '▲' : ordering === '-created_at' ? '▼' : ''}
          </button>
        </div>

        <div style={{ marginTop: '20px' }}>
          <h2 style={{ fontSize: '18px', color: '#111827', marginBottom: '15px' }}>Всі коментарі ({comments.length})</h2>
          {comments.length === 0 ? (
            <p style={{ color: '#9ca3af', fontSize: '14px' }}>Коментарів поки немає. Будьте першим!</p>
          ) : (
            comments.map((comment) => (
              <CommentNode
                key={comment.id}
                comment={comment}
                onReplyClick={(id) => console.log('Відповідь на коментар ID:', id)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default App;