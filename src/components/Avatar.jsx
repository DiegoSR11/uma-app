export const Avatar = ({ nombre }) => {
  const inicial = (nombre || 'U').charAt(0).toUpperCase();
  const color = ['#f87171', '#fbbf24', '#34d399', '#60a5fa'][inicial.charCodeAt(0) % 4];
  
  return (
    <div style={{ 
      width: '35px', height: '35px', borderRadius: '50%', 
      backgroundColor: color, display: 'flex', alignItems: 'center', 
      justifyContent: 'center', fontWeight: 'bold', fontSize: '14px', color: '#FFF' 
    }}>
      {inicial}
    </div>
  );
};