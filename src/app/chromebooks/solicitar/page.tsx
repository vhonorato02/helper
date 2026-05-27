import { permanentRedirect } from 'next/navigation';

export default function LegacyPublicChromebookRequestPage() {
  permanentRedirect('/solicitar/chromebooks');
}
