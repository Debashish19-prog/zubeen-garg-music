import HomeView from '@/components/views/HomeView';
import { homeData } from '@/lib/server/catalog';

export default function HomePage() {
  return <HomeView data={homeData()} />;
}
