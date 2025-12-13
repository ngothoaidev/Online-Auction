export default function ProductDescription({ description }) {
  return (
    <div className="rounded-2xl p-6 border" style={{ backgroundColor: 'var(--bg-soft)', borderColor: 'var(--border)' }}>
      <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--text)' }}>Description</h3>
      <div 
        className="prose prose-sm max-w-none"
        style={{ color: 'var(--text-muted)' }}
        dangerouslySetInnerHTML={{ __html: description }}
      />
    </div>
  );
}
