import { redirect } from 'next/navigation';

export default function HomePage() {
  // Redireciona o acesso inicial para a tela de login
  redirect('/login');
}