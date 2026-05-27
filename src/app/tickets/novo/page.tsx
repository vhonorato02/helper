import { redirect } from 'next/navigation';

export default function NovoPage() {
  redirect('/tickets?novo=1');
}
