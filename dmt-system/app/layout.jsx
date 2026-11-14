import './globals.css';

export const metadata = {
  title: 'dmt-system | Controle de Estoque',
  description: 'Sistema ERP de Controle de Estoque e Estrutura BOM - DM Trailers',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
      </body>
    </html>
  );
}