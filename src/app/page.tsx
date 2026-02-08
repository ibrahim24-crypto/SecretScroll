import { Header } from '@/components/layout/Header';
import { Feed } from '@/components/feed/Feed';

export default function HomePage() {
  return (
    <>
      <Header />
      <main className="container py-8">
        <Feed />
      </main>
    </>
  );
}
