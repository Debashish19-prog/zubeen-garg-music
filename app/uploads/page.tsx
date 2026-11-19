import type { Metadata } from 'next';
import ListPage from '@/components/music/ListPage';
import UploadsActions from '@/components/upload/UploadsActions';
import { DB, listPayload } from '@/lib/server/catalog';

export const metadata: Metadata = { title: 'Uploads' };
export const dynamic = 'force-dynamic';

export default function UploadsPage() {
  return (
    <ListPage
      ctx={{ key: 'uploads', label: 'Uploads', href: '/uploads', kind: 'Playlist' }}
      kind="Playlist"
      title="Uploads"
      desc="Full songs added to the site's own archive. They play right here, start to finish, with every control in the player bar."
      cover={{ type: 'uploads' }}
      color="#1f5a52"
      list={listPayload(DB.uploadIds, 100)}
      source={{ type: 'uploads', key: '' }}
      actions={<UploadsActions />}
      empty="Nothing uploaded yet."
    />
  );
}
