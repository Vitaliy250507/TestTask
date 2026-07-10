import { useEffect, useState, useRef } from 'react';
import { CommentForm } from './components/CommentForm';
import { CommentNode } from './components/CommentNode';
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
  parent?: number | null;
  parent_id?: number | null;
  replies: Comment[];
}

function App() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [ordering, setOrdering] = useState<string>('-created_at');
  const [activeReplyId, setActiveReplyId] = useState<number | null>(null);

  const updateCommentReplies = (items: Comment[], newReply: any): Comment[] => {
    const targetParentId = newReply.parent || newReply.parent_id;
    return items.map((item) => {
      if (item.id === targetParentId) {
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

  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Якщо сокет уже ініціалізований — виходимо (захист від StrictMode)
    if (socketRef.current) return;

    const socket = new WebSocket('ws://localhost:8000/ws/comments/');
    socketRef.current = socket;

    socket.onopen = () => {
      console.log('Успішно підключено до WebSocket!');
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'new_comment' && data.comment) {
        const newComment = data.comment;
        const hasParent = newComment.parent || newComment.parent_id;

        if (!hasParent) {
          setComments((prev) => [newComment, ...prev]);
        } else {
          setComments((prev) => updateCommentReplies(prev, newComment));
        }
      }
    };

    socket.onclose = (event) => {
      // Виводимо лог тільки якщо сокет реально впав на сервері
      if (socket.readyState === WebSocket.CLOSED) {
        console.log('WebSocket дійсно закрився на сервері з кодом:', event.code);
      }
      socketRef.current = null;
    };

    return () => {
      // Закриваємо сокет ТІЛЬКИ якщо користувач дійсно йде зі сторінки
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
        socket.close();
      }
      socketRef.current = null;
    };
  }, []); // Масив порожній

  return (
    <div style={{ padding: '40px 20px', fontFamily: 'sans-serif', backgroundColor: '#f3f4f6', minHeight: '100vh' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ marginBottom: '5px', color: '#111827' }}>Система коментарів</h1>

        {activeReplyId === null && (
          <CommentForm onCommentSuccess={loadComments} />
        )}

        <hr style={{ margin: '40px 0', border: '0', borderTop: '1px solid #e5e7eb' }} />

        <div style={{ backgroundColor: '#ffffff', padding: '12px 20px', borderRadius: '6px', display: 'flex', gap: '20px', alignItems: 'center', marginBottom: '15px' }}>
          <span style={{ fontSize: '14px', fontWeight: 'bold' }}>Сортувати заглавні:</span>
          <button onClick={() => toggleSort('user__username')}>User Name {ordering.includes('user__username') ? (ordering.startsWith('-') ? '▼' : '▲') : ''}</button>
          <button onClick={() => toggleSort('user__email')}>E-mail {ordering.includes('user__email') ? (ordering.startsWith('-') ? '▼' : '▲') : ''}</button>
          <button onClick={() => toggleSort('created_at')}>Дата {ordering.includes('created_at') ? (ordering.startsWith('-') ? '▼' : '▲') : ''}</button>
        </div>

        <div style={{ marginTop: '20px' }}>
          {comments.map((comment) => (
            <CommentNode
              key={comment.id}
              comment={comment}
              activeReplyId={activeReplyId}
              setActiveReplyId={setActiveReplyId}
              onCommentSuccess={loadComments}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;