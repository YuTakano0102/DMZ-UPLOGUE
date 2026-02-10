export default function TestPage({ params }: { params: Promise<{ locale: string }> }) {
  return (
    <div style={{ padding: '2rem' }}>
      <h1>Test Page</h1>
      <p>If you can see this, the routing is working!</p>
    </div>
  );
}
