import { CommentForm } from './components/CommentForm';

function App() {
  const handleCommentSuccess = () => {
    alert('Коментар успішно надіслано на бекенд!');
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', backgroundColor: '#f9f9f9', minHeight: '100vh' }}>
      <h1>Система коментарів</h1>
      <p style={{ color: '#666' }}>Тестування форми та капчі з Django API</p>

      <CommentForm onCommentSuccess={handleCommentSuccess} />
    </div>
  );
}

export default App;